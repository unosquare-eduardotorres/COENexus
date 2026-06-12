// Deterministic mock datasets for the C.O.E. Bonus report.
//
// Everything is derived from a string seed (year + quarter + coe) so that:
//   - switching any filter visibly changes every chart, AND
//   - the same selection always renders the same numbers (stable demos).
//
// Phase 1 only: NO bonus math is authoritative here — values are illustrative
// so the layout and chart placements can be reviewed and adapted later.

import type {
  BonusMeasureKey,
  CoeBonusFilterOptions,
  CoeBonusFilters,
  CoeOption,
  FillRateDetail,
  GrossMarginDetail,
  GrossMarginFloorStep,
  MeasureStatus,
  MeasureSummary,
  MeasureTrendPoint,
  OverviewSummary,
  OverviewTrendPoint,
  PlacementMarginDetail,
  Quarter,
} from '../types/coeBonus'

// ---- Filter options ----------------------------------------------------------

export const COE_OPTIONS: CoeOption[] = [
  { id: 'software-engineering', label: 'Software Engineering' },
  { id: 'quality-engineering', label: 'Quality Engineering' },
  { id: 'data', label: 'Data' },
  { id: 'cloud-devops', label: 'Cloud / DevOps' },
  { id: 'design', label: 'Design' },
]

export const YEAR_OPTIONS = [2024, 2025, 2026]
export const QUARTER_OPTIONS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

export const FILTER_OPTIONS: CoeBonusFilterOptions = {
  years: YEAR_OPTIONS,
  quarters: QUARTER_OPTIONS,
  coes: COE_OPTIONS,
}

export const DEFAULT_FILTERS: CoeBonusFilters = {
  year: 2026,
  quarter: 'Q1',
  coe: 'all',
}

// ---- Deterministic pseudo-random helpers ------------------------------------

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Mulberry32 PRNG — deterministic stream of [0,1) from a 32-bit seed. */
function makeRng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rngFor(filters: CoeBonusFilters, salt = ''): () => number {
  return makeRng(hashString(`${filters.year}|${filters.quarter}|${filters.coe}|${salt}`))
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function range(rng: () => number, min: number, max: number): number {
  return round1(min + rng() * (max - min))
}

// ---- Measure math (illustrative, NOT authoritative) -------------------------

function linearAttainment(actual: number, floor: number, target: number): number {
  if (target <= floor) return actual >= target ? 1 : 0
  return Math.max(0, Math.min(1, (actual - floor) / (target - floor)))
}

function statusFor(attainment: number): MeasureStatus {
  if (attainment >= 0.85) return 'on-track'
  if (attainment >= 0.4) return 'at-risk'
  return 'missed'
}

const WEIGHT = 0.25

interface MeasureMeta {
  key: BonusMeasureKey
  label: string
  shortLabel: string
  floor: number
  target: number
  goal: number
}

const MEASURE_META: Record<BonusMeasureKey, MeasureMeta> = {
  'placement-margin': {
    key: 'placement-margin',
    label: 'Placement Margin',
    shortLabel: 'Placement',
    floor: 50,
    target: 55,
    goal: 55,
  },
  'gross-margin': {
    key: 'gross-margin',
    label: 'Practice Gross Margin',
    shortLabel: 'Gross Margin',
    floor: 45,
    target: 50,
    goal: 50,
  },
  'fill-rate': {
    key: 'fill-rate',
    label: 'Open Position Fill Rate',
    shortLabel: 'Fill Rate',
    floor: 50,
    target: 65,
    goal: 65,
  },
  'acceptance-rate': {
    key: 'acceptance-rate',
    label: 'Candidate Acceptance Rate',
    shortLabel: 'Acceptance',
    floor: 28,
    target: 33,
    goal: 33,
  },
}

function buildSummary(meta: MeasureMeta, achievement: number): MeasureSummary {
  const attainment = linearAttainment(achievement, meta.floor, meta.target)
  return {
    key: meta.key,
    label: meta.label,
    shortLabel: meta.shortLabel,
    unit: '%',
    achievement: round1(achievement),
    goal: meta.goal,
    floor: meta.floor,
    target: meta.target,
    weight: WEIGHT,
    attainment: Math.round(attainment * 100) / 100,
    contribution: Math.round(attainment * WEIGHT * 100) / 100,
    status: statusFor(attainment),
  }
}

/** Achievement value for a measure under a given selection. */
function achievementFor(key: BonusMeasureKey, filters: CoeBonusFilters): number {
  const rng = rngFor(filters, key)
  const meta = MEASURE_META[key]
  // Center each measure a little below its target with a spread that crosses it,
  // so demos show a healthy mix of on-track / at-risk / missed states.
  const low = meta.floor - 1.5
  const high = meta.target + 2.5
  return range(rng, low, high)
}

// ---- Recent-quarter sequence (for trend charts) -----------------------------

function recentPeriods(filters: CoeBonusFilters, count = 6): CoeBonusFilters[] {
  const order: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']
  const idx = order.indexOf(filters.quarter)
  let absolute = filters.year * 4 + idx
  const out: CoeBonusFilters[] = []
  for (let i = count - 1; i >= 0; i--) {
    const a = absolute - i
    out.push({ year: Math.floor(a / 4), quarter: order[a % 4], coe: filters.coe })
  }
  void absolute
  return out
}

function periodLabel(f: CoeBonusFilters): string {
  return `${f.year} ${f.quarter}`
}

// ---- Public mock builders ---------------------------------------------------

export function getOverviewMock(filters: CoeBonusFilters): OverviewSummary {
  const keys: BonusMeasureKey[] = [
    'placement-margin',
    'gross-margin',
    'fill-rate',
    'acceptance-rate',
  ]
  const measures = keys.map(k => buildSummary(MEASURE_META[k], achievementFor(k, filters)))
  const overallAttainment = Math.round(
    measures.reduce((sum, m) => sum + m.contribution, 0) * 100,
  ) / 100

  const trend: OverviewTrendPoint[] = recentPeriods(filters).map(p => {
    const pct = (k: BonusMeasureKey) =>
      Math.round(linearAttainment(achievementFor(k, p), MEASURE_META[k].floor, MEASURE_META[k].target) * 100)
    return {
      period: periodLabel(p),
      placementMargin: pct('placement-margin'),
      grossMargin: pct('gross-margin'),
      fillRate: pct('fill-rate'),
      acceptanceRate: pct('acceptance-rate'),
    }
  })

  return { filters, overallAttainment, measures, trend }
}

function measureTrend(key: BonusMeasureKey, filters: CoeBonusFilters): MeasureTrendPoint[] {
  const meta = MEASURE_META[key]
  return recentPeriods(filters).map(p => ({
    period: periodLabel(p),
    value: round1(achievementFor(key, p)),
    goal: meta.goal,
  }))
}

export function getPlacementMarginMock(filters: CoeBonusFilters): PlacementMarginDetail {
  const meta = MEASURE_META['placement-margin']
  const summary = buildSummary(meta, achievementFor('placement-margin', filters))
  const rng = rngFor(filters, 'placement-breakdown')
  const accounts = ['Atlas Corp', 'Northwind', 'Helios Bank', 'Vertex Health', 'Orion Retail']
  const breakdown = accounts.map(account => {
    const placements = Math.round(range(rng, 4, 22))
    const revenue = Math.round(range(rng, 180, 640)) * 1000
    const marginPct = range(rng, 46, 60)
    const cost = Math.round(revenue * (1 - marginPct / 100))
    return { account, placements, revenue, cost, marginPct }
  })
  return { summary, trend: measureTrend('placement-margin', filters), breakdown }
}

export function getGrossMarginMock(filters: CoeBonusFilters): GrossMarginDetail {
  const meta = MEASURE_META['gross-margin']
  const summary = buildSummary(meta, achievementFor('gross-margin', filters))

  // Ratcheting floor: Q1 is the baseline; the floor only ever steps UP when a
  // quarter beats the previous floor.
  const periods = recentPeriods(filters)
  let floor = 43.7
  const floorSteps: GrossMarginFloorStep[] = periods.map((p, i) => {
    const actual = round1(achievementFor('gross-margin', p))
    if (i > 0 && actual > floor) floor = actual
    const step: GrossMarginFloorStep = {
      period: periodLabel(p),
      floor: round1(floor),
      windowTop: round1(floor + 5),
      actual,
    }
    return step
  })

  return { summary, floorSteps, trend: measureTrend('gross-margin', filters) }
}

export function getFillRateMock(filters: CoeBonusFilters): FillRateDetail {
  const meta = MEASURE_META['fill-rate']
  const summary = buildSummary(meta, achievementFor('fill-rate', filters))

  const sweRng = rngFor(filters, 'fill-swe')
  const qeRng = rngFor(filters, 'fill-qe')

  const sweFill = range(sweRng, 52, 72)
  const sweOpen = Math.round(range(sweRng, 40, 120))
  const sweFilled = Math.round((sweFill / 100) * sweOpen)

  const qeFill = range(qeRng, 58, 82)
  const qeOpen = Math.round(range(qeRng, 20, 70))
  const qeFilled = Math.round((qeFill / 100) * qeOpen)

  const roles = [
    {
      role: 'Software Engineering',
      fillRate: sweFill,
      goal: 60,
      openPositions: sweOpen,
      filledPositions: sweFilled,
      status: statusFor(linearAttainment(sweFill, 50, 60)),
    },
    {
      role: 'Quality Engineering',
      fillRate: qeFill,
      goal: 70,
      openPositions: qeOpen,
      filledPositions: qeFilled,
      status: statusFor(linearAttainment(qeFill, 60, 70)),
    },
  ]

  const ttm = recentPeriods(filters).map(p => ({
    period: periodLabel(p),
    swe: round1(range(rngFor(p, 'fill-swe'), 52, 72)),
    qe: round1(range(rngFor(p, 'fill-qe'), 58, 82)),
  }))

  return { summary, roles, ttm }
}

// Acceptance Rate is now a real IPC-backed operational report
// (see coeBonusService.getAcceptanceRate) — no mock generator here.
