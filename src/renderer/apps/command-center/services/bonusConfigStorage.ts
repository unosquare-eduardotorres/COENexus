// Pure functions for bonus config localStorage read/write. No React dependencies.

import type {
  ActivePeriod,
  BonusConfig,
  BonusConfigStore,
  MeasureConfig,
  MeasureKey,
  MeasureLock,
} from '../types/bonusConfig'

const STORAGE_KEY = 'coe-bonus-configs'

// ── Default config ───────────────────────────────────────────────────────────

export function defaultMeasures(): Record<MeasureKey, MeasureConfig> {
  return {
    placementMargin: { weight: 25, goal: 55, floor: 50 },
    acceptanceRate:  { weight: 25, goal: 90, floor: 85 },
    fillRate:        { weight: 25, goal: 60, floor: 50 },
    grossMargin:     { weight: 25, goal: 55, floor: 50 },
  }
}

export function defaultLocks(): Record<MeasureKey, MeasureLock | null> {
  return {
    placementMargin: null,
    acceptanceRate: null,
    fillRate: null,
    grossMargin: null,
  }
}

export function defaultConfig(): BonusConfig {
  return {
    bonusPool: 0,
    measures: defaultMeasures(),
    locks: defaultLocks(),
  }
}

// ── Config key ───────────────────────────────────────────────────────────────

export function buildConfigKey(period: ActivePeriod): string {
  return `${period.year}:${period.quarter}:${period.coeName}`
}

// ── Store CRUD ───────────────────────────────────────────────────────────────

export function loadStore(): BonusConfigStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as BonusConfigStore
      if (parsed && typeof parsed.configs === 'object') return parsed
    }
  } catch {
    // corrupted — start fresh
  }
  return { activeKey: '', configs: {} }
}

export function saveStore(store: BonusConfigStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getOrCreateConfig(store: BonusConfigStore, key: string): BonusConfig {
  if (store.configs[key]) return store.configs[key]
  const config = defaultConfig()
  store.configs[key] = config
  return config
}

// ── Bonus math ───────────────────────────────────────────────────────────────

/**
 * Linear attainment: maps achievement into [0, 1] given floor → goal.
 * At or below floor → 0. At or above goal → 1 (capped, no overshoot).
 */
export function computeAttainment(achievement: number, goal: number, floor: number): number {
  if (goal <= floor) return achievement >= goal ? 1 : 0
  return Math.max(0, Math.min(1, (achievement - floor) / (goal - floor)))
}

/** Compute a single measure's bonus row. */
export function computeBonusRow(
  measureConfig: MeasureConfig,
  lock: MeasureLock | null,
  bonusPool: number,
): { attainment: number; earned: number; status: 'on-track' | 'at-risk' | 'missed'; achievement: number | null } {
  const achievement = lock?.achievement ?? measureConfig.achievement ?? null
  if (achievement === null || achievement === undefined) {
    return { attainment: 0, earned: 0, status: 'missed', achievement: null }
  }
  const attainment = computeAttainment(achievement, measureConfig.goal, measureConfig.floor)
  const earned = bonusPool * (measureConfig.weight / 100) * attainment
  const status = attainment >= 0.9 ? 'on-track' : attainment >= 0.5 ? 'at-risk' : 'missed'
  return { attainment, earned, status, achievement }
}

/** Compute totals across all measures. */
export function computeBonusTotal(config: BonusConfig): {
  totalAttainment: number
  totalEarned: number
  weightSum: number
  lockedCount: number
} {
  const keys: MeasureKey[] = ['placementMargin', 'acceptanceRate', 'fillRate', 'grossMargin']
  let totalEarned = 0
  let weightedAttainmentSum = 0
  let weightSum = 0
  let lockedCount = 0

  for (const key of keys) {
    const mc = config.measures[key]
    const lock = config.locks[key]
    const row = computeBonusRow(mc, lock, config.bonusPool)
    weightSum += mc.weight
    totalEarned += row.earned
    if (row.achievement !== null) {
      weightedAttainmentSum += mc.weight * row.attainment
    }
    if (lock || (key === 'grossMargin' && mc.achievement !== undefined)) {
      lockedCount++
    }
  }

  const totalAttainment = weightSum > 0 ? weightedAttainmentSum / weightSum : 0

  return { totalAttainment, totalEarned, weightSum, lockedCount }
}
