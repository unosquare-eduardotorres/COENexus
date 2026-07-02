// Types for the C.O.E. Bonus report (Phase 1: UX/UI skeleton, mocked data).
// Shapes mirror what a future `window.api.coeBonus.*` IPC surface would expose,
// so wiring real data later is a drop-in replacement for the mock service.

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export type BonusMeasureKey =
  | 'placement-margin'
  | 'gross-margin'
  | 'fill-rate'
  | 'acceptance-rate'

export type MeasureStatus = 'on-track' | 'at-risk' | 'missed'

export interface CoeOption {
  /** Stable id used in filters / mock keys. */
  id: string
  label: string
}

export interface CoeBonusFilters {
  year: number
  quarter: Quarter
  coe: string
}

export interface CoeBonusFilterOptions {
  years: number[]
  quarters: Quarter[]
  coes: CoeOption[]
}

/** Normalised summary used by the Overview grid and each measure header. */
export interface MeasureSummary {
  key: BonusMeasureKey
  label: string
  shortLabel: string
  unit: '%'
  /** Achieved value for the selected quarter (percent). */
  achievement: number
  /** Target value that earns full attainment (percent). */
  goal: number
  /** Floor of the linear scale — 0% attainment at/below this (percent). */
  floor: number
  /** Top of the 5-point linear scale (== goal for most measures). */
  target: number
  /** Fraction of bonus this measure carries (0..1, all 0.25 in Phase 1). */
  weight: number
  /** Fraction of THIS measure earned via the linear scale (0..1). */
  attainment: number
  /** weight * attainment — contribution to the overall bonus (0..1). */
  contribution: number
  status: MeasureStatus
}

export interface MeasureTrendPoint {
  /** Display label, e.g. "2025 Q3". */
  period: string
  value: number
  goal: number
}

// ---- Overview ----------------------------------------------------------------

export interface OverviewTrendPoint {
  period: string
  placementMargin: number
  grossMargin: number
  fillRate: number
  acceptanceRate: number
}

export interface OverviewSummary {
  filters: CoeBonusFilters
  /** Sum of contributions across all measures (0..1). */
  overallAttainment: number
  measures: MeasureSummary[]
  /** Per-measure attainment % over recent quarters (for the QoQ trend line). */
  trend: OverviewTrendPoint[]
}

// ---- Placement Margin --------------------------------------------------------

export interface PlacementMarginRow {
  account: string
  placements: number
  revenue: number
  cost: number
  marginPct: number
}

export interface PlacementMarginDetail {
  summary: MeasureSummary
  trend: MeasureTrendPoint[]
  breakdown: PlacementMarginRow[]
}

// ---- Gross Margin (ratcheting floor) ----------------------------------------

export interface GrossMarginFloorStep {
  period: string
  /** Floor in effect for this quarter (never decreases). */
  floor: number
  /** Top of the 5-point window for this quarter. */
  windowTop: number
  /** Actual gross margin achieved this quarter. */
  actual: number
}

export interface GrossMarginDetail {
  summary: MeasureSummary
  floorSteps: GrossMarginFloorStep[]
  trend: MeasureTrendPoint[]
}

// ---- Open Position Fill Rate (SWE vs QE, TTM) -------------------------------

export interface FillRateRole {
  role: string
  fillRate: number
  goal: number
  openPositions: number
  filledPositions: number
  status: MeasureStatus
}

export interface FillRateTtmPoint {
  period: string
  swe: number
  qe: number
}

export interface FillRateDetail {
  summary: MeasureSummary
  roles: FillRateRole[]
  ttm: FillRateTtmPoint[]
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
