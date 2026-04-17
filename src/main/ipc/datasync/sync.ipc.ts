import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { SyncStartParams, SyncSingleParams, SyncRetryParams, SyncYearFilterParams, SyncUploadNoteParams, SyncRecordDto } from '../../../shared/ipc-types'
import type { SyncedEmployeeRow, SyncedCandidateRow, SyncedOpenPositionRow, SyncedProjectReallocationRow } from '../../db/repositories/syncRepository'
import { validateSender } from '../validate'
import { getMainWindow } from '../../index'
import { syncOrchestrator } from '../../services/syncOrchestrator'
import { syncRepository } from '../../db/repositories/syncRepository'
import { matchRepository } from '../../db/repositories/matchRepository'
import { catalogService } from '../../services/catalogService'
import { upstreamApiService } from '../../services/upstreamApiService'
import { validatePayload, syncStartSchema, syncSingleSchema, syncRetrySchema, syncUploadNoteSchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'
import { createLogger } from '../../services/logger'

const log = createLogger('SyncIPC')

function mapEmployeeRowToDto(row: SyncedEmployeeRow): SyncRecordDto {
  return {
    id: `emp-${row.upstream_id}`,
    source: 'employees',
    status: row.status,
    name: row.full_name,
    email: row.email,
    seniority: row.seniority,
    mainSkill: row.main_skill,
    country: row.country,
    grossMonthlySalary: row.gross_monthly_salary,
    currency: row.salary_currency,
    expectedRate: row.rate,
    lastAccount: row.last_account,
    lastAccountStartDate: row.last_account_start_date,
    hasResume: row.has_resume === 1,
    resumeNoteId: row.resume_note_id,
    resumeFilename: row.resume_filename,
    isBench: row.is_bench === 1,
    reason: row.status_reason,
    resumeChanged: false,
    upstreamId: row.upstream_id,

    syncedAt: row.synced_at,
    resumeDateCreated: row.resume_date_created,
    jobTitle: row.job_title,
  }
}

function mapCandidateRowToDto(row: SyncedCandidateRow): SyncRecordDto {
  return {
    id: `cand-${row.upstream_id}`,
    source: 'candidates',
    status: row.status,
    name: row.full_name,
    email: row.email ?? '',
    seniority: row.seniority ?? undefined,
    mainSkill: row.main_skill ?? undefined,
    country: row.country ?? undefined,
    grossMonthlySalary: row.current_salary,
    currency: row.salary_currency,
    coeCertified: row.coe_certified === 1,
    candidateStatus: row.candidate_status,
    lastStatusUpdate: row.last_status_update,
    salaryExpectations: row.salary_expectations,
    salaryExpectationsCurrency: row.salary_expectations_currency,
    hasResume: row.has_resume === 1,
    resumeNoteId: row.resume_note_id,
    resumeFilename: row.resume_filename,
    isBench: false,
    reason: row.status_reason,
    resumeChanged: false,
    upstreamId: row.upstream_id,

    syncedAt: row.synced_at,
    resumeDateCreated: row.resume_date_created,
  }
}

function mapPositionRowToDto(row: SyncedOpenPositionRow): SyncRecordDto {
  let candidatesCount = 0;
  try {
    candidatesCount = matchRepository.getOpenPositionCandidateCount(row.upstream_id);
  } catch {
    // Non-critical — open_position_candidates table may be empty or unavailable
  }
  return {
    id: `pos-${row.upstream_id}`,
    source: 'open-positions',
    status: row.status,
    name: `${row.account} - ${row.job_title || row.main_skill}`,
    email: '',
    hasResume: false,
    isBench: false,
    resumeChanged: false,
    upstreamId: row.upstream_id,

    syncedAt: row.synced_at,
    reason: row.status_reason,
    account: row.account,
    coe: row.coe,
    practice: row.practice,
    stakeholder: row.stakeholder,
    mainSkill: row.main_skill,
    countries: row.countries,
    seniorities: row.seniorities,
    availableRange: row.available_range,
    positionStatus: row.position_status,
    aging: row.aging,
    hasJobDescription: !!(row.job_description?.trim()),
    candidatesCount,
  }
}

function mapPrrRowToDto(row: SyncedProjectReallocationRow): SyncRecordDto {
  let presentationsCount = 0
  try {
    presentationsCount = syncRepository.getPrrPresentationCount(row.upstream_id)
  } catch { /* non-critical */ }
  return {
    id: `prr-${row.upstream_id}`,
    source: 'project-reallocations',
    status: row.status,
    name: row.employee,
    email: '',
    hasResume: false,
    isBench: false,
    resumeChanged: false,
    upstreamId: row.upstream_id,
    syncedAt: row.synced_at,
    reason: row.status_reason,
    account: row.account,
    mainSkill: row.main_skill,
    seniority: row.seniority,
    team: row.team,
    transitionStatus: row.transition_status,
    location: row.location,
    impact: row.impact,
    attritionRisk: row.attrition_risk,
    presentationsCount,
  }
}

export function registerSyncHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.SYNC_VALIDATE_TOKEN,
    async (event: IpcMainInvokeEvent, token: string) => {
      validateSender(event)
      log.info('Token validation requested')
      if (!token || typeof token !== 'string') throw new Error('Token is required')
      try {
        await upstreamApiService.getEmployeesPaged(token, 0, 1)
        log.info('Token validation result', { valid: true })
        return { valid: true, message: 'Token is valid' }
      } catch (err) {
        log.info('Token validation result', { valid: false, error: err instanceof Error ? err.message : String(err) })
        return { valid: false, message: err instanceof Error ? err.message : 'Token validation failed' }
      }
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_GET_STATUS,
    async (event: IpcMainInvokeEvent, dataSource: string) => {
      validateSender(event)
      const table = dataSource === 'employees' ? 'synced_employees' as const
        : dataSource === 'candidates' ? 'synced_candidates' as const
        : dataSource === 'project-reallocations' ? 'synced_project_reallocations' as const
        : 'synced_open_positions' as const
      return syncRepository.getCountByStatus(table)
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_APPLY_YEAR_FILTER,
    async (event: IpcMainInvokeEvent, params: SyncYearFilterParams) => {
      validateSender(event)
      return { success: true, year: params.year }
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_START,
    async (event: IpcMainInvokeEvent, params: SyncStartParams) => {
      validateSender(event)
      const p = validatePayload(syncStartSchema, params, IPC_CHANNELS.SYNC_START)
      log.info('Sync start requested', { source: p.source, limit: p.limit, skip: p.skip, year: p.year, activeOnly: p.activeOnly })
      const win = getMainWindow()
      syncOrchestrator.syncAsync(p.source, p.token, { limit: p.limit, skip: p.skip, year: p.year, activeOnly: p.activeOnly }, (evt) => {
        win?.webContents.send(IPC_CHANNELS.SYNC_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_PAUSE,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      log.info('Sync pause requested')
      syncOrchestrator.requestPause()
      return { paused: true }
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_SINGLE,
    async (event: IpcMainInvokeEvent, params: SyncSingleParams) => {
      validateSender(event)
      const p = validatePayload(syncSingleSchema, params, IPC_CHANNELS.SYNC_SINGLE)
      log.info('Single record sync requested', { source: p.source, upstreamId: p.upstreamId })
      return syncOrchestrator.syncSingle(p.source, p.token, p.upstreamId)
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_RETRY_FAILED,
    async (event: IpcMainInvokeEvent, params: SyncRetryParams) => {
      validateSender(event)
      const p = validatePayload(syncRetrySchema, params, IPC_CHANNELS.SYNC_RETRY_FAILED)
      log.info('Retry failed records requested', { source: p.source })
      const win = getMainWindow()
      syncOrchestrator.syncAsync(p.source, p.token, {}, (evt) => {
        win?.webContents.send(IPC_CHANNELS.SYNC_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_RETRY_NOT_PROCESSED,
    async (event: IpcMainInvokeEvent, params: SyncRetryParams) => {
      validateSender(event)
      const p = validatePayload(syncRetrySchema, params, IPC_CHANNELS.SYNC_RETRY_NOT_PROCESSED)
      log.info('Retry not-processed records requested', { source: p.source })
      const win = getMainWindow()
      syncOrchestrator.syncAsync(p.source, p.token, {}, (evt) => {
        win?.webContents.send(IPC_CHANNELS.SYNC_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_GET_RECORDS,
    async (event: IpcMainInvokeEvent, dataSource: string) => {
      validateSender(event)
      if (dataSource === 'employees') return syncRepository.getAllEmployees(50000, 0).map(mapEmployeeRowToDto)
      if (dataSource === 'candidates') return syncRepository.getAllCandidates(50000, 0).map(mapCandidateRowToDto)
      if (dataSource === 'open-positions') return syncRepository.getAllOpenPositions(50000, 0).map(mapPositionRowToDto)
      if (dataSource === 'project-reallocations') return syncRepository.getAllProjectReallocations(50000, 0).map(mapPrrRowToDto)
      return []
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_CLEAR,
    async (event: IpcMainInvokeEvent, dataSource: string) => {
      validateSender(event)
      log.warn('Sync table cleared', { dataSource })
      syncRepository.clearTable(dataSource as 'employees' | 'candidates' | 'positions' | 'project-reallocations')
      return { cleared: true, dataSource }
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_GET_SKILLS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      try {
        const skills = await catalogService.getMainSkills('')
        return [...skills.values()]
      } catch (err) {
        // Skills fetch failure is non-critical — return empty list
        return []
      }
    })

  registerIpcHandler(IPC_CHANNELS.SYNC_UPLOAD_NOTE,
    async (event: IpcMainInvokeEvent, params: SyncUploadNoteParams) => {
      validateSender(event)
      const p = validatePayload(syncUploadNoteSchema, params, IPC_CHANNELS.SYNC_UPLOAD_NOTE)
      log.info('Note upload requested', { personId: p.personId, noteType: p.noteType, fileName: p.fileName })
      const noteId = await upstreamApiService.savePersonaNote(p.token, p.personId, p.noteType, p.fileName, p.fileContent)
      return { success: true, noteId }
    })
}
