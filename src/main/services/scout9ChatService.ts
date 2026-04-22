import { query } from '@anthropic-ai/claude-agent-sdk'
import { app } from 'electron'
import { getConfig } from '../config'
import { createScout9McpServer } from './scout9McpServer'
import { ToolCallTracker } from './scout9Tools'
import { assembleBrain } from './scout9BrainService'
import { claudeService } from './claudeService'
import { createLogger } from './logger'

const log = createLogger('Scout9ChatService')

function safeJson(input: unknown, fallback = ''): string {
  try {
    return JSON.stringify(input)
  } catch {
    return fallback
  }
}

function describeToolCall(name: string, input: unknown): string {
  const inputJson = safeJson(input, '')
  if (!inputJson || inputJson === '{}') {
    return `Running ${name}`
  }

  const compact = inputJson.replace(/\s+/g, ' ').trim()
  const truncated = compact.length > 240 ? `${compact.slice(0, 240)}...` : compact
  return `Running ${name} with ${truncated}`
}

export const scout9ChatService = {
  async chat(
    content: string,
    emitStep?: (step: string) => void,
    scopeClient?: string,
    scopeStakeholder?: string
  ): Promise<{ content: string; toolCalls: number; inputTokens: number; outputTokens: number }> {
    const chatStart = performance.now()
    const model = getConfig().claude.sonnetModel
    const tracker = new ToolCallTracker({ maxPerRun: 100, maxPerCandidate: 10 })
    const mcpServer = createScout9McpServer(tracker, 15_000)

    const { systemPrompt } = assembleBrain('chat', scopeClient, scopeStakeholder)

    const chatSystemPrompt = [
      systemPrompt,
      '',
      '[CHAT MODE]',
      'You are in conversational chat mode. The user will ask questions about candidates, positions, salary feasibility, and staffing strategy.',
      'Use your tools to look up real data before answering. Provide clear, concise answers with specific numbers when available.',
      'When discussing salary feasibility, include the verdict (feasible/marginal/not-feasible) and key figures.',
      'When comparing countries, mention contractor-heavy considerations for BOL and PRY.',
      'Do NOT output JSON reports in chat mode — use natural language with formatting.',
    ].join('\n')

    const abortController = new AbortController()

    emitStep?.('Analyzing your question...')

    let result = ''
    let inputTokens = 0
    let outputTokens = 0
    let toolCallCount = 0

    const q = query({
      prompt: content,
      options: {
        model,
        systemPrompt: chatSystemPrompt,
        maxTurns: 5,
        permissionMode: 'auto',
        abortController,
        env: {
          ...process.env,
          CLAUDE_AGENT_SDK_CLIENT_APP: `operation-nexus/${app.getVersion()}`,
        },
        mcpServers: {
          scout9: {
            type: 'sdk',
            name: 'scout9',
            instance: mcpServer,
          },
        },
      },
    })

    try {
      for await (const message of q) {
        const msg = message as Record<string, unknown>

        if (msg.type === 'assistant' && typeof msg.message === 'object' && msg.message) {
          const assistantMessage = msg.message as Record<string, unknown>
          const blocks = assistantMessage.content as Array<Record<string, unknown>> | undefined

          blocks?.forEach(block => {
            if (block.type === 'tool_use' && typeof block.name === 'string') {
              toolCallCount++
              emitStep?.(describeToolCall(block.name, block.input))
            }

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
      log.warn('SDK max turns reached in Scout9 chat — using accumulated response', {
        model,
        resultLength: result.length,
        toolCallCount,
      })
    }

    emitStep?.('Done')

    claudeService.trackExternalUsage(inputTokens, outputTokens)

    const chatMs = Math.round(performance.now() - chatStart)
    log.info('Scout9 chat completed', {
      model,
      inputTokens,
      outputTokens,
      resultLength: result.length,
      toolCallCount,
      durationMs: chatMs,
    })

    if (!result) {
      throw new Error('Empty response from Scout9 chat service')
    }

    return {
      content: result,
      toolCalls: toolCallCount,
      inputTokens,
      outputTokens,
    }
  },
}
