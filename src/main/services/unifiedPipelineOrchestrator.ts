import { upstreamApiService } from './upstreamApiService'
import { syncRepository } from '../db/repositories/syncRepository'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { matchEngineService } from './matchEngineService'
import { syncEmployeeOrchestrator } from './sync/syncEmployeeOrchestrator'
import { syncCandidateOrchestrator } from './sync/syncCandidateOrchestrator'
import { extractSingleRecord, vectorizeSingleRecord } from './processingUtils'
import { createLogger } from './logger'
import { getConfig } from '../config'
import { tokenWatchdog, isTokenExpiringSoon } from './tokenWatchdog'

const log = createLogger('UnifiedPipeline')

export interface PipelineRecordEvent {
  upstreamId: number
  name: string
  outcome: 'vectorized' | 'skipped' | 'failed'
  failedStep?: 'sync' | 'extract' | 'vectorize' | 'no_resume'
  error?: string
  seniority?: string
  mainSkill?: string
  jobTitle?: string
  functionalUnit?: string
  businessUnit?: string
  hasResume?: boolean
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
  pauseReason?: 'user' | 'token-expiring' | 'error'
  errorMessage?: string
}

export type PipelineEvent =
  | { type: 'record'; record: PipelineRecordEvent }
  | { type: 'progress'; progress: PipelineProgress }
  | { type: 'complete'; progress: PipelineProgress }
  | { type: 'error'; message: string }

export type PipelineMode = 'full' | 'sync-only'

export interface PipelineStartParams {
  source: 'employees' | 'candidates'
  token: string
  mode?: PipelineMode
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

function savePipelineState(state: {
  source: string; offset: number; totalRecords: number; processedRecords: number
  succeededCount: number; failedCount: number; skippedCount: number
  pauseReason?: string; errorMessage?: string
  succeededRecords: PipelineRecordEvent[]; failedRecords: PipelineRecordEvent[]; skippedRecords: PipelineRecordEvent[]
  year?: number
}): void {
  const persisted = { ...state, status: 'paused' as const, savedAt: new Date().toISOString() }
  syncRepository.saveSyncMetadata(`pipeline-state:${state.source}`, JSON.stringify(persisted))
}

export function clearPipelineState(source: string): void {
  syncRepository.clearSyncMetadata(`pipeline-state:${source}`)
}

export function loadPipelineState(source: string): Record<string, unknown> | null {
  const raw = syncRepository.getSyncMetadata(`pipeline-state:${source}`)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function makeProgress(
  source: string, total: number, processed: number, succeeded: number, failed: number, skipped: number,
  status: 'processing' | 'paused' | 'completed' = 'processing', currentRecord?: string,
  pauseReason?: 'user' | 'token-expiring' | 'error', errorMessage?: string,
): PipelineProgress {
  return { source, status, totalRecords: total, processedRecords: processed, succeededCount: succeeded, failedCount: failed, skippedCount: skipped, currentRecord, pauseReason, errorMessage }
}

type PageItem = { upstreamId: number; fullName: string; email: string; [k: string]: unknown }

async function fetchPage(
  source: 'employees' | 'candidates', token: string, offset: number, take: number,
  year: number | undefined, signal: AbortSignal,
): Promise<{ items: PageItem[]; totalRecords: number }> {
  if (source === 'employees') {
    const result = await upstreamApiService.getEmployeesPaged(token, offset, take, signal)
    return { totalRecords: result.totalRecords, items: result.items.map(e => ({ upstreamId: e.userId, fullName: e.fullName, email: e.email, raw: e })) }
  }
  const result = await upstreamApiService.getCandidatesPaged(token, offset, take, year, signal)
  return { totalRecords: result.totalRecords, items: result.items.map(c => ({ upstreamId: c.candidateId, fullName: c.fullName, email: c.email ?? '', raw: c })) }
}

interface BatchCounters {
  succeededCount: number
  failedCount: number
  skippedCount: number
}

function accountBatchResult(
  result: PromiseSettledResult<PipelineRecordEvent>,
  item: PageItem,
  source: string,
  counters: BatchCounters,
  emitAndAccumulate: (event: PipelineEvent) => void,
): void {
  if (result.status === 'rejected') {
    const reason = result.reason
    if (reason instanceof Error && reason.name === 'AbortError') {
      counters.skippedCount++
      emitAndAccumulate({ type: 'record', record: { upstreamId: item.upstreamId, name: item.fullName, outcome: 'skipped' } })
    } else {
      counters.failedCount++
      const error = reason instanceof Error ? reason.message : 'Unknown error'
      log.error('Pipeline record processing failed', reason instanceof Error ? reason : new Error(error), { source, upstreamId: item.upstreamId })
      emitAndAccumulate({ type: 'record', record: { upstreamId: item.upstreamId, name: item.fullName, outcome: 'failed', failedStep: 'sync', error } })
    }
  } else {
    const record = result.value
    if (record.outcome === 'vectorized') counters.succeededCount++
    else if (record.outcome === 'failed') counters.failedCount++
    else counters.skippedCount++
    emitAndAccumulate({ type: 'record', record })
  }
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
    const { source, token, limit, skip, year, mode = 'full' } = params
    const model = getModel(params.model)
    const pipelineLabel = `unified-${source}`

    tokenWatchdog.updateToken(token)
    tokenWatchdog.register(pipelineLabel, () => activeController?.abort())

    log.info('Unified pipeline started', { source, mode, limit, skip, year, model })

    let benchUpstreamIds: Set<number> | undefined
    if (source === 'employees') {
      try {
        benchUpstreamIds = await upstreamApiService.getBenchEmployeeIds(token, signal)
        log.info('Loaded bench IDs for pipeline', { count: benchUpstreamIds.size })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err
        log.warn('Failed to load bench IDs — using composition-only detection')
      }
    }

    const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
    syncRepository.reconcileStatuses(source)
    let totalRecords = 0
    const resumeFrom = skip ?? pausedOffset
    pausedOffset = 0
    let processedRecords = resumeFrom
    let succeededCount = 0
    let failedCount = 0
    let skippedCount = 0
    const accSucceeded: PipelineRecordEvent[] = []
    const accFailed: PipelineRecordEvent[] = []
    const accSkipped: PipelineRecordEvent[] = []
    const pageSize = 100
    let pageOffset = resumeFrom
    const maxToProcess = limit ?? Infinity
    let processedInRun = 0
    const seenUpstreamIds = new Set<number>()

    const emitAndAccumulate = (event: PipelineEvent): void => {
      if (event.type === 'record') {
        const r = event.record
        if (r.outcome === 'vectorized') accSucceeded.push(r)
        else if (r.outcome === 'failed') accFailed.push(r)
        else if (r.outcome === 'skipped') accSkipped.push(r)
      }
      emitEvent(event)
    }

    try {
      while (processedInRun < maxToProcess) {
        if (signal.aborted) break

        const page = await fetchPage(source, token, pageOffset, Math.min(pageSize, maxToProcess - processedInRun), year, signal)
        const pageItems = page.items
        totalRecords = page.totalRecords
        if (pageItems.length === 0) break

        const batchSize = mode === 'sync-only' ? 12 : 8
        for (let batchStart = 0; batchStart < pageItems.length; batchStart += batchSize) {
          if (signal.aborted) break
          const remaining = maxToProcess - processedInRun
          const batch = pageItems.slice(batchStart, batchStart + Math.min(batchSize, remaining))
          if (batch.length === 0) break

          const batchResults = await Promise.allSettled(
            batch.map(item => processOneRecord(source, token, model, table, item, mode, signal, benchUpstreamIds))
          )

          const counters: BatchCounters = { succeededCount, failedCount, skippedCount }
          for (let i = 0; i < batchResults.length; i++) {
            processedRecords++
            processedInRun++
            seenUpstreamIds.add(batch[i].upstreamId)
            accountBatchResult(batchResults[i], batch[i], source, counters, emitAndAccumulate)
          }
          succeededCount = counters.succeededCount
          failedCount = counters.failedCount
          skippedCount = counters.skippedCount

          emitEvent({ type: 'progress', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'processing', batch[batch.length - 1]?.fullName) })

          if (processedInRun >= maxToProcess) break
        }

        pageOffset += pageItems.length
        if (pageOffset >= totalRecords) break
      }

      if (!signal.aborted && source === 'employees') {
        const staleCount = syncRepository.markStaleEmployees(seenUpstreamIds)
        if (staleCount > 0) {
          log.info('Marked stale employees as inactive', { staleCount })
        }
      }

      matchEngineService.invalidateFilterCache()
      syncRepository.reconcileStatuses(source)
      const finalStatus = signal.aborted ? 'paused' as const : 'completed' as const
      if (signal.aborted) {
        pausedOffset = pageOffset
      }
      const pauseReason = signal.aborted ? (isTokenExpiringSoon() ? 'token-expiring' as const : 'user' as const) : undefined
      log.info('Unified pipeline finished', { source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, status: finalStatus })
      if (finalStatus === 'paused') {
        savePipelineState({ source, offset: pageOffset, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, pauseReason, succeededRecords: accSucceeded, failedRecords: accFailed, skippedRecords: accSkipped, year })
      } else {
        clearPipelineState(source)
      }
      emitEvent({ type: 'complete', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, finalStatus, undefined, pauseReason) })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        pausedOffset = pageOffset
        const reason = isTokenExpiringSoon() ? 'token-expiring' as const : 'user' as const
        savePipelineState({ source, offset: pageOffset, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, pauseReason: reason, succeededRecords: accSucceeded, failedRecords: accFailed, skippedRecords: accSkipped, year })
        emitEvent({ type: 'complete', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'paused', undefined, reason) })
        return
      }
      log.error('Unified pipeline failed', err instanceof Error ? err : new Error(String(err)), { source })
      pausedOffset = pageOffset
      const errMsg = err instanceof Error ? err.message : 'Pipeline failed'
      savePipelineState({ source, offset: pageOffset, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, pauseReason: 'error', errorMessage: errMsg, succeededRecords: accSucceeded, failedRecords: accFailed, skippedRecords: accSkipped, year })
      emitEvent({ type: 'error', message: errMsg })
      emitEvent({ type: 'complete', progress: makeProgress(source, totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'paused', undefined, 'error', errMsg) })
    } finally {
      tokenWatchdog.unregister(pipelineLabel)
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
    syncRepository.reconcileStatuses(source)

    const failedRecords = syncRepository.getRetryableRecords(table)
    const totalRecords = failedRecords.length
    let processedRecords = 0
    let succeededCount = 0
    let failedCount = 0
    let skippedCount = 0

    emitEvent({ type: 'progress', progress: makeProgress(source, totalRecords, 0, 0, 0, 0, 'processing') })

    try {
      for (let i = 0; i < failedRecords.length; i++) {
        if (signal.aborted) break
        const record = failedRecords[i]
        processedRecords++

        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
          if (signal.aborted) break
        }

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

    const records = syncRepository.getRetryableRecords(table)
    const record = records.find(r => r.upstream_id === upstreamId)

    if (!record) {
      return { upstreamId, name: 'Unknown', outcome: 'failed', failedStep: 'sync', error: 'Record not found in retryable list' }
    }

    return retrySingleInternal(source, token, model, record)
  },
}

async function processOneRecord(
  source: 'employees' | 'candidates',
  token: string,
  model: string,
  table: 'synced_employees' | 'synced_candidates',
  item: { upstreamId: number; fullName: string; email: string },
  mode: PipelineMode = 'full',
  signal?: AbortSignal,
  benchUpstreamIds?: Set<number>,
): Promise<PipelineRecordEvent> {
  const syncResult = await syncSingleRecord(source, token, item.upstreamId, signal, benchUpstreamIds)

  if ('error' in syncResult) {
    syncRepository.upsertSyncFailed(table, {
      upstream_id: item.upstreamId,
      full_name: item.fullName || 'Unknown',
      status: 'sync_failed',
      status_reason: syncResult.error,
    })
    return { upstreamId: item.upstreamId, name: item.fullName, outcome: 'failed', failedStep: 'sync', error: syncResult.error }
  }

  const { dbId, resumeChanged, syncDetail, hasResume, noteId, filename, isBench, name, seniority, mainSkill, jobTitle, functionalUnit, businessUnit } = syncResult
  const extraFields = { seniority, mainSkill, jobTitle, functionalUnit, businessUnit, hasResume }

  if (mode === 'sync-only') {
    return { upstreamId: item.upstreamId, name, outcome: 'skipped', ...extraFields }
  }

  if (syncDetail === 'unchanged' && !resumeChanged) {
    const existing = source === 'employees'
      ? syncRepository.findEmployeeByUpstreamId(item.upstreamId)
      : syncRepository.findCandidateByUpstreamId(item.upstreamId)
    const alreadyVectorized = existing?.status === 'vectorized' || existing?.status === 'extracted'
    if (alreadyVectorized) {
      return { upstreamId: item.upstreamId, name, outcome: 'skipped', ...extraFields }
    }
  }

  if (syncDetail === 'updated' && !resumeChanged) {
    const existing = source === 'employees'
      ? syncRepository.findEmployeeByUpstreamId(item.upstreamId)
      : syncRepository.findCandidateByUpstreamId(item.upstreamId)
    if (existing?.status === 'vectorized') {
      return { upstreamId: item.upstreamId, name, outcome: 'skipped', ...extraFields }
    }
  }

  if (!hasResume) {
    syncRepository.markFailed(table, dbId, 'incomplete', 'No resume available')
    return { upstreamId: item.upstreamId, name, outcome: 'failed', failedStep: 'no_resume', error: 'No resume available', ...extraFields }
  }

  const extractResult = await extractSingleRecord(source, token, noteId!, filename!, dbId, item.upstreamId, isBench, signal)
  if ('error' in extractResult) {
    return { upstreamId: item.upstreamId, name, outcome: 'failed', failedStep: 'extract', error: extractResult.error, ...extraFields }
  }

  const vecResult = await vectorizeSingleRecord(source, dbId, item.upstreamId, extractResult.text, isBench, model, signal)
  if ('error' in vecResult) {
    return { upstreamId: item.upstreamId, name, outcome: 'failed', failedStep: 'vectorize', error: vecResult.error, ...extraFields }
  }

  return { upstreamId: item.upstreamId, name, outcome: 'vectorized', ...extraFields }
}

async function syncSingleRecord(
  source: 'employees' | 'candidates',
  token: string,
  upstreamId: number,
  signal?: AbortSignal,
  benchUpstreamIds?: Set<number>,
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
      jobTitle: string
      functionalUnit: string
      businessUnit: string
    }
> {
  try {
    if (source === 'employees') {
      const dto = await syncEmployeeOrchestrator.syncSingle(token, upstreamId, signal, benchUpstreamIds)
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
        jobTitle: row.job_title,
        functionalUnit: row.functional_unit,
        businessUnit: row.business_unit,
      }
    } else {
      const dto = await syncCandidateOrchestrator.syncSingle(token, upstreamId, signal)
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
        jobTitle: '',
        functionalUnit: '',
        businessUnit: '',
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err
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

  if (record.status === 'extracted' || record.status === 'vectorize_failed') {
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
