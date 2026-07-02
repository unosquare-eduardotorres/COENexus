import type { ResponsivenessReport, ResponsivenessCoePracticeLead, ResponsivenessDiscussionComment, ResponsivenessAiAnalysisResult, PositionAttentionReport } from '../../../../shared/ipc-types'

export const responsivenessService = {
  getReport(): Promise<ResponsivenessReport> {
    return window.api.responsiveness.getReport()
  },

  getLeads(): Promise<ResponsivenessCoePracticeLead[]> {
    return window.api.responsiveness.getLeads()
  },

  addLead(name: string, email: string, coe?: string): Promise<ResponsivenessCoePracticeLead> {
    return window.api.responsiveness.addLead({ name, email, coe })
  },

  removeLead(id: number): Promise<{ removed: boolean }> {
    return window.api.responsiveness.removeLead(id)
  },

  getPositionDiscussions(positionUpstreamId: number): Promise<ResponsivenessDiscussionComment[]> {
    return window.api.responsiveness.getPositionDiscussions(positionUpstreamId)
  },

  analyzeMentions(positionUpstreamIds: number[]): Promise<ResponsivenessAiAnalysisResult[]> {
    return window.api.responsiveness.analyzeMentions({ positionUpstreamIds })
  },

  generateFullReport(): Promise<PositionAttentionReport> {
    return window.api.responsiveness.generateFullReport()
  },

  getLastReport(): Promise<PositionAttentionReport | null> {
    return window.api.responsiveness.getLastReport()
  },
}
