import { query } from '@anthropic-ai/claude-agent-sdk'
import { app } from 'electron'
import { getConfig } from '../config'
import { getDatabase } from '../db/connection'
import { claudeService } from './claudeService'
import { createOracleMcpServer } from './oracleMcpServer'
import { createLogger } from './logger'

const log = createLogger('OracleChatService')

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

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

function introspectSchema(): string {
  const db = getDatabase()

  const tables = db.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE 'vec_embeddings%'
      AND name <> 'schema_migrations'
      AND sql IS NOT NULL
    ORDER BY name ASC
  `).all() as Array<{ name: string; sql: string }>

  const indexes = db.prepare(`
    SELECT name, tbl_name AS table_name, sql
    FROM sqlite_master
    WHERE type = 'index'
      AND name NOT LIKE 'sqlite_%'
      AND sql IS NOT NULL
    ORDER BY tbl_name ASC, name ASC
  `).all() as Array<{ name: string; table_name: string; sql: string }>

  const counts = tables.map(table => {
    const countSql = `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table.name)}`
    const row = db.prepare(countSql).get() as { count: number }
    return { table: table.name, ddl: table.sql, count: row.count }
  })

  const ddlLines = counts
    .map(item => `-- ${item.table}: ${item.count} rows\n${item.ddl};`)
    .join('\n\n')

  const indexLines = indexes
    .map(index => index.sql + ';')
    .join('\n')

  return [
    'Live SQLite schema snapshot:',
    '',
    '-- Table definitions:',
    ddlLines || '-- (none)',
    '',
    '-- Indexes:',
    indexLines || '-- (none)',
  ].join('\n')
}

function buildSystemPrompt(schemaSnapshot: string): string {
  return [
    'You are Oracle, the data intelligence analyst for Operation Nexus.',
    'Your job is to answer with accurate, actionable insights using the Oracle MCP tools connected to the live SQLite database.',
    'Rules:',
    '- Ground every conclusion in queried data. Do not invent values.',
    '- Prefer the specific domain tools first and use run_sql only when needed.',
    '- If data is insufficient, say what is missing and suggest the next query.',
    '- Keep responses concise and business-oriented.',
    '- Include key metrics, patterns, and risks when relevant.',
    '- When querying or reporting on open positions, focus on Active positions by default (position_status = "Active") unless the user explicitly asks for other statuses (Draft, Closed, Filled, etc.). Active positions are the ones that need operational focus and attention.',
    'Key relationships:',
    '- synced_open_positions links to open_position_candidates via upstream_id/open_position_id.',
    '- match_sessions captures matching pipeline execution history.',
    '- synced_project_reallocations captures PRR/attrition transitions.',
    schemaSnapshot,
  ].join('\n\n')
}

const SENTENCE_DELIMITERS = /(?<=[.!?])\s+|\n/

export const oracleChatService = {
  async chat(
    content: string,
    emitStep?: (step: string) => void,
    emitChunk?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<{ content: string; toolCalls: number; inputTokens: number; outputTokens: number }> {
    const chatStart = performance.now()
    const mcpServer = createOracleMcpServer()
    const model = getConfig().claude.sonnetModel

    const schemaStart = performance.now()
    const schemaSnapshot = introspectSchema()
    const schemaMs = Math.round(performance.now() - schemaStart)
    log.info('Schema introspection completed', { durationMs: schemaMs })

    const systemPrompt = buildSystemPrompt(schemaSnapshot)

    const abortController = new AbortController()
    if (signal) {
      signal.addEventListener('abort', () => abortController.abort())
    }

    emitStep?.('Analyzing your question and preparing database queries...')

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
        maxTurns: 3,
        permissionMode: 'auto',
        abortController,
        includePartialMessages: true,
        env: {
          ...process.env,
          CLAUDE_AGENT_SDK_CLIENT_APP: `operation-nexus/${app.getVersion()}`,
        },
        mcpServers: {
          oracle: {
            type: 'sdk',
            name: 'oracle',
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
      log.warn('SDK max turns reached in Oracle chat — using accumulated response', {
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
    log.info('Oracle chat completed', {
      model,
      inputTokens,
      outputTokens,
      resultLength: result.length,
      toolCallCount,
      durationMs: chatMs,
      schemaIntrospectionMs: schemaMs,
    })

    if (!result) {
      throw new Error('Empty response from Oracle chat service')
    }

    return { content: result, toolCalls: toolCallCount, inputTokens, outputTokens }
  },
}
