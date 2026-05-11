import { getDatabase } from '../db/connection'
import { getAgentsDatabase } from '../db/agents/agentsConnection'
import { embeddingRepository, type ResumeSkills } from '../db/repositories/embeddingRepository'
import { createLogger } from './logger'

const log = createLogger('BraniacDataAggregator')

const CHARS_PER_TOKEN = 4
export const MAX_TOKEN_BUDGET = 80_000

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

export interface ResumeSkillsInfo {
  primaryStack: string[]
  secondaryStack: string[]
  roles: string[]
  yearsExperience: number | null
  seniority: string[]
  summary: string
  source: 'resume-session' | 'employees' | 'candidates'
}

export interface AggregatedCandidate {
  candidateId: number
  candidateName: string
  requisitionTaggedSkill: string
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
  resumeSkills: ResumeSkillsInfo | null
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
  hasResumeSkills: boolean
  resumeSkillsCoverage: number
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

export interface PositionBatch {
  batchIndex: number
  totalBatches: number
  positions: AggregatedPosition[]
  salaryBands: SalaryBandInfo[]
  feedbackCatalog: FeedbackLabel[]
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

  try {
    const hasTable = nexusDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='synced_open_positions'"
    ).get()
    if (!hasTable) {
      log.warn('synced_open_positions table not found, returning empty positions')
      return []
    }

    const baseQuery = stakeholder
      ? 'SELECT * FROM synced_open_positions WHERE account = ? AND stakeholder = ? ORDER BY upstream_id DESC'
      : 'SELECT * FROM synced_open_positions WHERE account = ? ORDER BY upstream_id DESC'

    const positionRows = stakeholder
      ? nexusDb.prepare(baseQuery).all(account, stakeholder) as Record<string, unknown>[]
      : nexusDb.prepare(baseQuery).all(account) as Record<string, unknown>[]

    const feedbackCatalogList = loadFeedbackCatalog()
    const feedbackMap = new Map(feedbackCatalogList.map(f => [f.id, f.label]))

    const droppedZeroMins = positionRows.filter(p =>
      (p.minimum_rate as number | null) === 0
    ).length
    if (droppedZeroMins > 0) {
      log.info('Normalizing positions with minimum_rate=0 to null (human-error floor)', {
        account,
        stakeholder,
        count: droppedZeroMins,
        totalPositions: positionRows.length,
      })
    }

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
          requisitionTaggedSkill: c.main_skill as string,
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
          resumeSkills: null,
        }
      })

      const rawMin = pos.minimum_rate as number | null
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
        minimumRate: rawMin != null && rawMin > 0 ? rawMin : null,
        closedReason: (pos.closed_reason as string) ?? null,
        candidates,
      })
    }

    enrichPositionsWithResumeSkills(positions)
    return positions
  } catch (error) {
    log.warn('Failed to load positions, degrading gracefully', {
      account,
      stakeholder,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

function toResumeSkillsInfo(skills: ResumeSkills, source: string): ResumeSkillsInfo {
  return {
    primaryStack: skills.primary_tech_stack,
    secondaryStack: skills.secondary_tech_stack,
    roles: skills.roles,
    yearsExperience: skills.years_experience,
    seniority: skills.seniority_signals,
    summary: skills.summary,
    source: source as ResumeSkillsInfo['source'],
  }
}

function enrichPositionsWithResumeSkills(positions: AggregatedPosition[]): void {
  const allCandidateIds = new Set<number>()
  for (const pos of positions) {
    for (const c of pos.candidates) {
      allCandidateIds.add(c.candidateId)
    }
  }

  if (allCandidateIds.size === 0) return

  try {
    const skillsMap = embeddingRepository.getSkillsBatchByUpstreamIds([...allCandidateIds])
    for (const pos of positions) {
      for (const c of pos.candidates) {
        const entry = skillsMap.get(c.candidateId)
        if (entry) {
          c.resumeSkills = toResumeSkillsInfo(entry.skills, entry.source)
        }
      }
    }
  } catch (error) {
    log.warn('Failed to enrich candidates with resume skills, degrading gracefully', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function computeSkillsCoverage(positions: AggregatedPosition[]): { hasResumeSkills: boolean; coverage: number } {
  let total = 0
  let withSkills = 0
  for (const pos of positions) {
    for (const c of pos.candidates) {
      total++
      if (c.resumeSkills) withSkills++
    }
  }
  return {
    hasResumeSkills: withSkills > 0,
    coverage: total > 0 ? withSkills / total : 0,
  }
}

function summarizePositions(positions: AggregatedPosition[], maxTokens: number): AggregatedPosition[] {
  let current = estimateTokens(positions)
  if (current <= maxTokens) return positions

  if (current > maxTokens) {
    const stripped = positions.map(p => ({
      ...p,
      candidates: p.candidates.map(c => ({ ...c, resumeSkills: null })),
    }))
    const strippedTokens = estimateTokens(stripped)
    if (strippedTokens <= maxTokens) {
      log.info('Stripped resumeSkills from lowest-priority positions to fit budget', {
        originalTokens: current,
        strippedTokens,
        budget: maxTokens,
      })
      return stripped
    }
    current = strippedTokens
  }

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

function buildChunkBundle(
  account: string,
  positions: AggregatedPosition[],
  salaryBands: SalaryBandInfo[],
  feedbackCatalog: FeedbackLabel[]
): BraniacDataBundle {
  const hasRejectionDetails = positions.some(p =>
    p.candidates.some(c => c.rejectionFeedback.length > 0 || c.rejectionComments.length > 0)
  )
  const dataPointsCount = positions.reduce(
    (sum, p) => sum + Math.max(1, p.candidates.length), 0
  )
  const skillsCov = computeSkillsCoverage(positions)
  return {
    account,
    positions,
    salaryBands,
    feedbackCatalog,
    dataPointsCount,
    estimatedTokens: estimateTokens({ positions, salaryBands, feedbackCatalog }),
    dataCompleteness: {
      hasSalaryBands: salaryBands.length > 0,
      hasFeedbackCatalog: feedbackCatalog.length > 0,
      hasRejectionDetails,
      hasResumeSkills: skillsCov.hasResumeSkills,
      resumeSkillsCoverage: skillsCov.coverage,
    },
  }
}

export interface StakeholderComputedMetrics {
  totalPresented: number
  totalAccepted: number
  successRate: number | null
  avgPublishedRate: number | null
  avgDaysToClose: number | null
  totalClosedPositions: number
  totalWonPositions: number
  winRate: number | null
}

const ACCEPTED_STATUSES = ['Hired', 'AcceptedByClient', 'Started', 'Active']

function isWonCloseReason(reason: string | null): boolean {
  if (!reason) return false
  return reason.toLowerCase().includes('win')
}

export function computeStakeholderMetrics(positions: AggregatedPosition[]): StakeholderComputedMetrics {
  let totalPresented = 0
  let totalAccepted = 0

  const publishedRates: number[] = []
  for (const pos of positions) {
    if (pos.minimumRate != null && pos.maximumRate != null) {
      publishedRates.push((pos.minimumRate + pos.maximumRate) / 2)
    } else if (pos.maximumRate != null) {
      publishedRates.push(pos.maximumRate)
    } else if (pos.minimumRate != null) {
      publishedRates.push(pos.minimumRate)
    }

    for (const cand of pos.candidates) {
      totalPresented++
      if (ACCEPTED_STATUSES.some(s => cand.candidateStatus === s)) {
        totalAccepted++
      }
    }
  }

  const closedPositions = positions.filter(p =>
    p.positionStatus === 'Closed' && p.closedReason
  )
  const wonPositions = closedPositions.filter(p => isWonCloseReason(p.closedReason))

  const avgDaysToClose = closedPositions.length > 0
    ? closedPositions.reduce((sum, p) => sum + p.aging, 0) / closedPositions.length
    : null

  const avgPublishedRate = publishedRates.length > 0
    ? publishedRates.reduce((a, b) => a + b, 0) / publishedRates.length
    : null

  const winRate = closedPositions.length > 0
    ? wonPositions.length / closedPositions.length
    : null

  return {
    totalPresented,
    totalAccepted,
    successRate: totalPresented > 0 ? totalAccepted / totalPresented : null,
    avgPublishedRate: avgPublishedRate ? Math.round(avgPublishedRate * 100) / 100 : null,
    avgDaysToClose: avgDaysToClose ? Math.round(avgDaysToClose * 10) / 10 : null,
    totalClosedPositions: closedPositions.length,
    totalWonPositions: wonPositions.length,
    winRate,
  }
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

    const skillsCovAccount = computeSkillsCoverage(finalPositions)
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
        hasResumeSkills: skillsCovAccount.hasResumeSkills,
        resumeSkillsCoverage: skillsCovAccount.coverage,
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

    const skillsCovStakeholder = computeSkillsCoverage(finalPositions)
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
        hasResumeSkills: skillsCovStakeholder.hasResumeSkills,
        resumeSkillsCoverage: skillsCovStakeholder.coverage,
      },
    }
  },

  aggregateInBatches(
    account: string,
    stakeholder?: string,
    batchSize = 8
  ): PositionBatch[] {
    const allPositions = stakeholder
      ? loadPositions(account, stakeholder)
      : loadPositions(account)

    if (allPositions.length === 0) return []

    const salaryBands = loadSalaryBands()
    const feedbackCatalog = loadFeedbackCatalog()

    const hasRejectionDetails = allPositions.some(p =>
      p.candidates.some(c => c.rejectionFeedback.length > 0 || c.rejectionComments.length > 0)
    )
    const skillsCovBatch = computeSkillsCoverage(allPositions)
    const dataCompleteness: DataCompleteness = {
      hasSalaryBands: salaryBands.length > 0,
      hasFeedbackCatalog: feedbackCatalog.length > 0,
      hasRejectionDetails,
      hasResumeSkills: skillsCovBatch.hasResumeSkills,
      resumeSkillsCoverage: skillsCovBatch.coverage,
    }

    const sorted = [...allPositions].sort(
      (a, b) => b.candidates.length - a.candidates.length
    )

    const totalBatches = Math.ceil(sorted.length / batchSize)
    const batches: PositionBatch[] = []

    for (let i = 0; i < sorted.length; i += batchSize) {
      const slice = sorted.slice(i, i + batchSize)
      batches.push({
        batchIndex: batches.length,
        totalBatches,
        positions: slice,
        salaryBands,
        feedbackCatalog,
        estimatedTokens: estimateTokens({ positions: slice, salaryBands }),
        dataCompleteness,
      })
    }

    log.info('Batched aggregation complete', {
      account,
      stakeholder: stakeholder ?? null,
      totalPositions: allPositions.length,
      batchSize,
      batches: batches.length,
    })

    return batches
  },

  aggregateByStakeholderChunks(account: string): BraniacDataBundle[] {
    log.info('Aggregating data by stakeholder chunks', { account })

    const allPositions = loadPositions(account)
    if (allPositions.length === 0) return []

    const salaryBands = loadSalaryBands()
    const feedbackCatalog = loadFeedbackCatalog()

    const byStakeholder = new Map<string, AggregatedPosition[]>()
    for (const pos of allPositions) {
      const key = pos.stakeholder || '__unknown__'
      const group = byStakeholder.get(key) ?? []
      group.push(pos)
      byStakeholder.set(key, group)
    }

    const overheadTokens = estimateTokens({ salaryBands, feedbackCatalog })
    const chunkBudget = MAX_TOKEN_BUDGET - overheadTokens

    const chunks: BraniacDataBundle[] = []
    let currentPositions: AggregatedPosition[] = []
    let currentTokens = 0

    for (const [, positions] of byStakeholder) {
      const groupTokens = estimateTokens(positions)

      if (groupTokens > chunkBudget) {
        if (currentPositions.length > 0) {
          chunks.push(buildChunkBundle(account, currentPositions, salaryBands, feedbackCatalog))
          currentPositions = []
          currentTokens = 0
        }
        const summarized = summarizePositions(positions, chunkBudget)
        chunks.push(buildChunkBundle(account, summarized, salaryBands, feedbackCatalog))
        continue
      }

      if (currentTokens + groupTokens > chunkBudget && currentPositions.length > 0) {
        chunks.push(buildChunkBundle(account, currentPositions, salaryBands, feedbackCatalog))
        currentPositions = []
        currentTokens = 0
      }

      currentPositions.push(...positions)
      currentTokens += groupTokens
    }

    if (currentPositions.length > 0) {
      chunks.push(buildChunkBundle(account, currentPositions, salaryBands, feedbackCatalog))
    }

    log.info('Chunked aggregation complete', {
      account,
      totalPositions: allPositions.length,
      totalStakeholders: byStakeholder.size,
      chunks: chunks.length,
    })

    return chunks
  },
}
