import { createHash } from 'crypto'
import type { IpcMainInvokeEvent } from 'electron'
import { vigilRepository, type VigilRunRow } from '../db/agents/repositories/vigilRepository'
import { syncOrchestrator, type SyncEvent, type SyncOptions } from './syncOrchestrator'
import { createStepEmitter } from './agentStepEmitter'
import { createLogger } from './logger'
import type { VigilSource, VigilRunStatus, VigilRunTriggerType } from '../../shared/ipc-types'

const log = createLogger('VigilExecutor')

const DEFAULT_SOURCES: VigilSource[] = ['employees', 'candidates', 'open-positions', 'project-reallocations']
const MAX_FAILED_RECORDS = 500

interface FailedRecord {
  source: string
  name: string
  upstreamId: number
  reason: string
  timestamp: string
}

interface SourceRunResult {
  source: VigilSource
  success: boolean
  attempts: number
  errors: string[]
  progress?: {
    totalRecords: number
    fetchedRecords: number
    syncedCount: number
    updatedCount: number
    unchangedCount: number
    incompleteCount: number
    notProcessedCount: number
    skippedCount: number
    status: string
  }
}

export interface VigilExecutorRunParams {
  token: string
  triggerType?: VigilRunTriggerType
  sources?: VigilSource[]
  options?: SyncOptions
  emitEvent?: (event: SyncEvent) => void
  event?: IpcMainInvokeEvent
}

export interface VigilExecutorStatus {
  status: VigilRunStatus | 'idle'
  run_id: string | null
  timestamp: string
}

class VigilExecutor {
  private activeRunId: string | null = null

  async run(params: VigilExecutorRunParams): Promise<VigilRunRow> {
    const token = params.token?.trim()
    if (!token) {
      throw new Error('Token is required')
    }

    if (this.activeRunId) {
      throw new Error('Vigil run already in progress')
    }

    const sources = (params.sources && params.sources.length > 0 ? params.sources : DEFAULT_SOURCES).filter(Boolean)
    const options = params.options ?? {}
    const triggerType = params.triggerType ?? 'manual'
    const tokenHash = createHash('sha256').update(token).digest('hex')

    const run = vigilRepository.createRun({
      trigger_type: triggerType,
      status: 'running',
      sources_json: JSON.stringify(sources),
      results_json: null,
      started_at: new Date().toISOString(),
      completed_at: null,
      token_hash: tokenHash,
    })

    this.activeRunId = run.id

    const emitter = params.event
      ? createStepEmitter({ agentId: 'vigil', runId: run.id, event: params.event })
      : null

    vigilRepository.createActivityLog({
      run_id: run.id,
      event_type: 'run_started',
      source: 'system',
      severity: 'info',
      message: `Vigil run started (${triggerType})`,
      details_json: JSON.stringify({ sources, options }),
    })

    const results: SourceRunResult[] = []
    const failedRecords: FailedRecord[] = []

    const wrappedEmitEvent = params.emitEvent
      ? (event: SyncEvent) => {
          if (
            event.type === 'record' &&
            event.record.status === 'sync_failed' &&
            failedRecords.length < MAX_FAILED_RECORDS
          ) {
            failedRecords.push({
              source: event.record.source,
              name: event.record.name,
              upstreamId: event.record.upstreamId,
              reason: event.record.reason ?? 'Unknown error',
              timestamp: event.record.syncedAt,
            })
          }
          params.emitEvent!(event)
        }
      : undefined

    try {
      await emitter?.narrate(
        'Starting Vigil sync run',
        'Starting Vigil sync - I will process each source now.',
        'thinking',
        { sources }
      )

      for (const [index, source] of sources.entries()) {
        await emitter?.narrate(
          `Syncing source ${source}`,
          `Working on ${source} (${index + 1}/${sources.length}).`,
          'running',
          { source, index: index + 1, total: sources.length }
        )

        const sourceResult = await this.runSourceWithRetry(run.id, source, token, options, wrappedEmitEvent)
        results.push(sourceResult)

        await emitter?.narrate(
          `Finished source ${source}`,
          sourceResult.success
            ? `${source} synced successfully.`
            : `${source} sync finished with issues.`,
          sourceResult.success ? 'running' : 'error',
          { source, success: sourceResult.success, attempts: sourceResult.attempts }
        )
      }

      const failed = results.some(result => !result.success)
      const status: VigilRunStatus = failed ? 'failed' : 'completed'
      const completedAt = new Date().toISOString()

      vigilRepository.updateRun(run.id, {
        status,
        completed_at: completedAt,
        results_json: JSON.stringify({
          sources: results,
          failedRecords,
          options,
          trigger_type: triggerType,
        }),
      })

      vigilRepository.createActivityLog({
        run_id: run.id,
        event_type: failed ? 'run_failed' : 'run_completed',
        source: 'system',
        severity: failed ? 'error' : 'info',
        message: failed ? 'Vigil run finished with failures' : 'Vigil run completed',
        details_json: JSON.stringify({ results }),
        created_at: completedAt,
      })

      await emitter?.narrate(
        failed ? 'Vigil sync completed with failures' : 'Vigil sync completed successfully',
        failed ? 'Run finished with some failures.' : 'All sources synced successfully.',
        failed ? 'error' : 'done',
        { failed, results }
      )

      return vigilRepository.getRunById(run.id) ?? run
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const completedAt = new Date().toISOString()

      vigilRepository.updateRun(run.id, {
        status: 'failed',
        completed_at: completedAt,
        results_json: JSON.stringify({
          sources: results,
          failedRecords,
          error: message,
          options,
          trigger_type: triggerType,
        }),
      })

      vigilRepository.createActivityLog({
        run_id: run.id,
        event_type: 'run_failed',
        source: 'system',
        severity: 'error',
        message,
        details_json: JSON.stringify({ sources: results }),
        created_at: completedAt,
      })

      await emitter?.narrate('Vigil sync failed', 'Run failed before completion.', 'error', {
        error: message,
      })

      throw error
    } finally {
      this.activeRunId = null
    }
  }

  async syncSource(
    source: VigilSource,
    token: string,
    options: SyncOptions = {},
    emitEvent?: (event: SyncEvent) => void
  ): Promise<{ started: boolean }> {
    await this.runSourceWithRetry(null, source, token, options, emitEvent)
    return { started: true }
  }

  cancel(runId?: string): boolean {
    const targetRunId = runId ?? this.activeRunId
    if (!targetRunId) return false

    syncOrchestrator.requestPause()

    const now = new Date().toISOString()
    vigilRepository.updateRun(targetRunId, {
      status: 'canceled',
      completed_at: now,
    })

    vigilRepository.createActivityLog({
      run_id: targetRunId,
      event_type: 'system',
      source: 'system',
      severity: 'warning',
      message: 'Vigil run canceled',
      created_at: now,
    })

    this.activeRunId = null
    return true
  }

  getStatus(): VigilExecutorStatus {
    const active = vigilRepository.getActiveRun()
    if (active) {
      return {
        status: active.status,
        run_id: active.id,
        timestamp: new Date().toISOString(),
      }
    }

    return {
      status: 'idle',
      run_id: null,
      timestamp: new Date().toISOString(),
    }
  }

  private async runSourceWithRetry(
    runId: string | null,
    source: VigilSource,
    token: string,
    options: SyncOptions,
    emitEvent?: (event: SyncEvent) => void
  ): Promise<SourceRunResult> {
    const errors: string[] = []
    let lastProgress: SourceRunResult['progress'] | undefined

    for (let attempt = 1; attempt <= 2; attempt++) {
      let failed = false
      let failureMessage = ''

      vigilRepository.createActivityLog({
        run_id: runId,
        event_type: 'run_progress',
        source,
        severity: 'info',
        message: attempt === 1 ? `Starting sync for ${source}` : `Retrying sync for ${source}`,
        details_json: JSON.stringify({ attempt, options }),
      })

      await syncOrchestrator.syncAsync(source, token, options, (event) => {
        if (event.type === 'error') {
          failed = true
          failureMessage = event.message
        }

        if (event.type === 'complete') {
          lastProgress = {
            totalRecords: event.progress.totalRecords,
            fetchedRecords: event.progress.fetchedRecords,
            syncedCount: event.progress.syncedCount,
            updatedCount: event.progress.updatedCount,
            unchangedCount: event.progress.unchangedCount,
            incompleteCount: event.progress.incompleteCount,
            notProcessedCount: event.progress.notProcessedCount,
            skippedCount: event.progress.skippedCount,
            status: event.progress.status,
          }
        }

        if (emitEvent) {
          emitEvent(event)
        }
      })

      if (!failed) {
        vigilRepository.createActivityLog({
          run_id: runId,
          event_type: 'run_progress',
          source,
          severity: 'info',
          message: `Sync completed for ${source}`,
          details_json: JSON.stringify({ attempt }),
        })

        return {
          source,
          success: true,
          attempts: attempt,
          errors,
          progress: lastProgress,
        }
      }

      const message = failureMessage || `Sync failed for ${source} on attempt ${attempt}`
      errors.push(message)

      vigilRepository.createActivityLog({
        run_id: runId,
        event_type: attempt === 2 ? 'run_failed' : 'run_progress',
        source,
        severity: attempt === 2 ? 'error' : 'warning',
        message,
        details_json: JSON.stringify({ attempt }),
      })

      log.warn('Vigil source sync failed', { source, attempt, message })
    }

    return {
      source,
      success: false,
      attempts: 2,
      errors,
      progress: lastProgress,
    }
  }
}

export const vigilExecutor = new VigilExecutor()
