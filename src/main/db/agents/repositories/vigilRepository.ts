import { getAgentsDatabase } from '../agentsConnection'

export type VigilSource = 'employees' | 'candidates' | 'open-positions' | 'project-reallocations'
export type VigilRunTriggerType = 'manual' | 'scheduled'
export type VigilRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
export type VigilActivityEventType = 'run_started' | 'run_progress' | 'run_completed' | 'run_failed' | 'chat' | 'system'
export type VigilActivitySeverity = 'info' | 'warning' | 'error'
export type VigilChatRole = 'system' | 'user' | 'assistant' | 'tool'

export interface VigilRunRow {
  id: string
  trigger_type: VigilRunTriggerType
  status: VigilRunStatus
  sources_json: string
  results_json: string | null
  started_at: string
  completed_at: string | null
  token_hash: string | null
}

export interface VigilActivityLogRow {
  id: string
  run_id: string | null
  event_type: VigilActivityEventType
  source: VigilSource | 'system'
  severity: VigilActivitySeverity
  message: string
  details_json: string | null
  created_at: string
}

export interface VigilChatMessageRow {
  id: string
  role: VigilChatRole
  content: string
  metadata_json: string | null
  created_at: string
}

export interface VigilConfigRow {
  id: 1
  schedule_enabled: 0 | 1
  schedule_hour: number
  schedule_minute: number
  sync_sources_json: string
  candidate_year_filter: number
}

export interface CreateVigilRunInput {
  trigger_type: VigilRunTriggerType
  status?: VigilRunStatus
  sources_json: string
  results_json?: string | null
  started_at?: string
  completed_at?: string | null
  token_hash?: string | null
}

export interface UpdateVigilRunInput {
  trigger_type?: VigilRunTriggerType
  status?: VigilRunStatus
  sources_json?: string
  results_json?: string | null
  started_at?: string
  completed_at?: string | null
  token_hash?: string | null
}

export interface CreateVigilActivityLogInput {
  run_id?: string | null
  event_type: VigilActivityEventType
  source: VigilSource | 'system'
  severity: VigilActivitySeverity
  message: string
  details_json?: string | null
  created_at?: string
}

export interface ListVigilActivityLogInput {
  run_id?: string
  source?: VigilSource
  severity?: VigilActivitySeverity
  limit?: number
  offset?: number
}

export interface CreateVigilChatMessageInput {
  role: VigilChatRole
  content: string
  metadata_json?: string | null
  created_at?: string
}

export interface UpdateVigilConfigInput {
  schedule_enabled?: 0 | 1
  schedule_hour?: number
  schedule_minute?: number
  sync_sources_json?: string
  candidate_year_filter?: number
}

export interface ListVigilRunsInput {
  status?: VigilRunStatus
  limit?: number
  offset?: number
}

export interface ListVigilChatMessagesInput {
  limit?: number
  offset?: number
}

export const vigilRepository = {
  createRun(input: CreateVigilRunInput): VigilRunRow {
    const db = getAgentsDatabase()
    const row = db.prepare(`
      INSERT INTO vigil_runs (
        trigger_type, status, sources_json, results_json, started_at, completed_at, token_hash
      ) VALUES (
        @trigger_type, @status, @sources_json, @results_json, @started_at, @completed_at, @token_hash
      )
      RETURNING *
    `).get({
      trigger_type: input.trigger_type,
      status: input.status ?? 'queued',
      sources_json: input.sources_json,
      results_json: input.results_json ?? null,
      started_at: input.started_at ?? new Date().toISOString(),
      completed_at: input.completed_at ?? null,
      token_hash: input.token_hash ?? null,
    }) as VigilRunRow | undefined

    if (!row) throw new Error('Failed to create vigil run')
    return row
  },

  getRunById(id: string): VigilRunRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM vigil_runs WHERE id = ?').get(id) as VigilRunRow | undefined
  },

  getActiveRun(): VigilRunRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM vigil_runs
      WHERE status IN ('queued', 'running')
      ORDER BY started_at DESC
      LIMIT 1
    `).get() as VigilRunRow | undefined
  },

  listRuns(input: ListVigilRunsInput = {}): VigilRunRow[] {
    const db = getAgentsDatabase()
    const limit = input.limit ?? 100
    const offset = input.offset ?? 0

    if (input.status) {
      return db.prepare(`
        SELECT * FROM vigil_runs
        WHERE status = ?
        ORDER BY started_at DESC
        LIMIT ? OFFSET ?
      `).all(input.status, limit, offset) as VigilRunRow[]
    }

    return db.prepare(`
      SELECT * FROM vigil_runs
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as VigilRunRow[]
  },

  updateRun(id: string, input: UpdateVigilRunInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    if (updates.length === 0) return false

    values.push(id)
    const result = db.prepare(`
      UPDATE vigil_runs
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)

    return result.changes > 0
  },

  deleteRun(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM vigil_runs WHERE id = ?').run(id)
    return result.changes > 0
  },

  createActivityLog(input: CreateVigilActivityLogInput): VigilActivityLogRow {
    const db = getAgentsDatabase()
    const row = db.prepare(`
      INSERT INTO vigil_activity_log (
        run_id, event_type, source, severity, message, details_json, created_at
      ) VALUES (
        @run_id, @event_type, @source, @severity, @message, @details_json, @created_at
      )
      RETURNING *
    `).get({
      run_id: input.run_id ?? null,
      event_type: input.event_type,
      source: input.source,
      severity: input.severity,
      message: input.message,
      details_json: input.details_json ?? null,
      created_at: input.created_at ?? new Date().toISOString(),
    }) as VigilActivityLogRow | undefined

    if (!row) throw new Error('Failed to create vigil activity log')
    return row
  },

  listActivityLog(input: ListVigilActivityLogInput = {}): VigilActivityLogRow[] {
    const db = getAgentsDatabase()
    const where: string[] = []
    const values: unknown[] = []

    if (input.run_id) {
      where.push('run_id = ?')
      values.push(input.run_id)
    }
    if (input.source) {
      where.push('source = ?')
      values.push(input.source)
    }
    if (input.severity) {
      where.push('severity = ?')
      values.push(input.severity)
    }

    const limit = input.limit ?? 100
    const offset = input.offset ?? 0
    values.push(limit, offset)

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    return db.prepare(`
      SELECT * FROM vigil_activity_log
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...values) as VigilActivityLogRow[]
  },

  clearActivityLog(): number {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM vigil_activity_log').run()
    return result.changes
  },

  createChatMessage(input: CreateVigilChatMessageInput): VigilChatMessageRow {
    const db = getAgentsDatabase()
    const row = db.prepare(`
      INSERT INTO vigil_chat_messages (
        role, content, metadata_json, created_at
      ) VALUES (
        @role, @content, @metadata_json, @created_at
      )
      RETURNING *
    `).get({
      role: input.role,
      content: input.content,
      metadata_json: input.metadata_json ?? null,
      created_at: input.created_at ?? new Date().toISOString(),
    }) as VigilChatMessageRow | undefined

    if (!row) throw new Error('Failed to create vigil chat message')
    return row
  },

  listChatMessages(input: ListVigilChatMessagesInput = {}): VigilChatMessageRow[] {
    const db = getAgentsDatabase()
    const limit = input.limit ?? 100
    const offset = input.offset ?? 0
    return db.prepare(`
      SELECT * FROM vigil_chat_messages
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as VigilChatMessageRow[]
  },

  clearChatMessages(): number {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM vigil_chat_messages').run()
    return result.changes
  },

  getConfig(): VigilConfigRow {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM vigil_config WHERE id = 1').get() as VigilConfigRow
  },

  updateConfig(input: UpdateVigilConfigInput): VigilConfigRow {
    const db = getAgentsDatabase()
    const updates: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    if (updates.length > 0) {
      values.push(1)
      db.prepare(`
        UPDATE vigil_config
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values)
    }

    return db.prepare('SELECT * FROM vigil_config WHERE id = 1').get() as VigilConfigRow
  },
}
