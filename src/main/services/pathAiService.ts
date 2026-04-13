import { claudeService } from './claudeService'
import { createLogger } from './logger'

const log = createLogger('PathAI')

export interface DefensePrepParams {
  candidateName: string
  targetLevel: string
  rubricScores: Array<{ dimension: string; score: number; maxScore: number }>
  codeReviewStrengths: string[]
}

export interface DefensePrepResult {
  prepKit: string
  suggestedQuestions: string[]
}

export interface RemediationParams {
  candidateName: string
  scorecardGaps: Array<{ dimension: string; score: number; threshold: number }>
  evaluatorNotes: string
}

export interface RemediationResult {
  plan: string
  focusAreas: string[]
  timeline: string
}

function buildDefensePrepPrompt(params: DefensePrepParams): string {
  const scoresSummary = params.rubricScores
    .map(r => `- ${r.dimension}: ${r.score}/${r.maxScore}`)
    .join('\n')
  const strengths = params.codeReviewStrengths.join(', ')

  return `You are a technical assessment expert helping prepare a defense prep kit for a promotion candidate.

Candidate: ${params.candidateName}
Target Level: ${params.targetLevel}

Rubric Scores:
${scoresSummary}

Code Review Strengths: ${strengths}

Generate:
1. A defense preparation kit (2-3 paragraphs) summarizing the candidate's strengths, areas to discuss during defense, and recommended talking points.
2. A list of 5-7 suggested defense questions that evaluators should ask, focusing on gaps shown in the rubric scores.

Respond in this exact JSON format:
{"prepKit": "...", "suggestedQuestions": ["...", "..."]}`
}

function buildRemediationPrompt(params: RemediationParams): string {
  const gapsSummary = params.scorecardGaps
    .map(g => `- ${g.dimension}: scored ${g.score}, threshold ${g.threshold} (gap: ${g.threshold - g.score})`)
    .join('\n')

  return `You are a career development expert creating a focused remediation plan for a developer whose promotion was deferred.

Candidate: ${params.candidateName}

Scorecard Gaps:
${gapsSummary}

Evaluator Notes: ${params.evaluatorNotes}

Generate a focused remediation plan including:
1. An overall plan (2-3 paragraphs)
2. Top 3-5 focus areas with specific actionable items
3. A suggested timeline (e.g., "8-12 weeks")

Respond in this exact JSON format:
{"plan": "...", "focusAreas": ["...", "..."], "timeline": "..."}`
}

function safeParseJson<T>(text: string, fallback: T): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T
    }
    return fallback
  } catch {
    log.warn('Failed to parse AI response as JSON', { textLength: text.length })
    return fallback
  }
}

export const pathAiService = {
  async generateDefensePrepKit(params: DefensePrepParams): Promise<DefensePrepResult> {
    log.info('Generating defense prep kit', { candidateName: params.candidateName, targetLevel: params.targetLevel })

    const available = await claudeService.checkAvailability()
    if (!available) {
      log.warn('Claude service not available, returning empty prep kit')
      return { prepKit: 'AI service is currently unavailable. Please try again later.', suggestedQuestions: [] }
    }

    const prompt = buildDefensePrepPrompt(params)
    const signal = AbortSignal.timeout(30_000)
    const response = await claudeService.chatAsync(
      'claude-sonnet-4-20250514',
      prompt,
      2000,
      0.3,
      'You are a technical assessment expert. Always respond with valid JSON.',
      signal
    )

    const result = safeParseJson<DefensePrepResult>(response, {
      prepKit: response,
      suggestedQuestions: [],
    })

    log.info('Defense prep kit generated', { questionCount: result.suggestedQuestions.length })
    return result
  },

  async generateRemediationPath(params: RemediationParams): Promise<RemediationResult> {
    log.info('Generating remediation path', { candidateName: params.candidateName, gapCount: params.scorecardGaps.length })

    const available = await claudeService.checkAvailability()
    if (!available) {
      log.warn('Claude service not available, returning empty remediation')
      return { plan: 'AI service is currently unavailable.', focusAreas: [], timeline: '' }
    }

    const prompt = buildRemediationPrompt(params)
    const signal = AbortSignal.timeout(30_000)
    const response = await claudeService.chatAsync(
      'claude-sonnet-4-20250514',
      prompt,
      2000,
      0.3,
      'You are a career development expert. Always respond with valid JSON.',
      signal
    )

    const result = safeParseJson<RemediationResult>(response, {
      plan: response,
      focusAreas: [],
      timeline: '',
    })

    log.info('Remediation path generated', { focusAreaCount: result.focusAreas.length, timeline: result.timeline })
    return result
  },
}
