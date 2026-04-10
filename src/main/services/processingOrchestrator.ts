import { upstreamApiService } from './upstreamApiService'
import { resumeTextExtractor } from './resumeTextExtractor'
import { voyageEmbeddingService } from './voyageEmbeddingService'
import { syncRepository } from '../db/repositories/syncRepository'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { getDatabase } from '../db/connection'
import { getConfig } from '../config'
import { createLogger } from './logger'

const log = createLogger('ProcessingOrchestrator')

export interface ProcessingRecordDto {
  id: string
  upstreamId: number
  name: string
  status: string
  error?: string
  resumeSizeKb?: number
  extractedChunks?: number
  vectorDimensions?: number
}

export interface ProcessingProgressDto {
  source: string
  status: string
  totalRecords: number
  processedRecords: number
  successCount: number
  failedCount: number
  skippedCount: number
}

export type ProcessingEvent =
  | { type: 'record'; record: ProcessingRecordDto }
  | { type: 'progress'; progress: ProcessingProgressDto }
  | { type: 'complete'; progress: ProcessingProgressDto }
  | { type: 'error'; message: string }

interface EligibleRecord {
  dbId: number
  upstreamId: number
  name: string
  noteId: number | null
  filename: string | null
  isBench: boolean
}

let activeController: AbortController | null = null

function makeProgress(source: string, total: number, processed: number, success: number, failed: number, skipped: number, status = 'processing'): ProcessingEvent {
  return { type: 'progress', progress: { source, status, totalRecords: total, processedRecords: processed, successCount: success, failedCount: failed, skippedCount: skipped } }
}

function getEligibleEmployeesForExtraction(): EligibleRecord[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT e.id, e.upstream_id, e.full_name, e.resume_note_id, e.resume_filename, e.is_bench
    FROM synced_employees e
    LEFT JOIN resume_embeddings re ON re.source_type = 'employees' AND re.source_id = e.id
    WHERE e.has_resume = 1 AND e.status IN ('synced', 'incomplete', 'extract_failed')
      AND (re.id IS NULL OR re.resume_text IS NULL OR re.resume_text = '')
    ORDER BY e.full_name
  `).all() as { id: number; upstream_id: number; full_name: string; resume_note_id: number | null; resume_filename: string | null; is_bench: number }[]

  return rows.map(r => ({ dbId: r.id, upstreamId: r.upstream_id, name: r.full_name, noteId: r.resume_note_id, filename: r.resume_filename, isBench: r.is_bench === 1 }))
}

function getEligibleCandidatesForExtraction(): EligibleRecord[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT c.id, c.upstream_id, c.full_name, c.resume_note_id, c.resume_filename
    FROM synced_candidates c
    LEFT JOIN resume_embeddings re ON re.source_type = 'candidates' AND re.source_id = c.id
    WHERE c.has_resume = 1 AND c.status IN ('synced', 'incomplete', 'extract_failed')
      AND (re.id IS NULL OR re.resume_text IS NULL OR re.resume_text = '')
    ORDER BY c.full_name
  `).all() as { id: number; upstream_id: number; full_name: string; resume_note_id: number | null; resume_filename: string | null }[]

  return rows.map(r => ({ dbId: r.id, upstreamId: r.upstream_id, name: r.full_name, noteId: r.resume_note_id, filename: r.resume_filename, isBench: false }))
}

function getEligibleForVectorization(source: string): { dbId: number; upstreamId: number; name: string; resumeText: string; isBench: boolean }[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT re.source_id, re.upstream_id, re.resume_text, re.is_bench,
      CASE
        WHEN re.source_type = 'employees' THEN (SELECT full_name FROM synced_employees WHERE id = re.source_id)
        WHEN re.source_type = 'candidates' THEN (SELECT full_name FROM synced_candidates WHERE id = re.source_id)
        ELSE 'Unknown'
      END as name
    FROM resume_embeddings re
    WHERE re.source_type = ? AND re.resume_text IS NOT NULL AND re.resume_text != ''
      AND (re.embedding IS NULL)
    ORDER BY re.source_id
  `).all(source) as { source_id: number; upstream_id: number; resume_text: string; is_bench: number; name: string }[]

  return rows.map(r => ({ dbId: r.source_id, upstreamId: r.upstream_id, name: r.name, resumeText: r.resume_text, isBench: r.is_bench === 1 }))
}

function sanitizeUnicode(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

function buildEnrichedText(source: string, dbId: number, resumeText: string): string {
  if (source === 'employees') {
    const db = getDatabase()
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
  return resumeText
}

export const processingOrchestrator = {
  requestPause(): void {
    activeController?.abort()
  },

  getStatus(): { employees: { total: number; extracted: number; vectorized: number; failed: number }; candidates: { total: number; extracted: number; vectorized: number; failed: number }; positions: { total: number; extracted: number; vectorized: number; failed: number } } {
    const db = getDatabase()

    const empTotal = (db.prepare("SELECT COUNT(*) as c FROM synced_employees WHERE has_resume = 1").get() as { c: number }).c
    const empExtracted = (db.prepare("SELECT COUNT(*) as c FROM resume_embeddings WHERE source_type = 'employees' AND resume_text IS NOT NULL AND resume_text != ''").get() as { c: number }).c
    const empVectorized = (db.prepare("SELECT COUNT(*) as c FROM resume_embeddings WHERE source_type = 'employees' AND embedding IS NOT NULL").get() as { c: number }).c
    const empFailed = (db.prepare("SELECT COUNT(*) as c FROM synced_employees WHERE status IN ('sync_failed', 'extract_failed', 'vectorize_failed')").get() as { c: number }).c

    const candTotal = (db.prepare("SELECT COUNT(*) as c FROM synced_candidates WHERE has_resume = 1").get() as { c: number }).c
    const candExtracted = (db.prepare("SELECT COUNT(*) as c FROM resume_embeddings WHERE source_type = 'candidates' AND resume_text IS NOT NULL AND resume_text != ''").get() as { c: number }).c
    const candVectorized = (db.prepare("SELECT COUNT(*) as c FROM resume_embeddings WHERE source_type = 'candidates' AND embedding IS NOT NULL").get() as { c: number }).c
    const candFailed = (db.prepare("SELECT COUNT(*) as c FROM synced_candidates WHERE status IN ('sync_failed', 'extract_failed', 'vectorize_failed')").get() as { c: number }).c

    const posTotal = (db.prepare("SELECT COUNT(*) as c FROM synced_open_positions").get() as { c: number }).c
    const posExtracted = (db.prepare("SELECT COUNT(*) as c FROM resume_embeddings WHERE source_type = 'positions' AND resume_text IS NOT NULL AND resume_text != ''").get() as { c: number }).c
    const posVectorized = (db.prepare("SELECT COUNT(*) as c FROM resume_embeddings WHERE source_type = 'positions' AND embedding IS NOT NULL").get() as { c: number }).c
    const posFailed = (db.prepare("SELECT COUNT(*) as c FROM synced_open_positions WHERE status IN ('sync_failed', 'extract_failed', 'vectorize_failed')").get() as { c: number }).c

    return {
      employees: { total: empTotal, extracted: empExtracted, vectorized: empVectorized, failed: empFailed },
      candidates: { total: candTotal, extracted: candExtracted, vectorized: candVectorized, failed: candFailed },
      positions: { total: posTotal, extracted: posExtracted, vectorized: posVectorized, failed: posFailed },
    }
  },

  async extractAsync(source: string, token: string, emitEvent: (event: ProcessingEvent) => void): Promise<void> {
    activeController = new AbortController()
    const { signal } = activeController
    log.info('Text extraction started', { source })

    try {
      if (source === 'open-positions') {
        await extractOpenPositions(emitEvent, signal)
        return
      }

      const eligible = source === 'employees'
        ? getEligibleEmployeesForExtraction()
        : getEligibleCandidatesForExtraction()

      const total = eligible.length
      let processed = 0, success = 0, failed = 0, skipped = 0

      emitEvent(makeProgress(source, total, processed, success, failed, skipped))

      const batchSize = 5

      for (let i = 0; i < eligible.length; i += batchSize) {
        if (signal.aborted) break

        const batch = eligible.slice(i, i + batchSize)

        const results = await Promise.allSettled(batch.map(async (item) => {
          if (!item.noteId) {
            return { item, text: null as string | null, error: 'No resume note ID', fileSize: 0 }
          }

          const fileBytes = await upstreamApiService.getNoteFile(token, item.noteId)
          const buffer = Buffer.from(fileBytes)
          const text = await resumeTextExtractor.extractText(buffer, item.filename ?? 'resume.pdf')
          return { item, text: sanitizeUnicode(text), error: null as string | null, fileSize: buffer.length }
        }))

        for (const result of results) {
          processed++

          if (result.status === 'rejected') {
            failed++
            log.error('Extraction failed for record', result.reason instanceof Error ? result.reason : new Error(result.reason?.message ?? 'Extraction failed'), { source })
            emitEvent({ type: 'record', record: { id: `${source}-0`, upstreamId: 0, name: 'Unknown', status: 'failed', error: result.reason?.message ?? 'Extraction failed' } })
            emitEvent(makeProgress(source, total, processed, success, failed, skipped))
            continue
          }

          const { item, text, error, fileSize } = result.value

          if (error || !text?.trim()) {
            failed++
            const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
            syncRepository.markFailed(table, item.dbId, 'extract_failed', error ?? 'Empty text after extraction')
            emitEvent({ type: 'record', record: { id: `${source}-${item.upstreamId}`, upstreamId: item.upstreamId, name: item.name, status: 'failed', error: error ?? 'Empty text' } })
          } else {
            const enrichedText = buildEnrichedText(source, item.dbId, text)

            embeddingRepository.upsertTextOnly({
              sourceType: source,
              sourceId: item.dbId,
              upstreamId: item.upstreamId,
              resumeText: enrichedText,
              isBench: item.isBench,
            })

            const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
            syncRepository.updateStatus(table, item.dbId, 'extracted')
            success++

            emitEvent({ type: 'record', record: { id: `${source}-${item.upstreamId}`, upstreamId: item.upstreamId, name: item.name, status: 'extracted', resumeSizeKb: Math.round(fileSize / 1024), extractedChunks: text.length } })
          }

          emitEvent(makeProgress(source, total, processed, success, failed, skipped))
        }
      }

      log.info('Text extraction complete', { source, total, success, failed, skipped, paused: signal.aborted })
      emitEvent({ type: 'complete', progress: { source, status: signal.aborted ? 'paused' : 'completed', totalRecords: total, processedRecords: processed, successCount: success, failedCount: failed, skippedCount: skipped } })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Extraction failed' })
    } finally {
      activeController = null
    }
  },

  async vectorizeAsync(source: string, model: string, emitEvent: (event: ProcessingEvent) => void): Promise<void> {
    activeController = new AbortController()
    const { signal } = activeController
    log.info('Vectorization started', { source, model })

    try {
      const eligible = getEligibleForVectorization(source)
      const total = eligible.length
      log.info('Vectorization eligible records', { source, eligible: eligible.length })
      let processed = 0, success = 0, failed = 0, skipped = 0

      emitEvent(makeProgress(source, total, processed, success, failed, skipped, 'vectorizing'))

      for (const item of eligible) {
        if (signal.aborted) break
        processed++

        try {
          const vector = await voyageEmbeddingService.generateEmbedding(item.resumeText, model)

          embeddingRepository.upsert({
            sourceType: source,
            sourceId: item.dbId,
            upstreamId: item.upstreamId,
            embedding: vector,
            resumeText: item.resumeText,
            isBench: item.isBench,
          })

          const table = source === 'employees' ? 'synced_employees' as const
            : source === 'candidates' ? 'synced_candidates' as const
            : 'synced_open_positions' as const
          syncRepository.updateStatus(table, item.dbId, 'vectorized')
          success++

          emitEvent({ type: 'record', record: { id: `${source}-${item.upstreamId}`, upstreamId: item.upstreamId, name: item.name, status: 'vectorized', vectorDimensions: vector.length } })
        } catch (err) {
          failed++
          log.error('Vectorization failed for record', err instanceof Error ? err : new Error(String(err)), { source, upstreamId: item.upstreamId })
          const table = source === 'employees' ? 'synced_employees' as const
            : source === 'candidates' ? 'synced_candidates' as const
            : 'synced_open_positions' as const
          syncRepository.markFailed(table, item.dbId, 'vectorize_failed', err instanceof Error ? err.message : 'Vectorization failed')
          emitEvent({ type: 'record', record: { id: `${source}-${item.upstreamId}`, upstreamId: item.upstreamId, name: item.name, status: 'failed', error: err instanceof Error ? err.message : 'Vectorization failed' } })
        }

        emitEvent(makeProgress(source, total, processed, success, failed, skipped, 'vectorizing'))
      }

      log.info('Vectorization complete', { source, total, success, failed, paused: signal.aborted })
      emitEvent({ type: 'complete', progress: { source, status: signal.aborted ? 'paused' : 'completed', totalRecords: total, processedRecords: processed, successCount: success, failedCount: failed, skippedCount: skipped } })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Vectorization failed' })
    } finally {
      activeController = null
    }
  },

  async vectorizeSingle(source: string, upstreamId: number, model: string): Promise<{ success: boolean; error?: string }> {
    log.info('Single vectorization requested', { source, upstreamId })
    const db = getDatabase()
    const embedding = db.prepare(
      'SELECT * FROM resume_embeddings WHERE source_type = ? AND upstream_id = ?'
    ).get(source, upstreamId) as { source_id: number; resume_text: string | null; is_bench: number } | undefined

    if (!embedding?.resume_text) return { success: false, error: 'No resume text found' }

    try {
      const vector = await voyageEmbeddingService.generateEmbedding(embedding.resume_text, model)

      embeddingRepository.upsert({
        sourceType: source,
        sourceId: embedding.source_id,
        upstreamId,
        embedding: vector,
        resumeText: embedding.resume_text,
        isBench: embedding.is_bench === 1,
      })

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Vectorization failed' }
    }
  },
}

async function extractOpenPositions(emitEvent: (event: ProcessingEvent) => void, signal?: AbortSignal): Promise<void> {
  const db = getDatabase()
  const positions = db.prepare(`
    SELECT op.id, op.upstream_id, op.account, op.job_title, op.main_skill, op.job_description
    FROM synced_open_positions op
    LEFT JOIN resume_embeddings re ON re.source_type = 'positions' AND re.source_id = op.id
    WHERE op.job_description IS NOT NULL AND op.job_description != ''
      AND (re.id IS NULL OR re.resume_text IS NULL OR re.resume_text = '')
    ORDER BY op.account
  `).all() as { id: number; upstream_id: number; account: string; job_title: string; main_skill: string; job_description: string }[]

  const total = positions.length
  let processed = 0, success = 0, failed = 0
  log.info('Open position text extraction started', { eligible: positions.length })

  emitEvent(makeProgress('open-positions', total, processed, success, failed, 0))

  for (const pos of positions) {
    if (signal?.aborted) break
    processed++

    const enrichedText = [
      pos.account && `Account: ${pos.account}`,
      pos.job_title && `Job Title: ${pos.job_title}`,
      pos.main_skill && `Main Skill: ${pos.main_skill}`,
      '', 'Job Description:', pos.job_description,
    ].filter(Boolean).join('\n')

    embeddingRepository.upsert({
      sourceType: 'positions',
      sourceId: pos.id,
      upstreamId: pos.upstream_id,
      embedding: new Float32Array(0),
      resumeText: enrichedText,
      isBench: false,
    })

    syncRepository.updateStatus('synced_open_positions', pos.id, 'extracted')
    success++

    emitEvent({ type: 'record', record: { id: `pos-${pos.upstream_id}`, upstreamId: pos.upstream_id, name: `${pos.account} - ${pos.job_title}`, status: 'extracted' } })
    emitEvent(makeProgress('open-positions', total, processed, success, failed, 0))
  }

  log.info('Open position text extraction complete', { total, success, failed })
  emitEvent({ type: 'complete', progress: { source: 'open-positions', status: 'completed', totalRecords: total, processedRecords: processed, successCount: success, failedCount: failed, skippedCount: 0 } })
}
