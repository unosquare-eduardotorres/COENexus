import { query } from '@anthropic-ai/claude-agent-sdk'
import { app } from 'electron'
import { createLogger } from './logger'

const log = createLogger('ClaudeService')

let cumulativeUsage = { inputTokens: 0, outputTokens: 0 }

export const claudeService = {
  async chatAsync(
    model: string,
    prompt: string,
    maxTokens = 4096,
    temperature = 0.1,
    systemPrompt?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const abortController = new AbortController()
    if (signal) {
      signal.addEventListener('abort', () => abortController.abort())
    }

    let result = ''
    let inputTokens = 0
    let outputTokens = 0

    const q = query({
      prompt,
      options: {
        model,
        systemPrompt,
        maxTurns: 1,
        allowedTools: [],
        permissionMode: 'auto',
        abortController,
        env: {
          ...process.env,
          CLAUDE_AGENT_SDK_CLIENT_APP: `operation-nexus/${app.getVersion()}`,
        },
      },
    })

    try {
      for await (const message of q) {
        const msg = message as Record<string, unknown>

        if (msg.type === 'assistant' && typeof msg.message === 'object') {
          const m = msg.message as Record<string, unknown>
          const content = m.content as Array<Record<string, unknown>> | undefined
          content?.forEach(block => {
            if (block.type === 'text' && typeof block.text === 'string') {
              result += block.text
            }
          })
        }

        if (msg.type === 'result' && typeof msg.result === 'string') {
          result = msg.result
        }

        if (msg.type === 'result') {
          const usage = msg.usage as Record<string, number> | undefined
          if (usage) {
            inputTokens = usage.input_tokens ?? usage.input ?? 0
            outputTokens = usage.output_tokens ?? usage.output ?? 0
          }
        }
      }
    } catch (streamError) {
      const isMaxTurns = streamError instanceof Error
        && streamError.message.includes('maximum number of turns')
      if (!isMaxTurns || !result) {
        throw streamError
      }
      log.warn('SDK max turns reached — using accumulated response', {
        model, resultLength: result.length,
      })
    }

    cumulativeUsage.inputTokens += inputTokens
    cumulativeUsage.outputTokens += outputTokens

    log.info('Chat completed', { model, inputTokens, outputTokens, resultLength: result.length })

    if (!result) throw new Error('Empty response from Claude SDK')
    return result
  },

  getTokenUsage() {
    return { ...cumulativeUsage }
  },

  resetTokenUsage() {
    cumulativeUsage = { inputTokens: 0, outputTokens: 0 }
  },

  async checkAvailability(): Promise<boolean> {
    const { subscriptionService } = await import('./subscriptionService')
    const checkResult = await subscriptionService.checkClaudeAuth()
    return checkResult.authenticated
  },
}
