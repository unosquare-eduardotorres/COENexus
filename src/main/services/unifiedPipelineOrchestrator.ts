import { upstreamApiService } from './upstreamApiService'
import { syncRepository } from '../db/repositories/syncRepository'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { matchEngineService } from './matchEngineService'
import { syncEmployeeOrchestrator } from './sync/syncEmployeeOrchestrator'
import { syncCandidateOrchestrator } from './sync/syncCandidateOrchestrator'
import { extractSingleRecord, vectorizeSingleRecord } from './processingUtils'
import { createLogger } from './logger'
import { getConfig } from '../config'

const log = createLogger('UnifiedPipeline')

export interface PipelineRecordEvent {
  upstreamId: number
  name: string
  outcome: 'vectorized' | 'skipped' | 'failed'
  failedStep?: 'sync' | 'extract' | 'vectorize' | 'no_resume'
  error?: string
  seniority?: string
  mainSkill?: string
}

export interface PipelineProgress {
  source: string
  status: 'processing' | 'paused' | 'completed'
  totalRecords: number
  processedRecords: number
  succeededCount: number
  failedCount: number
  skippedCount: number
  currentRecord?: string
}

export type PipelineEvent =
  | { type: 'record'; record: PipelineRecordEvent }
  | { type: 'progress'; progress: PipelineProgress }
  | { type: 'complete'; progress: PipelineProgress }
  | { type: 'error'; message: string }

export interface PipelineStartParams {
  source: 'employees' | 'candidates'
  token: string
  model?: string
  limit?: number
  skip?: number
  year?: number
  activeOnly?: boolean
}

export interface PipelineRetryParams {
  source: 'employees' | 'candidates'
  token: string
  model?: string
}

export interface PipelineRetrySingleParams {
  source: 'employees' | 'candidates'
  token: string
  model?: string
  upstreamId: number
}

let activeController: AbortController | null = null
let pausedOffset = 0

function getModel(model?: string): string {
  if (model) return model
  const { voyage } = getConfig()
  return voyage.defaultModel ?? 'voyage-3-large'
}

function makeProgress(source: string, total: number, processed: number, succeeded: number, failed: number, skipped: number, status: 'processing' | 'paused' | 'completed' = 'processing', currentRecord?: string): PipelineProgress {
  return { source, status, totalRecords: total, processedRecords: processed, succeededCount: succeeded, failedCount: failed, skippedCount: skipped, currentRecord }
}

export const unifiedPipelineOrchestrator = {
  requestPause(): void {
    if (activeController) {
      activeController.abort()
      log.info('Pipeline pause requested')
    }
  },

  async run(
    params: PipelineStartParams,
    emitEvent: (event: PipelineEvent) => void,
  ): Promise<void> {
    activeController = new AbortController()
    const { signal } = activeController
    const { source, token, limit, skip, year } = params
    const model = getModel(params.model)

    log.info('Unified pipeline started', { source, limit, skip, year, model })

    const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
    let totalRecords = 0
    let processedRecords = 0
    let succeededCount = 0
    let failedCount = 0
    let skippedCount = 0
    const pageSize = 100
    let pageOffset = skip ?? pausedOffset
    pausedOffset = 0
    const maxToProcess = limit ?? Infinity
    let processedInRun = 0

    try {
      while (processedInRun < maxToProcess) {
        if (signal.aborted) break

        let pageItems: Array<{ upstreamId: number; fullName: string; email: string; [k: string]: unknown }>
        let pageTotal: number

        if (source === 'employees') {
          const result = await upstreamApiService.getEmployeesPaged(token, pageOffset, Math.min(pageSize, maxToProcess - processedInRun))
          pageTotal = result.totalRecords
          pageItems = result.items.map(e => ({ upstreamId: e.userId, fullName: e.fullName, email: e.email, raw: e }))
        } else {
          const take = Math.min(pageSize, maxToProcess - processedInRun)
          const result = await upstreamApiService.getCandidatesPaged(token, pageOffset, take, year)
          pageTotal = result.totalRecords
          pageItems = result.items.map(c => ({ upstreamId: c.candidateId, fullName: c.fullName, email: c.email ?? '', raw: c }))
        }

        totalRecords = pageTotal
        if (pageItems.length === 0) break

        const batchSize = 5
        for (let batchStart = 0; batchStart < pageItems.length; batchStart += batchSize) {
          if (signal.aborted) break
          const batch = pageItems.slice(batchStart, batchStart + batchSize)

          for (const item of batch) {
            if (signal.aborted) break
            if (processedInRun >= maxToProcess) break

            processedRecords++
            processedInRun++

            emitEvent({ type: 'progress', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'processing', item.fullName) })

            try {
              const syncResult = await syncSingleRecord(source, token, item.upstreamId)

              if ('error' in syncResult) {
                failedCount++
                syncRepository.upsertSyncFailed(table, {
                  upstream_id: item.upstreamId,
                  full_name: item.fullName || 'Unknown',
                  status: 'sync_failed',
                  status_reason: syncResult.error,
                })
                emitEvent({ type: 'record', record: { upstreamId: item.upstreamId, name: item.fullName, outcome: 'failed', failedStep: 'sync', error: syncResult.error } })
                continue
              }

              const { dbId, resumeChanged, syncDetail, hasResume, noteId, filename, isBench, name, seniority, mainSkill } = syncResult

              if (syncDetail === 'unchanged' && !resumeChanged) {
                const existing = source === 'employees'
                  ? syncRepository.findEmployeeByUpstreamId(item.upstreamId)
                  : syncRepository.findCandidateByUpstreamId(item.upstreamId)
                const alreadyVectorized = existing?.status === 'vectorized' || existing?.status === 'extracted'
                if (alreadyVectorized) {
                  skippedCount++
                  emitEvent({ type: 'record', record: { upstreamId: item.upstreamId, name, outcome: 'skipped', seniority, mainSkill } })
                  continue
                }
              }

              if (syncDetail === 'updated' && !resumeChanged) {
                const existing = source === 'employees'
                  ? syncRepository.findEmployeeByUpstreamId(item.upstreamId)
                  : syncRepository.findCandidateByUpstreamId(item.upstreamId)
                if (existing?.status === 'vectorized') {
                  skippedCount++
                  emitEvent({ type: 'record', record: { upstreamId: item.upstreamId, name, outcome: 'skipped', seniority, mainSkill } })
                  continue
                }
              }

              if (!hasResume) {
                failedCount++
                syncRepository.markFailed(table, dbId, 'incomplete', 'No resume available')
                emitEvent({ type: 'record', record: { upstreamId: item.upstreamId, name, outcome: 'failed', failedStep: 'no_resume', error: 'No resume available' } })
                continue
              }

              const extractResult = await extractSingleRecord(source, token, noteId!, filename!, dbId, item.upstreamId, isBench)
              if ('error' in extractResult) {
                failedCount++
                emitEvent({ type: 'record', record: { upstreamId: item.upstreamId, name, outcome: 'failed', failedStep: 'extract', error: extractResult.error } })
                continue
              }

              const vecResult = await vectorizeSingleRecord(source, dbId, item.upstreamId, extractResult.text, isBench, model)
              if ('error' in vecResult) {
                failedCount++
                emitEvent({ type: 'record', record: { upstreamId: item.upstreamId, name, outcome: 'failed', failedStep: 'vectorize', error: vecResult.error } })
                continue
              }

              succeededCount++
              emitEvent({ type: 'record', record: { upstreamId: item.upstreamId, name, outcome: 'vectorized', seniority, mainSkill } })
            } catch (err) {
              failedCount++
              const error = err instanceof Error ? err.message : 'Unknown error'
              log.error('Pipeline record processing failed', err instanceof Error ? err : new Error(error), { source, upstreamId: item.upstreamId })
              emitEvent({ type: 'record', record: { upstreamId: item.upstreamId, name: item.fullName, outcome: 'failed', failedStep: 'sync', error } })
            }

            emitEvent({ type: 'progress', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'processing', item.fullName) })
          }

          if (processedInRun >= maxToProcess) break
        }

        pageOffset += pageItems.length
        if (pageOffset >= totalRecords) break
      }

      matchEngineService.invalidateFilterCache()
      const finalStatus = signal.aborted ? 'paused' as const : 'completed' as const
      if (signal.aborted) {
        pausedOffset = pageOffset
      }
      log.info('Unified pipeline finished', { source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, status: finalStatus })
      emitEvent({ type: 'complete', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, finalStatus) })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        pausedOffset = pageOffset
        emitEvent({ type: 'complete', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'paused') })
        return
      }
      log.error('Unified pipeline failed', err instanceof Error ? err : new Error(String(err)), { source })
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Pipeline failed' })
    } finally {
      activeController = null
    }
  },

  async retryAllFailed(
    params: PipelineRetryParams,
    emitEvent: (event: PipelineEvent) => void,
  ): Promise<void> {
    activeController = new AbortController()
    const { signal } = activeController
    const { source, token } = params
    const model = getModel(params.model)
    const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const

    log.info('Retry all failed started', { source })

    const failedRecords = syncRepository.getFailedRecords(table)
    const totalRecords = failedRecords.length
    let processedRecords = 0
    let succeededCount = 0
    let failedCount = 0
    let skippedCount = 0

    emitEvent({ type: 'progress', progress: makeProgress(source, totalRecords, 0, 0, 0, 0, 'processing') })

    try {
      for (const record of failedRecords) {
        if (signal.aborted) break
        processedRecords++

        try {
          const result = await retrySingleInternal(source, token, model, record)
          if (result.outcome === 'vectorized') succeededCount++
          else if (result.outcome === 'failed') failedCount++
          else skippedCount++
          emitEvent({ type: 'record', record: result })
        } catch (err) {
          failedCount++
          emitEvent({ type: 'record', record: { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'sync', error: err instanceof Error ? err.message : 'Retry failed' } })
        }

        emitEvent({ type: 'progress', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'processing', record.full_name) })
      }

      const finalStatus = signal.aborted ? 'paused' as const : 'completed' as const
      log.info('Retry all failed finished', { source, totalRecords, succeededCount, failedCount })
      emitEvent({ type: 'complete', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, finalStatus) })
    } catch (err) {
      log.error('Retry all failed error', err instanceof Error ? err : new Error(String(err)), { source })
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Retry failed' })
    } finally {
      activeController = null
    }
  },

  async retrySingle(params: PipelineRetrySingleParams): Promise<PipelineRecordEvent> {
    const { source, token, upstreamId } = params
    const model = getModel(params.model)
    const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const

    const records = syncRepository.getFailedRecords(table)
    const record = records.find(r => r.upstream_id === upstreamId)

    if (!record) {
      return { upstreamId, name: 'Unknown', outcome: 'failed', failedStep: 'sync', error: 'Record not found in failed list' }
    }

    return retrySingleInternal(source, token, model, record)
  },
}

async function syncSingleRecord(
  source: 'employees' | 'candidates',
  token: string,
  upstreamId: number,
): Promise<
  | { error: string }
  | {
      dbId: number
      resumeChanged: boolean
      syncDetail: string
      hasResume: boolean
      noteId: number | null
      filename: string | null
      isBench: boolean
      name: string
      seniority: string
      mainSkill: string
    }
> {
  try {
    if (source === 'employees') {
      const dto = await syncEmployeeOrchestrator.syncSingle(token, upstreamId)
      const row = syncRepository.findEmployeeByUpstreamId(upstreamId)
      if (!row) return { error: 'Failed to persist employee record' }
      return {
        dbId: row.id,
        resumeChanged: dto.resumeChanged,
        syncDetail: dto.syncDetail ?? 'new',
        hasResume: row.has_resume === 1,
        noteId: row.resume_note_id,
        filename: row.resume_filename,
        isBench: row.is_bench === 1,
        name: row.full_name,
        seniority: row.seniority,
        mainSkill: row.main_skill,
      }
    } else {
      const dto = await syncCandidateOrchestrator.syncSingle(token, upstreamId)
      const row = syncRepository.findCandidateByUpstreamId(upstreamId)
      if (!row) return { error: 'Failed to persist candidate record' }
      return {
        dbId: row.id,
        resumeChanged: dto.resumeChanged,
        syncDetail: dto.syncDetail ?? 'new',
        hasResume: row.has_resume === 1,
        noteId: row.resume_note_id,
        filename: row.resume_filename,
        isBench: false,
        name: row.full_name,
        seniority: row.seniority ?? '',
        mainSkill: row.main_skill ?? '',
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sync failed' }
  }
}

async function retrySingleInternal(
  source: 'employees' | 'candidates',
  token: string,
  model: string,
  record: { id: number; upstream_id: number; full_name: string; status: string; has_resume: number; resume_note_id: number | null; resume_filename: string | null },
): Promise<PipelineRecordEvent> {
  const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const

  if (record.status === 'sync_failed' || record.status === 'incomplete') {
    const syncResult = await syncSingleRecord(source, token, record.upstream_id)
    if ('error' in syncResult) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'sync', error: syncResult.error }
    }

    if (!syncResult.hasResume) {
      syncRepository.markFailed(table, syncResult.dbId, 'incomplete', 'No resume available')
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'no_resume', error: 'No resume available' }
    }

    const extractResult = await extractSingleRecord(source, token, syncResult.noteId!, syncResult.filename!, syncResult.dbId, record.upstream_id, syncResult.isBench)
    if ('error' in extractResult) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'extract', error: extractResult.error }
    }

    const vecResult = await vectorizeSingleRecord(source, syncResult.dbId, record.upstream_id, extractResult.text, syncResult.isBench, model)
    if ('error' in vecResult) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'vectorize', error: vecResult.error }
    }

    return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'vectorized' }
  }

  if (record.status === 'extract_failed') {
    if (!record.resume_note_id || !record.resume_filename) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'no_resume', error: 'No resume note to extract' }
    }

    const isBench = source === 'employees'
      ? (syncRepository.findEmployeeByUpstreamId(record.upstream_id)?.is_bench === 1)
      : false

    const extractResult = await extractSingleRecord(source, token, record.resume_note_id, record.resume_filename, record.id, record.upstream_id, isBench)
    if ('error' in extractResult) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'extract', error: extractResult.error }
    }

    const vecResult = await vectorizeSingleRecord(source, record.id, record.upstream_id, extractResult.text, isBench, model)
    if ('error' in vecResult) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'vectorize', error: vecResult.error }
    }

    return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'vectorized' }
  }

  if (record.status === 'vectorize_failed') {
    const embedding = embeddingRepository.findBySource(source, record.id)
    if (!embedding?.resume_text) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'extract', error: 'No resume text found for re-vectorization' }
    }

    const isBench = source === 'employees'
      ? (syncRepository.findEmployeeByUpstreamId(record.upstream_id)?.is_bench === 1)
      : false

    const vecResult = await vectorizeSingleRecord(source, record.id, record.upstream_id, embedding.resume_text, isBench, model)
    if ('error' in vecResult) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'vectorize', error: vecResult.error }
    }

    return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'vectorized' }
  }

  return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'sync', error: `Unknown status: ${record.status}` }
}
