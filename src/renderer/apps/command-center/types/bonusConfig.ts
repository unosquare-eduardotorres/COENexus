// Types for the bonus configuration system (lock-to-overview calculator).

export type MeasureKey = 'placementMargin' | 'acceptanceRate' | 'fillRate' | 'grossMargin'

export interface MeasureConfig {
  weight: number       // 0-100, all should sum to 100 (UI warns if not)
  goal: number         // target percentage
  floor: number        // floor percentage
  achievement?: number // manual entry only (grossMargin)
}

export interface MeasureLock {
  achievement: number
  periodLabel: string                // e.g. "Q2 2026", "YTD 2026", "TTM Jun 2026"
  lockedAt: string                   // ISO timestamp
  filters: Record<string, unknown>   // tab-specific filter state snapshot
  exclusions?: string[]              // AR only: toggled exclusion statuses
}

export interface BonusConfig {
  bonusPool: number
  measures: Record<MeasureKey, MeasureConfig>
  locks: Record<MeasureKey, MeasureLock | null>
}

export interface ActivePeriod {
  year: number
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  coeId: number | null    // catalog COE id (for skill mapping lookups)
  coeName: string         // display name AND IPC filter value (matches sop.coe)
}

export interface BonusConfigStore {
  activeKey: string
  configs: Record<string, BonusConfig>
}

/** Quarter end months for TTM alignment (0-indexed). */
export const QUARTER_END_MONTH: Record<string, number> = {
  Q1: 2,   // March
  Q2: 5,   // June
  Q3: 8,   // September
  Q4: 11,  // December
}

export const ALL_MEASURE_KEYS: MeasureKey[] = [
  'placementMargin',
  'acceptanceRate',
  'fillRate',
  'grossMargin',
]

export const MEASURE_LABELS: Record<MeasureKey, string> = {
  placementMargin: 'Placement Margin',
  acceptanceRate: 'Acceptance Rate',
  fillRate: 'Fill Rate',
  grossMargin: 'Gross Margin',
}
