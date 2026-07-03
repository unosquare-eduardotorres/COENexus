import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type {
  PLBPlacementEntry,
  PLBOffboardingEntry,
  PLBOverview,
  PLBPracticeLeadRow,
  BonusTier,
} from '../../../shared/ipc-types'
import { registerIpcHandler } from '../registerIpcHandler'
import { validateSender } from '../validate'
import { practiceLeadBonusService } from '../../services/practiceLeadBonusService'

export function registerPracticeLeadBonusHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.PRACTICE_LEAD_BONUS_PLACEMENTS,
    async (event, params: { year: number; quarter: string; tiers?: BonusTier[] }): Promise<PLBPlacementEntry[]> => {
      validateSender(event)
      return practiceLeadBonusService.getPlacements(params.year, params.quarter, params.tiers)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRACTICE_LEAD_BONUS_OFFBOARDINGS,
    async (event, params: { year: number; quarter: string; tiers?: BonusTier[] }): Promise<PLBOffboardingEntry[]> => {
      validateSender(event)
      return practiceLeadBonusService.getOffboardings(params.year, params.quarter, params.tiers)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRACTICE_LEAD_BONUS_OVERVIEW,
    async (event, params: { year: number; quarter: string; tiers?: BonusTier[] }): Promise<PLBOverview> => {
      validateSender(event)
      return practiceLeadBonusService.getOverview(params.year, params.quarter, params.tiers)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRACTICE_LEAD_BONUS_GET_PRACTICE_LEADS,
    async (event): Promise<PLBPracticeLeadRow[]> => {
      validateSender(event)
      return practiceLeadBonusService.getPracticeLeads() as PLBPracticeLeadRow[]
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PRACTICE_LEAD_BONUS_SAVE_GM_OVERRIDE,
    async (event, params: { year: number; employee: string; offboardingDate: string | null; account: string; gmOverride: number }): Promise<{ success: boolean }> => {
      validateSender(event)
      practiceLeadBonusService.saveGmOverride(
        params.year, params.employee, params.offboardingDate, params.account, params.gmOverride
      )
      return { success: true }
    }
  )
}
