import type { ResponsivenessReport, ResponsivenessCoePracticeLead } from '../../../../shared/ipc-types'

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
}
