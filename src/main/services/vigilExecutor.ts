import { createHash } from 'crypto'
import { vigilRepository, type VigilRunRow } from '../db/agents/repositories/vigilRepository'
import { syncOrchestrator, type SyncEvent, type SyncOptions } from './syncOrchestrator'
import { createLogger } from './logger'
import type { VigilSource, VigilRunStatus, VigilRunTriggerType } from '../../shared/ipc-types'

const log = createLogger('VigilExecutor')

const DEFAULT_SOURCES: VigilSource[] = ['employees', 'candidates', 'open-positions', 'project-reallocations']

interface SourceRunResult {
  source: VigilSource
  success: boolean
  attempts: number
  errors: string[]
}

export interface VigilExecutorRunParams {
  token: string
  triggerType?: VigilRunTriggerType
  sources?: VigilSource[]
  options?: SyncOptions
  emitEvent?: (event: SyncEvent) => void
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

    vigilRepository.createActivityLog({
      run_id: run.id,
      event_type: 'run_started',
      source: 'system',
      severity: 'info',
      message: `Vigil run started (${triggerType})`,
      details_json: JSON.stringify({ sources, options }),
    })

    const results: SourceRunResult[] = []

    try {
      for (const source of sources) {
        const sourceResult = await this.runSourceWithRetry(run.id, source, token, options, params.emitEvent)
        results.push(sourceResult)
      }

      const failed = results.some(result => !result.success)
      const status: VigilRunStatus = failed ? 'failed' : 'completed'
      const completedAt = new Date().toISOString()

      vigilRepository.updateRun(run.id, {
        status,
        completed_at: completedAt,
        results_json: JSON.stringify({
          sources: results,
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

      return vigilRepository.getRunById(run.id) ?? run
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const completedAt = new Date().toISOString()

      vigilRepository.updateRun(run.id, {
        status: 'failed',
        completed_at: completedAt,
        results_json: JSON.stringify({
          sources: results,
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
    }
  }
}

export const vigilExecutor = new VigilExecutor()
