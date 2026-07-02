import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type {
  ResponsivenessReport,
  ResponsivenessCoePracticeLead,
  ResponsivenessAddLeadParams,
  ResponsivenessDiscussionComment,
  ResponsivenessAnalyzeRequest,
  ResponsivenessAiAnalysisResult,
  PositionAttentionReport,
} from '../../../shared/ipc-types'
import { registerIpcHandler } from '../registerIpcHandler'
import { validateSender } from '../validate'
import { responsivenessService } from '../../services/responsivenessService'

export function registerResponsivenessHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.RESPONSIVENESS_GET_REPORT,
    async (event): Promise<ResponsivenessReport> => {
      validateSender(event)
      return responsivenessService.getReport()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.RESPONSIVENESS_GET_LEADS,
    async (event): Promise<ResponsivenessCoePracticeLead[]> => {
      validateSender(event)
      return responsivenessService.getLeads()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.RESPONSIVENESS_ADD_LEAD,
    async (event, params: ResponsivenessAddLeadParams): Promise<ResponsivenessCoePracticeLead> => {
      validateSender(event)
      return responsivenessService.addLead(params.name, params.email, params.coe)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.RESPONSIVENESS_REMOVE_LEAD,
    async (event, id: number): Promise<{ removed: boolean }> => {
      validateSender(event)
      responsivenessService.removeLead(id)
      return { removed: true }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.RESPONSIVENESS_GET_POSITION_DISCUSSIONS,
    async (event, positionUpstreamId: number): Promise<ResponsivenessDiscussionComment[]> => {
      validateSender(event)
      return responsivenessService.getPositionDiscussions(positionUpstreamId)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.RESPONSIVENESS_ANALYZE_MENTIONS,
    async (event, request: ResponsivenessAnalyzeRequest): Promise<ResponsivenessAiAnalysisResult[]> => {
      validateSender(event)
      return responsivenessService.analyzeUnansweredMentions(request.positionUpstreamIds)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.RESPONSIVENESS_GENERATE_FULL_REPORT,
    async (event): Promise<PositionAttentionReport> => {
      validateSender(event)
      return responsivenessService.generateFullReport(event.sender)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.RESPONSIVENESS_GET_LAST_REPORT,
    async (event): Promise<PositionAttentionReport | null> => {
      validateSender(event)
      return responsivenessService.getLastReport()
    }
  )
}
