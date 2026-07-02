import type { FeatureKey } from '../../shared/model-config-types'
import { claudeService } from './claudeService'
import { localLlmService } from './localLlmService'
import { getConfig } from '../config'
import { createLogger } from './logger'

const log = createLogger('LLMRouter')

const HAIKU_TIER_FEATURES: FeatureKey[] = [
  'resumeSkillExtraction', 'matchTriage', 'bugDescription',
]

export const llmRouter = {
  /**
   * Route an LLM call to the correct provider based on model config.
   */
  async chatAsync(
    featureKey: FeatureKey,
    prompt: string,
    maxTokens = 4096,
    temperature = 0.1,
    systemPrompt?: string,
    signal?: AbortSignal
  ): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
    const config = getConfig()
    const assignment = config.modelConfig.features[featureKey]

    if (!assignment) {
      log.warn(`No model assignment for feature "${featureKey}", falling back to Claude Sonnet`)
      return claudeService.chatAsync('claude-sonnet-4-6', prompt, maxTokens, temperature, systemPrompt, signal)
    }

    log.info('Routing LLM call', { featureKey, provider: assignment.provider, model: assignment.model })

    if (assignment.provider === 'local') {
      const { localServerUrl } = config.modelConfig
      if (!localServerUrl) {
        throw new Error(
          `Local model configured for "${featureKey}" but no server URL set. ` +
          'Go to Settings → AI Models to configure your local LLM server URL.'
        )
      }
      return localLlmService.chatAsync(
        localServerUrl, assignment.model, prompt, maxTokens, temperature, systemPrompt, signal
      )
    }

    return claudeService.chatAsync(
      assignment.model, prompt, maxTokens, temperature, systemPrompt, signal
    )
  },

  /**
   * Get the concurrency limit for a feature based on its provider.
   */
  getConcurrencyLimit(featureKey: FeatureKey): number {
    const config = getConfig()
    const assignment = config.modelConfig.features[featureKey]

    if (!assignment || assignment.provider === 'claude') {
      return HAIKU_TIER_FEATURES.includes(featureKey)
        ? config.modelConfig.concurrency.claude.haikuMax
        : config.modelConfig.concurrency.claude.max
    }

    return config.modelConfig.concurrency.local.max
  },

  /**
   * Combined token usage from both providers.
   */
  getTokenUsage() {
    return {
      claude: claudeService.getTokenUsage(),
      local: localLlmService.getTokenUsage(),
    }
  },

  resetTokenUsage() {
    claudeService.resetTokenUsage()
    localLlmService.resetTokenUsage()
  },
}
