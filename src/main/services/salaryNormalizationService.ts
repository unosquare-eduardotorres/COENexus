import { getAllExchangeRates } from '../db/agents/repositories/exchangeRateRepository'
import { getSalaryBandsByCountry, getCountryByUpstreamName } from '../db/agents/repositories/salaryBandRepository'
import { getDatabase } from '../db/connection'
import { createLogger } from './logger'

const log = createLogger('SalaryNormalization')

interface NormalizationResult {
  normalizedMonthlyUsd: number | null
  inferredCurrency: string | null
  currencyConfidence: 'exact' | 'high' | 'medium' | 'low' | null
  reasoning?: string
}

interface InferenceResult {
  currency: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

const SENIORITY_MAP: Record<string, string[]> = {
  'trainee': ['Trainee'],
  'junior': ['Junior'],
  'intermediate': ['Intermediate'],
  'senior': ['Senior'],
  'lead': ['Lead', 'Staff'],
  'staff': ['Staff', 'Lead'],
  'principal': ['Principal'],
}

function normalizeSeniorityForBand(seniority: string): string[] {
  const lower = seniority.toLowerCase()
  for (const [key, values] of Object.entries(SENIORITY_MAP)) {
    if (lower.includes(key)) return values
  }
  return [seniority]
}

function checkAgainstBands(
  amount: number,
  countryCode: string,
  seniority?: string
): { fits: boolean; currency: string } | null {
  try {
    const bands = getSalaryBandsByCountry(countryCode)
    if (bands.length === 0) return null

    const seniorityBands = seniority
      ? normalizeSeniorityForBand(seniority)
      : []

    const relevantBands = seniorityBands.length > 0
      ? bands.filter(b => seniorityBands.some(s => b.band.toLowerCase().includes(s.toLowerCase())))
      : bands

    const bandsToCheck = relevantBands.length > 0 ? relevantBands : bands

    for (const band of bandsToCheck) {
      if (amount >= band.min_monthly && amount <= band.max_monthly) {
        const country = getCountryByUpstreamName(countryCode) ?? { default_currency: 'USD' }
        return { fits: true, currency: country.default_currency }
      }
    }

    return { fits: false, currency: '' }
  } catch {
    return null
  }
}

function inferCurrency(
  amount: number,
  countryCode: string,
  seniority?: string,
  _jobFamilyGroup?: string
): InferenceResult {
  const upper = countryCode.toUpperCase()

  if (upper === 'US') {
    return { currency: 'USD', confidence: 'high', reasoning: 'US-based — always USD' }
  }

  if (upper === 'UK') {
    return { currency: 'GBP', confidence: 'high', reasoning: 'UK-based — always GBP' }
  }

  if (upper === 'CO') {
    if (amount > 100_000) {
      return { currency: 'COP', confidence: 'high', reasoning: `CO: amount ${amount} > 100,000 — COP` }
    }
    if (amount < 10_000) {
      return { currency: 'USD', confidence: 'high', reasoning: `CO: amount ${amount} < 10,000 — USD` }
    }
    const bandCheck = checkAgainstBands(amount, 'CO', seniority)
    if (bandCheck?.fits) {
      return { currency: bandCheck.currency, confidence: 'medium', reasoning: `CO: amount ${amount} fits local band — ${bandCheck.currency}` }
    }
    return { currency: 'COP', confidence: 'medium', reasoning: `CO: amount ${amount} ambiguous range, defaulting COP` }
  }

  if (upper === 'PRY') {
    if (amount > 50_000) {
      return { currency: 'PYG', confidence: 'high', reasoning: `PRY: amount ${amount} > 50,000 — PYG` }
    }
    if (amount < 10_000) {
      return { currency: 'USD', confidence: 'high', reasoning: `PRY: amount ${amount} < 10,000 — USD` }
    }
    const bandCheck = checkAgainstBands(amount, 'PRY', seniority)
    if (bandCheck?.fits) {
      return { currency: bandCheck.currency, confidence: 'medium', reasoning: `PRY: amount ${amount} fits local band — ${bandCheck.currency}` }
    }
    return { currency: 'PYG', confidence: 'medium', reasoning: `PRY: amount ${amount} ambiguous range, defaulting PYG` }
  }

  if (upper === 'MX') {
    if (amount > 8_000) {
      return { currency: 'MXN', confidence: 'high', reasoning: `MX: amount ${amount} > 8,000 — MXN` }
    }
    if (amount < 1_000) {
      return { currency: 'USD', confidence: 'high', reasoning: `MX: amount ${amount} < 1,000 — USD` }
    }
    const bandCheck = checkAgainstBands(amount, 'MX', seniority)
    if (bandCheck?.fits) {
      return { currency: bandCheck.currency, confidence: 'medium', reasoning: `MX: amount ${amount} fits local band — ${bandCheck.currency}` }
    }
    return { currency: 'MXN', confidence: 'medium', reasoning: `MX: amount ${amount} ambiguous range, defaulting MXN` }
  }

  if (upper === 'BOL') {
    const bolBandCheck = checkAgainstBands(amount, 'BOL', seniority)
    if (bolBandCheck?.fits) {
      return { currency: 'BOB', confidence: 'medium', reasoning: `BOL: amount ${amount} fits BOB band for ${seniority ?? 'any'} seniority` }
    }

    const rates = getAllExchangeRates()
    const bobRate = rates['BOB']
    if (bobRate && amount < 10_000) {
      return { currency: 'USD', confidence: 'medium', reasoning: `BOL: amount ${amount} doesn't fit BOB bands, treating as USD` }
    }

    if (amount > 10_000) {
      return { currency: 'BOB', confidence: 'low', reasoning: `BOL: amount ${amount} > 10,000 — likely BOB but low confidence` }
    }

    return { currency: 'USD', confidence: 'low', reasoning: `BOL: amount ${amount} ambiguous — low confidence USD` }
  }

  return { currency: 'USD', confidence: 'low', reasoning: `Unknown country ${countryCode} — defaulting USD with low confidence` }
}

function normalizeToUsdMonthly(
  amount: number,
  currency: string,
  period: 'monthly' | 'hourly' = 'monthly'
): number | null {
  const rates = getAllExchangeRates()
  const rate = rates[currency.toUpperCase()]
  if (rate === undefined) return null

  const monthlyAmount = period === 'hourly' ? amount * 160 : amount
  return Math.round(monthlyAmount * rate * 100) / 100
}

function resolveCountryCode(country: string | null): string | null {
  if (!country) return null

  if (country.length <= 3) return country.toUpperCase()

  try {
    const countryRow = getCountryByUpstreamName(country)
    if (countryRow) return countryRow.code
  } catch {
    // agents db might not be available
  }

  const nameMap: Record<string, string> = {
    'colombia': 'CO',
    'mexico': 'MX',
    'méxico': 'MX',
    'united states': 'US',
    'united kingdom': 'UK',
    'bolivia': 'BOL',
    'paraguay': 'PRY',
  }
  return nameMap[country.toLowerCase()] ?? null
}

function normalizeSalary(params: {
  amount: number | null
  currency: string | null
  country: string | null
  seniority?: string | null
  period?: 'monthly' | 'hourly'
  jobFamilyGroup?: string
}): NormalizationResult {
  if (params.amount === null || params.amount === undefined || params.amount === 0) {
    return { normalizedMonthlyUsd: null, inferredCurrency: null, currencyConfidence: null }
  }

  const countryCode = resolveCountryCode(params.country)

  let resolvedCurrency: string
  let confidence: NormalizationResult['currencyConfidence']
  let reasoning: string | undefined

  if (params.currency) {
    resolvedCurrency = params.currency.toUpperCase()
    confidence = 'exact'
    reasoning = `Currency provided: ${resolvedCurrency}`
  } else if (countryCode) {
    const inference = inferCurrency(
      params.amount,
      countryCode,
      params.seniority ?? undefined,
      params.jobFamilyGroup
    )
    resolvedCurrency = inference.currency
    confidence = inference.confidence
    reasoning = inference.reasoning
  } else {
    return {
      normalizedMonthlyUsd: null,
      inferredCurrency: null,
      currencyConfidence: 'low',
      reasoning: 'No currency and no country — cannot infer',
    }
  }

  const normalized = normalizeToUsdMonthly(
    params.amount,
    resolvedCurrency,
    params.period ?? 'monthly'
  )

  return {
    normalizedMonthlyUsd: normalized,
    inferredCurrency: resolvedCurrency,
    currencyConfidence: confidence,
    reasoning,
  }
}

function backfillAll(): { candidatesUpdated: number; employeesUpdated: number; errors: number } {
  const db = getDatabase()
  let candidatesUpdated = 0
  let employeesUpdated = 0
  let errors = 0

  const candidates = db.prepare(
    'SELECT id, current_salary, salary_currency, salary_expectations, salary_expectations_currency, country, seniority FROM synced_candidates'
  ).all() as { id: number; current_salary: number | null; salary_currency: string | null; salary_expectations: number | null; salary_expectations_currency: string | null; country: string | null; seniority: string | null }[]

  const updateCandStmt = db.prepare(`
    UPDATE synced_candidates
    SET normalized_monthly_usd = ?, inferred_currency = ?, currency_confidence = ?
    WHERE id = ?
  `)

  const candidateTx = db.transaction(() => {
    for (const c of candidates) {
      try {
        const expectNorm = normalizeSalary({
          amount: c.salary_expectations,
          currency: c.salary_expectations_currency ?? c.salary_currency,
          country: c.country,
          seniority: c.seniority,
        })
        const currentNorm = normalizeSalary({
          amount: c.current_salary,
          currency: c.salary_currency,
          country: c.country,
          seniority: c.seniority,
        })
        const primary = expectNorm.normalizedMonthlyUsd ? expectNorm : currentNorm
        if (primary.normalizedMonthlyUsd !== null) {
          updateCandStmt.run(primary.normalizedMonthlyUsd, primary.inferredCurrency, primary.currencyConfidence, c.id)
          candidatesUpdated++
        }
      } catch {
        errors++
      }
    }
  })
  candidateTx()

  const employees = db.prepare(
    'SELECT id, gross_monthly_salary, salary_currency, rate, country, seniority FROM synced_employees'
  ).all() as { id: number; gross_monthly_salary: number | null; salary_currency: string | null; rate: number | null; country: string | null; seniority: string | null }[]

  const updateEmpStmt = db.prepare(`
    UPDATE synced_employees
    SET normalized_monthly_usd = ?, inferred_currency = ?, currency_confidence = ?
    WHERE id = ?
  `)

  const employeeTx = db.transaction(() => {
    for (const e of employees) {
      try {
        if (e.gross_monthly_salary) {
          const norm = normalizeSalary({
            amount: e.gross_monthly_salary,
            currency: e.salary_currency,
            country: e.country,
            seniority: e.seniority,
          })
          if (norm.normalizedMonthlyUsd !== null) {
            updateEmpStmt.run(norm.normalizedMonthlyUsd, norm.inferredCurrency, norm.currencyConfidence, e.id)
            employeesUpdated++
          }
        } else if (e.rate) {
          const norm = normalizeSalary({
            amount: e.rate,
            currency: 'USD',
            country: e.country,
            period: 'hourly',
          })
          if (norm.normalizedMonthlyUsd !== null) {
            updateEmpStmt.run(norm.normalizedMonthlyUsd, 'USD', 'low', e.id)
            employeesUpdated++
          }
        }
      } catch {
        errors++
      }
    }
  })
  employeeTx()

  log.info('Salary backfill completed', { candidatesUpdated, employeesUpdated, errors })
  return { candidatesUpdated, employeesUpdated, errors }
}

export const salaryNormalizationService = {
  normalizeSalary,
  inferCurrency,
  normalizeToUsdMonthly,
  backfillAll,
  resolveCountryCode,
}
