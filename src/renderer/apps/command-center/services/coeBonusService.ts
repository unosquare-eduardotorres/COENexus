// Thin async service for the C.O.E. Bonus report.
//
// Phase 1 returns mocks, but the method signatures intentionally match the shape
// a future `window.api.coeBonus.*` IPC surface would expose. When real data is
// wired up, only the bodies change — callers stay the same.

import {
  FILTER_OPTIONS,
  getFillRateMock,
  getGrossMarginMock,
  getOverviewMock,
} from '../mocks/coeBonusMockData'
import type {
  CoeBonusFilterOptions,
  CoeBonusFilters,
  FillRateDetail,
  GrossMarginDetail,
  OverviewSummary,
  PlacementMarginReportResult,
  PlacementMarginSyncStatus,
  ReportAcceptanceRateResultV2,
} from '../types/coeBonus'

/** Simulates IPC latency so loading states are exercised in the skeleton. */
function settle<T>(value: T, delayMs = 220): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), delayMs))
}

export const coeBonusService = {
  async getFilterOptions(): Promise<CoeBonusFilterOptions> {
    // Years/quarters stay static; COE options come from real Closed-position data
    // so the Acceptance Rate report can scope by an actual COE. 'all' = no scoping.
    try {
      const coes = await window.api.report.getAcceptanceRateCoes()
      return {
        ...FILTER_OPTIONS,
        coes: [{ id: 'all', label: 'All C.O.E.s' }, ...coes.map(c => ({ id: c, label: c }))],
      }
    } catch {
      return { ...FILTER_OPTIONS, coes: [{ id: 'all', label: 'All C.O.E.s' }, ...FILTER_OPTIONS.coes] }
    }
  },

  getOverview(filters: CoeBonusFilters): Promise<OverviewSummary> {
    return settle(getOverviewMock(filters))
  },

  async getPlacementMargin(filters: CoeBonusFilters): Promise<PlacementMarginReportResult | null> {
    return window.api.report.getPlacementMargin(filters.year, filters.quarter)
  },

  async getPlacementMarginSyncStatus(year: number, quarter: number): Promise<PlacementMarginSyncStatus> {
    return window.api.report.getPlacementMarginSyncStatus(year, quarter)
  },

  async syncPlacementMargin(token: string, year: number, quarter?: string): Promise<{ started: boolean }> {
    return window.api.report.syncPlacementMargin({ token, year, quarter })
  },

  getGrossMargin(filters: CoeBonusFilters): Promise<GrossMarginDetail> {
    return settle(getGrossMarginMock(filters))
  },

  getFillRate(filters: CoeBonusFilters): Promise<FillRateDetail> {
    return settle(getFillRateMock(filters))
  },

  getAcceptanceRate(filters: CoeBonusFilters): Promise<ReportAcceptanceRateResultV2> {
    return window.api.report.getAcceptanceRate(filters) as Promise<ReportAcceptanceRateResultV2>
  },
}
