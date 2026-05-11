import type { IpcMainInvokeEvent } from 'electron'
import { jobRepository, type AgentJobRow } from '../db/agents/repositories/jobRepository'
import { patternRepository, type PatternApprovalStatus } from '../db/agents/repositories/patternRepository'
import { stakeholderProfileRepository } from '../db/agents/repositories/stakeholderProfileRepository'
import { braniacDataAggregator, MAX_TOKEN_BUDGET, computeStakeholderMetrics, type BraniacDataBundle, type PositionBatch, type StakeholderComputedMetrics, type AggregatedPosition } from './braniacDataAggregator'
import { claudeService } from './claudeService'
import { createStepEmitter } from './agentStepEmitter'
import { createLogger } from './logger'

const log = createLogger('BraniacExecutor')

const BRANIAC_MODEL = 'claude-sonnet-4-20250514'
const MAX_OUTPUT_TOKENS = 8192
const AUTO_APPLY_CONFIDENCE_THRESHOLD = 0.9
const AUTO_APPLY_DATA_POINTS_THRESHOLD = 15

export interface BraniacExecutorRunParams {
  scope: 'account' | 'stakeholder'
  account: string
  stakeholder?: string
  event?: IpcMainInvokeEvent
}

export interface BraniacExecutorStatus {
  running: boolean
  job_id: string | null
}

interface InferredPattern {
  pattern_name: string
  pattern_text: string
  confidence_score: number
  data_points_count: number
}

interface InferredStakeholderProfile {
  stakeholder_name: string
  observed_rate_floor: number | null
  observed_rate_ceiling: number | null
  avg_accepted_rate: number | null
  accepted_countries: string[]
  rejected_countries: string[]
  seniority_flexibility: boolean
  posted_seniorities: string[]
  accepted_seniorities: string[]
  avg_time_to_decision_days: number | null
  top_rejection_reasons: string[]
  top_acceptance_signals: string[]
  preference_summary: string
  actual_accepted_tech_stacks: string[][] | null
  actual_rejected_tech_stacks: string[][] | null
  tech_stack_flexibility: 'rigid' | 'moderate' | 'flexible' | null
  tag_vs_resume_divergence_rate: number | null
}

interface BraniacResult {
  patterns: InferredPattern[]
  stakeholder_profiles: InferredStakeholderProfile[]
}

interface ResumeSkillObservation {
  stakeholder: string
  approvedStacks: string[][]
  rejectedStacks: string[][]
  tagVsResumeMismatches: number
}

interface BatchObservation {
  batchIndex: number
  positionsAnalyzed: number[]
  rateObservations: {
    stakeholder: string
    rates: number[]
    acceptedRates: number[]
    rejectedRates: number[]
  }[]
  countryObservations: {
    stakeholder: string
    accepted: string[]
    rejected: string[]
  }[]
  seniorityObservations: {
    stakeholder: string
    posted: string[]
    accepted: string[]
  }[]
  rejectionThemes: string[]
  acceptanceSignals: string[]
  timingObservations: {
    stakeholder: string
    daysToDecision: number[]
  }[]
  resumeSkillObservations: ResumeSkillObservation[]
  rawNotes: string
}

const PROGRESSIVE_THRESHOLD = 10
const SINGLE_SHOT_TOKEN_LIMIT = 25_000

function buildBatchAnalysisPrompt(
  batch: PositionBatch,
  priorObservations: BatchObservation[],
  account: string
): string {
  const parts: string[] = []

  parts.push(`You are analyzing batch ${batch.batchIndex + 1} of ${batch.totalBatches} for account "${account}".`)
  parts.push('')

  if (priorObservations.length > 0) {
    parts.push('## Prior Context (observations from previous batches)')
    parts.push('Use these to build upon — do NOT repeat them, but consider them when forming new observations.')
    parts.push('')
    for (const obs of priorObservations) {
      parts.push(`### Batch ${obs.batchIndex + 1} (${obs.positionsAnalyzed.length} positions)`)
      if (obs.rejectionThemes.length > 0) parts.push(`- Rejection themes: ${obs.rejectionThemes.join(', ')}`)
      if (obs.acceptanceSignals.length > 0) parts.push(`- Acceptance signals: ${obs.acceptanceSignals.join(', ')}`)
      if (obs.rawNotes) parts.push(`- Notes: ${obs.rawNotes.slice(0, 300)}`)
      parts.push('')
    }
  }

  parts.push(`## Positions in This Batch (${batch.positions.length} positions)`)
  parts.push(JSON.stringify(batch.positions, null, 2))
  parts.push('')

  if (batch.salaryBands.length > 0) {
    parts.push('## Salary Band References')
    parts.push(JSON.stringify(batch.salaryBands, null, 2))
    parts.push('')
  }

  parts.push(`## Output Format
Respond with ONLY a JSON object (no markdown fences) matching this structure:

{
  "rate_observations": [
    { "stakeholder": "...", "rates": [...], "accepted_rates": [...], "rejected_rates": [...] }
  ],
  "country_observations": [
    { "stakeholder": "...", "accepted": ["CO", "MX"], "rejected": ["US"] }
  ],
  "seniority_observations": [
    { "stakeholder": "...", "posted": ["Senior"], "accepted": ["Mid", "Senior"] }
  ],
  "rejection_themes": ["rate too high", "wrong country"],
  "acceptance_signals": ["strong Java skills", "competitive rate"],
  "timing_observations": [
    { "stakeholder": "...", "days_to_decision": [5, 12, 3] }
  ],
  "resume_skill_observations": [
    {
      "stakeholder": "...",
      "approved_stacks": [["C#", ".NET"], ["React", "TypeScript"]],
      "rejected_stacks": [["Java", "Spring"]],
      "tag_vs_resume_mismatches": 3
    }
  ],
  "notes": "Free-form observations about patterns emerging in this batch."
}

Focus on extracting raw data observations, not drawing final conclusions yet.
When candidates have "resumeSkills", compare their actual tech stack against the "requisitionTaggedSkill".
Count mismatches where the tagged skill does not appear in the candidate's primary or secondary tech stack.`)

  return parts.join('\n')
}

function buildBatchSystemPrompt(): string {
  return `You are an expert recruitment data analyst performing incremental analysis.
You are processing positions in batches. Extract structured observations from each batch.

IMPORTANT:
- Focus on raw data extraction, not final conclusions
- Note rates (billing and salary), countries, seniorities, rejection/acceptance patterns
- If prior batch observations are provided, build upon them — do NOT contradict without evidence
- Be specific: include actual numbers, country codes, stakeholder names
- For rate analysis, distinguish billing rate from normalizedMonthlyUsd (candidate salary)
- currency_confidence indicates reliability: "exact" > "high" > "medium" > "low"

SKILL DATA SOURCES:
You will see TWO skill signals per candidate. Treat them differently:
  - "requisitionTaggedSkill": a SINGLE label from the HR system attached when the
    candidate was presented to this position. This often reflects the POSITION'S
    requirement, NOT the candidate's actual profile. Use with caution — a C# dev
    presented on a Java opening may be tagged "Java".
  - "resumeSkills": structured profile EXTRACTED FROM THE CANDIDATE'S RESUME.
    This is the ground truth for what the person actually does. Prefer this
    when describing what stakeholders accept/reject.
When resumeSkills is null, fall back to requisitionTaggedSkill and flag the lower confidence.`
}

function parseBatchObservation(response: string, batchIndex: number, positionIds: number[]): BatchObservation {
  const cleaned = response
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      batchIndex,
      positionsAnalyzed: positionIds,
      rateObservations: (parsed.rate_observations ?? []).map((r: Record<string, unknown>) => ({
        stakeholder: r.stakeholder as string ?? '',
        rates: Array.isArray(r.rates) ? r.rates : [],
        acceptedRates: Array.isArray(r.accepted_rates) ? r.accepted_rates : [],
        rejectedRates: Array.isArray(r.rejected_rates) ? r.rejected_rates : [],
      })),
      countryObservations: (parsed.country_observations ?? []).map((c: Record<string, unknown>) => ({
        stakeholder: c.stakeholder as string ?? '',
        accepted: Array.isArray(c.accepted) ? c.accepted : [],
        rejected: Array.isArray(c.rejected) ? c.rejected : [],
      })),
      seniorityObservations: (parsed.seniority_observations ?? []).map((s: Record<string, unknown>) => ({
        stakeholder: s.stakeholder as string ?? '',
        posted: Array.isArray(s.posted) ? s.posted : [],
        accepted: Array.isArray(s.accepted) ? s.accepted : [],
      })),
      rejectionThemes: Array.isArray(parsed.rejection_themes) ? parsed.rejection_themes : [],
      acceptanceSignals: Array.isArray(parsed.acceptance_signals) ? parsed.acceptance_signals : [],
      timingObservations: (parsed.timing_observations ?? []).map((t: Record<string, unknown>) => ({
        stakeholder: t.stakeholder as string ?? '',
        daysToDecision: Array.isArray(t.days_to_decision) ? t.days_to_decision : [],
      })),
      resumeSkillObservations: (parsed.resume_skill_observations ?? []).map((r: Record<string, unknown>) => ({
        stakeholder: r.stakeholder as string ?? '',
        approvedStacks: Array.isArray(r.approved_stacks) ? r.approved_stacks : [],
        rejectedStacks: Array.isArray(r.rejected_stacks) ? r.rejected_stacks : [],
        tagVsResumeMismatches: typeof r.tag_vs_resume_mismatches === 'number' ? r.tag_vs_resume_mismatches : 0,
      })),
      rawNotes: typeof parsed.notes === 'string' ? parsed.notes : '',
    }
  } catch (error) {
    log.error('Failed to parse batch observation', error instanceof Error ? error : new Error(String(error)), {
      batchIndex,
      responsePreview: cleaned.slice(0, 200),
    })
    return {
      batchIndex,
      positionsAnalyzed: positionIds,
      rateObservations: [],
      countryObservations: [],
      seniorityObservations: [],
      rejectionThemes: [],
      acceptanceSignals: [],
      timingObservations: [],
      resumeSkillObservations: [],
      rawNotes: '',
    }
  }
}

function buildSynthesisPrompt(
  observations: BatchObservation[],
  account: string,
  stakeholder?: string,
  totalPositions?: number
): string {
  const parts: string[] = []

  parts.push(`You analyzed ${totalPositions ?? observations.reduce((s, o) => s + o.positionsAnalyzed.length, 0)} positions across ${observations.length} batches for account "${account}"${stakeholder ? ` (stakeholder: ${stakeholder})` : ''}.`)
  parts.push('')
  parts.push('Below are your accumulated observations from each batch.')
  parts.push('')

  parts.push('## Batch Observations')
  parts.push(JSON.stringify(observations, null, 2))
  parts.push('')

  parts.push(`## Task
Synthesize these observations into final patterns and stakeholder profiles.

Important:
- Combine rate observations across batches to compute floor/ceiling/average
- Merge country lists, deduplicating
- Weight confidence by total data points, not per-batch
- The "rawNotes" fields may contain insights not captured in structured observations — integrate them
- Only include patterns clearly supported by data across multiple batches
- Merge resume_skill_observations across batches and compute actual_accepted_tech_stacks and tech_stack_flexibility for each stakeholder

## Required Output Format

Respond with ONLY a JSON object (no markdown fences) matching this structure:

{
  "patterns": [
    {
      "pattern_name": "short descriptive name",
      "pattern_text": "detailed description of the observed pattern",
      "confidence_score": 0.0 to 1.0,
      "data_points_count": number
    }
  ],
  "stakeholder_profiles": [
    {
      "stakeholder_name": "name from the data",
      "observed_rate_floor": number or null,
      "observed_rate_ceiling": number or null,
      "avg_accepted_rate": number or null,
      "accepted_countries": ["country1", "country2"],
      "rejected_countries": ["country1"],
      "seniority_flexibility": true/false,
      "posted_seniorities": ["Senior", "Mid"],
      "accepted_seniorities": ["Senior"],
      "avg_time_to_decision_days": number or null,
      "top_rejection_reasons": ["reason1", "reason2"],
      "top_acceptance_signals": ["signal1", "signal2"],
      "preference_summary": "A 2-3 paragraph narrative summary of this stakeholder's hiring preferences, rate expectations, and behavioral patterns.",
      "actual_accepted_tech_stacks": [["C#", ".NET"], ["React", "TypeScript"]],
      "actual_rejected_tech_stacks": [["Java", "Spring"]],
      "tech_stack_flexibility": "rigid" | "moderate" | "flexible",
      "tag_vs_resume_divergence_rate": 0.0 to 1.0
    }
  ]
}`)

  return parts.join('\n')
}

function buildSystemPrompt(): string {
  return `You are an expert recruitment data analyst. You analyze historical position and candidate data to infer stakeholder preferences, hiring patterns, and rate behaviors.

Your analysis must be data-driven and specific. Output structured JSON that can be parsed programmatically.

IMPORTANT:
- Only infer patterns that are clearly supported by the data
- Assign confidence scores based on sample size and consistency:
  - 3-5 data points: 0.3-0.5 (low confidence)
  - 6-14 data points: 0.5-0.8 (moderate confidence)
  - 15+ data points: 0.8-1.0 (high confidence)
- If data is insufficient for a particular insight, omit it rather than guess
- For rate analysis, use actual candidate rates and position rate ranges
- When normalized_monthly_usd is available for candidates, use it alongside the billing rate for more accurate cost analysis:
  - "rate" = billing rate charged to the client (from open_position_candidates)
  - "normalizedMonthlyUsd" = the candidate's actual salary expectation/cost in USD/month
  - Distinguish between these two metrics in your analysis — the spread between them is the margin
  - For observed_rate_floor/ceiling/avg_accepted_rate, continue using billing rates as these reflect client-facing pricing
  - Note when normalized salary data reveals candidates whose cost structure wouldn't support a given billing rate
- currency_confidence indicates reliability: "exact" > "high" > "medium" > "low". Weight analysis accordingly.
- For rejection patterns, identify recurring feedback themes

SKILL DATA SOURCES:
You will see TWO skill signals per candidate. Treat them differently:
  - "requisitionTaggedSkill": a SINGLE label from the HR system attached when the
    candidate was presented to this position. This often reflects the POSITION'S
    requirement, NOT the candidate's actual profile. Use with caution — a C# dev
    presented on a Java opening may be tagged "Java".
  - "resumeSkills": structured profile EXTRACTED FROM THE CANDIDATE'S RESUME.
    This is the ground truth for what the person actually does. Prefer this
    when describing what stakeholders accept/reject.

When forming skill-based patterns ("X approved C# candidates"), cite resumeSkills.
When resumeSkills is null, fall back to requisitionTaggedSkill and explicitly
flag the lower confidence in the pattern_text.`
}

function buildAnalysisPrompt(data: BraniacDataBundle): string {
  const parts: string[] = []

  parts.push(`Analyze the following recruitment data for account "${data.account}"${data.stakeholder ? ` (stakeholder: ${data.stakeholder})` : ''}.`)
  parts.push('')

  if (!data.dataCompleteness.hasSalaryBands) {
    parts.push('NOTE: No salary band reference data is available. Rate analysis will be based solely on position and candidate rates.')
  }
  if (!data.dataCompleteness.hasFeedbackCatalog) {
    parts.push('NOTE: No feedback catalog is available. Rejection reasons are raw IDs.')
  }

  parts.push('')
  parts.push(`## Historical Positions (${data.positions.length} positions, ${data.dataPointsCount} total data points)`)
  parts.push('')
  parts.push(JSON.stringify(data.positions, null, 2))

  if (data.salaryBands.length > 0) {
    parts.push('')
    parts.push('## Salary Band References')
    parts.push(JSON.stringify(data.salaryBands, null, 2))
  }

  parts.push('')
  parts.push(`## Required Output Format

Respond with ONLY a JSON object (no markdown fences) matching this structure:

{
  "patterns": [
    {
      "pattern_name": "short descriptive name",
      "pattern_text": "detailed description of the observed pattern",
      "confidence_score": 0.0 to 1.0,
      "data_points_count": number
    }
  ],
  "stakeholder_profiles": [
    {
      "stakeholder_name": "name from the data",
      "observed_rate_floor": number or null,
      "observed_rate_ceiling": number or null,
      "avg_accepted_rate": number or null,
      "accepted_countries": ["country1", "country2"],
      "rejected_countries": ["country1"],
      "seniority_flexibility": true/false,
      "posted_seniorities": ["Senior", "Mid"],
      "accepted_seniorities": ["Senior"],
      "avg_time_to_decision_days": number or null,
      "top_rejection_reasons": ["reason1", "reason2"],
      "top_acceptance_signals": ["signal1", "signal2"],
      "preference_summary": "A 2-3 paragraph narrative summary of this stakeholder's hiring preferences, rate expectations, and behavioral patterns.",
      "actual_accepted_tech_stacks": [["C#", ".NET"], ["React", "TypeScript"]],
      "actual_rejected_tech_stacks": [["Java", "Spring"]],
      "tech_stack_flexibility": "rigid" | "moderate" | "flexible",
      "tag_vs_resume_divergence_rate": 0.0 to 1.0
    }
  ]
}

Analyze:
1. Rate patterns (min/max billing rates, what rates get accepted/rejected)
2. Salary vs rate analysis (compare normalizedMonthlyUsd against billing rates to understand margin patterns)
3. Country/geography preferences (which countries appear accepted vs rejected)
4. Seniority patterns (posted vs actually hired seniorities)
5. Rejection themes (common rejection reasons from feedback)
6. Decision speed (time from candidate presentation to decision)
7. Skill preferences (what skills are repeatedly requested — prefer resumeSkills over requisitionTaggedSkill)
8. Cost feasibility patterns (which country+seniority combinations are feasible at observed rate ranges)
9. Any other recurring behavioral patterns
10. Resume-based skill patterns: compare the requisitionTaggedSkill to each candidate's actual resumeSkills.
    Identify cases where the tagged skill diverges from the resume profile — this reveals how flexible the
    stakeholder is on advertised vs. accepted skill sets.`)

  return parts.join('\n')
}

function parseBraniacResponse(response: string): BraniacResult {
  const cleaned = response
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    const profiles = Array.isArray(parsed.stakeholder_profiles)
      ? parsed.stakeholder_profiles.map((p: Record<string, unknown>) => ({
        ...p,
        actual_accepted_tech_stacks: Array.isArray(p.actual_accepted_tech_stacks) ? p.actual_accepted_tech_stacks : null,
        actual_rejected_tech_stacks: Array.isArray(p.actual_rejected_tech_stacks) ? p.actual_rejected_tech_stacks : null,
        tech_stack_flexibility: typeof p.tech_stack_flexibility === 'string' ? p.tech_stack_flexibility : null,
        tag_vs_resume_divergence_rate: typeof p.tag_vs_resume_divergence_rate === 'number' ? p.tag_vs_resume_divergence_rate : null,
      }))
      : []
    return {
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      stakeholder_profiles: profiles,
    }
  } catch (error) {
    log.error('Failed to parse Braniac response', error instanceof Error ? error : new Error(String(error)), {
      responsePreview: cleaned.slice(0, 200),
    })
    return { patterns: [], stakeholder_profiles: [] }
  }
}

function determineApprovalStatus(
  confidenceScore: number,
  dataPointsCount: number
): PatternApprovalStatus {
  if (confidenceScore >= AUTO_APPLY_CONFIDENCE_THRESHOLD && dataPointsCount >= AUTO_APPLY_DATA_POINTS_THRESHOLD) {
    return 'auto_applied'
  }
  return 'pending_review'
}

function adjustConfidenceForCompleteness(
  confidence: number,
  completeness: BraniacDataBundle['dataCompleteness']
): number {
  let adjustment = 0
  if (!completeness.hasSalaryBands) adjustment -= 0.05
  if (!completeness.hasFeedbackCatalog) adjustment -= 0.05
  if (!completeness.hasRejectionDetails) adjustment -= 0.05
  if (completeness.hasResumeSkills && completeness.resumeSkillsCoverage >= 0.5) adjustment += 0.05
  return Math.max(0, Math.min(1, confidence + adjustment))
}

function attributePatternStakeholder(
  pattern: InferredPattern,
  knownStakeholders: string[]
): string | null {
  const text = `${pattern.pattern_name} ${pattern.pattern_text}`.toLowerCase()
  for (const name of knownStakeholders) {
    if (text.includes(name.toLowerCase())) return name
  }
  return null
}

function mergeStackArrays(a: string[][] | null, b: string[][] | null): string[][] | null {
  if (!a && !b) return null
  const merged = [...(a ?? []), ...(b ?? [])]
  const seen = new Set<string>()
  return merged.filter(stack => {
    const key = stack.sort().join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mergeResults(results: BraniacResult[]): BraniacResult {
  if (results.length === 1) return results[0]

  const patterns: InferredPattern[] = []
  const profileMap = new Map<string, InferredStakeholderProfile>()

  for (const r of results) {
    patterns.push(...r.patterns)

    for (const profile of r.stakeholder_profiles) {
      const existing = profileMap.get(profile.stakeholder_name)
      if (!existing) {
        profileMap.set(profile.stakeholder_name, profile)
      } else {
        profileMap.set(profile.stakeholder_name, {
          ...existing,
          ...profile,
          accepted_countries: [...new Set([
            ...(existing.accepted_countries ?? []),
            ...(profile.accepted_countries ?? []),
          ])],
          rejected_countries: [...new Set([
            ...(existing.rejected_countries ?? []),
            ...(profile.rejected_countries ?? []),
          ])],
          top_rejection_reasons: [...new Set([
            ...(existing.top_rejection_reasons ?? []),
            ...(profile.top_rejection_reasons ?? []),
          ])],
          top_acceptance_signals: [...new Set([
            ...(existing.top_acceptance_signals ?? []),
            ...(profile.top_acceptance_signals ?? []),
          ])],
          actual_accepted_tech_stacks: mergeStackArrays(existing.actual_accepted_tech_stacks, profile.actual_accepted_tech_stacks),
          actual_rejected_tech_stacks: mergeStackArrays(existing.actual_rejected_tech_stacks, profile.actual_rejected_tech_stacks),
          tech_stack_flexibility: profile.tech_stack_flexibility ?? existing.tech_stack_flexibility,
          tag_vs_resume_divergence_rate: profile.tag_vs_resume_divergence_rate ?? existing.tag_vs_resume_divergence_rate,
        })
      }
    }
  }

  return {
    patterns,
    stakeholder_profiles: Array.from(profileMap.values()),
  }
}

class BraniacExecutor {
  private activeRunId: string | null = null
  private abortController: AbortController | null = null

  async run(params: BraniacExecutorRunParams): Promise<AgentJobRow> {
    if (this.activeRunId) {
      throw new Error('Braniac run already in progress')
    }

    const startTime = Date.now()
    const { scope, account, stakeholder, event } = params

    if (scope === 'stakeholder' && !stakeholder) {
      throw new Error('Stakeholder name is required for stakeholder scope')
    }

    const job = jobRepository.create({
      status: 'running',
      scope_type: scope,
      scope_value: stakeholder ?? account,
      initiated_by: 'user',
      run_reason: `Braniac analysis for ${scope}: ${stakeholder ?? account}`,
      pipeline_phase: 'aggregating',
      agent_type: 'braniac',
      started_at: new Date().toISOString(),
      metadata_json: JSON.stringify({ account, stakeholder: stakeholder ?? null }),
    })

    this.activeRunId = job.id
    this.abortController = new AbortController()

    log.info('Braniac run started', { jobId: job.id, scope, account, stakeholder })

    const emitter = event
      ? createStepEmitter({ agentId: 'braniac', runId: job.id, event })
      : null

    try {
      await emitter?.narrate(
        'Aggregating data',
        `Collecting historical data for ${account}${stakeholder ? ` / ${stakeholder}` : ''}...`,
        'thinking'
      )

      jobRepository.update(job.id, { pipeline_phase: 'aggregating' })

      const batches = braniacDataAggregator.aggregateInBatches(account, stakeholder)
      const totalPositions = batches.reduce((s, b) => s + b.positions.length, 0)

      if (totalPositions === 0) {
        jobRepository.update(job.id, {
          status: 'completed',
          pipeline_phase: 'done',
          completed_at: new Date().toISOString(),
          metadata_json: JSON.stringify({
            account,
            stakeholder: stakeholder ?? null,
            result: 'no_data',
            dataPointsCount: 0,
            durationMs: Date.now() - startTime,
          }),
        })

        await emitter?.narrate(
          'No data found',
          `No historical position data found for ${account}. Cannot infer patterns.`,
          'done'
        )

        return jobRepository.getById(job.id) ?? job
      }

      const isClaudeAvailable = await claudeService.checkAvailability().catch(() => false)
      if (!isClaudeAvailable) {
        throw new Error(
          'Claude AI is not available. Ensure the Claude Proxy is running on localhost:3456 or that valid Claude API credentials are configured.'
        )
      }

      const totalTokens = batches.reduce((s, b) => s + b.estimatedTokens, 0)

      if (totalPositions <= PROGRESSIVE_THRESHOLD && totalTokens <= SINGLE_SHOT_TOKEN_LIMIT) {
        try {
          return await this.runSingleShot(job, params, batches, emitter, startTime)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('Empty response')) {
            log.warn('Single-shot returned empty — retrying with progressive mode', {
              totalPositions,
              totalTokens,
            })
            await emitter?.narrate(
              'Retrying with chunked analysis',
              'Single-shot analysis returned empty. Retrying by splitting into smaller batches…',
              'running'
            )
            return await this.runProgressive(job, params, batches, emitter, startTime)
          }
          throw err
        }
      }

      log.info('Routing to progressive mode', {
        totalPositions,
        totalTokens,
        reason: totalPositions > PROGRESSIVE_THRESHOLD ? 'position-count' : 'token-size',
      })
      return await this.runProgressive(job, params, batches, emitter, startTime)
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error)
      const isAuthError = rawMessage.includes('not available') || rawMessage.includes('auth') || rawMessage.includes('ECONNREFUSED') || rawMessage.includes('proxy')
      const isAbortError = rawMessage.includes('abort') || rawMessage.includes('cancel')
      const isEmptyResponse = rawMessage.includes('Empty response')

      let userMessage = rawMessage
      if (isAuthError) {
        userMessage = `Claude AI connectivity issue: ${rawMessage}. Verify that the Claude Proxy is running on localhost:3456.`
      } else if (isEmptyResponse) {
        userMessage = `Claude returned an empty response. The data bundle may be too large or the model may have timed out. Try again or reduce the account scope.`
      } else if (isAbortError) {
        userMessage = `Analysis was aborted: ${rawMessage}`
      }

      jobRepository.update(job.id, {
        status: 'failed',
        pipeline_phase: 'error',
        completed_at: new Date().toISOString(),
        error_message: userMessage,
        metadata_json: JSON.stringify({
          account,
          stakeholder: stakeholder ?? null,
          durationMs: Date.now() - startTime,
          errorType: isAuthError ? 'claude_connectivity' : isEmptyResponse ? 'empty_response' : isAbortError ? 'aborted' : 'unknown',
        }),
      })

      log.error('Braniac run failed', error instanceof Error ? error : new Error(rawMessage), {
        jobId: job.id,
        account,
        stakeholder,
        errorType: isAuthError ? 'claude_connectivity' : isEmptyResponse ? 'empty_response' : isAbortError ? 'aborted' : 'unknown',
      })

      await emitter?.narrate(
        'Analysis failed',
        userMessage,
        'error',
        { error: userMessage }
      )

      const enrichedError = new Error(userMessage)
      enrichedError.cause = error
      throw enrichedError
    } finally {
      this.activeRunId = null
      this.abortController = null
    }
  }

  private async runSingleShot(
    job: AgentJobRow,
    params: BraniacExecutorRunParams,
    batches: PositionBatch[],
    emitter: ReturnType<typeof createStepEmitter> | null,
    startTime: number
  ): Promise<AgentJobRow> {
    const { account, stakeholder } = params
    const dataCompleteness = batches[0].dataCompleteness

    const allPositions = batches.flatMap(b => b.positions)
    const totalPositions = allPositions.length
    const totalDataPoints = allPositions.reduce(
      (sum, p) => sum + Math.max(1, p.candidates.length), 0
    )

    const singleBundle: BraniacDataBundle = {
      account,
      stakeholder,
      positions: allPositions,
      salaryBands: batches[0].salaryBands,
      feedbackCatalog: batches[0].feedbackCatalog,
      dataPointsCount: totalDataPoints,
      estimatedTokens: batches.reduce((s, b) => s + b.estimatedTokens, 0),
      dataCompleteness,
    }

    log.info('Using single-shot analysis path', {
      jobId: job.id,
      positions: totalPositions,
      dataPoints: totalDataPoints,
    })

    await emitter?.narrate(
      'Analyzing patterns',
      `Found ${totalPositions} positions with ${totalDataPoints} data points. Sending to Claude for analysis...`,
      'running',
      { positions: totalPositions, dataPoints: totalDataPoints }
    )

    jobRepository.update(job.id, {
      pipeline_phase: 'analyzing',
      metadata_json: JSON.stringify({
        account,
        stakeholder: stakeholder ?? null,
        mode: 'single-shot',
        batch: 1,
        totalBatches: 1,
        positionsProcessed: 0,
        totalPositions,
        progressPct: 10,
        phase: 'analyzing',
      }),
    })

    const response = await claudeService.chatAsync(
      BRANIAC_MODEL,
      buildAnalysisPrompt(singleBundle),
      MAX_OUTPUT_TOKENS,
      0.1,
      buildSystemPrompt(),
      this.abortController!.signal
    )

    log.info('Claude analysis received (single-shot)', {
      jobId: job.id,
      responseLength: response.length,
    })

    const result = parseBraniacResponse(response)

    jobRepository.update(job.id, {
      metadata_json: JSON.stringify({
        account,
        stakeholder: stakeholder ?? null,
        mode: 'single-shot',
        batch: 1,
        totalBatches: 1,
        positionsProcessed: totalPositions,
        totalPositions,
        progressPct: 90,
        phase: 'persisting',
      }),
    })

    const positionsByStakeholder = new Map<string, AggregatedPosition[]>()
    for (const pos of allPositions) {
      const key = pos.stakeholder || stakeholder || 'Unknown'
      const arr = positionsByStakeholder.get(key) || []
      arr.push(pos)
      positionsByStakeholder.set(key, arr)
    }
    const metricsMap = new Map<string, StakeholderComputedMetrics>()
    for (const [name, positions] of positionsByStakeholder) {
      metricsMap.set(name, computeStakeholderMetrics(positions))
    }

    return this.persistResults(result, job, account, stakeholder, totalDataPoints, totalPositions, dataCompleteness, emitter, startTime, 'single-shot', undefined, metricsMap)
  }

  private async runProgressive(
    job: AgentJobRow,
    params: BraniacExecutorRunParams,
    batches: PositionBatch[],
    emitter: ReturnType<typeof createStepEmitter> | null,
    startTime: number
  ): Promise<AgentJobRow> {
    const { account, stakeholder } = params
    const batchSize = batches.length > 0 ? batches[0].positions.length : 8
    const totalPositions = batches.reduce((s, b) => s + b.positions.length, 0)
    const totalDataPoints = batches.flatMap(b => b.positions).reduce(
      (sum, p) => sum + Math.max(1, p.candidates.length), 0
    )
    const dataCompleteness = batches[0].dataCompleteness

    log.info('Using progressive analysis path', {
      jobId: job.id,
      positions: totalPositions,
      batches: batches.length,
      batchSize,
    })

    const observations: BatchObservation[] = []

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]

      if (this.abortController?.signal.aborted) {
        throw new Error('Analysis was aborted by user')
      }

      const posStart = i * batchSize + 1
      const posEnd = Math.min((i + 1) * batchSize, totalPositions)
      const progressPct = Math.round((i / (batches.length + 1)) * 100)

      await emitter?.narrate(
        `Analyzing positions ${posStart}–${posEnd} of ${totalPositions}`,
        `Batch ${i + 1}/${batches.length}: ${batch.positions.map(p => p.jobTitle).slice(0, 4).join(', ')}${batch.positions.length > 4 ? '…' : ''}`,
        'running',
        {
          batch: i + 1,
          totalBatches: batches.length,
          positionsProcessed: i * batchSize,
          totalPositions,
          progressPct,
          phase: 'analyzing',
        }
      )

      jobRepository.update(job.id, {
        pipeline_phase: 'analyzing',
        metadata_json: JSON.stringify({
          account,
          stakeholder: stakeholder ?? null,
          mode: 'progressive',
          batch: i + 1,
          totalBatches: batches.length,
          positionsProcessed: i * batchSize,
          totalPositions,
          progressPct,
        }),
      })

      const prompt = buildBatchAnalysisPrompt(batch, observations, account)
      const response = await claudeService.chatAsync(
        BRANIAC_MODEL,
        prompt,
        MAX_OUTPUT_TOKENS,
        0.1,
        buildBatchSystemPrompt(),
        this.abortController!.signal
      )

      log.info('Batch analysis received', {
        jobId: job.id,
        batch: i + 1,
        totalBatches: batches.length,
        responseLength: response.length,
      })

      const positionIds = batch.positions.map(p => p.upstreamId)
      const observation = parseBatchObservation(response, i, positionIds)
      observations.push(observation)

      jobRepository.update(job.id, {
        metadata_json: JSON.stringify({
          account,
          stakeholder: stakeholder ?? null,
          mode: 'progressive',
          batch: i + 1,
          totalBatches: batches.length,
          positionsProcessed: (i + 1) * batchSize,
          totalPositions,
          progressPct: Math.round(((i + 1) / (batches.length + 1)) * 100),
          observations: observations.map(o => ({
            batch: o.batchIndex + 1,
            positions: o.positionsAnalyzed.length,
            rateObs: o.rateObservations.length,
            countryObs: o.countryObservations.length,
            themes: o.rejectionThemes.length,
            notes: o.rawNotes.slice(0, 200),
          })),
        }),
      })
    }

    if (this.abortController?.signal.aborted) {
      throw new Error('Analysis was aborted by user')
    }

    const synthesisPct = Math.round((batches.length / (batches.length + 1)) * 100)

    await emitter?.narrate(
      'Synthesizing patterns',
      `Consolidating insights from ${observations.length} batches across ${totalPositions} positions...`,
      'running',
      {
        batch: batches.length,
        totalBatches: batches.length,
        positionsProcessed: totalPositions,
        totalPositions,
        progressPct: synthesisPct,
        phase: 'synthesizing',
      }
    )

    jobRepository.update(job.id, {
      pipeline_phase: 'synthesizing',
      metadata_json: JSON.stringify({
        account,
        stakeholder: stakeholder ?? null,
        mode: 'progressive',
        batch: batches.length,
        totalBatches: batches.length,
        positionsProcessed: totalPositions,
        totalPositions,
        progressPct: synthesisPct,
        phase: 'synthesizing',
      }),
    })

    const synthesisPrompt = buildSynthesisPrompt(observations, account, stakeholder, totalPositions)
    const synthesisResponse = await claudeService.chatAsync(
      BRANIAC_MODEL,
      synthesisPrompt,
      MAX_OUTPUT_TOKENS,
      0.1,
      buildSystemPrompt(),
      this.abortController!.signal
    )

    log.info('Synthesis response received', {
      jobId: job.id,
      responseLength: synthesisResponse.length,
      batchesProcessed: observations.length,
    })

    const result = parseBraniacResponse(synthesisResponse)

    const allPositions = batches.flatMap(b => b.positions)
    const positionsByStakeholder = new Map<string, AggregatedPosition[]>()
    for (const pos of allPositions) {
      const key = pos.stakeholder || stakeholder || 'Unknown'
      const arr = positionsByStakeholder.get(key) || []
      arr.push(pos)
      positionsByStakeholder.set(key, arr)
    }
    const metricsMap = new Map<string, StakeholderComputedMetrics>()
    for (const [name, positions] of positionsByStakeholder) {
      metricsMap.set(name, computeStakeholderMetrics(positions))
    }

    return this.persistResults(result, job, account, stakeholder, totalDataPoints, totalPositions, dataCompleteness, emitter, startTime, 'progressive', batches.length, metricsMap)
  }

  private async persistResults(
    result: BraniacResult,
    job: AgentJobRow,
    account: string,
    stakeholder: string | undefined,
    totalDataPoints: number,
    totalPositions: number,
    dataCompleteness: BraniacDataBundle['dataCompleteness'],
    emitter: ReturnType<typeof createStepEmitter> | null,
    startTime: number,
    mode: 'single-shot' | 'progressive',
    batchCount?: number,
    metricsMap?: Map<string, StakeholderComputedMetrics>
  ): Promise<AgentJobRow> {
    await emitter?.narrate(
      'Processing results',
      'Persisting patterns and stakeholder profiles...',
      'running'
    )

    jobRepository.update(job.id, { pipeline_phase: 'persisting' })

    log.info('Persisting results', {
      jobId: job.id,
      mode,
      patternsFound: result.patterns.length,
      profilesFound: result.stakeholder_profiles.length,
    })

    let patternsCreated = 0
    let autoApplied = 0
    let pendingReview = 0

    const knownStakeholders = result.stakeholder_profiles.map(p => p.stakeholder_name)

    for (const pattern of result.patterns) {
      const adjustedConfidence = adjustConfidenceForCompleteness(
        pattern.confidence_score,
        dataCompleteness
      )
      const approvalStatus = determineApprovalStatus(adjustedConfidence, pattern.data_points_count)
      const inferredStakeholder = stakeholder ?? attributePatternStakeholder(pattern, knownStakeholders)

      try {
        patternRepository.createPattern({
          pattern_name: `[${account}] ${pattern.pattern_name}`,
          pattern_text: pattern.pattern_text,
          confidence_score: adjustedConfidence,
          is_active: approvalStatus === 'auto_applied' ? 1 : 0,
          approval_status: approvalStatus,
          account,
          stakeholder: inferredStakeholder,
          source_agent: 'braniac',
          data_points_count: pattern.data_points_count,
        })
        patternsCreated++
        if (approvalStatus === 'auto_applied') autoApplied++
        else pendingReview++
      } catch (error) {
        log.warn('Failed to create pattern (possible duplicate)', {
          patternName: pattern.pattern_name,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    let profilesUpserted = 0
    for (const profile of result.stakeholder_profiles) {
      try {
        const metrics = metricsMap?.get(profile.stakeholder_name)
        stakeholderProfileRepository.upsert({
          stakeholder_name: profile.stakeholder_name,
          account,
          observed_rate_floor: profile.observed_rate_floor,
          observed_rate_ceiling: profile.observed_rate_ceiling,
          avg_accepted_rate: profile.avg_accepted_rate,
          accepted_countries: JSON.stringify(profile.accepted_countries ?? []),
          rejected_countries: JSON.stringify(profile.rejected_countries ?? []),
          seniority_flexibility: profile.seniority_flexibility ? 1 : 0,
          posted_seniorities: JSON.stringify(profile.posted_seniorities ?? []),
          accepted_seniorities: JSON.stringify(profile.accepted_seniorities ?? []),
          avg_time_to_decision_days: profile.avg_time_to_decision_days,
          top_rejection_reasons: JSON.stringify(profile.top_rejection_reasons ?? []),
          top_acceptance_signals: JSON.stringify(profile.top_acceptance_signals ?? []),
          preference_summary: profile.preference_summary ?? '',
          actual_accepted_tech_stacks_json: profile.actual_accepted_tech_stacks ? JSON.stringify(profile.actual_accepted_tech_stacks) : null,
          actual_rejected_tech_stacks_json: profile.actual_rejected_tech_stacks ? JSON.stringify(profile.actual_rejected_tech_stacks) : null,
          tech_stack_flexibility: profile.tech_stack_flexibility ?? null,
          tag_vs_resume_divergence_rate: profile.tag_vs_resume_divergence_rate ?? null,
          total_candidates_presented: metrics?.totalPresented ?? 0,
          total_candidates_accepted: metrics?.totalAccepted ?? 0,
          success_rate: metrics?.successRate ?? null,
          avg_published_rate: metrics?.avgPublishedRate ?? null,
          avg_days_to_close: metrics?.avgDaysToClose ?? null,
          total_closed_positions: metrics?.totalClosedPositions ?? 0,
          total_won_positions: metrics?.totalWonPositions ?? 0,
          win_rate: metrics?.winRate ?? null,
          data_points_count: totalDataPoints,
          confidence_score: adjustConfidenceForCompleteness(
            totalDataPoints >= 15 ? 0.85 : totalDataPoints >= 6 ? 0.6 : 0.35,
            dataCompleteness
          ),
          last_inference_job_id: job.id,
        })
        profilesUpserted++
      } catch (error) {
        log.error('Failed to upsert stakeholder profile', error instanceof Error ? error : new Error(String(error)), {
          stakeholder: profile.stakeholder_name,
        })
      }
    }

    const durationMs = Date.now() - startTime
    jobRepository.update(job.id, {
      status: 'completed',
      pipeline_phase: 'done',
      completed_at: new Date().toISOString(),
      metadata_json: JSON.stringify({
        account,
        stakeholder: stakeholder ?? null,
        mode,
        dataPointsCount: totalDataPoints,
        totalPositions,
        batches: batchCount ?? 1,
        dataCompleteness,
        patternsCreated,
        autoApplied,
        pendingReview,
        profilesUpserted,
        durationMs,
      }),
    })

    log.info('Braniac run completed', {
      jobId: job.id,
      mode,
      patternsCreated,
      autoApplied,
      pendingReview,
      profilesUpserted,
      durationMs,
    })

    const summary = mode === 'progressive'
      ? `Progressive analysis complete (${batchCount} batches): ${patternsCreated} patterns (${autoApplied} auto-applied, ${pendingReview} pending review), ${profilesUpserted} stakeholder profiles updated.`
      : `Analysis complete: ${patternsCreated} patterns (${autoApplied} auto-applied, ${pendingReview} pending review), ${profilesUpserted} stakeholder profiles updated.`

    await emitter?.narrate(
      'Analysis complete',
      summary,
      'done',
      {
        patternsCreated, autoApplied, pendingReview, profilesUpserted,
        mode, batches: batchCount ?? 1,
        progressPct: 100,
        phase: 'done',
      }
    )

    return jobRepository.getById(job.id) ?? job
  }

  cancel(jobId?: string): boolean {
    const targetId = jobId ?? this.activeRunId
    if (!targetId) return false

    if (this.abortController) {
      this.abortController.abort()
    }

    log.info('Braniac run canceled', { jobId: targetId })

    const now = new Date().toISOString()
    jobRepository.update(targetId, {
      status: 'canceled',
      pipeline_phase: 'canceled',
      canceled_at: now,
      completed_at: now,
    })

    this.activeRunId = null
    this.abortController = null
    return true
  }

  getStatus(): BraniacExecutorStatus {
    return {
      running: this.activeRunId !== null,
      job_id: this.activeRunId,
    }
  }
}

export const braniacExecutor = new BraniacExecutor()
