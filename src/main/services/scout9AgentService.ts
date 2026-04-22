import { query } from '@anthropic-ai/claude-agent-sdk'
import { app } from 'electron'
import { getConfig } from '../config'
import { createScout9McpServer } from './scout9McpServer'
import { ToolCallTracker } from './scout9Tools'
import { claudeService } from './claudeService'
import { createLogger } from './logger'
import type { Scout9PipelineEvent } from './scout9PipelineService'

const log = createLogger('Scout9AgentService')

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
    return `🔧 Agent calling ${name}`
  }

  const compact = inputJson.replace(/\s+/g, ' ').trim()
  const truncated = compact.length > 200 ? `${compact.slice(0, 200)}...` : compact
  return `🔧 Agent calling ${name} with ${truncated}`
}

export async function runScout9Agent(
  systemPrompt: string,
  analysisPrompt: string,
  emit: (e: Scout9PipelineEvent) => void,
  signal: AbortSignal
): Promise<Record<string, unknown>> {
  const agentStart = performance.now()
  const model = getConfig().claude.sonnetModel
  const tracker = new ToolCallTracker({ maxPerRun: 200, maxPerCandidate: 10 })
  const mcpServer = createScout9McpServer(tracker, 15_000)

  const abortController = new AbortController()
  signal.addEventListener('abort', () => abortController.abort())

  emit({ type: 'log', message: '4.5.0 Connecting to Claude Agent SDK...' })

  let result = ''
  let inputTokens = 0
  let outputTokens = 0
  let toolCallCount = 0

  const q = query({
    prompt: analysisPrompt,
    options: {
      model,
      systemPrompt,
      maxTurns: 8,
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
            emit({
              type: 'log',
              message: `4.5.${toolCallCount} ${describeToolCall(block.name, block.input)}`,
            })
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
    log.warn('SDK max turns reached in Scout9 agent — using accumulated response', {
      model,
      resultLength: result.length,
      toolCallCount,
    })
  }

  claudeService.trackExternalUsage(inputTokens, outputTokens)

  const agentMs = Math.round(performance.now() - agentStart)
  log.info('Scout9 agent completed', {
    model,
    inputTokens,
    outputTokens,
    resultLength: result.length,
    toolCallCount,
    trackerTotal: tracker.total,
    durationMs: agentMs,
  })

  emit({
    type: 'log',
    message: `4.5 AI analysis complete — ${toolCallCount} tool calls, ${inputTokens + outputTokens} tokens, ${agentMs}ms`,
  })

  if (!result) {
    throw new Error('Empty response from Scout9 agent')
  }

  let reportContent: Record<string, unknown>
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in agent response')
    }
    reportContent = JSON.parse(jsonMatch[0])
  } catch (parseErr) {
    log.warn('Failed to parse JSON from agent response, wrapping as text', {
      resultLength: result.length,
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    })
    reportContent = {
      summary: result.slice(0, 500),
      positions: [],
      rawResponse: result,
    }
  }

  return reportContent
}
