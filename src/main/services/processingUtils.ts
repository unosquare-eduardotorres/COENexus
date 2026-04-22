import { upstreamApiService } from './upstreamApiService'
import { resumeTextExtractor } from './resumeTextExtractor'
import { voyageEmbeddingService } from './voyageEmbeddingService'
import { syncRepository } from '../db/repositories/syncRepository'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { getDatabase } from '../db/connection'
import { createLogger } from './logger'

const log = createLogger('ProcessingUtils')

function sanitizeUnicode(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

function buildEnrichedText(source: string, dbId: number, resumeText: string): string {
  const db = getDatabase()
  if (source === 'employees') {
    const row = db.prepare('SELECT * FROM synced_employees WHERE id = ?').get(dbId) as { full_name: string; main_skill: string; seniority: string; job_title: string } | undefined
    if (row) {
      const parts = [`Name: ${row.full_name}`]
      if (row.main_skill) parts.push(`Main Skill: ${row.main_skill}`)
      if (row.seniority) parts.push(`Seniority: ${row.seniority}`)
      if (row.job_title) parts.push(`Job Title: ${row.job_title}`)
      parts.push('', 'Resume:', resumeText)
      return parts.join('\n')
    }
  }
  if (source === 'candidates') {
    const row = db.prepare('SELECT * FROM synced_candidates WHERE id = ?').get(dbId) as { full_name: string; main_skill: string | null; seniority: string | null; country: string | null } | undefined
    if (row) {
      const parts = [`Name: ${row.full_name}`]
      if (row.main_skill) parts.push(`Main Skill: ${row.main_skill}`)
      if (row.seniority) parts.push(`Seniority: ${row.seniority}`)
      if (row.country) parts.push(`Country: ${row.country}`)
      parts.push('', 'Resume:', resumeText)
      return parts.join('\n')
    }
  }
  return resumeText
}

export function extractPositionText(position: {
  account: string
  job_title: string
  main_skill: string
  job_description: string
}): string {
  return [
    position.account && `Account: ${position.account}`,
    position.job_title && `Job Title: ${position.job_title}`,
    position.main_skill && `Main Skill: ${position.main_skill}`,
    '',
    'Job Description:',
    position.job_description,
  ].filter(Boolean).join('\n')
}

export async function extractSingleRecord(
  source: string,
  token: string,
  noteId: number,
  filename: string,
  dbId: number,
  upstreamId: number,
  isBench: boolean,
): Promise<{ text: string; fileSize: number } | { error: string }> {
  try {
    const fileBytes = await upstreamApiService.getNoteFile(token, noteId)
    const buffer = Buffer.from(fileBytes)
    const rawText = await resumeTextExtractor.extractText(buffer, filename)
    const text = sanitizeUnicode(rawText)

    if (!text.trim()) {
      const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
      syncRepository.markFailed(table, dbId, 'extract_failed', 'Empty text after extraction')
      return { error: 'Empty text after extraction' }
    }

    const enrichedText = buildEnrichedText(source, dbId, text)

    embeddingRepository.upsertTextOnly({
      sourceType: source,
      sourceId: dbId,
      upstreamId,
      resumeText: enrichedText,
      isBench,
    })

    const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
    syncRepository.updateStatus(table, dbId, 'extracted')

    return { text: enrichedText, fileSize: buffer.length }
  } catch (err) {
    log.error('Single record extraction failed', err instanceof Error ? err : new Error(String(err)), { source, upstreamId })
    const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
    syncRepository.markFailed(table, dbId, 'extract_failed', err instanceof Error ? err.message : 'Extraction failed')
    return { error: err instanceof Error ? err.message : 'Extraction failed' }
  }
}

export async function vectorizeSingleRecord(
  source: string,
  dbId: number,
  upstreamId: number,
  resumeText: string,
  isBench: boolean,
  model: string,
): Promise<{ dimensions: number } | { error: string }> {
  try {
    const vector = await voyageEmbeddingService.generateEmbedding(resumeText, model)

    embeddingRepository.upsert({
      sourceType: source,
      sourceId: dbId,
      upstreamId,
      embedding: vector,
      resumeText,
      isBench,
    })

    const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
    syncRepository.updateStatus(table, dbId, 'vectorized')

    return { dimensions: vector.length }
  } catch (err) {
    log.error('Single record vectorization failed', err instanceof Error ? err : new Error(String(err)), { source, upstreamId })
    const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
    syncRepository.markFailed(table, dbId, 'vectorize_failed', err instanceof Error ? err.message : 'Vectorization failed')
    return { error: err instanceof Error ? err.message : 'Vectorization failed' }
  }
}
