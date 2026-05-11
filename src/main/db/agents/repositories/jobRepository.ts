import { getAgentsDatabase } from '../agentsConnection'

export type Scout9JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
export type Scout9ScopeType = 'org' | 'project' | 'custom' | 'account' | 'stakeholder'

export type AgentType = 'scout9' | 'vigil' | 'braniac'

export interface AgentJobRow {
  id: string
  status: Scout9JobStatus
  scope_type: Scout9ScopeType
  scope_value: string | null
  initiated_by: string
  run_reason: string
  pipeline_phase: string
  started_at: string | null
  completed_at: string | null
  canceled_at: string | null
  error_message: string | null
  metadata_json: string
  agent_type: AgentType
  created_at: string
  updated_at: string
}

export interface CreateAgentJobInput {
  status?: Scout9JobStatus
  scope_type?: Scout9ScopeType
  scope_value?: string | null
  initiated_by?: string
  run_reason?: string
  pipeline_phase?: string
  metadata_json?: string
  agent_type?: AgentType
  started_at?: string | null
}

export interface UpdateAgentJobInput {
  status?: Scout9JobStatus
  scope_type?: Scout9ScopeType
  scope_value?: string | null
  initiated_by?: string
  run_reason?: string
  pipeline_phase?: string
  started_at?: string | null
  completed_at?: string | null
  canceled_at?: string | null
  error_message?: string | null
  metadata_json?: string
  agent_type?: AgentType
}

export const jobRepository = {
  list(limit = 100, offset = 0): AgentJobRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM agent_jobs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as AgentJobRow[]
  },

  getById(id: string): AgentJobRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM agent_jobs WHERE id = ?').get(id) as AgentJobRow | undefined
  },

  create(input: CreateAgentJobInput): AgentJobRow {
    const db = getAgentsDatabase()
    const row = db.prepare(`
      INSERT INTO agent_jobs (
        status, scope_type, scope_value, initiated_by, run_reason, pipeline_phase, metadata_json, agent_type, started_at, updated_at
      ) VALUES (
        @status, @scope_type, @scope_value, @initiated_by, @run_reason, @pipeline_phase, @metadata_json, @agent_type, @started_at, datetime('now')
      )
      RETURNING *
    `).get({
      status: input.status ?? 'queued',
      scope_type: input.scope_type ?? 'org',
      scope_value: input.scope_value ?? null,
      initiated_by: input.initiated_by ?? 'system',
      run_reason: input.run_reason ?? '',
      pipeline_phase: input.pipeline_phase ?? 'idle',
      metadata_json: input.metadata_json ?? '{}',
      agent_type: input.agent_type ?? 'scout9',
      started_at: input.started_at ?? null,
    }) as AgentJobRow | undefined
    if (!row) throw new Error('Failed to create agent job')
    return row
  },

  update(id: string, input: UpdateAgentJobInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    values.push(id)
    const result = db.prepare(`
      UPDATE agent_jobs
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)

    return result.changes > 0
  },

  listByAgentType(agentType: AgentType, limit = 100, offset = 0): AgentJobRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM agent_jobs
      WHERE agent_type = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(agentType, limit, offset) as AgentJobRow[]
  },

  delete(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM agent_jobs WHERE id = ?').run(id)
    return result.changes > 0
  },

  deleteByScopeAndAgent(agentType: AgentType, scopeType: Scout9ScopeType, scopeValue: string): number {
    const db = getAgentsDatabase()
    const result = db.prepare(
      'DELETE FROM agent_jobs WHERE agent_type = ? AND scope_type = ? AND scope_value = ?',
    ).run(agentType, scopeType, scopeValue)
    return result.changes
  },
}
