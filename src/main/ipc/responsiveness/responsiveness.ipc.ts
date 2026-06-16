import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type {
  ResponsivenessReport,
  ResponsivenessCoePracticeLead,
  ResponsivenessAddLeadParams,
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
}
