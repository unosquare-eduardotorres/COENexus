import type { AgentId, AgentStepEvent } from '../../shared/ipc-types'
import { claudeService } from './claudeService'
import { createLogger } from './logger'
import * as configRepository from '../db/agents/repositories/configRepository'

const log = createLogger('AgentNarrator')

const AGENT_NARRATOR_SYSTEM_PROMPT = `You generate short operator-facing progress updates for backend agent execution.
Return one sentence, plain text only, no markdown.
Keep it concise, concrete, and action-oriented.
Do not include surrounding quotes.`

interface AgentNarrationInput {
  agentId: AgentId
  phase: AgentStepEvent['status'] | string
  step: string
  detail?: string
}

function buildPrompt(input: AgentNarrationInput): string {
  const detail = input.detail?.trim() ? `Detail: ${input.detail.trim()}` : 'Detail: none'
  return [
    `Agent: ${input.agentId}`,
    `Phase: ${input.phase}`,
    `Step: ${input.step}`,
    detail,
    'Write a single short status narration for UI streaming.',
  ].join('\n')
}

function buildFallbackNarration(input: AgentNarrationInput): string {
  const detail = input.detail?.trim()
  if (detail) {
    return `${input.step}: ${detail}`
  }
  return input.step
}

function normalizeNarration(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  if (compact.length <= 180) return compact
  return `${compact.slice(0, 177).trimEnd()}...`
}

export const agentNarrator = {
  async narrateStep(input: AgentNarrationInput): Promise<string> {
    const fallback = buildFallbackNarration(input)

    try {
      const model = configRepository.getConfig().haiku_model
      const { text: response } = await claudeService.chatAsync(
        model,
        buildPrompt(input),
        120,
        0.2,
        AGENT_NARRATOR_SYSTEM_PROMPT
      )

      const narration = normalizeNarration(response)
      return narration || fallback
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error('Narration generation failed', err, {
        agentId: input.agentId,
        phase: input.phase,
        step: input.step,
      })
      return fallback
    }
  },
}
