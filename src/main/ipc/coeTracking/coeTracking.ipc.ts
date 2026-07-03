import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type {
  CoeTrackingSummary,
  PracticeTrackingSummary,
  SkillTrackingSummary,
  TrackedPosition,
  TrackedPositionDetail,
  CoeTrackingSkillPositionsParams,
  CoeTrackingPracticeDetailParams,
  ReportSyncStatus,
} from '../../../shared/ipc-types'
import { registerIpcHandler } from '../registerIpcHandler'
import { validateSender } from '../validate'
import { coeTrackingService } from '../../services/coeTrackingService'

export function registerCoeTrackingHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.COE_TRACKING_GET_OVERVIEW,
    async (event): Promise<CoeTrackingSummary[]> => {
      validateSender(event)
      return coeTrackingService.getOverview()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.COE_TRACKING_GET_COE_DETAIL,
    async (event, coe: string): Promise<PracticeTrackingSummary[]> => {
      validateSender(event)
      return coeTrackingService.getCoeDetail(coe)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.COE_TRACKING_GET_PRACTICE_DETAIL,
    async (event, params: CoeTrackingPracticeDetailParams): Promise<SkillTrackingSummary[]> => {
      validateSender(event)
      return coeTrackingService.getPracticeDetail(params.coe, params.practice)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.COE_TRACKING_GET_PRACTICE_POSITIONS,
    async (event, params: CoeTrackingPracticeDetailParams): Promise<TrackedPosition[]> => {
      validateSender(event)
      return coeTrackingService.getPracticePositions(params.coe, params.practice)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.COE_TRACKING_GET_SKILL_POSITIONS,
    async (event, params: CoeTrackingSkillPositionsParams): Promise<TrackedPosition[]> => {
      validateSender(event)
      return coeTrackingService.getSkillPositions(params.coe, params.practice, params.skill)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.COE_TRACKING_GET_COE_POSITIONS,
    async (event, coe: string): Promise<TrackedPosition[]> => {
      validateSender(event)
      return coeTrackingService.getCoePositions(coe)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.COE_TRACKING_GET_POSITION_DETAIL,
    async (event, upstreamId: number): Promise<TrackedPositionDetail | null> => {
      validateSender(event)
      return coeTrackingService.getPositionDetail(upstreamId)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.COE_TRACKING_GET_SYNC_STATUS,
    async (event): Promise<ReportSyncStatus> => {
      validateSender(event)
      return coeTrackingService.getSyncStatus()
    }
  )
}
