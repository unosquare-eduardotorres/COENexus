import { BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  BraniacApprovePatternParams,
  BraniacCancelParams,
  BraniacJob,
  BraniacListJobsParams,
  BraniacListPatternsParams,
  BraniacListProfilesParams,
  BraniacGetProfileParams,
  BraniacRejectPatternParams,
  BraniacResponse,
  BraniacRunParams,
  BraniacStatusEvent,
  BraniacUpdatePatternParams,
} from '../../shared/ipc-types'
import { jobRepository, type AgentJobRow } from '../db/agents/repositories/jobRepository'
import { patternRepository } from '../db/agents/repositories/patternRepository'
import { stakeholderProfileRepository } from '../db/agents/repositories/stakeholderProfileRepository'
import { braniacScheduler } from '../services/braniacScheduler'
import { getDatabase } from '../db/connection'
import { createLogger } from '../services/logger'
import { registerIpcHandler } from './registerIpcHandler'
import { validateSender } from './validate'

const log = createLogger('BraniacIPC')

function ok<T>(data: T): BraniacResponse<T> {
  return { success: true, data }
}

function fail<T>(message: string): BraniacResponse<T> {
  return { success: false, error: message }
}

function emitStatusEvent(event: IpcMainInvokeEvent, payload: BraniacStatusEvent): void {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.webContents.send(IPC_CHANNELS.BRANIAC_STATUS_EVENT, payload)
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function mapJobRow(row: AgentJobRow): BraniacJob {
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

export function registerBraniacHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.BRANIAC_RUN, async (event: IpcMainInvokeEvent, params: BraniacRunParams) => {
    validateSender(event)
    try {
      const runPromise = braniacScheduler.trigger({
        scope: params.scope,
        account: params.account,
        stakeholder: params.stakeholder,
        event,
      })

      const status = braniacScheduler.getStatus()
      emitStatusEvent(event, { status: 'running', job_id: status.job_id, timestamp: nowIso() })

      runPromise.then((completedJob) => {
        emitStatusEvent(event, {
          status: completedJob.status === 'completed' ? 'completed' : 'failed',
          job_id: completedJob.id,
          timestamp: nowIso(),
        })
      }).catch((err) => {
        emitStatusEvent(event, { status: 'failed', job_id: null, timestamp: nowIso() })
        log.error('Braniac run async failed', err instanceof Error ? err : new Error(String(err)))
      })

      const jobs = jobRepository.listByAgentType('braniac', 1)
      const latestJob = jobs[0]
      return ok(latestJob ? mapJobRow(latestJob) : { id: '', status: 'running' as const, scope_type: params.scope, scope_value: params.account, initiated_by: 'user', run_reason: '', pipeline_phase: 'aggregating', started_at: nowIso(), completed_at: null, error_message: null, metadata_json: '{}', created_at: nowIso() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run Braniac'
      log.error('braniac:run failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_CANCEL, async (event: IpcMainInvokeEvent, params: BraniacCancelParams) => {
    validateSender(event)
    try {
      const canceled = braniacScheduler.cancel(params.job_id)
      emitStatusEvent(event, { status: 'idle', job_id: null, timestamp: nowIso() })
      return ok({ canceled })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel Braniac'
      log.error('braniac:cancel failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_STATUS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      return ok(braniacScheduler.getStatus())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get Braniac status'
      log.error('braniac:get-status failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_JOBS, async (event: IpcMainInvokeEvent, params: BraniacListJobsParams | void) => {
    validateSender(event)
    try {
      const rows = jobRepository.listByAgentType('braniac', params?.limit ?? 50, params?.offset ?? 0)
      return ok(rows.map(mapJobRow))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list Braniac jobs'
      log.error('braniac:list-jobs failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_JOB, async (event: IpcMainInvokeEvent, jobId: string) => {
    validateSender(event)
    try {
      const row = jobRepository.getById(jobId)
      return ok(row ? mapJobRow(row) : null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get Braniac job'
      log.error('braniac:get-job failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_PATTERNS, async (event: IpcMainInvokeEvent, params: BraniacListPatternsParams | void) => {
    validateSender(event)
    try {
      let rows
      if (params?.account) {
        rows = patternRepository.listPatternsByAccount(params.account)
      } else if (params?.approval_status) {
        rows = patternRepository.listPatternsByApprovalStatus(params.approval_status)
      } else {
        rows = patternRepository.listPatternsBySourceAgent('braniac')
      }
      return ok(rows)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list Braniac patterns'
      log.error('braniac:list-patterns failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_LIST_PROFILES, async (event: IpcMainInvokeEvent, params: BraniacListProfilesParams | void) => {
    validateSender(event)
    try {
      const rows = params?.account
        ? stakeholderProfileRepository.listByAccount(params.account)
        : stakeholderProfileRepository.listAll()
      return ok(rows)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list stakeholder profiles'
      log.error('braniac:list-profiles failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_PROFILE, async (event: IpcMainInvokeEvent, params: BraniacGetProfileParams) => {
    validateSender(event)
    try {
      const row = stakeholderProfileRepository.getByStakeholderAndAccount(params.stakeholder, params.account)
      return ok(row ?? null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get stakeholder profile'
      log.error('braniac:get-profile failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_GET_ACCOUNTS, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      const nexusDb = getDatabase()
      const rows = nexusDb.prepare(
        "SELECT DISTINCT account FROM synced_open_positions WHERE account != '' ORDER BY account"
      ).all() as { account: string }[]
      return ok(rows.map(r => r.account))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get accounts'
      log.error('braniac:get-accounts failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_APPROVE_PATTERN, async (event: IpcMainInvokeEvent, params: BraniacApprovePatternParams) => {
    validateSender(event)
    try {
      const updated = patternRepository.updatePattern(params.id, { approval_status: 'approved' })
      return ok({ updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve pattern'
      log.error('braniac:approve-pattern failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_REJECT_PATTERN, async (event: IpcMainInvokeEvent, params: BraniacRejectPatternParams) => {
    validateSender(event)
    try {
      const updates: Record<string, unknown> = { approval_status: 'rejected', is_active: 0 }
      if (params.reason) {
        updates.rejection_reason = params.reason
      }
      const updated = patternRepository.updatePattern(params.id, updates)
      return ok({ updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject pattern'
      log.error('braniac:reject-pattern failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  registerIpcHandler(IPC_CHANNELS.BRANIAC_UPDATE_PATTERN, async (event: IpcMainInvokeEvent, params: BraniacUpdatePatternParams) => {
    validateSender(event)
    try {
      const updates: Record<string, unknown> = {}
      if (params.pattern_text !== undefined) updates.pattern_text = params.pattern_text
      if (params.confidence_score !== undefined) updates.confidence_score = params.confidence_score
      const updated = patternRepository.updatePattern(params.id, updates)
      return ok({ updated })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update pattern'
      log.error('braniac:update-pattern failed', error instanceof Error ? error : new Error(message))
      return fail(message)
    }
  })

  log.info('Registered Braniac IPC handlers')
}
