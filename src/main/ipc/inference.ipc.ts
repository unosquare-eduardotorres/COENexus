import { BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  InferenceCancelParams,
  InferenceJob,
  InferenceListJobsParams,
  InferenceListPatternsParams,
  InferenceListProfilesParams,
  InferenceGetProfileParams,
  InferenceResponse,
  InferenceRunParams,
  InferenceStatusEvent,
} from '../../shared/ipc-types'
import { jobRepository, type AgentJobRow } from '../db/agents/repositories/jobRepository'
import { patternRepository } from '../db/agents/repositories/patternRepository'
import { stakeholderProfileRepository } from '../db/agents/repositories/stakeholderProfileRepository'
import { inferenceScheduler } from '../services/inferenceScheduler'
import { getDatabase } from '../db/connection'
import { createLogger } from '../services/logger'
import { registerIpcHandler } from './registerIpcHandler'
import { validateSender } from './validate'

const log = createLogger('InferenceIPC')

function ok<T>(data: T): InferenceResponse<T> {
  return { success: true, data }
}

function fail<T>(message: string): InferenceResponse<T> {
  return { success: false, error: message }
}

function emitStatusEvent(event: IpcMainInvokeEvent, payload: InferenceStatusEvent): void {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.INFERENCE_STATUS_EVENT, payload)
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function mapJobRow(row: AgentJobRow): InferenceJob {
  return {
    id: row.id,
    status: row.status,
    scope_type: row.scope_type as 'account' | 'stakeholder',
    scope_value: row.scope_value,
    initiated_by: row.initiated_by,
    run_reason: row.run_reason,
    pipeline_phase: row.pipeline_phase,
    started_at: row.started_at,
    completed_at: row.completed_at,
    error_message: row.error_message,
    metadata_json: row.metadata_json,
    created_at: row.created_at,
  }
}

export function registerInferenceHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.INFERENCE_RUN, async (event: IpcMainInvokeEvent, params: InferenceRunParams) => {
    validateSender(event)
    try {
      const runPromise = inferenceScheduler.trigger({
        scope: params.scope,
        account: params.account,
        stakeholder: params.stakeholder,
        event,
      })

      const status = inferenceScheduler.getStatus()
      emitStatusEvent(event, { status: 'running', job_id: status.job_id, timestamp: nowIso() })

      runPromise.then((completedJob) => {
        emitStatusEvent(event, {
          status: completedJob.status === 'completed' ? 'completed' : 'failed',
          job_id: completedJob.id,
          timestamp: nowIso(),
        })
      }).catch((err) => {
        emitStatusEvent(event, { status: 'failed', job_id: null, timestamp: nowIso() })
        log.error('Inference run failed', err instanceof Error ? err : new Error(String(err)))
      })

      const jobs = jobRepository.listByAgentType('inference', 1)
      const latestJob = jobs[0]
      return ok(latestJob ? mapJobRow(latestJob) : { id: '', status: 'running' as const, scope_type: params.scope, scope_value: params.account, initiated_by: 'user', run_reason: '', pipeline_phase: 'aggregating', started_at: nowIso(), completed_at: null, error_message: null, metadata_json: '{}', created_at: nowIso() })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to run inference')
    }
  })

  registerIpcHandler(IPC_CHANNELS.INFERENCE_CANCEL, async (event: IpcMainInvokeEvent, params: InferenceCancelParams) => {
    validateSender(event)
    try {
      const canceled = inferenceScheduler.cancel(params.job_id)
      emitStatusEvent(event, { status: 'idle', job_id: null, timestamp: nowIso() })
      return ok({ canceled })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to cancel inference')
    }
  })

  registerIpcHandler(IPC_CHANNELS.INFERENCE_GET_STATUS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(inferenceScheduler.getStatus())
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get inference status')
    }
  })

  registerIpcHandler(IPC_CHANNELS.INFERENCE_LIST_JOBS, async (event: IpcMainInvokeEvent, params: InferenceListJobsParams | void) => {
    validateSender(event)
    try {
      const rows = jobRepository.listByAgentType('inference', params?.limit ?? 50, params?.offset ?? 0)
      return ok(rows.map(mapJobRow))
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list inference jobs')
    }
  })

  registerIpcHandler(IPC_CHANNELS.INFERENCE_GET_JOB, async (event: IpcMainInvokeEvent, jobId: string) => {
    validateSender(event)
    try {
      const row = jobRepository.getById(jobId)
      return ok(row ? mapJobRow(row) : null)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get inference job')
    }
  })

  registerIpcHandler(IPC_CHANNELS.INFERENCE_LIST_PATTERNS, async (event: IpcMainInvokeEvent, params: InferenceListPatternsParams | void) => {
    validateSender(event)
    try {
      let rows
      if (params?.account) {
        rows = patternRepository.listPatternsByAccount(params.account)
      } else if (params?.approval_status) {
        rows = patternRepository.listPatternsByApprovalStatus(params.approval_status)
      } else {
        rows = patternRepository.listPatternsBySourceAgent('inference')
      }
      return ok(rows)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list inference patterns')
    }
  })

  registerIpcHandler(IPC_CHANNELS.INFERENCE_LIST_PROFILES, async (event: IpcMainInvokeEvent, params: InferenceListProfilesParams | void) => {
    validateSender(event)
    try {
      const rows = params?.account
        ? stakeholderProfileRepository.listByAccount(params.account)
        : stakeholderProfileRepository.listAll()
      return ok(rows)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list stakeholder profiles')
    }
  })

  registerIpcHandler(IPC_CHANNELS.INFERENCE_GET_PROFILE, async (event: IpcMainInvokeEvent, params: InferenceGetProfileParams) => {
    validateSender(event)
    try {
      const row = stakeholderProfileRepository.getByStakeholderAndAccount(params.stakeholder, params.account)
      return ok(row ?? null)
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get stakeholder profile')
    }
  })

  registerIpcHandler(IPC_CHANNELS.INFERENCE_GET_ACCOUNTS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      const nexusDb = getDatabase()
      const rows = nexusDb.prepare(
        "SELECT DISTINCT account FROM synced_open_positions WHERE account != '' ORDER BY account"
      ).all() as { account: string }[]
      return ok(rows.map(r => r.account))
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to get accounts')
    }
  })

  log.info('Registered Inference IPC handlers')
}
