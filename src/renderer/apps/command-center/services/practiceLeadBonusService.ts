// Thin async service for the Practice Lead Bonus report.
// Wraps window.api.practiceLeadBonus.* IPC calls.

import type {
  PLBPlacementEntry,
  PLBOffboardingEntry,
  PLBOverview,
  PLBPracticeLeadRow,
  BonusTier,
} from '../../../../shared/ipc-types'

export const practiceLeadBonusRendererService = {
  async getPlacements(year: number, quarter: string, tiers?: BonusTier[]): Promise<PLBPlacementEntry[]> {
    return window.api.practiceLeadBonus.getPlacements(year, quarter, tiers)
  },

  async getOffboardings(year: number, quarter: string, tiers?: BonusTier[]): Promise<PLBOffboardingEntry[]> {
    return window.api.practiceLeadBonus.getOffboardings(year, quarter, tiers)
  },

  async getOverview(year: number, quarter: string, tiers?: BonusTier[]): Promise<PLBOverview> {
    return window.api.practiceLeadBonus.getOverview(year, quarter, tiers)
  },

  async getPracticeLeads(): Promise<PLBPracticeLeadRow[]> {
    return window.api.practiceLeadBonus.getPracticeLeads()
  },

  async saveGmOverride(year: number, employee: string, offboardingDate: string | null, account: string, gmOverride: number): Promise<void> {
    await window.api.practiceLeadBonus.saveGmOverride(year, employee, offboardingDate, account, gmOverride)
  },
}
