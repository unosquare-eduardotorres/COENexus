import { claudeService } from './claudeService'
import { voyageEmbeddingService } from './voyageEmbeddingService'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { syncRepository } from '../db/repositories/syncRepository'
import { matchRepository } from '../db/repositories/matchRepository'
import { OPUS_ANALYSIS, BENCH_BURN_CONTEXT_BLOCK, EXTERNAL_CANDIDATE_CONTEXT_BLOCK, CANDIDATE_TO_POSITIONS_CONTEXT_BLOCK, fillTemplate } from './promptTemplates'
import { getConfig } from '../config'
import type { MatchEvent } from './matchEngineService'
import { parseAiResponse } from './utils/aiResponseParser'
import { opusAnalysisSchema } from './utils/aiResponseSchemas'
import { createLogger } from './logger'
import { createHash } from 'crypto'

const log = createLogger('BenchBurn')

function hashJobDescription(jd: string): string {
  return createHash('sha256').update(jd.trim().toLowerCase()).digest('hex')
}

export interface BenchBurnRequest {
  name: string
  matchFlowType?: string
  employeeUpstreamIds: number[]
  positionUpstreamIds: number[]
  topNPerEmployee?: number
  topNPerPosition?: number
  customPositions?: { name: string; jobDescription: string }[]
}

export interface ExternalCandidateMatchRequest {
  name: string
  matchFlowType?: string
  positionUpstreamIds: number[]
  candidates: { name: string; resumeText: string }[]
  customPosition?: { name: string; jobDescription: string }
}

interface CrossMatchResult {
  employeeUpstreamId: number
  employeeName: string
  positionUpstreamId: number
  positionLabel: string
  matchScore: number
  cosineSimilarity: number
  scores: unknown
  skills: unknown[]
  gaps: unknown[]
  domains: unknown[]
  analysis: unknown | null
  summary: string
}

import { runConcurrent } from './utils/concurrency'

export const benchBurnService = {
  async executeAsync(
    request: BenchBurnRequest,
    emitEvent: (event: MatchEvent) => void
  ): Promise<number | null> {
    const startTime = Date.now()
    const { claude } = getConfig()

    log.info('Bench burn started', { employees: request.employeeUpstreamIds.length, positions: request.positionUpstreamIds.length, topNPerEmployee: request.topNPerEmployee, topNPerPosition: request.topNPerPosition })

    try {
      emitEvent({ type: 'progress', percent: 5, stage: 'Loading employee and position data...' })

      const employees = request.employeeUpstreamIds
        .map(id => syncRepository.findEmployeeByUpstreamId(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof syncRepository.findEmployeeByUpstreamId>>[]

      const positions = request.positionUpstreamIds
        .map(id => syncRepository.findPositionByUpstreamId(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof syncRepository.findPositionByUpstreamId>>[]

      emitEvent({ type: 'progress', percent: 15, stage: 'Computing cross-similarities...' })

      const similarities = embeddingRepository.crossSimilarity(
        request.employeeUpstreamIds,
        request.positionUpstreamIds
      )

      const simMap = new Map<string, number>()
      for (const s of similarities) {
        simMap.set(`${s.empUpstreamId}-${s.posUpstreamId}`, s.similarity)
      }

      const topNPerEmp = request.topNPerEmployee ?? 5
      const topNPerPos = request.topNPerPosition ?? 3

      const pairs: { emp: typeof employees[0]; pos: typeof positions[0]; similarity: number }[] = []

      for (const emp of employees) {
        const empPairs = positions
          .map(pos => ({
            emp, pos,
            similarity: simMap.get(`${emp.upstream_id}-${pos.upstream_id}`) ?? 0,
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topNPerEmp)

        pairs.push(...empPairs)
      }

      const uniquePairs = [...new Map(pairs.map(p => [`${p.emp.upstream_id}-${p.pos.upstream_id}`, p])).values()]

      log.info('Cross-similarities computed', { pairs: similarities.length, uniquePairs: uniquePairs.length })

      emitEvent({ type: 'progress', percent: 30, stage: `Analyzing ${uniquePairs.length} employee-position pairs...` })

      let cacheHits = 0
      let cacheMisses = 0

      const results = await runConcurrent(uniquePairs, claude.maxConcurrency, async (pair) => {
        const jdHash = hashJobDescription(pair.pos.job_description)
        const cached = matchRepository.getCachedAnalysis(pair.emp.upstream_id, 'employee', jdHash)

        if (cached) {
          cacheHits++
          log.info('Bench burn cache hit', { employeeId: pair.emp.upstream_id, positionId: pair.pos.upstream_id })
          return {
            employeeUpstreamId: pair.emp.upstream_id,
            employeeName: pair.emp.full_name,
            positionUpstreamId: pair.pos.upstream_id,
            positionLabel: `${pair.pos.account} - ${pair.pos.job_title}`,
            matchScore: (cached.matchScore as number) ?? 0,
            cosineSimilarity: pair.similarity,
            scores: cached.scores ?? {},
            skills: cached.skills ?? [],
            gaps: cached.gaps ?? [],
            domains: cached.domains ?? [],
            analysis: cached.analysis ?? null,
            summary: (cached.summary as string) ?? '',
          } as CrossMatchResult
        }

        cacheMisses++
        const empEmbedding = embeddingRepository.findBySource('employees', pair.emp.id)

        const contextBlock = fillTemplate(BENCH_BURN_CONTEXT_BLOCK, {
          account: pair.pos.account,
          jobTitle: pair.pos.job_title,
          positionMainSkill: pair.pos.main_skill,
          jobDescription: pair.pos.job_description,
          employeeName: pair.emp.full_name,
          employeeJobTitle: pair.emp.job_title,
          seniority: pair.emp.seniority,
          employeeMainSkill: pair.emp.main_skill,
          country: pair.emp.country,
        })

        const salaryDisplay = pair.emp.gross_monthly_salary ? `$${pair.emp.gross_monthly_salary}/mo` : (pair.emp.rate ? `$${pair.emp.rate}/hr` : 'N/A')

        const prompt = fillTemplate(OPUS_ANALYSIS, {
          contextBlock,
          resume: empEmbedding?.resume_text?.slice(0, 8000) ?? 'No resume text available',
          country: pair.emp.country,
          salaryDisplay,
          availabilityDisplay: pair.emp.is_bench === 1 ? 'Immediately available (bench)' : 'Currently assigned',
        })

        try {
          const response = await claudeService.chatAsync(claude.opusModel, prompt, 4096, 0.1)
          const parsed = parseAiResponse(response, opusAnalysisSchema, 'bench-burn')

          const analysisObj = (parsed.analysis ?? {}) as Record<string, unknown>
          const mergedAnalysis = {
            ...analysisObj,
            fitVerdict: parsed.fitVerdict ?? (analysisObj.fitVerdict as string | undefined),
            fitSummary: parsed.fitSummary ?? (analysisObj.fitSummary as string | undefined),
            whyNotFit: parsed.whyNotFit ?? (analysisObj.whyNotFit as string | undefined),
          }

          const analysisResult = {
            matchScore: parsed.matchScore,
            scores: parsed.scores,
            skills: parsed.skills,
            gaps: parsed.gaps,
            domains: parsed.domains,
            analysis: mergedAnalysis,
            summary: parsed.summary,
          }
          matchRepository.cacheAnalysis(pair.emp.upstream_id, 'employee', jdHash, analysisResult, claude.opusModel)

          return {
            employeeUpstreamId: pair.emp.upstream_id,
            employeeName: pair.emp.full_name,
            positionUpstreamId: pair.pos.upstream_id,
            positionLabel: `${pair.pos.account} - ${pair.pos.job_title}`,
            matchScore: parsed.matchScore,
            cosineSimilarity: pair.similarity,
            scores: parsed.scores,
            skills: parsed.skills,
            gaps: parsed.gaps,
            domains: parsed.domains,
            analysis: mergedAnalysis,
            summary: parsed.summary,
          } as CrossMatchResult
        } catch (err) {
          return {
            employeeUpstreamId: pair.emp.upstream_id,
            employeeName: pair.emp.full_name,
            positionUpstreamId: pair.pos.upstream_id,
            positionLabel: `${pair.pos.account} - ${pair.pos.job_title}`,
            matchScore: Math.round(pair.similarity * 100),
            cosineSimilarity: pair.similarity,
            scores: {}, skills: [], gaps: [], domains: [],
            analysis: null,
            summary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown'}`,
          } as CrossMatchResult
        }
      })

      log.info('Bench burn cache stats', { cacheHits, cacheMisses })

      const employeeResults: Record<string, CrossMatchResult[]> = {}
      const positionResults: Record<string, CrossMatchResult[]> = {}

      for (const r of results) {
        const empKey = String(r.employeeUpstreamId)
        if (!employeeResults[empKey]) employeeResults[empKey] = []
        employeeResults[empKey].push(r)

        const posKey = String(r.positionUpstreamId)
        if (!positionResults[posKey]) positionResults[posKey] = []
        positionResults[posKey].push(r)
      }

      for (const key of Object.keys(employeeResults)) {
        employeeResults[key].sort((a, b) => b.matchScore - a.matchScore)
      }
      for (const key of Object.keys(positionResults)) {
        positionResults[key].sort((a, b) => b.matchScore - a.matchScore)
        positionResults[key] = positionResults[key].slice(0, topNPerPos)
      }

      const stats = {
        totalPairs: uniquePairs.length,
        analyzed: results.length,
        cacheHits: String(cacheHits),
        cacheMisses: String(cacheMisses),
        time: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      }

      const resultPayload = { employeeResults, positionResults, stats }

      log.info('Bench burn analysis complete', { totalPairs: uniquePairs.length, analyzed: results.length, cacheHits, cacheMisses, time: stats.time })

      emitEvent({ type: 'result', candidates: results, stats })
      emitEvent({ type: 'progress', percent: 95, stage: 'Saving session...' })

      const sessionId = matchRepository.createSession({
        name: request.name || `Bench Burn ${new Date().toLocaleDateString()}`,
        match_flow_type: request.matchFlowType || 'bench-burn',
        data_source: 'bench',
        top_n: topNPerEmp,
        search_mode: 'opus',
        job_description: '',
        jd_source: '',
        constraints_json: null,
        pipeline_stats_json: JSON.stringify(stats),
        pipeline_stages_json: null,
        results_json: JSON.stringify(resultPayload),
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })

      emitEvent({ type: 'session', sessionId })
      emitEvent({ type: 'progress', percent: 100, stage: 'Bench burn complete' })

      return sessionId
    } catch (err) {
      log.error('Bench burn failed', err instanceof Error ? err : new Error(String(err)))
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Bench burn failed' })
      return null
    }
  },

  rankPositionsForPerson(
    sourceType: 'candidate' | 'employee',
    upstreamId: number,
    topN: number
  ): { upstreamId: number; account: string; jobTitle: string; mainSkill: string; seniorities: string; positionStatus: string; aging: number; countries: string; coe: string; cosineSimilarity: number; isVectorized: boolean }[] {
    const embeddingSourceType = sourceType === 'candidate' ? 'candidates' : 'employees'
    const embeddingBuffer = embeddingRepository.getEmbeddingByUpstreamId(embeddingSourceType, upstreamId)
    if (!embeddingBuffer) throw new Error('Person has no embedding — vectorize first')

    const personVec = new Float32Array(embeddingBuffer.buffer, embeddingBuffer.byteOffset, embeddingBuffer.byteLength / 4)
    const vectorResults = embeddingRepository.searchPositionsBySimilarity(personVec, topN * 2)

    return vectorResults
      .map(vr => {
        const pos = syncRepository.findPositionByUpstreamId(vr.upstream_id)
        if (!pos || !['Active', 'Draft'].includes(pos.position_status)) return null
        return {
          upstreamId: pos.upstream_id,
          account: pos.account,
          jobTitle: pos.job_title,
          mainSkill: pos.main_skill,
          seniorities: pos.seniorities,
          positionStatus: pos.position_status,
          aging: pos.aging,
          countries: pos.countries,
          coe: pos.coe,
          cosineSimilarity: 1 - vr.distance,
          isVectorized: true,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .slice(0, topN)
  },

  async rankPositionsForText(
    resumeText: string,
    topN: number
  ): Promise<{ upstreamId: number; account: string; jobTitle: string; mainSkill: string; seniorities: string; positionStatus: string; aging: number; countries: string; coe: string; cosineSimilarity: number; isVectorized: boolean }[]> {
    const embedding = await voyageEmbeddingService.generateEmbedding(resumeText)
    const vectorResults = embeddingRepository.searchPositionsBySimilarity(embedding, topN * 2)

    return vectorResults
      .map(vr => {
        const pos = syncRepository.findPositionByUpstreamId(vr.upstream_id)
        if (!pos || !['Active', 'Draft'].includes(pos.position_status)) return null
        return {
          upstreamId: pos.upstream_id,
          account: pos.account,
          jobTitle: pos.job_title,
          mainSkill: pos.main_skill,
          seniorities: pos.seniorities,
          positionStatus: pos.position_status,
          aging: pos.aging,
          countries: pos.countries,
          coe: pos.coe,
          cosineSimilarity: 1 - vr.distance,
          isVectorized: true,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .slice(0, topN)
  },

  async executeCandidateToPositionsAsync(
    request: {
      name: string
      matchFlowType: 'match-to-positions'
      personSourceType: 'candidate' | 'employee' | 'external'
      upstreamId?: number
      candidateName?: string
      resumeText?: string
      positionUpstreamIds: number[]
      customPositions?: { name: string; jobDescription: string }[]
    },
    emitEvent: (event: MatchEvent) => void
  ): Promise<number | null> {
    if (request.personSourceType === 'employee') {
      return this.executeAsync({
        name: request.name,
        matchFlowType: 'match-to-positions',
        employeeUpstreamIds: [request.upstreamId!],
        positionUpstreamIds: request.positionUpstreamIds,
        customPositions: request.customPositions,
        topNPerEmployee: request.positionUpstreamIds.length + (request.customPositions?.length ?? 0),
        topNPerPosition: 1,
      }, emitEvent)
    }

    if (request.personSourceType === 'external') {
      return this.executeExternalCandidateAsync({
        name: request.name,
        matchFlowType: 'match-to-positions',
        positionUpstreamIds: request.positionUpstreamIds,
        candidates: [{ name: request.candidateName!, resumeText: request.resumeText! }],
        customPosition: request.customPositions?.[0]
          ? { name: request.customPositions[0].name, jobDescription: request.customPositions[0].jobDescription }
          : undefined,
      }, emitEvent)
    }

    const startTime = Date.now()
    const { claude } = getConfig()

    log.info('Candidate-to-positions match started', { candidateId: request.upstreamId, positions: request.positionUpstreamIds.length })

    try {
      emitEvent({ type: 'progress', percent: 5, stage: 'Loading candidate and position data...' })

      const candidate = syncRepository.findCandidateByUpstreamId(request.upstreamId!)
      if (!candidate) throw new Error(`Candidate ${request.upstreamId} not found`)

      const positions = request.positionUpstreamIds
        .map(id => syncRepository.findPositionByUpstreamId(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof syncRepository.findPositionByUpstreamId>>[]

      if (request.customPositions) {
        for (const cp of request.customPositions) {
          positions.push({
            id: 0,
            upstream_id: -1 - positions.length,
            account: 'Custom',
            coe: '', practice: '', stakeholder: '',
            main_skill: '', countries: '', seniorities: '',
            available_range: '', account_overview: '',
            job_description: cp.jobDescription,
            job_title: cp.name,
            position_status: 'Active',
            aging: 0, created: null, ready_date: null, last_modification: null,
            sourcing: '', replacement: 0,
            status: 'synced', status_reason: null, failed: 0,
            synced_at: new Date().toISOString(),
          })
        }
      }

      emitEvent({ type: 'progress', percent: 15, stage: 'Computing cross-similarities...' })

      const similarities = embeddingRepository.crossSimilarity(
        [request.upstreamId!],
        request.positionUpstreamIds,
        'candidates'
      )

      const simMap = new Map<string, number>()
      for (const s of similarities) {
        simMap.set(`${s.empUpstreamId}-${s.posUpstreamId}`, s.similarity)
      }

      const pairs = positions.map(pos => ({
        candidate,
        pos,
        similarity: simMap.get(`${candidate.upstream_id}-${pos.upstream_id}`) ?? 0,
      }))

      emitEvent({ type: 'progress', percent: 30, stage: `Analyzing ${pairs.length} candidate-position pairs...` })

      let cacheHits = 0
      let cacheMisses = 0

      const results = await runConcurrent(pairs, claude.maxConcurrency, async (pair) => {
        const jdHash = hashJobDescription(pair.pos.job_description)
        const cached = matchRepository.getCachedAnalysis(pair.candidate.upstream_id, 'candidate', jdHash)

        if (cached) {
          cacheHits++
          return {
            employeeUpstreamId: pair.candidate.upstream_id,
            employeeName: pair.candidate.full_name,
            positionUpstreamId: pair.pos.upstream_id,
            positionLabel: `${pair.pos.account} - ${pair.pos.job_title}`,
            matchScore: (cached.matchScore as number) ?? 0,
            cosineSimilarity: pair.similarity,
            scores: cached.scores ?? {},
            skills: cached.skills ?? [],
            gaps: cached.gaps ?? [],
            domains: cached.domains ?? [],
            analysis: cached.analysis ?? null,
            summary: (cached.summary as string) ?? '',
          } as CrossMatchResult
        }

        cacheMisses++
        const candidateEmbedding = embeddingRepository.findBySource('candidates', pair.candidate.id)

        const contextBlock = fillTemplate(CANDIDATE_TO_POSITIONS_CONTEXT_BLOCK, {
          account: pair.pos.account,
          jobTitle: pair.pos.job_title,
          positionMainSkill: pair.pos.main_skill,
          jobDescription: pair.pos.job_description,
          candidateName: pair.candidate.full_name,
          seniority: pair.candidate.seniority ?? '',
          candidateMainSkill: pair.candidate.main_skill ?? '',
          country: pair.candidate.country ?? '',
          sourceLabel: 'Synced Candidate',
        })

        const salaryDisplay = pair.candidate.current_salary ? `${pair.candidate.current_salary}/mo` : 'N/A'

        const prompt = fillTemplate(OPUS_ANALYSIS, {
          contextBlock,
          resume: candidateEmbedding?.resume_text?.slice(0, 8000) ?? 'No resume text available',
          country: pair.candidate.country ?? '',
          salaryDisplay,
          availabilityDisplay: `Candidate (${pair.candidate.candidate_status ?? 'Unknown status'})`,
        })

        try {
          const response = await claudeService.chatAsync(claude.opusModel, prompt, 4096, 0.1)
          const parsed = parseAiResponse(response, opusAnalysisSchema, 'candidate-to-positions')

          const analysisObj = (parsed.analysis ?? {}) as Record<string, unknown>
          const mergedAnalysis = {
            ...analysisObj,
            fitVerdict: parsed.fitVerdict ?? (analysisObj.fitVerdict as string | undefined),
            fitSummary: parsed.fitSummary ?? (analysisObj.fitSummary as string | undefined),
            whyNotFit: parsed.whyNotFit ?? (analysisObj.whyNotFit as string | undefined),
          }

          const analysisResult = {
            matchScore: parsed.matchScore,
            scores: parsed.scores,
            skills: parsed.skills,
            gaps: parsed.gaps,
            domains: parsed.domains,
            analysis: mergedAnalysis,
            summary: parsed.summary,
          }
          matchRepository.cacheAnalysis(pair.candidate.upstream_id, 'candidate', jdHash, analysisResult, claude.opusModel)

          return {
            employeeUpstreamId: pair.candidate.upstream_id,
            employeeName: pair.candidate.full_name,
            positionUpstreamId: pair.pos.upstream_id,
            positionLabel: `${pair.pos.account} - ${pair.pos.job_title}`,
            matchScore: parsed.matchScore,
            cosineSimilarity: pair.similarity,
            scores: parsed.scores,
            skills: parsed.skills,
            gaps: parsed.gaps,
            domains: parsed.domains,
            analysis: mergedAnalysis,
            summary: parsed.summary,
          } as CrossMatchResult
        } catch (err) {
          return {
            employeeUpstreamId: pair.candidate.upstream_id,
            employeeName: pair.candidate.full_name,
            positionUpstreamId: pair.pos.upstream_id,
            positionLabel: `${pair.pos.account} - ${pair.pos.job_title}`,
            matchScore: Math.round(pair.similarity * 100),
            cosineSimilarity: pair.similarity,
            scores: {}, skills: [], gaps: [], domains: [],
            analysis: null,
            summary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown'}`,
          } as CrossMatchResult
        }
      })

      const employeeResults: Record<string, CrossMatchResult[]> = {}
      for (const r of results) {
        const key = String(r.employeeUpstreamId)
        if (!employeeResults[key]) employeeResults[key] = []
        employeeResults[key].push(r)
      }
      for (const key of Object.keys(employeeResults)) {
        employeeResults[key].sort((a, b) => b.matchScore - a.matchScore)
      }

      const stats = {
        totalPairs: pairs.length,
        analyzed: results.length,
        cacheHits: String(cacheHits),
        cacheMisses: String(cacheMisses),
        time: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      }

      const resultPayload = { employeeResults, positionResults: {}, stats }

      emitEvent({ type: 'result', candidates: results, stats })
      emitEvent({ type: 'progress', percent: 95, stage: 'Saving session...' })

      const sessionId = matchRepository.createSession({
        name: request.name || `Match to Positions ${new Date().toLocaleDateString()}`,
        match_flow_type: 'match-to-positions',
        data_source: 'candidates',
        top_n: pairs.length,
        search_mode: 'opus',
        job_description: '',
        jd_source: '',
        constraints_json: null,
        pipeline_stats_json: JSON.stringify(stats),
        pipeline_stages_json: null,
        results_json: JSON.stringify(resultPayload),
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })

      emitEvent({ type: 'session', sessionId })
      emitEvent({ type: 'progress', percent: 100, stage: 'Match to positions complete' })

      return sessionId
    } catch (err) {
      log.error('Candidate-to-positions match failed', err instanceof Error ? err : new Error(String(err)))
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Candidate-to-positions match failed' })
      return null
    }
  },

  async executeExternalCandidateAsync(
    request: ExternalCandidateMatchRequest,
    emitEvent: (event: MatchEvent) => void
  ): Promise<number | null> {
    const startTime = Date.now()
    const { claude } = getConfig()

    log.info('External candidate match started', { candidates: request.candidates.length, positions: request.positionUpstreamIds.length, hasCustomPosition: !!request.customPosition })

    try {
      emitEvent({ type: 'progress', percent: 5, stage: 'Loading position data...' })

      const positions = request.positionUpstreamIds
        .map(id => syncRepository.findPositionByUpstreamId(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof syncRepository.findPositionByUpstreamId>>[]

      if (request.customPosition) {
        positions.push({
          id: 0,
          upstream_id: -1,
          account: 'Custom',
          coe: '',
          practice: '',
          stakeholder: '',
          main_skill: '',
          countries: '',
          seniorities: '',
          available_range: '',
          account_overview: '',
          job_description: request.customPosition.jobDescription,
          job_title: request.customPosition.name,
          position_status: 'Active',
          aging: 0,
          created: null,
          ready_date: null,
          last_modification: null,
          sourcing: '',
          replacement: 0,
          status: 'synced',
          status_reason: null,
          failed: 0,
          synced_at: new Date().toISOString(),
        })
      }

      emitEvent({ type: 'progress', percent: 20, stage: `Analyzing ${request.candidates.length} candidates against ${positions.length} positions...` })

      const allResults: CrossMatchResult[] = []

      for (const candidate of request.candidates) {
        for (const pos of positions) {
          const contextBlock = fillTemplate(EXTERNAL_CANDIDATE_CONTEXT_BLOCK, {
            account: pos.account,
            jobTitle: pos.job_title,
            positionMainSkill: pos.main_skill,
            jobDescription: pos.job_description,
            candidateName: candidate.name,
            sourceFileName: 'uploaded-resume',
          })

          const prompt = fillTemplate(OPUS_ANALYSIS, {
            contextBlock,
            resume: candidate.resumeText.slice(0, 8000),
            country: '',
            salaryDisplay: 'N/A',
            availabilityDisplay: 'External candidate',
          })

          try {
            const response = await claudeService.chatAsync(claude.opusModel, prompt, 4096, 0.1)
            const parsed = parseAiResponse(response, opusAnalysisSchema, 'external-candidate')

            const analysisObj = (parsed.analysis ?? {}) as Record<string, unknown>
            const mergedAnalysis = {
              ...analysisObj,
              fitVerdict: parsed.fitVerdict ?? (analysisObj.fitVerdict as string | undefined),
              fitSummary: parsed.fitSummary ?? (analysisObj.fitSummary as string | undefined),
              whyNotFit: parsed.whyNotFit ?? (analysisObj.whyNotFit as string | undefined),
            }

            allResults.push({
              employeeUpstreamId: 0,
              employeeName: candidate.name,
              positionUpstreamId: pos.upstream_id,
              positionLabel: `${pos.account} - ${pos.job_title}`,
              matchScore: parsed.matchScore,
              cosineSimilarity: 0,
              scores: parsed.scores,
              skills: parsed.skills,
              gaps: parsed.gaps,
              domains: parsed.domains,
              analysis: mergedAnalysis,
              summary: parsed.summary,
            })
          } catch (err) {
            allResults.push({
              employeeUpstreamId: 0,
              employeeName: candidate.name,
              positionUpstreamId: pos.upstream_id,
              positionLabel: `${pos.account} - ${pos.job_title}`,
              matchScore: 0, cosineSimilarity: 0,
              scores: {}, skills: [], gaps: [], domains: [],
              analysis: null,
              summary: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown'}`,
            })
          }
        }
      }

      const stats = {
        totalPairs: request.candidates.length * positions.length,
        analyzed: allResults.length,
        time: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      }

      log.info('External candidate match complete', { totalPairs: stats.totalPairs, analyzed: allResults.length, time: stats.time })

      emitEvent({ type: 'result', candidates: allResults, stats })

      const sessionId = matchRepository.createSession({
        name: request.name || `External Match ${new Date().toLocaleDateString()}`,
        match_flow_type: request.matchFlowType || 'external-candidate-to-op',
        data_source: 'external',
        top_n: 10,
        search_mode: 'opus',
        job_description: '',
        jd_source: 'custom',
        constraints_json: null,
        pipeline_stats_json: JSON.stringify(stats),
        pipeline_stages_json: null,
        results_json: JSON.stringify(allResults),
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })

      emitEvent({ type: 'session', sessionId })
      emitEvent({ type: 'progress', percent: 100, stage: 'External candidate matching complete' })

      return sessionId
    } catch (err) {
      log.error('External candidate match failed', err instanceof Error ? err : new Error(String(err)))
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'External candidate match failed' })
      return null
    }
  },
}
