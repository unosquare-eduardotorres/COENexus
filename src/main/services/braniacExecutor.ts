import type { IpcMainInvokeEvent } from 'electron'
import { jobRepository, type AgentJobRow } from '../db/agents/repositories/jobRepository'
import { patternRepository, type PatternApprovalStatus } from '../db/agents/repositories/patternRepository'
import { stakeholderProfileRepository } from '../db/agents/repositories/stakeholderProfileRepository'
import { braniacDataAggregator, type BraniacDataBundle } from './braniacDataAggregator'
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
}

interface BraniacResult {
  patterns: InferredPattern[]
  stakeholder_profiles: InferredStakeholderProfile[]
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
- For rejection patterns, identify recurring feedback themes`
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
      "preference_summary": "A 2-3 paragraph narrative summary of this stakeholder's hiring preferences, rate expectations, and behavioral patterns."
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
7. Skill preferences (what skills are repeatedly requested)
8. Cost feasibility patterns (which country+seniority combinations are feasible at observed rate ranges)
9. Any other recurring behavioral patterns`)

  return parts.join('\n')
}

function parseBraniacResponse(response: string): BraniacResult {
  const cleaned = response
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      stakeholder_profiles: Array.isArray(parsed.stakeholder_profiles) ? parsed.stakeholder_profiles : [],
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
  return Math.max(0, Math.min(1, confidence + adjustment))
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

      const dataBundle = scope === 'stakeholder'
        ? braniacDataAggregator.aggregateForStakeholder(account, stakeholder!)
        : braniacDataAggregator.aggregateForAccount(account)

      log.info('Data aggregation complete', {
        jobId: job.id,
        positions: dataBundle.positions.length,
        dataPoints: dataBundle.dataPointsCount,
        estimatedTokens: dataBundle.estimatedTokens,
        completeness: dataBundle.dataCompleteness,
      })

      if (dataBundle.positions.length === 0) {
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

      await emitter?.narrate(
        'Analyzing patterns',
        `Found ${dataBundle.positions.length} positions with ${dataBundle.dataPointsCount} data points. Sending to Claude for analysis...`,
        'running',
        { positions: dataBundle.positions.length, dataPoints: dataBundle.dataPointsCount, tokens: dataBundle.estimatedTokens }
      )

      jobRepository.update(job.id, { pipeline_phase: 'analyzing' })

      const systemPrompt = buildSystemPrompt()
      const analysisPrompt = buildAnalysisPrompt(dataBundle)

      const response = await claudeService.chatAsync(
        BRANIAC_MODEL,
        analysisPrompt,
        MAX_OUTPUT_TOKENS,
        0.1,
        systemPrompt,
        this.abortController.signal
      )

      const tokenUsage = claudeService.getTokenUsage?.() ?? null

      log.info('Claude analysis received', {
        jobId: job.id,
        responseLength: response.length,
        tokenUsage,
      })

      await emitter?.narrate(
        'Processing results',
        'Parsing Claude analysis and persisting patterns...',
        'running'
      )

      jobRepository.update(job.id, { pipeline_phase: 'persisting' })

      const result = parseBraniacResponse(response)

      log.info('Claude analysis received', {
        jobId: job.id,
        responseLength: response.length,
        patternsFound: result.patterns.length,
        profilesFound: result.stakeholder_profiles.length,
      })

      let patternsCreated = 0
      let autoApplied = 0
      let pendingReview = 0

      for (const pattern of result.patterns) {
        const adjustedConfidence = adjustConfidenceForCompleteness(
          pattern.confidence_score,
          dataBundle.dataCompleteness
        )
        const approvalStatus = determineApprovalStatus(adjustedConfidence, pattern.data_points_count)

        try {
          patternRepository.createPattern({
            pattern_name: `[${account}] ${pattern.pattern_name}`,
            pattern_text: pattern.pattern_text,
            confidence_score: adjustedConfidence,
            is_active: approvalStatus === 'auto_applied' ? 1 : 0,
            approval_status: approvalStatus,
            account,
            stakeholder: stakeholder ?? null,
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
            data_points_count: dataBundle.dataPointsCount,
            confidence_score: adjustConfidenceForCompleteness(
              dataBundle.dataPointsCount >= 15 ? 0.85 : dataBundle.dataPointsCount >= 6 ? 0.6 : 0.35,
              dataBundle.dataCompleteness
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
      const completedAt = new Date().toISOString()
      jobRepository.update(job.id, {
        status: 'completed',
        pipeline_phase: 'done',
        completed_at: completedAt,
        metadata_json: JSON.stringify({
          account,
          stakeholder: stakeholder ?? null,
          dataPointsCount: dataBundle.dataPointsCount,
          estimatedTokens: dataBundle.estimatedTokens,
          dataCompleteness: dataBundle.dataCompleteness,
          patternsCreated,
          autoApplied,
          pendingReview,
          profilesUpserted,
          durationMs,
          tokenUsage: tokenUsage ? {
            inputTokens: tokenUsage.inputTokens,
            outputTokens: tokenUsage.outputTokens,
          } : null,
        }),
      })

      log.info('Braniac run completed', {
        jobId: job.id,
        patternsCreated,
        autoApplied,
        pendingReview,
        profilesUpserted,
        durationMs,
      })

      await emitter?.narrate(
        'Analysis complete',
        `Analysis complete: ${patternsCreated} patterns (${autoApplied} auto-applied, ${pendingReview} pending review), ${profilesUpserted} stakeholder profiles updated.`,
        'done',
        { patternsCreated, autoApplied, pendingReview, profilesUpserted }
      )

      return jobRepository.getById(job.id) ?? job
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const completedAt = new Date().toISOString()

      jobRepository.update(job.id, {
        status: 'failed',
        pipeline_phase: 'error',
        completed_at: completedAt,
        error_message: message,
      })

      log.error('Braniac run failed', error instanceof Error ? error : new Error(message), { jobId: job.id })

      await emitter?.narrate(
        'Analysis failed',
        `Analysis failed: ${message}`,
        'error',
        { error: message }
      )

      throw error
    } finally {
      this.activeRunId = null
      this.abortController = null
    }
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
