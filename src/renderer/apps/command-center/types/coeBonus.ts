// Types for the C.O.E. Bonus report tabs.
// Real IPC types are re-exported for renderer convenience.

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export type MeasureStatus = 'on-track' | 'at-risk' | 'missed'

export interface CoeBonusFilters {
  year: number
  quarter: Quarter
  coe: string
}

// ---- Open Position Fill Rate (TTM, by COE) ---------------------------------
// Re-exports the IPC types for renderer convenience.
import type { ReportFillRateResult, ReportFillRateCoeRow, ReportFillRateMonthPoint } from '../../../../shared/ipc-types'
export type { ReportFillRateResult, ReportFillRateCoeRow, ReportFillRateMonthPoint }

export interface FillRateLocalFilters {
  startDate: string   // ISO date, e.g. '2025-07-01'
  endDate: string     // ISO date, e.g. '2026-06-30'
  coe: string
  includeActive: boolean
}

// ---- Candidate Acceptance Rate V2 (monthly cohort + audit trail) ------------
// Re-exports the IPC types for renderer convenience. The IPC result is a drop-in.

import type { ReportAcceptanceRateResultV2 } from '../../../../shared/ipc-types'

export type { AcceptanceBucket, AcceptanceOutcome } from '../../../../shared/ipc-types'

export type {
  ReportCandidateAudit,
  ReportPositionOutcomeV2,
  ReportMonthBreakdown,
  ReportAcceptanceRateResultV2,
} from '../../../../shared/ipc-types'

// V2 summary shape (re-exported from the IPC result for convenience)
export type AcceptanceRateSummaryV2 = ReportAcceptanceRateResultV2['summary']

// Placement Margin types (wired to real data)
export type {
  PlacementMarginReportResult,
  PlacementMarginEntryDto,
  PlacementMarginAccountRow,
  PlacementMarginMonthPoint,
  PlacementMarginSyncStatus,
} from '../../../../shared/ipc-types'

// Re-export bonus config types for convenience
export type { MeasureKey, MeasureConfig, MeasureLock, BonusConfig, ActivePeriod } from './bonusConfig'
