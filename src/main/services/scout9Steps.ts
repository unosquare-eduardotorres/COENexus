import { getDatabase } from '../db/connection'
import { reportRepository } from '../db/scout9/repositories/reportRepository'
import { assembleBrain } from './scout9BrainService'
import { createLogger } from './logger'
import type { PipelineContext, Scout9PipelineEvent } from './scout9PipelineService'

const log = createLogger('Scout9Steps')

interface PositionRow {
  id: number
  upstream_id: number
  account: string
  coe: string
  stakeholder: string
  main_skill: string
  job_title: string
  job_description: string
  seniorities: string
  countries: string
  vertical_industry: string
  aging: number
  candidates_presented: number
}

interface CandidatePoolEntry {
  upstreamId: number
  sourceType: 'candidates' | 'employees'
  fullName: string
  mainSkill: string
  seniority: string
  country: string
  hasResumeText: boolean
}

export async function fetchPositions(
  ctx: PipelineContext,
  emit: (e: Scout9PipelineEvent) => void
): Promise<PipelineContext> {
  emit({ type: 'log', message: '1.1 Connecting to nexus.db → synced_open_positions' })
  const db = getDatabase()
  const filters = ctx.params.filters
  const conditions: string[] = ["position_status = 'Active'"]
  const params: unknown[] = []

  emit({ type: 'log', message: '1.2 Applying scope filters...' })
  if (filters?.coe && filters.coe.length > 0) {
    conditions.push(`coe IN (${filters.coe.map(() => '?').join(',')})`)
    params.push(...filters.coe)
  }
  if (filters?.client && filters.client.length > 0) {
    conditions.push(`account IN (${filters.client.map(() => '?').join(',')})`)
    params.push(...filters.client)
  }
  if (filters?.vertical && filters.vertical.length > 0) {
    conditions.push(`vertical_industry IN (${filters.vertical.map(() => '?').join(',')})`)
    params.push(...filters.vertical)
  }
  if (filters?.positions && filters.positions.length > 0) {
    conditions.push(`upstream_id IN (${filters.positions.map(() => '?').join(',')})`)
    params.push(...filters.positions)
  }

  emit({ type: 'log', message: `1.3 Applying preset logic: ${ctx.params.preset ?? 'all-active'}` })
  if (ctx.params.preset === 'no-candidates') {
    conditions.push('candidates_presented = 0')
  } else if (ctx.params.preset === 'stalled-30d') {
    conditions.push('aging >= 30')
  } else if (ctx.params.preset === 'high-priority') {
    conditions.push('aging >= 14 AND candidates_presented = 0')
  }

  emit({ type: 'log', message: '1.4 Executing position query...' })
  const query = `SELECT id, upstream_id, account, coe, stakeholder, main_skill, job_title, job_description, seniorities, countries, vertical_industry, aging, candidates_presented FROM synced_open_positions WHERE ${conditions.join(' AND ')} ORDER BY aging DESC`
  const positions = db.prepare(query).all(...params) as PositionRow[]

  emit({ type: 'log', message: `1.5 Found ${positions.length} positions matching filters` })
  emit({ type: 'stats', data: { positionsFound: positions.length } })
  return { ...ctx, positions, stepData: { positionsFound: positions.length } }
}

export async function gatherCandidates(
  ctx: PipelineContext,
  emit: (e: Scout9PipelineEvent) => void
): Promise<PipelineContext> {
  const db = getDatabase()
  const positions = ctx.positions as PositionRow[]

  emit({ type: 'log', message: '2.1 Querying candidate pool from resume_embeddings JOIN synced_candidates...' })
  const candidateRows = db.prepare(`
    SELECT re.upstream_id, sc.full_name, sc.main_skill, sc.seniority, sc.country,
      CASE WHEN re.resume_text IS NOT NULL AND re.resume_text != '' THEN 1 ELSE 0 END as has_text
    FROM resume_embeddings re
    JOIN synced_candidates sc ON sc.upstream_id = re.upstream_id
    WHERE re.source_type = 'candidates'
  `).all() as { upstream_id: number; full_name: string; main_skill: string | null; seniority: string | null; country: string | null; has_text: number }[]
  emit({ type: 'log', message: `2.1 Found ${candidateRows.length} candidates with embeddings` })

  emit({ type: 'log', message: '2.2 Querying employee pool from resume_embeddings JOIN synced_employees...' })
  const employeeRows = db.prepare(`
    SELECT re.upstream_id, se.full_name, se.main_skill, se.seniority, se.country,
      CASE WHEN re.resume_text IS NOT NULL AND re.resume_text != '' THEN 1 ELSE 0 END as has_text
    FROM resume_embeddings re
    JOIN synced_employees se ON se.upstream_id = re.upstream_id
    WHERE re.source_type = 'employees'
  `).all() as { upstream_id: number; full_name: string; main_skill: string; seniority: string; country: string; has_text: number }[]
  emit({ type: 'log', message: `2.2 Found ${employeeRows.length} employees with embeddings` })

  emit({ type: 'log', message: '2.3 Building unified candidate pool...' })
  const fullPool: CandidatePoolEntry[] = [
    ...candidateRows.map(row => ({
      upstreamId: row.upstream_id,
      sourceType: 'candidates' as const,
      fullName: row.full_name,
      mainSkill: row.main_skill ?? '',
      seniority: row.seniority ?? '',
      country: row.country ?? '',
      hasResumeText: row.has_text === 1,
    })),
    ...employeeRows.map(row => ({
      upstreamId: row.upstream_id,
      sourceType: 'employees' as const,
      fullName: row.full_name,
      mainSkill: row.main_skill,
      seniority: row.seniority,
      country: row.country,
      hasResumeText: row.has_text === 1,
    })),
  ]
  emit({ type: 'log', message: `2.3 Unified pool: ${fullPool.length} total (${candidateRows.length} candidates + ${employeeRows.length} employees)` })

  emit({ type: 'log', message: `2.4 Assigning pool to ${positions.length} positions...` })
  const candidates = new Map<number, CandidatePoolEntry[]>()
  for (const pos of positions) {
    if (ctx.signal.aborted) break
    candidates.set(pos.upstream_id, fullPool)
  }

  const totalCandidates = positions.length * fullPool.length
  emit({ type: 'log', message: `2.5 Candidate gathering complete: ${totalCandidates.toLocaleString()} position-candidate pairs` })
  emit({ type: 'stats', data: { candidatesGathered: totalCandidates, poolSize: fullPool.length } })
  return { ...ctx, candidates, stepData: { candidatesGathered: totalCandidates } }
}

export async function crossReference(
  ctx: PipelineContext,
  emit: (e: Scout9PipelineEvent) => void
): Promise<PipelineContext> {
  const db = getDatabase()
  const positions = ctx.positions as PositionRow[]
  const crossRefData = new Map<number, Set<number>>()

  emit({ type: 'log', message: `3.1 Cross-referencing ${positions.length} positions...` })
  for (const pos of positions) {
    if (ctx.signal.aborted) break

    emit({ type: 'log', message: `3.2 Querying presented candidates for position ${pos.upstream_id} (${pos.job_title})` })
    const presented = db.prepare(
      'SELECT candidate_id FROM open_position_candidates WHERE open_position_id = ?'
    ).all(pos.upstream_id) as { candidate_id: number }[]

    crossRefData.set(pos.upstream_id, new Set(presented.map(p => p.candidate_id)))
  }

  emit({ type: 'log', message: '3.3 Building exclusion sets per position...' })
  const totalPresentedPairs = Array.from(crossRefData.values()).reduce((s, set) => s + set.size, 0)
  emit({ type: 'log', message: `3.4 Cross-reference complete: ${totalPresentedPairs} already-presented pairs across ${positions.length} positions` })
  emit({ type: 'stats', data: { crossReferencedPairs: totalPresentedPairs } })
  return { ...ctx, crossRefData, stepData: { crossReferencedPairs: totalPresentedPairs } }
}

export async function runAgenticPhase(
  ctx: PipelineContext,
  emit: (e: Scout9PipelineEvent) => void
): Promise<PipelineContext> {
  const positions = ctx.positions as PositionRow[]
  const candidates = ctx.candidates as Map<number, CandidatePoolEntry[]>
  const crossRefData = ctx.crossRefData as Map<number, Set<number>>

  const firstPosition = positions[0]
  const scopeClient = firstPosition?.account
  const scopeStakeholder = firstPosition?.stakeholder

  emit({ type: 'log', message: '4.1 Assembling brain: rules, glossary, patterns, notes with token budget trimming...' })
  const { systemPrompt, snapshotId } = assembleBrain(ctx.jobId, scopeClient, scopeStakeholder)
  emit({ type: 'log', message: `4.1 Brain assembled (snapshot: ${snapshotId}), system prompt: ${systemPrompt.length} chars` })

  emit({ type: 'log', message: '4.2 System prompt loaded from active version' })

  emit({ type: 'log', message: '4.3 Building position summaries, filtering out already-presented candidates...' })
  const positionSummaries = positions.map(pos => {
    const pool = candidates.get(pos.upstream_id) ?? []
    const presented = crossRefData.get(pos.upstream_id) ?? new Set()
    const newCandidates = pool.filter(c => !presented.has(c.upstreamId))

    return {
      upstreamId: pos.upstream_id,
      account: pos.account,
      jobTitle: pos.job_title,
      mainSkill: pos.main_skill,
      seniorities: pos.seniorities,
      countries: pos.countries,
      aging: pos.aging,
      candidatesPresented: pos.candidates_presented,
      availableCandidates: newCandidates.map(c => ({
        upstreamId: c.upstreamId,
        sourceType: c.sourceType,
        name: c.fullName,
        skill: c.mainSkill,
        seniority: c.seniority,
        country: c.country,
        hasResume: c.hasResumeText,
      })),
    }
  })

  const totalAvailable = positionSummaries.reduce((s, p) => s + p.availableCandidates.length, 0)
  emit({ type: 'log', message: `4.3 Position summaries built: ${positions.length} positions, ${totalAvailable} available candidates` })

  emit({ type: 'log', message: '4.4 Constructing analysis prompt with positions + candidate data...' })

  const analysisPrompt = `Analyze the following positions and their candidate pools. For each position, recommend the best matching candidates.

POSITIONS AND CANDIDATES:
${JSON.stringify(positionSummaries, null, 2)}

Use the available tools to get additional details when needed (resume text, discussion history, candidate presentation history).

Respond with a valid JSON report following the structure defined in your system instructions.`

  emit({ type: 'log', message: '4.5 Running AI analysis (stub — returns fitScore: 50, pending Agent SDK wiring)...' })
  let reportContent: Record<string, unknown>
  try {
    reportContent = {
      summary: `Scout-9 analysis of ${positions.length} positions with ${positionSummaries.reduce((s, p) => s + p.availableCandidates.length, 0)} available candidates`,
      positions: positionSummaries.map(pos => ({
        upstreamId: pos.upstreamId,
        account: pos.account,
        jobTitle: pos.jobTitle,
        recommendations: pos.availableCandidates.slice(0, 5).map(c => ({
          candidateUpstreamId: c.upstreamId,
          candidateSourceType: c.sourceType,
          candidateName: c.name,
          fitScore: 50,
          reasoning: 'Pending AI analysis',
          strengths: [c.skill],
          concerns: [],
        })),
      })),
    }
  } catch (err) {
    log.error('Failed to build report content', err instanceof Error ? err : new Error(String(err)))
    reportContent = { summary: 'Analysis failed', positions: [] }
  }

  const allRecommendations = (reportContent.positions as Array<{ recommendations: unknown[] }>)
    ?.flatMap(p => p.recommendations) ?? []

  emit({ type: 'log', message: `4.6 Persisting report to scout9.db (${allRecommendations.length} recommendations)...` })
  const report = reportRepository.createReport({
    job_id: ctx.jobId,
    report_title: `Scout-9 Report: ${positions.length} positions`,
    report_markdown: JSON.stringify(reportContent, null, 2),
    status: 'published',
  })

  emit({ type: 'stats', data: { reportId: report.id, recommendationCount: allRecommendations.length } })
  return { ...ctx, agenticResult: JSON.stringify(reportContent), stepData: { reportId: report.id } }
}
