import { query } from '@anthropic-ai/claude-agent-sdk'
import { app } from 'electron'
import { getConfig } from '../config'
import { createBraniacMcpServer } from './braniacMcpServer'
import { claudeService } from './claudeService'
import { createLogger } from './logger'

const log = createLogger('BraniacChatService')

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
    return `Looking up ${name}`
  }
  const compact = inputJson.replace(/\s+/g, ' ').trim()
  const truncated = compact.length > 240 ? `${compact.slice(0, 240)}...` : compact
  return `Looking up ${name} with ${truncated}`
}

const SENTENCE_DELIMITERS = /(?<=[.!?])\s+|\n/

export const braniacChatService = {
  async chat(
    content: string,
    emitStep?: (step: string) => void,
    emitChunk?: (text: string) => void,
    scopeAccount?: string
  ): Promise<{ content: string; toolCalls: number; inputTokens: number; outputTokens: number }> {
    const chatStart = performance.now()
    const model = getConfig().claude.sonnetModel
    const mcpServer = createBraniacMcpServer()

    const systemPrompt = [
      'You are Braniac — a recruitment intelligence analyst for Unosquare.',
      'You have access to learned hiring patterns and stakeholder preference profiles derived from historical position and candidate data.',
      '',
      'Your tools let you:',
      '- List and search learned patterns (hiring behaviors, rate preferences, rejection themes)',
      '- View stakeholder profiles (rate ranges, country preferences, seniority flexibility, decision speed)',
      '- Get account summaries (position/candidate/stakeholder counts)',
      '',
      scopeAccount ? `The user is currently focused on account: "${scopeAccount}". Scope your queries to this account unless asked otherwise.` : '',
      '',
      'Guidelines:',
      '- Use your tools to look up real data before answering',
      '- Be specific — cite confidence scores, data point counts, rate ranges',
      '- When comparing stakeholders, use a structured format',
      '- Explain what patterns mean for staffing strategy',
      '- Use natural conversational language, not JSON output',
    ].filter(Boolean).join('\n')

    const abortController = new AbortController()

    emitStep?.('Analyzing your question...')

    let result = ''
    let inputTokens = 0
    let outputTokens = 0
    let toolCallCount = 0
    let sentenceBuffer = ''

    const q = query({
      prompt: content,
      options: {
        model,
        systemPrompt,
        maxTurns: 5,
        permissionMode: 'auto',
        abortController,
        includePartialMessages: true,
        env: {
          ...process.env,
          CLAUDE_AGENT_SDK_CLIENT_APP: `operation-nexus/${app.getVersion()}`,
        },
        mcpServers: {
          braniac: {
            type: 'sdk',
            name: 'braniac',
            instance: mcpServer,
          },
        },
      },
    })

    try {
      for await (const message of q) {
        const msg = message as Record<string, unknown>

        if (msg.type === 'stream_event') {
          const event = (msg as { event: { type: string; delta?: { type: string; text?: string } } }).event
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
            sentenceBuffer += event.delta.text
            const sentences = sentenceBuffer.split(SENTENCE_DELIMITERS)
            if (sentences.length > 1) {
              for (let i = 0; i < sentences.length - 1; i++) {
                emitChunk?.(sentences[i] + (i < sentences.length - 2 ? ' ' : ''))
              }
              sentenceBuffer = sentences[sentences.length - 1]
            }
          }
        }

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
      log.warn('SDK max turns reached in Braniac chat — using accumulated response', {
        model,
        resultLength: result.length,
        toolCallCount,
      })
    }

    if (sentenceBuffer.trim()) {
      emitChunk?.(sentenceBuffer)
    }

    emitStep?.('Done')

    claudeService.trackExternalUsage(inputTokens, outputTokens)

    const chatMs = Math.round(performance.now() - chatStart)
    log.info('Braniac chat completed', {
      model,
      inputTokens,
      outputTokens,
      resultLength: result.length,
      toolCallCount,
      durationMs: chatMs,
    })

    if (!result) {
      throw new Error('Empty response from Braniac chat service')
    }

    return {
      content: result,
      toolCalls: toolCallCount,
      inputTokens,
      outputTokens,
    }
  },
}
