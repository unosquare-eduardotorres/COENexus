import { embeddingRepository, type ResumeSkills, type EmbeddingRow } from '../db/repositories/embeddingRepository'
import { claudeService } from './claudeService'
import { getConfig } from '../config'
import { createLogger } from './logger'

const log = createLogger('ResumeSkillExtractor')

const MAX_CONCURRENCY = 5
const MAX_RESUME_CHARS = 12_000

const EXTRACTION_PROMPT = `You are a resume parser. Extract a structured technical profile from the text below.
Output ONLY valid JSON (no markdown fences) matching this schema:
{
  "primary_tech_stack": string[],
  "secondary_tech_stack": string[],
  "roles": string[],
  "domains": string[],
  "years_experience": number | null,
  "seniority_signals": string[],
  "certifications": string[],
  "languages": string[],
  "summary": string
}

RULES:
- Use canonical names (C#, not "csharp"; React, not "ReactJS")
- Only include skills actually in the resume; do NOT guess
- primary_tech_stack = the person's clear expertise (top 3-8), not every skill mentioned once
- secondary_tech_stack = supporting skills mentioned in projects but not the focus
- roles = job titles actually held
- domains = industries worked in (fintech, healthcare, etc)
- years_experience = total professional years, best estimate from dates
- seniority_signals = "Lead", "Architect", "Principal", "Staff", "Manager" etc if present
- certifications = named certifications only
- languages = spoken/written languages with proficiency if stated
- summary = 1-2 sentence technical summary
- If field has no data, use empty array or null`

function parseSkillsResponse(response: string): ResumeSkills | null {
  const cleaned = response
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      primary_tech_stack: Array.isArray(parsed.primary_tech_stack) ? parsed.primary_tech_stack : [],
      secondary_tech_stack: Array.isArray(parsed.secondary_tech_stack) ? parsed.secondary_tech_stack : [],
      roles: Array.isArray(parsed.roles) ? parsed.roles : [],
      domains: Array.isArray(parsed.domains) ? parsed.domains : [],
      years_experience: typeof parsed.years_experience === 'number' ? parsed.years_experience : null,
      seniority_signals: Array.isArray(parsed.seniority_signals) ? parsed.seniority_signals : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      languages: Array.isArray(parsed.languages) ? parsed.languages : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    }
  } catch {
    return null
  }
}

async function extractOneInternal(row: EmbeddingRow, model: string): Promise<boolean> {
  if (!row.resume_text) {
    log.warn('Skipping extraction for row with no resume text', { id: row.id })
    return false
  }

  const text = row.resume_text.length > MAX_RESUME_CHARS
    ? row.resume_text.slice(0, MAX_RESUME_CHARS) + '\n[...truncated]'
    : row.resume_text

  const prompt = `${EXTRACTION_PROMPT}\n\nRESUME TEXT:\n${text}`

  const { text: response } = await claudeService.chatAsync(
    model,
    prompt,
    1024,
    0.0,
  )

  const skills = parseSkillsResponse(response)
  if (!skills) {
    log.error('Failed to parse skills from LLM response', new Error('Parse failure'), {
      id: row.id,
      sourceType: row.source_type,
      responsePreview: response.slice(0, 200),
    })
    return false
  }

  embeddingRepository.updateExtractedSkills(row.id, JSON.stringify(skills), model)
  return true
}

export interface ExtractionBatchResult {
  extracted: number
  skipped: number
  failed: number
}

export const resumeSkillExtractor = {
  async extractOne(embeddingId: number, force = false): Promise<boolean> {
    const db = (await import('../db/connection')).getDatabase()
    const row = db.prepare('SELECT * FROM resume_embeddings WHERE id = ?').get(embeddingId) as EmbeddingRow | undefined
    if (!row) {
      log.warn('Embedding not found for extraction', { embeddingId })
      return false
    }

    if (!force && row.extracted_skills_json) {
      log.info('Skipping already-extracted embedding', { id: row.id })
      return false
    }

    if (!row.resume_text) {
      log.warn('No resume text available for extraction', { id: row.id })
      return false
    }

    const model = getConfig().claude.haikuModel
    return extractOneInternal(row, model)
  },

  async extractBatch(
    sourceType?: string,
    limit = 100,
    force = false,
    onProgress?: (progress: { extracted: number; failed: number; total: number }) => void
  ): Promise<ExtractionBatchResult> {
    const model = getConfig().claude.haikuModel
    let rows: EmbeddingRow[]

    if (force) {
      const db = (await import('../db/connection')).getDatabase()
      const query = sourceType
        ? 'SELECT * FROM resume_embeddings WHERE resume_text IS NOT NULL AND source_type = ? ORDER BY updated_at DESC LIMIT ?'
        : 'SELECT * FROM resume_embeddings WHERE resume_text IS NOT NULL ORDER BY updated_at DESC LIMIT ?'
      rows = sourceType
        ? db.prepare(query).all(sourceType, limit) as EmbeddingRow[]
        : db.prepare(query).all(limit) as EmbeddingRow[]
    } else {
      rows = embeddingRepository.findNeedingSkillExtraction(sourceType, limit)
    }

    if (rows.length === 0) {
      log.info('No rows needing skill extraction')
      return { extracted: 0, skipped: 0, failed: 0 }
    }

    log.info('Starting batch skill extraction', {
      count: rows.length,
      sourceType: sourceType ?? 'all',
      force,
      model,
    })

    let extracted = 0
    let failed = 0
    let skipped = 0

    const queue = [...rows]
    const active: Promise<void>[] = []

    const processOne = async (row: EmbeddingRow): Promise<void> => {
      if (!force && row.extracted_skills_json) {
        skipped++
        return
      }
      try {
        const success = await extractOneInternal(row, model)
        if (success) {
          extracted++
        } else {
          failed++
        }
      } catch (error) {
        failed++
        log.error('Extraction failed for row', error instanceof Error ? error : new Error(String(error)), {
          id: row.id,
          sourceType: row.source_type,
        })
      }
      onProgress?.({ extracted, failed, total: rows.length })
    }

    while (queue.length > 0 || active.length > 0) {
      while (active.length < MAX_CONCURRENCY && queue.length > 0) {
        const row = queue.shift()!
        const promise = processOne(row).then(() => {
          active.splice(active.indexOf(promise), 1)
        })
        active.push(promise)
      }
      if (active.length > 0) {
        await Promise.race(active)
      }
    }

    log.info('Batch skill extraction complete', { extracted, skipped, failed, total: rows.length })
    return { extracted, skipped, failed }
  },

  async getExtractedSkills(sourceType: string, upstreamId: number): Promise<ResumeSkills | null> {
    return embeddingRepository.getSkillsByUpstreamId(sourceType, upstreamId)
  },

  getExtractionStatus(): { total: number; extracted: number; pending: number } {
    return embeddingRepository.countExtractedSkills()
  },
}
