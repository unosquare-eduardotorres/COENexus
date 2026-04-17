import { getDatabase } from '../db/connection'
import { getAgentsDatabase } from '../db/agents/agentsConnection'
import { createLogger } from './logger'

const log = createLogger('BraniacDataAggregator')

const CHARS_PER_TOKEN = 4
const MAX_TOKEN_BUDGET = 80_000

export interface AggregatedPosition {
  upstreamId: number
  account: string
  stakeholder: string
  mainSkill: string
  countries: string
  seniorities: string
  jobTitle: string
  positionStatus: string
  aging: number
  maximumRate: number | null
  minimumRate: number | null
  closedReason: string | null
  candidates: AggregatedCandidate[]
}

export interface AggregatedCandidate {
  candidateId: number
  candidateName: string
  mainSkill: string
  isEmployee: number
  candidateStatus: string
  rate: number
  normalizedMonthlyUsd: number | null
  inferredCurrency: string | null
  currencyConfidence: string | null
  country: string | null
  seniority: string | null
  rejectionFeedback: string[]
  rejectionComments: string
  rejectionActionDate: string | null
}

export interface SalaryBandInfo {
  countryCode: string
  jobFamilyGroup: string
  band: string
  level: number
  minMonthly: number
  maxMonthly: number
}

export interface FeedbackLabel {
  id: number
  label: string
}

export interface DataCompleteness {
  hasSalaryBands: boolean
  hasFeedbackCatalog: boolean
  hasRejectionDetails: boolean
}

export interface BraniacDataBundle {
  account: string
  stakeholder?: string
  positions: AggregatedPosition[]
  salaryBands: SalaryBandInfo[]
  feedbackCatalog: FeedbackLabel[]
  dataPointsCount: number
  estimatedTokens: number
  dataCompleteness: DataCompleteness
}

function estimateTokens(data: unknown): number {
  const json = JSON.stringify(data)
  return Math.ceil(json.length / CHARS_PER_TOKEN)
}

function resolveRejectionFeedback(
  feedbackJson: string,
  catalog: Map<number, string>
): string[] {
  try {
    const ids = JSON.parse(feedbackJson) as number[]
    if (!Array.isArray(ids)) return []
    return ids.map(id => catalog.get(id) ?? `feedback_id:${id}`)
  } catch {
    return []
  }
}

function loadFeedbackCatalog(): FeedbackLabel[] {
  const nexusDb = getDatabase()
  try {
    const hasTable = nexusDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='feedback_catalog'"
    ).get()
    if (!hasTable) return []

    return nexusDb.prepare('SELECT id, label FROM feedback_catalog').all() as FeedbackLabel[]
  } catch (error) {
    log.warn('Failed to load feedback catalog, degrading gracefully', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

function loadSalaryBands(countryCode?: string): SalaryBandInfo[] {
  const agentsDb = getAgentsDatabase()
  try {
    const hasTable = agentsDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='salary_bands'"
    ).get()
    if (!hasTable) return []

    const query = countryCode
      ? 'SELECT country_code, job_family_group, band, level, min_monthly, max_monthly FROM salary_bands WHERE is_active = 1 AND country_code = ?'
      : 'SELECT country_code, job_family_group, band, level, min_monthly, max_monthly FROM salary_bands WHERE is_active = 1'

    const rows = countryCode
      ? agentsDb.prepare(query).all(countryCode)
      : agentsDb.prepare(query).all()

    return (rows as Record<string, unknown>[]).map(row => ({
      countryCode: row.country_code as string,
      jobFamilyGroup: row.job_family_group as string,
      band: row.band as string,
      level: row.level as number,
      minMonthly: row.min_monthly as number,
      maxMonthly: row.max_monthly as number,
    }))
  } catch (error) {
    log.warn('Failed to load salary bands, degrading gracefully', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

function loadPositions(account: string, stakeholder?: string): AggregatedPosition[] {
  const nexusDb = getDatabase()

  const baseQuery = stakeholder
    ? 'SELECT * FROM synced_open_positions WHERE account = ? AND stakeholder = ? ORDER BY upstream_id DESC'
    : 'SELECT * FROM synced_open_positions WHERE account = ? ORDER BY upstream_id DESC'

  const positionRows = stakeholder
    ? nexusDb.prepare(baseQuery).all(account, stakeholder) as Record<string, unknown>[]
    : nexusDb.prepare(baseQuery).all(account) as Record<string, unknown>[]

  const feedbackCatalogList = loadFeedbackCatalog()
  const feedbackMap = new Map(feedbackCatalogList.map(f => [f.id, f.label]))

  const positions: AggregatedPosition[] = []

  for (const pos of positionRows) {
    const posId = pos.id as number
    const candidateRows = nexusDb.prepare(`
      SELECT * FROM open_position_candidates
      WHERE open_position_id = ?
      ORDER BY candidate_id
    `).all(posId) as Record<string, unknown>[]

    const candidates: AggregatedCandidate[] = candidateRows.map(c => {
      const candidateId = c.candidate_id as number
      const isEmployee = c.is_employee as number

      let salaryData: { normalized_monthly_usd: number | null; inferred_currency: string | null; currency_confidence: string | null; country: string | null; seniority: string | null } | undefined
      if (isEmployee) {
        salaryData = nexusDb.prepare(
          'SELECT normalized_monthly_usd, inferred_currency, currency_confidence, country, seniority FROM synced_employees WHERE upstream_id = ?'
        ).get(candidateId) as typeof salaryData
      } else {
        salaryData = nexusDb.prepare(
          'SELECT normalized_monthly_usd, inferred_currency, currency_confidence, country, seniority FROM synced_candidates WHERE upstream_id = ?'
        ).get(candidateId) as typeof salaryData
      }

      return {
        candidateId,
        candidateName: c.candidate_name as string,
        mainSkill: c.main_skill as string,
        isEmployee,
        candidateStatus: c.candidate_status as string,
        rate: c.rate as number,
        normalizedMonthlyUsd: salaryData?.normalized_monthly_usd ?? null,
        inferredCurrency: salaryData?.inferred_currency ?? null,
        currencyConfidence: salaryData?.currency_confidence ?? null,
        country: salaryData?.country ?? null,
        seniority: salaryData?.seniority ?? null,
        rejectionFeedback: resolveRejectionFeedback(
          (c.rejection_feedback as string) ?? '[]',
          feedbackMap
        ),
        rejectionComments: (c.rejection_comments as string) ?? '',
        rejectionActionDate: (c.rejection_action_date as string) ?? null,
      }
    })

    positions.push({
      upstreamId: pos.upstream_id as number,
      account: pos.account as string,
      stakeholder: pos.stakeholder as string,
      mainSkill: pos.main_skill as string,
      countries: pos.countries as string,
      seniorities: pos.seniorities as string,
      jobTitle: pos.job_title as string,
      positionStatus: pos.position_status as string,
      aging: pos.aging as number,
      maximumRate: (pos.maximum_rate as number) ?? null,
      minimumRate: (pos.minimum_rate as number) ?? null,
      closedReason: (pos.closed_reason as string) ?? null,
      candidates,
    })
  }

  return positions
}

function summarizePositions(positions: AggregatedPosition[], maxTokens: number): AggregatedPosition[] {
  let current = estimateTokens(positions)
  if (current <= maxTokens) return positions

  const sorted = [...positions].sort((a, b) => {
    const aDate = a.aging
    const bDate = b.aging
    return aDate - bDate
  })

  const result: AggregatedPosition[] = []
  let runningTokens = 0

  for (const pos of sorted) {
    const posTokens = estimateTokens(pos)
    if (runningTokens + posTokens > maxTokens) {
      log.info('Truncated positions to fit token budget', {
        included: result.length,
        total: positions.length,
        estimatedTokens: runningTokens,
      })
      break
    }
    result.push(pos)
    runningTokens += posTokens
  }

  return result
}

export const braniacDataAggregator = {
  aggregateForAccount(account: string): BraniacDataBundle {
    log.info('Aggregating data for account', { account })

    const positions = loadPositions(account)
    const salaryBands = loadSalaryBands()
    const feedbackCatalog = loadFeedbackCatalog()

    const hasRejectionDetails = positions.some(p =>
      p.candidates.some(c => c.rejectionFeedback.length > 0 || c.rejectionComments.length > 0)
    )

    const dataPointsCount = positions.reduce(
      (sum, p) => sum + Math.max(1, p.candidates.length),
      0
    )

    let finalPositions = positions
    let estimatedTokensRaw = estimateTokens({ positions, salaryBands, feedbackCatalog })

    if (estimatedTokensRaw > MAX_TOKEN_BUDGET) {
      log.warn('Data exceeds token budget, summarizing', {
        account,
        rawTokens: estimatedTokensRaw,
        budget: MAX_TOKEN_BUDGET,
      })
      finalPositions = summarizePositions(positions, MAX_TOKEN_BUDGET - estimateTokens({ salaryBands, feedbackCatalog }))
      estimatedTokensRaw = estimateTokens({ positions: finalPositions, salaryBands, feedbackCatalog })
    }

    return {
      account,
      positions: finalPositions,
      salaryBands,
      feedbackCatalog,
      dataPointsCount,
      estimatedTokens: estimatedTokensRaw,
      dataCompleteness: {
        hasSalaryBands: salaryBands.length > 0,
        hasFeedbackCatalog: feedbackCatalog.length > 0,
        hasRejectionDetails,
      },
    }
  },

  aggregateForStakeholder(account: string, stakeholder: string): BraniacDataBundle {
    log.info('Aggregating data for stakeholder', { account, stakeholder })

    const positions = loadPositions(account, stakeholder)
    const salaryBands = loadSalaryBands()
    const feedbackCatalog = loadFeedbackCatalog()

    const hasRejectionDetails = positions.some(p =>
      p.candidates.some(c => c.rejectionFeedback.length > 0 || c.rejectionComments.length > 0)
    )

    const dataPointsCount = positions.reduce(
      (sum, p) => sum + Math.max(1, p.candidates.length),
      0
    )

    let finalPositions = positions
    let estimatedTokensRaw = estimateTokens({ positions, salaryBands, feedbackCatalog })

    if (estimatedTokensRaw > MAX_TOKEN_BUDGET) {
      log.warn('Data exceeds token budget, summarizing', {
        account,
        stakeholder,
        rawTokens: estimatedTokensRaw,
        budget: MAX_TOKEN_BUDGET,
      })
      finalPositions = summarizePositions(positions, MAX_TOKEN_BUDGET - estimateTokens({ salaryBands, feedbackCatalog }))
      estimatedTokensRaw = estimateTokens({ positions: finalPositions, salaryBands, feedbackCatalog })
    }

    return {
      account,
      stakeholder,
      positions: finalPositions,
      salaryBands,
      feedbackCatalog,
      dataPointsCount,
      estimatedTokens: estimatedTokensRaw,
      dataCompleteness: {
        hasSalaryBands: salaryBands.length > 0,
        hasFeedbackCatalog: feedbackCatalog.length > 0,
        hasRejectionDetails,
      },
    }
  },
}
