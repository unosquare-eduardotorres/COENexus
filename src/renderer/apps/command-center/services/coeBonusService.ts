// Thin async service for the C.O.E. Bonus report.
//
// Placement margin, fill rate, and acceptance rate are wired to real IPC calls.
// Overview uses the BonusConfigContext (no service call needed).

import type {
  CoeBonusFilters,
  FillRateLocalFilters,
  PlacementMarginReportResult,
  PlacementMarginSyncStatus,
  ReportAcceptanceRateResultV2,
  ReportFillRateResult,
} from '../types/coeBonus'

export const coeBonusService = {
  async getPlacementMargin(filters: CoeBonusFilters): Promise<PlacementMarginReportResult | null> {
    return window.api.report.getPlacementMargin(filters.year, filters.quarter)
  },

  async getPlacementMarginSyncStatus(year: number, quarter: number): Promise<PlacementMarginSyncStatus> {
    return window.api.report.getPlacementMarginSyncStatus(year, quarter)
  },

  async syncPlacementMargin(token: string, year: number, quarter?: string): Promise<{ started: boolean }> {
    return window.api.report.syncPlacementMargin({ token, year, quarter })
  },

  async getFillRate(filters: FillRateLocalFilters): Promise<ReportFillRateResult> {
    return window.api.report.getFillRate({
      startDate: filters.startDate,
      endDate: filters.endDate,
      coe: filters.coe,
      includeActive: filters.includeActive,
    })
  },

  getAcceptanceRate(filters: CoeBonusFilters): Promise<ReportAcceptanceRateResultV2> {
    return window.api.report.getAcceptanceRate(filters) as Promise<ReportAcceptanceRateResultV2>
  },
}
