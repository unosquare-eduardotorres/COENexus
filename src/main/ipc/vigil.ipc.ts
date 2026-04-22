import { BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  VigilActivityEvent,
  VigilActivityLog,
  VigilCancelRunParams,
  VigilGetActivityLogParams,
  VigilListRunsParams,
  VigilResponse,
  VigilRun,
  VigilRunParams,
  VigilStatusEvent,
  VigilSyncSourceParams,
  VigilToolsDryRunParams,
  VigilUpdateConfigParams,
} from '../../shared/ipc-types'
import { vigilRepository } from '../db/agents/repositories/vigilRepository'
import type { VigilRunRow, VigilActivityLogRow } from '../db/agents/repositories/vigilRepository'
import { vigilExecutor } from '../services/vigilExecutor'
import { toVigilActivityEvent } from '../services/vigilEventMapper'
import { createLogger } from '../services/logger'
import { setVigilToken } from '../services/vigilTokenStore'
import { registerIpcHandler } from './registerIpcHandler'
import { validateSender } from './validate'

const log = createLogger('VigilIPC')

function ok<T>(data: T): VigilResponse<T> {
  return { success: true, data }
}

function fail<T>(message: string): VigilResponse<T> {
  return { success: false, error: message }
}

function emitActivityEvent(event: IpcMainInvokeEvent, payload: VigilActivityEvent): void {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.VIGIL_ACTIVITY_EVENT, payload)
  }
}

function emitStatusEvent(event: IpcMainInvokeEvent, payload: VigilStatusEvent): void {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.VIGIL_STATUS_EVENT, payload)
  }
}

function mapRunRow(row: VigilRunRow): VigilRun {
  return {
    id: row.id,
    trigger_type: row.trigger_type,
    status: row.status,
    sources_json: row.sources_json,
    results_json: row.results_json,
    started_at: row.started_at,
    completed_at: row.completed_at,
    token_hash: row.token_hash,
  }
}

function mapActivityRow(row: VigilActivityLogRow): VigilActivityLog {
  return {
    id: row.id,
    run_id: row.run_id,
    event_type: row.event_type,
    source: row.source,
    severity: row.severity,
    message: row.message,
    details_json: row.details_json,
    created_at: row.created_at,
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

export function registerVigilHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.VIGIL_RUN, async (event: IpcMainInvokeEvent, params: VigilRunParams) => {
    validateSender(event)
    try {
      setVigilToken(params.token)
      const sources = params.sources ?? ['employees', 'candidates', 'open-positions', 'project-reallocations']
      const config = vigilRepository.getConfig()
      const mergedOptions = {
        ...(params.options ?? {}),
        activeOnly: config.active_positions_only === 1,
      }

      const runPromise = vigilExecutor.run({
        token: params.token,
        triggerType: 'manual',
        sources,
        options: mergedOptions,
        emitEvent: (syncEvent) => {
          emitActivityEvent(event, toVigilActivityEvent(syncEvent))
        },
        event,
      })

      const executorStatus = vigilExecutor.getStatus()
      const activeRun = executorStatus.run_id
        ? vigilRepository.getRunById(executorStatus.run_id)
        : null

      runPromise.then((completedRun) => {
        emitStatusEvent(event, { status: completedRun.status, run_id: completedRun.id, timestamp: nowIso() })
      }).catch((err) => {
        emitStatusEvent(event, { status: 'failed', run_id: null, timestamp: nowIso() })
        log.error('Vigil run failed', err instanceof Error ? err : new Error(String(err)))
      })

      emitStatusEvent(event, { status: 'running', run_id: activeRun?.id ?? null, timestamp: nowIso() })
      return ok(mapRunRow(activeRun ?? vigilRepository.listRuns({ limit: 1 })[0]))
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to run Vigil')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_CANCEL_RUN, async (event: IpcMainInvokeEvent, params: VigilCancelRunParams) => {
    validateSender(event)
    try {
      const canceled = vigilExecutor.cancel(params.run_id)
      emitStatusEvent(event, { status: 'idle', run_id: null, timestamp: nowIso() })
      return ok({ canceled })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to cancel Vigil run')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_GET_STATUS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      const executorStatus = vigilExecutor.getStatus()
      const activeRun = executorStatus.run_id
        ? vigilRepository.getRunById(executorStatus.run_id) ?? null
        : null
      return ok({ active_run: activeRun ? mapRunRow(activeRun) : null })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get Vigil status')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_LIST_RUNS, async (event: IpcMainInvokeEvent, params: VigilListRunsParams | void) => {
    validateSender(event)
    try {
      const rows = vigilRepository.listRuns({
        status: params?.status,
        limit: params?.limit,
        offset: params?.offset,
      })
      return ok(rows.map(mapRunRow))
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list Vigil runs')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_GET_RUN, async (event: IpcMainInvokeEvent, runId: string) => {
    validateSender(event)
    try {
      const row = vigilRepository.getRunById(runId)
      return ok(row ? mapRunRow(row) : null)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get Vigil run')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_GET_ACTIVITY_LOG, async (event: IpcMainInvokeEvent, params: VigilGetActivityLogParams | void) => {
    validateSender(event)
    try {
      const rows = vigilRepository.listActivityLog({
        run_id: params?.run_id,
        source: params?.source,
        severity: params?.severity,
        limit: params?.limit,
        offset: params?.offset,
      })
      return ok(rows.map(mapActivityRow))
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list Vigil activity log')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_CLEAR_ACTIVITY_LOG, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      vigilRepository.clearActivityLog()
      return ok({ cleared: true })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to clear Vigil activity log')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_GET_CONFIG, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(vigilRepository.getConfig())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get Vigil config')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_UPDATE_CONFIG, async (event: IpcMainInvokeEvent, params: VigilUpdateConfigParams) => {
    validateSender(event)
    try {
      return ok(vigilRepository.updateConfig(params))
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to update Vigil config')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_TOOLS_DRY_RUN, async (event: IpcMainInvokeEvent, params: VigilToolsDryRunParams) => {
    validateSender(event)
    try {
      return ok({ input: params.input, dryRun: true })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to run Vigil tools dry run')
    }
  })

  registerIpcHandler(IPC_CHANNELS.VIGIL_SYNC_SOURCE, async (event: IpcMainInvokeEvent, params: VigilSyncSourceParams) => {
    validateSender(event)
    try {
      setVigilToken(params.token)
      await vigilExecutor.syncSource(params.source, params.token, params.options ?? {}, (syncEvent) => {
        emitActivityEvent(event, toVigilActivityEvent(syncEvent))
      })
      return ok({ started: true })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to sync source')
    }
  })

  log.info('Registered Vigil IPC handlers')
}
