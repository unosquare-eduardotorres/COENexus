import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { PrrAddCommentParams, PrrCommentDto, PrrDetailResult, PrrReportItem, PrrUpdateCoeStatusParams } from '../../../shared/ipc-types'
import { prrRepository, type PrrReportRow } from '../../db/repositories/prrRepository'
import { syncRepository } from '../../db/repositories/syncRepository'
import { registerIpcHandler } from '../registerIpcHandler'
import { validateSender } from '../validate'

function calculateDaysOpened(requestDate: string | null): number {
  if (!requestDate) return 0
  const opened = new Date(requestDate)
  if (Number.isNaN(opened.getTime())) return 0
  const now = new Date()
  const diffMs = now.getTime() - opened.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function mapRowToDto(row: PrrReportRow): PrrReportItem {
  let coeComments: PrrCommentDto[] = []
  try {
    const parsed = JSON.parse(row.coe_comments)
    if (Array.isArray(parsed)) {
      coeComments = parsed as PrrCommentDto[]
    }
  } catch {
    coeComments = []
  }

  return {
    upstreamId: row.upstream_id,
    employee: row.employee,
    account: row.account,
    team: row.team,
    mainSkill: row.main_skill,
    seniority: row.seniority,
    transitionStatus: row.transition_status,
    transitionSubType: row.transition_sub_type,
    location: row.location,
    requestDate: row.request_date,
    daysSinceLastInterview: row.days_since_last_interview,
    impact: row.impact,
    attritionRisk: row.attrition_risk,
    comments: row.comments,
    presentationsCount: row.presentations_count,
    coeStatus: row.coe_status,
    coeComments,
    daysOpened: calculateDaysOpened(row.request_date),
    syncedAt: row.synced_at,
  }
}

export function registerPrrHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.PRR_GET_ALL,
    async (event): Promise<PrrReportItem[]> => {
      validateSender(event)
      return prrRepository.getAll().map(mapRowToDto)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_GET_DETAIL,
    async (event, upstreamId: number): Promise<PrrDetailResult | null> => {
      validateSender(event)
      const prr = prrRepository.getByUpstreamId(upstreamId)
      if (!prr) return null
      const presentations = syncRepository.getPrrPresentationsByPrrId(upstreamId).map((presentation) => ({
        openPositionId: presentation.open_position_id,
        account: presentation.account,
        openPositionStatus: presentation.open_position_status,
        location: presentation.location,
        presentedOn: presentation.presented_on,
        candidateStatus: presentation.candidate_status,
      }))
      return { prr: mapRowToDto(prr), presentations }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_UPDATE_COE_STATUS,
    async (event, params: PrrUpdateCoeStatusParams): Promise<{ updated: boolean }> => {
      validateSender(event)
      prrRepository.updateCoeStatus(params.upstreamId, params.coeStatus)
      return { updated: true }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_ADD_COMMENT,
    async (event, params: PrrAddCommentParams): Promise<{ comments: PrrCommentDto[] }> => {
      validateSender(event)
      prrRepository.addComment(params.upstreamId, params.text, params.author)
      return { comments: prrRepository.getComments(params.upstreamId) }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_DELETE,
    async (event, upstreamId: number): Promise<{ deleted: boolean }> => {
      validateSender(event)
      const deleted = prrRepository.deleteByUpstreamId(upstreamId)
      return { deleted }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRR_GET_SYNC_STATUS,
    async (event): Promise<{ total: number; lastSyncedAt: string | null }> => {
      validateSender(event)
      return prrRepository.getSyncStatus()
    }
  )
}
