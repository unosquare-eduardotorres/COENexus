import type { BraniacAccountSummary } from '../../shared/ipc-types'
import type { StakeholderProfileRow } from '../db/agents/repositories/stakeholderProfileRepository'

function parseJsonArraySafe(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return numerator / denominator
}

function weightedAverage(
  values: Array<{ value: number | null; weight: number }>,
): number | null {
  let totalWeight = 0
  let weightedSum = 0
  for (const { value, weight } of values) {
    if (value === null || value === undefined || weight <= 0) continue
    weightedSum += value * weight
    totalWeight += weight
  }
  if (totalWeight === 0) return null
  return weightedSum / totalWeight
}

function simpleAverage(values: Array<number | null>): number | null {
  const valid = values.filter((v): v is number => v !== null && v !== undefined)
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

function topNByFrequency(all: string[], n: number): string[] {
  const counts = new Map<string, number>()
  for (const item of all) {
    if (!item) continue
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([item]) => item)
}

function unionStrings(arrays: string[][]): string[] {
  const set = new Set<string>()
  for (const arr of arrays) {
    for (const item of arr) {
      if (item) set.add(item)
    }
  }
  return [...set].sort()
}

function minNonNull(values: Array<number | null>): number | null {
  const valid = values.filter((v): v is number => v !== null && v !== undefined)
  if (valid.length === 0) return null
  return Math.min(...valid)
}

function maxNonNull(values: Array<number | null>): number | null {
  const valid = values.filter((v): v is number => v !== null && v !== undefined)
  if (valid.length === 0) return null
  return Math.max(...valid)
}

export function aggregateAccountMetrics(
  account: string,
  rows: StakeholderProfileRow[],
): BraniacAccountSummary {
  const totalPresented = rows.reduce((s, r) => s + (r.total_candidates_presented ?? 0), 0)
  const totalAccepted = rows.reduce((s, r) => s + (r.total_candidates_accepted ?? 0), 0)
  const totalClosed = rows.reduce((s, r) => s + (r.total_closed_positions ?? 0), 0)
  const totalWon = rows.reduce((s, r) => s + (r.total_won_positions ?? 0), 0)
  const totalDataPoints = rows.reduce((s, r) => s + (r.data_points_count ?? 0), 0)

  const avgDaysToClose = weightedAverage(
    rows.map(r => ({
      value: r.avg_days_to_close,
      weight: r.total_candidates_presented ?? 0,
    })),
  )

  const avgAcceptedRate = weightedAverage(
    rows.map(r => ({
      value: r.avg_accepted_rate,
      weight: r.total_candidates_accepted ?? 0,
    })),
  )

  const avgPublishedRate = weightedAverage(
    rows.map(r => ({
      value: r.avg_published_rate,
      weight: r.total_candidates_presented ?? 0,
    })),
  )

  const avgTimeToDecision = weightedAverage(
    rows.map(r => ({
      value: r.avg_time_to_decision_days,
      weight: r.data_points_count ?? 0,
    })),
  )

  const avgConfidence = simpleAverage(rows.map(r => r.confidence_score ?? 0)) ?? 0

  const observedRateFloor = minNonNull(rows.map(r => r.observed_rate_floor))
  const observedRateCeiling = maxNonNull(rows.map(r => r.observed_rate_ceiling))

  const allAcceptedCountries = rows.map(r => parseJsonArraySafe(r.accepted_countries))
  const allRejectedCountries = rows.map(r => parseJsonArraySafe(r.rejected_countries))

  const allRejectionReasons = rows.flatMap(r => parseJsonArraySafe(r.top_rejection_reasons))
  const allAcceptanceSignals = rows.flatMap(r => parseJsonArraySafe(r.top_acceptance_signals))

  const sortedByUpdated = [...rows].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
  const lastAnalyzedAt = sortedByUpdated[0]?.updated_at ?? null
  const lastInferenceJobId = sortedByUpdated[0]?.last_inference_job_id ?? null

  return {
    account,
    stakeholder_count: rows.length,
    total_candidates_presented: totalPresented,
    total_candidates_accepted: totalAccepted,
    success_rate: safeDivide(totalAccepted, totalPresented),
    total_closed_positions: totalClosed,
    total_won_positions: totalWon,
    win_rate: safeDivide(totalWon, totalClosed),
    avg_days_to_close: avgDaysToClose,
    observed_rate_floor: observedRateFloor,
    observed_rate_ceiling: observedRateCeiling,
    avg_accepted_rate: avgAcceptedRate,
    avg_published_rate: avgPublishedRate,
    avg_time_to_decision_days: avgTimeToDecision,
    accepted_countries: unionStrings(allAcceptedCountries),
    rejected_countries: unionStrings(allRejectedCountries),
    top_rejection_reasons: topNByFrequency(allRejectionReasons, 5),
    top_acceptance_signals: topNByFrequency(allAcceptanceSignals, 5),
    avg_confidence_score: avgConfidence,
    total_data_points: totalDataPoints,
    last_analyzed_at: lastAnalyzedAt,
    last_inference_job_id: lastInferenceJobId,
  }
}
