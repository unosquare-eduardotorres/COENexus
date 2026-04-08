import { claudeProxyService } from './claudeProxyService'
import { voyageEmbeddingService } from './voyageEmbeddingService'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { syncRepository } from '../db/repositories/syncRepository'
import { matchRepository } from '../db/repositories/matchRepository'
import { OPUS_ANALYSIS, BENCH_BURN_CONTEXT_BLOCK, EXTERNAL_CANDIDATE_CONTEXT_BLOCK, fillTemplate } from './promptTemplates'
import { getConfig } from '../config'
import type { MatchEvent } from './matchEngineService'

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
    const { claudeProxy } = getConfig()

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

      emitEvent({ type: 'progress', percent: 30, stage: `Analyzing ${uniquePairs.length} employee-position pairs...` })

      const results = await runConcurrent(uniquePairs, claudeProxy.maxConcurrency, async (pair) => {
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
          const response = await claudeProxyService.chatAsync(claudeProxy.opusModel, prompt, 4096, 0.1)
          const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim())

          return {
            employeeUpstreamId: pair.emp.upstream_id,
            employeeName: pair.emp.full_name,
            positionUpstreamId: pair.pos.upstream_id,
            positionLabel: `${pair.pos.account} - ${pair.pos.job_title}`,
            matchScore: parsed.matchScore ?? 0,
            cosineSimilarity: pair.similarity,
            scores: parsed.scores ?? {},
            skills: parsed.skills ?? [],
            gaps: parsed.gaps ?? [],
            domains: parsed.domains ?? [],
            analysis: parsed.analysis ?? null,
            summary: parsed.summary ?? '',
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
        time: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      }

      const resultPayload = { employeeResults, positionResults, stats }

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
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Bench burn failed' })
      return null
    }
  },

  async executeExternalCandidateAsync(
    request: ExternalCandidateMatchRequest,
    emitEvent: (event: MatchEvent) => void
  ): Promise<number | null> {
    const startTime = Date.now()
    const { claudeProxy } = getConfig()

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
            const response = await claudeProxyService.chatAsync(claudeProxy.opusModel, prompt, 4096, 0.1)
            const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim())

            allResults.push({
              employeeUpstreamId: 0,
              employeeName: candidate.name,
              positionUpstreamId: pos.upstream_id,
              positionLabel: `${pos.account} - ${pos.job_title}`,
              matchScore: parsed.matchScore ?? 0,
              cosineSimilarity: 0,
              scores: parsed.scores ?? {},
              skills: parsed.skills ?? [],
              gaps: parsed.gaps ?? [],
              domains: parsed.domains ?? [],
              analysis: parsed.analysis ?? null,
              summary: parsed.summary ?? '',
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
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'External candidate match failed' })
      return null
    }
  },
}
