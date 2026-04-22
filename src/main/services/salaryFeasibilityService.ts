import { getDatabase } from '../db/connection'
import { getAgentsDatabase } from '../db/agents/agentsConnection'
import { createLogger } from './logger'

const log = createLogger('SalaryFeasibility')

const HOURLY_TO_MONTHLY_FACTOR = 160

export type FeasibilityVerdict = 'feasible' | 'marginal' | 'not-feasible' | 'unknown'

export interface SalaryFeasibilityResult {
  candidateUpstreamId: number
  candidateName: string
  sourceType: 'candidates' | 'employees'
  country: string
  seniority: string
  normalizedMonthlyUsd: number | null
  currencyConfidence: string | null
  positionMonthlyBudget: number | null
  verdict: FeasibilityVerdict
  reason: string
  seniorityAdjusted: boolean
  employmentTypeNote: string | null
}

interface ClientOverride {
  override_text: string
}

interface PositionRateInfo {
  minimum_rate: number | null
  maximum_rate: number | null
}

function positionRateToMonthly(rate: PositionRateInfo): number | null {
  const effectiveRate = rate.maximum_rate ?? rate.minimum_rate
  if (effectiveRate === null) return null
  return effectiveRate * HOURLY_TO_MONTHLY_FACTOR
}

function parseSeniorityLevel(seniority: string): number {
  const lower = seniority.toLowerCase()
  if (lower.includes('junior') || lower.includes('jr')) return 1
  if (lower.includes('intermediate') || lower.includes('mid')) return 2
  if (lower.includes('senior') || lower.includes('sr')) return 3
  if (lower.includes('lead') || lower.includes('principal') || lower.includes('staff')) return 4
  if (lower.includes('architect') || lower.includes('director')) return 5
  return 2
}

function checkSeniorityFlexibility(
  candidateSeniority: string,
  positionSeniorities: string,
  clientId: string
): { flexible: boolean; delta: number } {
  const candidateLevel = parseSeniorityLevel(candidateSeniority)
  const positionLevels = positionSeniorities.split(',').map(s => parseSeniorityLevel(s.trim()))
  const minRequired = Math.min(...positionLevels)

  const delta = candidateLevel - minRequired
  if (delta >= 0) return { flexible: false, delta: 0 }

  let allowedDelta = 0
  try {
    const db = getAgentsDatabase()
    const hasTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='client_rule_overrides'"
    ).get()
    if (hasTable) {
      const overrides = db.prepare(
        "SELECT override_text FROM client_rule_overrides WHERE client_id = ? AND is_active = 1"
      ).all(clientId) as ClientOverride[]

      for (const override of overrides) {
        const match = override.override_text.match(/seniority\s*-(\d+)/i)
        if (match) {
          allowedDelta = Math.max(allowedDelta, parseInt(match[1], 10))
        }
      }
    }
  } catch {
    log.warn('Failed to check client seniority overrides')
  }

  return { flexible: Math.abs(delta) <= allowedDelta, delta }
}

const CONTRACTOR_HEAVY_COUNTRIES = ['BOL', 'PRY', 'Bolivia', 'Paraguay']

const FTE_OVERHEAD_MULTIPLIER = 1.35

function getEmploymentTypeNote(country: string): string | null {
  const isContractorHeavy = CONTRACTOR_HEAVY_COUNTRIES.some(
    c => country.toLowerCase() === c.toLowerCase()
  )
  if (isContractorHeavy) {
    return `${country} is a contractor-heavy market. Consider both FTE salary band and contractor rate structures.`
  }
  return null
}

export interface EmploymentCostComparison {
  country: string
  candidateName: string
  normalizedMonthlyUsd: number
  fteEstimatedCost: number
  contractorEstimatedCost: number
  isContractorHeavyCountry: boolean
  recommendation: 'fte' | 'contractor' | 'either'
  reason: string
}

export function compareEmploymentCosts(
  normalizedMonthlyUsd: number,
  country: string,
  candidateName: string
): EmploymentCostComparison {
  const isContractorHeavy = CONTRACTOR_HEAVY_COUNTRIES.some(
    c => country.toLowerCase() === c.toLowerCase()
  )

  const fteEstimatedCost = normalizedMonthlyUsd * FTE_OVERHEAD_MULTIPLIER
  const contractorEstimatedCost = normalizedMonthlyUsd * 1.1

  let recommendation: 'fte' | 'contractor' | 'either'
  let reason: string

  if (!isContractorHeavy) {
    recommendation = 'fte'
    reason = `${country} is primarily an FTE market. Contractor arrangements are non-standard.`
  } else if (contractorEstimatedCost < fteEstimatedCost * 0.85) {
    recommendation = 'contractor'
    reason = `Contractor cost (${contractorEstimatedCost.toLocaleString()}/mo) is significantly lower than FTE (${fteEstimatedCost.toLocaleString()}/mo) in ${country}`
  } else {
    recommendation = 'either'
    reason = `Both FTE (${fteEstimatedCost.toLocaleString()}/mo) and contractor (${contractorEstimatedCost.toLocaleString()}/mo) are viable in ${country}`
  }

  return {
    country,
    candidateName,
    normalizedMonthlyUsd,
    fteEstimatedCost,
    contractorEstimatedCost,
    isContractorHeavyCountry: isContractorHeavy,
    recommendation,
    reason,
  }
}

export function evaluateSalaryFeasibility(
  candidateMonthlyUsd: number | null,
  currencyConfidence: string | null,
  positionRate: PositionRateInfo,
  candidateSeniority: string,
  positionSeniorities: string,
  country: string,
  clientId: string
): { verdict: FeasibilityVerdict; reason: string; seniorityAdjusted: boolean; employmentTypeNote: string | null } {
  const positionBudget = positionRateToMonthly(positionRate)
  const employmentTypeNote = getEmploymentTypeNote(country)

  if (candidateMonthlyUsd === null) {
    return {
      verdict: 'unknown',
      reason: 'No normalized salary data available for this candidate',
      seniorityAdjusted: false,
      employmentTypeNote,
    }
  }

  if (positionBudget === null) {
    return {
      verdict: 'unknown',
      reason: 'Position has no rate information to compare against',
      seniorityAdjusted: false,
      employmentTypeNote,
    }
  }

  const seniorityCheck = checkSeniorityFlexibility(candidateSeniority, positionSeniorities, clientId)
  const margin = positionBudget - candidateMonthlyUsd
  const marginPercent = (margin / positionBudget) * 100

  const confidenceWarning = currencyConfidence === 'low'
    ? ' (salary confidence is low — verify before presenting)'
    : ''

  if (margin >= 0 && marginPercent >= 15) {
    return {
      verdict: 'feasible',
      reason: `Candidate salary ($${candidateMonthlyUsd.toLocaleString()}/mo) is within budget ($${positionBudget.toLocaleString()}/mo) with ${marginPercent.toFixed(0)}% margin${confidenceWarning}`,
      seniorityAdjusted: seniorityCheck.flexible,
      employmentTypeNote,
    }
  }

  if (margin >= 0 && marginPercent < 15) {
    return {
      verdict: 'marginal',
      reason: `Candidate salary ($${candidateMonthlyUsd.toLocaleString()}/mo) is within budget ($${positionBudget.toLocaleString()}/mo) but tight margin (${marginPercent.toFixed(0)}%)${confidenceWarning}`,
      seniorityAdjusted: seniorityCheck.flexible,
      employmentTypeNote,
    }
  }

  if (seniorityCheck.flexible && seniorityCheck.delta < 0) {
    return {
      verdict: 'marginal',
      reason: `Candidate salary ($${candidateMonthlyUsd.toLocaleString()}/mo) exceeds budget ($${positionBudget.toLocaleString()}/mo) but seniority -${Math.abs(seniorityCheck.delta)} is allowed for this client${confidenceWarning}`,
      seniorityAdjusted: true,
      employmentTypeNote,
    }
  }

  return {
    verdict: 'not-feasible',
    reason: `Candidate salary ($${candidateMonthlyUsd.toLocaleString()}/mo) exceeds position budget ($${positionBudget.toLocaleString()}/mo) by ${Math.abs(marginPercent).toFixed(0)}%${confidenceWarning}`,
    seniorityAdjusted: false,
    employmentTypeNote,
  }
}

export interface CountryFeasibilityEntry {
  country: string
  seniority: string
  salaryBandMin: number | null
  salaryBandMax: number | null
  positionMonthlyBudget: number | null
  verdict: FeasibilityVerdict
  reason: string
  employmentTypeNote: string | null
}

export function buildCountrySalaryMatrix(
  positionUpstreamId: number
): CountryFeasibilityEntry[] {
  const db = getDatabase()
  const position = db.prepare(
    'SELECT minimum_rate, maximum_rate, account, seniorities, countries FROM synced_open_positions WHERE upstream_id = ?'
  ).get(positionUpstreamId) as { minimum_rate: number | null; maximum_rate: number | null; account: string; seniorities: string; countries: string } | undefined

  if (!position) return []

  const positionBudget = positionRateToMonthly(position)
  const countries = position.countries ? position.countries.split(',').map(c => c.trim()) : []
  const seniorities = position.seniorities ? position.seniorities.split(',').map(s => s.trim()) : ['Mid']

  let salaryBands: Array<{ country_code: string; band: string; level: number; min_monthly: number; max_monthly: number }> = []
  try {
    const agentsDb = getAgentsDatabase()
    const hasTable = agentsDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='salary_bands'"
    ).get()
    if (hasTable) {
      salaryBands = agentsDb.prepare(
        'SELECT country_code, band, level, min_monthly, max_monthly FROM salary_bands WHERE is_active = 1'
      ).all() as typeof salaryBands
    }
  } catch {
    log.warn('Failed to load salary bands for feasibility matrix')
  }

  const bandMap = new Map<string, typeof salaryBands>()
  for (const band of salaryBands) {
    const key = band.country_code.toUpperCase()
    if (!bandMap.has(key)) bandMap.set(key, [])
    bandMap.get(key)!.push(band)
  }

  const allCountries = new Set<string>([
    ...countries,
    'MX', 'CO', 'BOL', 'PRY', 'US', 'UK', 'AR', 'PE', 'CR',
  ])

  const results: CountryFeasibilityEntry[] = []

  for (const country of allCountries) {
    for (const seniority of seniorities) {
      const level = parseSeniorityLevel(seniority)
      const countryBands = bandMap.get(country.toUpperCase()) ?? []
      const matchingBand = countryBands.find(b => b.level === level)
        ?? countryBands.find(b => Math.abs(b.level - level) <= 1)

      const employmentTypeNote = getEmploymentTypeNote(country)

      if (!matchingBand) {
        results.push({
          country,
          seniority,
          salaryBandMin: null,
          salaryBandMax: null,
          positionMonthlyBudget: positionBudget,
          verdict: 'unknown',
          reason: `No salary band data for ${country} at ${seniority} level`,
          employmentTypeNote,
        })
        continue
      }

      if (positionBudget === null) {
        results.push({
          country,
          seniority,
          salaryBandMin: matchingBand.min_monthly,
          salaryBandMax: matchingBand.max_monthly,
          positionMonthlyBudget: null,
          verdict: 'unknown',
          reason: 'Position has no rate to compare against',
          employmentTypeNote,
        })
        continue
      }

      const margin = positionBudget - matchingBand.max_monthly
      const marginPercent = (margin / positionBudget) * 100

      let verdict: FeasibilityVerdict
      let reason: string

      if (margin >= 0 && marginPercent >= 15) {
        verdict = 'feasible'
        reason = `Salary band max (${matchingBand.max_monthly.toLocaleString()}/mo) is within budget (${positionBudget.toLocaleString()}/mo) with ${marginPercent.toFixed(0)}% margin`
      } else if (margin >= 0) {
        verdict = 'marginal'
        reason = `Salary band max (${matchingBand.max_monthly.toLocaleString()}/mo) is within budget but tight margin (${marginPercent.toFixed(0)}%)`
      } else {
        const minMargin = positionBudget - matchingBand.min_monthly
        if (minMargin >= 0) {
          verdict = 'marginal'
          reason = `Band range (${matchingBand.min_monthly.toLocaleString()}–${matchingBand.max_monthly.toLocaleString()}/mo) overlaps with budget (${positionBudget.toLocaleString()}/mo) — lower-range candidates may work`
        } else {
          verdict = 'not-feasible'
          reason = `Even minimum salary band (${matchingBand.min_monthly.toLocaleString()}/mo) exceeds budget (${positionBudget.toLocaleString()}/mo)`
        }
      }

      results.push({
        country,
        seniority,
        salaryBandMin: matchingBand.min_monthly,
        salaryBandMax: matchingBand.max_monthly,
        positionMonthlyBudget: positionBudget,
        verdict,
        reason,
        employmentTypeNote,
      })
    }
  }

  return results
}

export function batchEvaluateFeasibility(
  positionUpstreamId: number,
  candidates: Array<{
    upstreamId: number
    fullName: string
    sourceType: 'candidates' | 'employees'
    country: string
    seniority: string
    normalizedMonthlyUsd: number | null
    currencyConfidence: string | null
  }>
): SalaryFeasibilityResult[] {
  const db = getDatabase()

  const position = db.prepare(
    'SELECT minimum_rate, maximum_rate, account, seniorities FROM synced_open_positions WHERE upstream_id = ?'
  ).get(positionUpstreamId) as { minimum_rate: number | null; maximum_rate: number | null; account: string; seniorities: string } | undefined

  if (!position) {
    log.warn('Position not found for feasibility check', { positionUpstreamId })
    return candidates.map(c => ({
      candidateUpstreamId: c.upstreamId,
      candidateName: c.fullName,
      sourceType: c.sourceType,
      country: c.country,
      seniority: c.seniority,
      normalizedMonthlyUsd: c.normalizedMonthlyUsd,
      currencyConfidence: c.currencyConfidence,
      positionMonthlyBudget: null,
      verdict: 'unknown' as const,
      reason: 'Position not found',
      seniorityAdjusted: false,
      employmentTypeNote: null,
    }))
  }

  const positionBudget = positionRateToMonthly(position)

  return candidates.map(c => {
    const result = evaluateSalaryFeasibility(
      c.normalizedMonthlyUsd,
      c.currencyConfidence,
      position,
      c.seniority,
      position.seniorities,
      c.country,
      position.account
    )

    return {
      candidateUpstreamId: c.upstreamId,
      candidateName: c.fullName,
      sourceType: c.sourceType,
      country: c.country,
      seniority: c.seniority,
      normalizedMonthlyUsd: c.normalizedMonthlyUsd,
      currencyConfidence: c.currencyConfidence,
      positionMonthlyBudget: positionBudget,
      ...result,
    }
  })
}
