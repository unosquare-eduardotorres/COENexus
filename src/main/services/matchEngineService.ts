import { voyageEmbeddingService } from './voyageEmbeddingService'
import { claudeService } from './claudeService'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { syncRepository } from '../db/repositories/syncRepository'
import { matchRepository } from '../db/repositories/matchRepository'
import { matchSearchCoordinator } from './matchSearchCoordinator'
import { OPUS_ANALYSIS, MATCH_ENGINE_CONTEXT_BLOCK, fillTemplate } from './promptTemplates'
import { getDatabase } from '../db/connection'
import { getConfig } from '../config'
import { createLogger } from './logger'
import { createHash } from 'crypto'

const log = createLogger('MatchEngine')

function hashJobDescription(jd: string): string {
  return createHash('sha256').update(jd.trim().toLowerCase()).digest('hex')
}

interface MatchRequest {
  jobDescription: string
  dataSource: string
  topN: number
  searchMode?: string
  constraints?: AdvancedConstraints
  candidateUpstreamIds?: number[]
  name?: string
  matchFlowType?: string
  jdSource?: string
}

interface AdvancedConstraints {
  candidateFilters?: FilterRule[]
  employeeFilters?: FilterRule[]
}

interface FilterRule {
  field: string
  operator: string
  value: string
  currency?: string
  connector?: string
}

export type MatchEvent =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'pipelineStages'; stages: unknown }
  | { type: 'haikuConfirm'; payload: unknown }
  | { type: 'result'; candidates: unknown[]; stats: unknown }
  | { type: 'session'; sessionId: number }
  | { type: 'error'; message: string }
  | { type: 'complete' }

interface EnrichedCandidate {
  sourceId: number
  sourceType: string
  upstreamId: number
  name: string
  resumeText: string
  cosineSimilarity: number
  seniority: string
  mainSkill: string
  country: string
  rate: number
  currency: string
  isBench: boolean
  jobTitle: string
  candidateStatus?: string
  salaryExpectations?: number
  salaryExpectationsCurrency?: string
  grossMonthlySalary?: number
}

function enrichWithEntityData(vectorResults: { id: number; source_type: string; source_id: number; upstream_id: number; resume_text: string | null; is_bench: number; distance: number }[]): EnrichedCandidate[] {
  return vectorResults
    .filter(vr => vr.source_type === 'employees' || vr.source_type === 'candidates')
    .map(vr => {
      const similarity = 1 - vr.distance

      if (vr.source_type === 'employees') {
        const emp = syncRepository.findEmployeeByUpstreamId(vr.upstream_id)
        return {
          sourceId: vr.source_id, sourceType: vr.source_type, upstreamId: vr.upstream_id,
          name: emp?.full_name ?? '', resumeText: vr.resume_text ?? '',
          cosineSimilarity: similarity, seniority: emp?.seniority ?? '',
          mainSkill: emp?.main_skill ?? '', country: emp?.country ?? '',
          rate: emp?.rate ?? 0, currency: emp?.salary_currency ?? '',
          isBench: emp?.is_bench === 1, jobTitle: emp?.job_title ?? '',
          grossMonthlySalary: emp?.gross_monthly_salary ?? undefined,
        }
      }

      const cand = syncRepository.findCandidateByUpstreamId(vr.upstream_id)
      return {
        sourceId: vr.source_id, sourceType: vr.source_type, upstreamId: vr.upstream_id,
        name: cand?.full_name ?? '', resumeText: vr.resume_text ?? '',
        cosineSimilarity: similarity, seniority: cand?.seniority ?? '',
        mainSkill: cand?.main_skill ?? '', country: cand?.country ?? '',
        rate: 0, currency: cand?.salary_currency ?? '',
        isBench: false, jobTitle: '',
        candidateStatus: cand?.candidate_status ?? undefined,
        salaryExpectations: cand?.salary_expectations ?? undefined,
        salaryExpectationsCurrency: cand?.salary_expectations_currency ?? undefined,
        grossMonthlySalary: cand?.current_salary ?? undefined,
      }
    })
}

const ALLOWED_OPERATORS = new Set([
  'equals', 'not-equals', 'contains', 'starts-with',
  'greater-than', 'less-than', 'between',
])

function buildConstraintFilter(constraints: AdvancedConstraints | undefined, dataSource: string): { sql: string; params: unknown[] } {
  if (!constraints) return { sql: '', params: [] }

  const filters = dataSource === 'bench'
    ? constraints.employeeFilters
    : dataSource === 'candidates'
      ? constraints.candidateFilters
      : [...(constraints.employeeFilters ?? []), ...(constraints.candidateFilters ?? [])]

  if (!filters || filters.length === 0) return { sql: '', params: [] }

  const conditions: string[] = []
  const params: unknown[] = []

  for (const rule of filters) {
    const col = mapFieldToColumn(rule.field, dataSource)
    if (!col) continue

    const operator = rule.operator.toLowerCase()
    if (!ALLOWED_OPERATORS.has(operator)) {
      log.warn(`Unknown filter operator "${rule.operator}" — skipping rule`, { field: rule.field })
      continue
    }

    const connector = rule.connector?.toLowerCase() === 'or' ? 'OR' : 'AND'
    if (conditions.length > 0) conditions.push(connector)

    switch (operator) {
      case 'equals':
        conditions.push(`${col} = ?`)
        params.push(rule.value)
        break
      case 'not-equals':
        conditions.push(`${col} != ?`)
        params.push(rule.value)
        break
      case 'contains':
        conditions.push(`${col} LIKE ?`)
        params.push(`%${rule.value}%`)
        break
      case 'starts-with':
        conditions.push(`${col} LIKE ?`)
        params.push(`${rule.value}%`)
        break
      case 'greater-than':
        conditions.push(`${col} > ?`)
        params.push(parseFloat(rule.value) || 0)
        break
      case 'less-than':
        conditions.push(`${col} < ?`)
        params.push(parseFloat(rule.value) || 0)
        break
      case 'between': {
        const parts = rule.value.split(',').map(v => parseFloat(v.trim()))
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          conditions.push(`${col} BETWEEN ? AND ?`)
          params.push(parts[0], parts[1])
        } else {
          log.warn(`Invalid "between" value: "${rule.value}"`, { field: rule.field })
        }
        break
      }
    }
  }

  return conditions.length > 0 ? { sql: `AND (${conditions.join(' ')})`, params } : { sql: '', params: [] }
}

function mapFieldToColumn(field: string, dataSource: string): string | null {
  const employeeMap: Record<string, string> = {
    seniority: 'e.seniority', mainSkill: 'e.main_skill', country: 'e.country',
    salary: 'e.gross_monthly_salary', rate: 'e.rate', isBench: 'e.is_bench',
    jobTitle: 'e.job_title',
  }
  const candidateMap: Record<string, string> = {
    seniority: 'c.seniority', mainSkill: 'c.main_skill', country: 'c.country',
    salary: 'c.current_salary', candidateStatus: 'c.candidate_status',
    coeCertified: 'c.coe_certified',
  }

  if (dataSource === 'bench' || dataSource === 'employees') return employeeMap[field] ?? null
  if (dataSource === 'candidates') return candidateMap[field] ?? null
  return employeeMap[field] ?? candidateMap[field] ?? null
}

import { runConcurrent } from './utils/concurrency'
import { parseAiResponse } from './utils/aiResponseParser'
import { haikuTriageSchema, opusAnalysisSchema } from './utils/aiResponseSchemas'

interface HaikuResult {
  candidate: EnrichedCandidate
  relevant: boolean
  score: number
  reason: string
}

interface CandidateStageSummary {
  upstreamId: number
  name: string
  sourceType: string
  cosineSimilarity: number
  seniority: string
  mainSkill: string
  country: string
  isBench: boolean
}

function toStageSummary(c: EnrichedCandidate): CandidateStageSummary {
  return { upstreamId: c.upstreamId, name: c.name, sourceType: c.sourceType, cosineSimilarity: c.cosineSimilarity, seniority: c.seniority, mainSkill: c.mainSkill, country: c.country, isBench: c.isBench }
}

async function generateJdEmbedding(jobDescription: string): Promise<Float32Array> {
  return voyageEmbeddingService.generateEmbedding(jobDescription)
}

function searchVectors(embedding: Float32Array, dataSource: string, topN: number): EnrichedCandidate[] {
  let sourceType: string | undefined
  let sourceTypes: string[] | undefined

  switch (dataSource) {
    case 'bench':
    case 'all-employees':
      sourceType = 'employees'
      break
    case 'candidates':
      sourceType = 'candidates'
      break
    case 'all-sources':
    default:
      sourceTypes = ['employees', 'candidates']
      break
  }

  const vectorLimit = Math.max(topN * 10, 50)
  const rawResults = embeddingRepository.searchSimilar(embedding, vectorLimit, sourceType, sourceTypes)
  let enriched = enrichWithEntityData(rawResults)

  if (dataSource === 'bench') {
    enriched = enriched.filter(c => c.isBench)
  }
  return enriched
}

function applyConstraintFilters(
  candidates: EnrichedCandidate[],
  constraints: AdvancedConstraints | undefined,
  dataSource: string
): { filtered: EnrichedCandidate[]; constraintSql: string } {
  const { sql: constraintSql, params: constraintParams } = buildConstraintFilter(constraints, dataSource)

  if (!constraintSql) return { filtered: candidates, constraintSql }

  const upstreamIds = new Set(candidates.map(c => c.upstreamId))
  const db = getDatabase()
  const table = dataSource === 'candidates' ? 'synced_candidates c' : 'synced_employees e'
  const idCol = dataSource === 'candidates' ? 'c.upstream_id' : 'e.upstream_id'
  const placeholders = [...upstreamIds].map(() => '?').join(',')
  const filterSql = `SELECT ${idCol} as uid FROM ${table} WHERE ${idCol} IN (${placeholders}) ${constraintSql}`
  const filteredRows = db.prepare(filterSql).all(...[...upstreamIds], ...constraintParams) as { uid: number }[]
  const filteredIds = new Set(filteredRows.map(r => r.uid))
  return { filtered: candidates.filter(c => filteredIds.has(c.upstreamId)), constraintSql }
}

async function runHaikuTriage(
  candidates: EnrichedCandidate[],
  jobDescription: string,
  topN: number,
  haikuModel: string,
  concurrency: number
): Promise<HaikuResult[]> {
  const haikuCandidates = candidates.slice(0, Math.max(topN * 3, 20))

  return runConcurrent(haikuCandidates, concurrency, async (candidate) => {
    try {
      const prompt = `Evaluate if this candidate is relevant for the job. Return JSON: {"relevant": true/false, "score": 0-100, "reason": "..."}\n\nJob Description:\n${jobDescription}\n\nCandidate: ${candidate.name}\nSkill: ${candidate.mainSkill}\nSeniority: ${candidate.seniority}\nResume excerpt: ${candidate.resumeText.slice(0, 2000)}`

      const response = await claudeService.chatAsync(haikuModel, prompt, 256, 0.1)
      const parsed = parseAiResponse(response, haikuTriageSchema, 'haiku-triage')
      return { candidate, relevant: parsed.relevant, score: parsed.score, reason: parsed.reason }
    } catch (err) {
      log.error(`Haiku triage failed for candidate ${candidate.upstreamId}`, err instanceof Error ? err : new Error(String(err)))
      return { candidate, relevant: true, score: 50, reason: 'Haiku triage failed — included by default' }
    }
  })
}

interface DeepAnalysisStats {
  cacheHits: number
  cacheMisses: number
}

async function runDeepAnalysis(
  haikuResults: HaikuResult[],
  request: MatchRequest,
  opusModel: string,
  concurrency: number
): Promise<{ results: Record<string, unknown>[]; cacheStats: DeepAnalysisStats }> {
  const jdHash = hashJobDescription(request.jobDescription)
  const cacheStats: DeepAnalysisStats = { cacheHits: 0, cacheMisses: 0 }

  const results = await runConcurrent(haikuResults, concurrency, async (haikuResult) => {
    const candidate = haikuResult.candidate

    const cached = matchRepository.getCachedAnalysis(candidate.upstreamId, candidate.sourceType, jdHash)
    if (cached) {
      cacheStats.cacheHits++
      log.info('Analysis cache hit', { candidateId: candidate.upstreamId, sourceType: candidate.sourceType })
      return { ...cached, fromCache: true }
    }

    cacheStats.cacheMisses++
    try {
      const contextBlock = fillTemplate(MATCH_ENGINE_CONTEXT_BLOCK, {
        jobDescription: request.jobDescription,
        candidateName: candidate.name,
        jobTitle: candidate.jobTitle,
        seniority: candidate.seniority,
        mainSkill: candidate.mainSkill,
        country: candidate.country,
        rate: String(candidate.rate || ''),
        currency: candidate.currency || '',
        isBench: String(candidate.isBench),
        sourceType: candidate.sourceType,
      })

      const salaryDisplay = candidate.grossMonthlySalary ? `$${candidate.grossMonthlySalary}/mo` : (candidate.rate ? `$${candidate.rate}/hr` : 'N/A')
      const prompt = fillTemplate(OPUS_ANALYSIS, {
        contextBlock,
        resume: candidate.resumeText.slice(0, 8000),
        country: candidate.country,
        salaryDisplay,
        availabilityDisplay: candidate.isBench ? 'Immediately available (bench)' : 'Currently assigned',
      })

      const response = await claudeService.chatAsync(opusModel, prompt, 4096, 0.1)
      const parsed = parseAiResponse(response, opusAnalysisSchema, 'opus-analysis')

      const analysisObj = (parsed.analysis ?? {}) as Record<string, unknown>
      const mergedAnalysis = {
        ...analysisObj,
        fitVerdict: parsed.fitVerdict ?? (analysisObj.fitVerdict as string | undefined),
        fitSummary: parsed.fitSummary ?? (analysisObj.fitSummary as string | undefined),
        whyNotFit: parsed.whyNotFit ?? (analysisObj.whyNotFit as string | undefined),
      }

      const analysisResult: Record<string, unknown> = {
        id: candidate.upstreamId, name: candidate.name, type: candidate.sourceType,
        matchScore: parsed.matchScore, role: parsed.role, years: parsed.years,
        location: parsed.location ?? candidate.country,
        salary: parsed.salary ?? salaryDisplay,
        availability: parsed.availability ?? '',
        scores: parsed.scores,
        summary: parsed.summary, skills: parsed.skills,
        domains: parsed.domains, gaps: parsed.gaps,
        leadership: parsed.leadership, softSkills: parsed.softSkills,
        analysis: mergedAnalysis,
        seniority: candidate.seniority, expectedRate: candidate.rate,
        currency: candidate.currency, country: candidate.country,
        mainSkill: candidate.mainSkill, isBench: candidate.isBench,
        candidateStatus: candidate.candidateStatus,
        salaryExpectations: candidate.salaryExpectations ?? 0,
        salaryExpectationsCurrency: candidate.salaryExpectationsCurrency ?? '',
      }

      matchRepository.cacheAnalysis(candidate.upstreamId, candidate.sourceType, jdHash, analysisResult, opusModel)
      log.info('Analysis cached', { candidateId: candidate.upstreamId, sourceType: candidate.sourceType })

      return analysisResult
    } catch (err) {
      return {
        id: candidate.upstreamId, name: candidate.name, type: candidate.sourceType,
        matchScore: haikuResult.score, role: '', years: 0,
        location: candidate.country, salary: '', availability: '',
        scores: {}, summary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown'}`,
        skills: [], domains: [], gaps: [], leadership: [], softSkills: [],
        seniority: candidate.seniority, expectedRate: candidate.rate,
        currency: candidate.currency, country: candidate.country,
        mainSkill: candidate.mainSkill, isBench: candidate.isBench,
      }
    }
  })

  return { results, cacheStats }
}

function saveMatchSession(
  request: MatchRequest,
  results: Record<string, unknown>[],
  stats: Record<string, string>,
  stages: Record<string, unknown>
): number {
  return matchRepository.createSession({
    name: request.name || `Search ${new Date().toLocaleDateString()}`,
    match_flow_type: request.matchFlowType || 'find-for-position',
    data_source: request.dataSource,
    top_n: request.topN,
    search_mode: request.searchMode || 'opus',
    job_description: request.jobDescription,
    jd_source: request.jdSource || 'custom',
    constraints_json: request.constraints ? JSON.stringify(request.constraints) : null,
    pipeline_stats_json: JSON.stringify(stats),
    pipeline_stages_json: JSON.stringify(stages),
    results_json: JSON.stringify(results),
    status: 'completed',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  })
}

interface FilterOptionsResult {
  seniorities: string[]
  mainSkills: string[]
  countries: string[]
  currencies: string[]
  candidateStatuses: string[]
}

let filterOptionsCache: { data: FilterOptionsResult; expiry: number } | null = null
const CACHE_TTL_MS = 60_000

export const matchEngineService = {
  getPoolCounts(): { bench: number; employees: number; candidates: number; allSources: number } {
    const bench = embeddingRepository.countBySourceType('employees')
    const candidates = embeddingRepository.countBySourceType('candidates')
    const db = getDatabase()
    const benchOnly = (db.prepare("SELECT COUNT(*) as c FROM resume_embeddings re JOIN synced_employees e ON e.id = re.source_id AND re.source_type = 'employees' WHERE e.is_bench = 1 AND re.embedding IS NOT NULL").get() as { c: number }).c
    return { bench: benchOnly, employees: bench, candidates, allSources: bench + candidates }
  },

  getFilterOptions(): FilterOptionsResult {
    if (filterOptionsCache && Date.now() < filterOptionsCache.expiry) {
      return filterOptionsCache.data
    }
    const db = getDatabase()
    const seniorities = (db.prepare("SELECT DISTINCT seniority FROM synced_employees WHERE seniority != '' UNION SELECT DISTINCT seniority FROM synced_candidates WHERE seniority IS NOT NULL AND seniority != ''").all() as { seniority: string }[]).map(r => r.seniority)
    const mainSkills = (db.prepare("SELECT DISTINCT main_skill FROM synced_employees WHERE main_skill != '' UNION SELECT DISTINCT main_skill FROM synced_candidates WHERE main_skill IS NOT NULL AND main_skill != ''").all() as { main_skill: string }[]).map(r => r.main_skill)
    const countries = (db.prepare("SELECT DISTINCT country FROM synced_employees WHERE country != '' UNION SELECT DISTINCT country FROM synced_candidates WHERE country IS NOT NULL AND country != ''").all() as { country: string }[]).map(r => r.country)
    const currencies = (db.prepare("SELECT DISTINCT salary_currency FROM synced_employees WHERE salary_currency IS NOT NULL AND salary_currency != '' UNION SELECT DISTINCT salary_currency FROM synced_candidates WHERE salary_currency IS NOT NULL AND salary_currency != ''").all() as { salary_currency: string }[]).map(r => r.salary_currency)
    const candidateStatuses = (db.prepare("SELECT DISTINCT candidate_status FROM synced_candidates WHERE candidate_status IS NOT NULL AND candidate_status != ''").all() as { candidate_status: string }[]).map(r => r.candidate_status)
    const result = { seniorities, mainSkills, countries, currencies, candidateStatuses }
    filterOptionsCache = { data: result, expiry: Date.now() + CACHE_TTL_MS }
    return result
  },

  invalidateFilterCache(): void {
    filterOptionsCache = null
  },

  async searchAsync(
    request: MatchRequest,
    emitEvent: (event: MatchEvent) => void
  ): Promise<number | null> {
    const startTime = Date.now()
    const { claude } = getConfig()
    log.info('Search pipeline started', { dataSource: request.dataSource, topN: request.topN, searchMode: request.searchMode, matchFlowType: request.matchFlowType })

    try {
      emitEvent({ type: 'progress', percent: 5, stage: 'Generating job description embedding...' })
      const jdEmbedding = await generateJdEmbedding(request.jobDescription)

      emitEvent({ type: 'progress', percent: 15, stage: 'Searching vector database...' })
      const enriched = searchVectors(jdEmbedding, request.dataSource, request.topN)
      const vectorStage = enriched.map(toStageSummary)
      log.info('Vector search complete', { vectorMatches: enriched.length, dataSource: request.dataSource })

      emitEvent({ type: 'progress', percent: 25, stage: `Found ${enriched.length} vector matches. Applying constraints...` })
      const { filtered, constraintSql } = applyConstraintFilters(enriched, request.constraints, request.dataSource)
      const afterConstraints = filtered.map(toStageSummary)
      log.info('Constraints applied', { before: enriched.length, after: filtered.length, hasConstraints: !!constraintSql })

      emitEvent({ type: 'progress', percent: 35, stage: `${filtered.length} candidates after constraints.` })
      emitEvent({ type: 'progress', percent: 40, stage: `Running Haiku triage on ${Math.min(Math.max(request.topN * 3, 20), filtered.length)} candidates...` })

      const haikuResults = await runHaikuTriage(filtered, request.jobDescription, request.topN, claude.haikuModel, claude.haikuMaxConcurrency)
      const passed = haikuResults.filter(r => r.relevant || r.score >= 40).sort((a, b) => b.score - a.score)
      let topCandidates = passed.slice(0, request.topN)
      log.info('Haiku triage complete', { triaged: haikuResults.length, passed: passed.length, topN: topCandidates.length })

      const afterHaiku = haikuResults.map(r => ({
        ...toStageSummary(r.candidate),
        haikuScore: r.score, eliminationReason: r.relevant ? undefined : r.reason,
      }))

      const stages = { vectorResults: vectorStage, afterConstraints, afterHaikuTriage: afterHaiku }
      emitEvent({ type: 'pipelineStages', stages })

      if (passed.length < request.topN && request.searchMode !== 'haiku-only') {
        const rejected = haikuResults.filter(r => !r.relevant && r.score < 40).sort((a, b) => b.score - a.score)
        const bestRejected = rejected.slice(0, 5).map(r => ({
          name: r.candidate.name,
          haikuScore: r.score,
          cosineSimilarity: r.candidate.cosineSimilarity,
          seniority: r.candidate.seniority,
          mainSkill: r.candidate.mainSkill,
        }))
        const lowestPassed = passed.length > 0 ? passed[passed.length - 1].score : 0
        const highestRejected = rejected.length > 0 ? rejected[0].score : 0
        const searchId = `search-${Date.now()}`
        emitEvent({ type: 'haikuConfirm', payload: { searchId, requestedTopN: request.topN, passedCount: passed.length, highestRejectedScore: highestRejected, lowestPassedScore: lowestPassed, bestRejected } })
        log.info('Haiku confirmation requested', { passedCount: passed.length, requestedTopN: request.topN, searchId })
        const decision = await matchSearchCoordinator.register(searchId)
        if (decision === 'include-all') {
          const allSorted = haikuResults.sort((a, b) => b.score - a.score)
          topCandidates = allSorted.slice(0, request.topN)
          log.info('User chose include-all', { newTopCount: topCandidates.length })
        } else {
          log.info('User chose proceed', { topCount: topCandidates.length })
        }
      }

      const jdHash = hashJobDescription(request.jobDescription)
      const cachedCount = topCandidates.filter(r => matchRepository.getCachedAnalysis(r.candidate.upstreamId, r.candidate.sourceType, jdHash) !== null).length
      const uncachedCount = topCandidates.length - cachedCount
      const cacheMsg = cachedCount > 0
        ? `${topCandidates.length} candidates passed Haiku. ${cachedCount} cached, analyzing ${uncachedCount} remaining...`
        : `${topCandidates.length} candidates passed Haiku. Running deep analysis...`
      emitEvent({ type: 'progress', percent: 60, stage: cacheMsg })

      if (request.searchMode === 'haiku-only') {
        const results = topCandidates.map(r => ({
          id: r.candidate.upstreamId, name: r.candidate.name, type: r.candidate.sourceType,
          matchScore: r.score, role: '', years: 0, location: r.candidate.country,
          salary: '', availability: '', scores: {}, summary: r.reason,
          skills: [], domains: [], gaps: [], leadership: [], softSkills: [],
          seniority: r.candidate.seniority, expectedRate: r.candidate.rate,
          currency: r.candidate.currency, country: r.candidate.country,
          mainSkill: r.candidate.mainSkill, isBench: r.candidate.isBench,
        }))
        const haikuCandidateCount = Math.min(Math.max(request.topN * 3, 20), filtered.length)
        emitEvent({ type: 'result', candidates: results, stats: { profilesScanned: String(vectorStage.length), preFiltered: String(filtered.length), constraintsApplied: constraintSql ? 'Yes' : 'None', haikuTriage: `${passed.length}/${haikuCandidateCount} passed`, sonnetAnalyzed: '0', time: `${((Date.now() - startTime) / 1000).toFixed(1)}s` } })
        emitEvent({ type: 'progress', percent: 100, stage: 'Search complete' })
        log.info('Search pipeline complete', { totalTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`, resultCount: results.length, mode: 'haiku-only' })
        return null
      }

      const { results: opusResults, cacheStats } = await runDeepAnalysis(topCandidates, request, claude.opusModel, claude.maxConcurrency)
      const sortedResults = opusResults.sort((a, b) => (b.matchScore as number) - (a.matchScore as number))
      log.info('Deep analysis cache stats', { cacheHits: cacheStats.cacheHits, cacheMisses: cacheStats.cacheMisses })

      const haikuCandidateCount = Math.min(Math.max(request.topN * 3, 20), filtered.length)
      const stats = {
        profilesScanned: String(vectorStage.length),
        preFiltered: String(vectorStage.length),
        constraintsApplied: constraintSql ? 'Yes' : 'None',
        haikuTriage: `${passed.length}/${haikuCandidateCount} passed`,
        sonnetAnalyzed: String(topCandidates.length),
        cacheHits: String(cacheStats.cacheHits),
        cacheMisses: String(cacheStats.cacheMisses),
        time: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      }

      emitEvent({ type: 'result', candidates: sortedResults, stats })
      emitEvent({ type: 'progress', percent: 95, stage: 'Saving session...' })

      const sessionId = saveMatchSession(request, sortedResults, stats, stages)

      emitEvent({ type: 'session', sessionId })
      emitEvent({ type: 'progress', percent: 100, stage: 'Search complete' })
      log.info('Search pipeline complete', { sessionId, totalTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`, resultCount: sortedResults.length })

      return sessionId
    } catch (err) {
      log.error('Search pipeline failed', err instanceof Error ? err : new Error(String(err)), { dataSource: request.dataSource })
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Search failed' })
      return null
    }
  },

  listSessions() {
    const sessions = matchRepository.listSessions()
    return sessions.map(s => {
      const stats = s.pipeline_stats_json ? JSON.parse(s.pipeline_stats_json) : null
      const results = s.results_json ? JSON.parse(s.results_json) : null
      return {
        id: s.id, name: s.name, matchFlowType: s.match_flow_type,
        dataSource: s.data_source, topN: s.top_n, searchMode: s.search_mode,
        jdSource: s.jd_source, status: s.status,
        createdAt: s.created_at, completedAt: s.completed_at,
        candidateCount: Array.isArray(results) ? results.length : null,
        time: stats?.time ?? null,
      }
    })
  },

  getSession(id: number) {
    return matchRepository.getSessionParsed(id)
  },

  getResumeText(sourceType: string, upstreamId: number): string | null {
    const db = getDatabase()
    const normalizedType = sourceType.endsWith('s') ? sourceType : `${sourceType}s`
    const row = db.prepare(
      'SELECT resume_text FROM resume_embeddings WHERE source_type = ? AND upstream_id = ?'
    ).get(normalizedType, upstreamId) as { resume_text: string | null } | undefined
    return row?.resume_text ?? null
  },
}
