import { getConfig } from '../config'
import { getDatabase } from '../db/connection'
import { getAgentsDatabase } from '../db/agents/agentsConnection'
import { vigilRepository, type VigilChatMessageRow } from '../db/agents/repositories/vigilRepository'
import { claudeService } from './claudeService'
import { createLogger } from './logger'

const log = createLogger('VigilChatService')

const VIGIL_SYSTEM_PROMPT = `You are Vigil, the backend operations watchdog for Operation Nexus.
You have access to live system state data injected below.
Always answer using the actual data provided — never say "let me check" or "I'll look into it."
When reporting sync results, break down by source with counts (new, updated, unchanged, errors).
Report errors with their actual error messages.
Keep responses concise, factual, and operationally actionable.
Use markdown-style formatting: bold for labels, bullet points for lists.`

interface SendVigilMessageParams {
  content: string
  metadata_json?: string | null
  model?: string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

function safeParseJson(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function buildContextualPrompt(): string {
  try {
    const agentsDb = getAgentsDatabase()
    const nexusDb = getDatabase()

    const recentRuns = agentsDb.prepare(
      `SELECT id, trigger_type, status, sources_json, results_json, started_at, completed_at
       FROM vigil_runs ORDER BY started_at DESC LIMIT 5`
    ).all() as Array<Record<string, unknown>>

    const recentActivity = agentsDb.prepare(
      `SELECT event_type, source, severity, message, details_json, created_at
       FROM vigil_activity_log ORDER BY created_at DESC LIMIT 15`
    ).all() as Array<Record<string, unknown>>

    const employees = (nexusDb.prepare('SELECT COUNT(*) AS c FROM synced_employees').get() as { c: number }).c
    const candidates = (nexusDb.prepare('SELECT COUNT(*) AS c FROM synced_candidates').get() as { c: number }).c
    const positions = (nexusDb.prepare('SELECT COUNT(*) AS c FROM synced_open_positions').get() as { c: number }).c
    const prr = (nexusDb.prepare('SELECT COUNT(*) AS c FROM synced_project_reallocations').get() as { c: number }).c

    const config = agentsDb.prepare('SELECT * FROM vigil_config WHERE id = 1').get() as Record<string, unknown> | undefined

    const chatHistory = agentsDb.prepare(
      `SELECT role, content, created_at FROM vigil_chat_messages ORDER BY created_at DESC LIMIT 8`
    ).all() as Array<{ role: string; content: string; created_at: string }>

    const runsBlock = recentRuns.map(r => {
      const sources = safeParseJson(r.sources_json as string)
      const results = safeParseJson(r.results_json as string)
      const sourceResults = Array.isArray(results?.sources) ? results.sources : []

      const sourceLines = (sourceResults as Array<Record<string, unknown>>).map((sr) => {
        const prog = sr.progress as Record<string, unknown> | undefined
        const statusLabel = sr.success ? 'Completed' : `Error: ${(sr.errors as string[])?.[0] ?? 'unknown'}`
        const counts = prog
          ? ` — new: ${prog.syncedCount}, updated: ${prog.updatedCount}, unchanged: ${prog.unchangedCount}, failed: ${prog.notProcessedCount}, skipped: ${prog.skippedCount}`
          : ''
        return `    ${sr.source}: ${statusLabel}${counts}`
      })

      return [
        `  Run ${r.id} [${r.trigger_type}] ${r.status} | ${r.started_at} → ${r.completed_at ?? 'in progress'}`,
        `  Sources: ${sources ? JSON.stringify(sources) : 'unknown'}`,
        ...sourceLines,
      ].join('\n')
    })

    const contextBlock = [
      '--- CURRENT SYSTEM STATE (live data) ---',
      '',
      `Database Totals: ${employees} employees, ${candidates} candidates, ${positions} open positions, ${prr} project reallocations`,
      '',
      'Recent Vigil Runs (newest first):',
      ...runsBlock,
      '',
      'Recent Activity Log:',
      ...recentActivity.map(a => `  [${a.created_at}] ${a.severity} (${a.source}): ${a.message}`),
      '',
      config
        ? `Schedule: ${config.schedule_enabled ? 'enabled' : 'disabled'}, runs at ${String(config.schedule_hour).padStart(2, '0')}:${String(config.schedule_minute).padStart(2, '0')}, year filter: ${config.candidate_year_filter}`
        : '',
      '',
      'Recent Conversation:',
      ...chatHistory.reverse().map(m => `  [${m.role}]: ${m.content.slice(0, 300)}`),
      '',
      '--- END SYSTEM STATE ---',
    ].filter(Boolean).join('\n')

    return `${VIGIL_SYSTEM_PROMPT}\n\n${contextBlock}`
  } catch (err) {
    log.warn('Failed to build contextual prompt, using base prompt', {
      error: err instanceof Error ? err.message : String(err),
    })
    return VIGIL_SYSTEM_PROMPT
  }
}

export const vigilChatService = {
  async sendMessage(params: SendVigilMessageParams): Promise<VigilChatMessageRow> {
    const content = params.content?.trim()
    if (!content) {
      throw new Error('Message content is required')
    }

    const userMessage = vigilRepository.createChatMessage({
      role: 'user',
      content,
      metadata_json: params.metadata_json ?? null,
      created_at: new Date().toISOString(),
    })

    const claudeModel = params.model ?? getConfig().claude.sonnetModel

    vigilRepository.createActivityLog({
      run_id: null,
      event_type: 'chat',
      source: 'system',
      severity: 'info',
      message: 'Vigil chat request received',
      details_json: JSON.stringify({ user_message_id: userMessage.id, model: claudeModel }),
    })

    try {
      const reply = await claudeService.chatAsync(
        claudeModel,
        content,
        params.maxTokens ?? 1200,
        params.temperature ?? 0.2,
        buildContextualPrompt(),
        params.signal
      )

      const assistantMessage = vigilRepository.createChatMessage({
        role: 'assistant',
        content: reply,
        metadata_json: JSON.stringify({
          model: claudeModel,
          in_reply_to: userMessage.id,
        }),
        created_at: new Date().toISOString(),
      })

      vigilRepository.createActivityLog({
        run_id: null,
        event_type: 'chat',
        source: 'system',
        severity: 'info',
        message: 'Vigil chat response generated',
        details_json: JSON.stringify({ assistant_message_id: assistantMessage.id }),
      })

      return assistantMessage
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      vigilRepository.createActivityLog({
        run_id: null,
        event_type: 'chat',
        source: 'system',
        severity: 'error',
        message,
        details_json: JSON.stringify({ user_message_id: userMessage.id }),
      })
      log.error('Vigil chat failed', error instanceof Error ? error : new Error(message))
      throw error
    }
  },

  listMessages(limit = 100, offset = 0): VigilChatMessageRow[] {
    return vigilRepository.listChatMessages({ limit, offset })
  },

  clearMessages(): number {
    return vigilRepository.clearChatMessages()
  },

  getSystemPrompt(): string {
    return VIGIL_SYSTEM_PROMPT
  },
}
