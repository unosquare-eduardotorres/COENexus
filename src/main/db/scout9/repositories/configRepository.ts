import { getScout9Database } from '../scout9Connection'

export interface AgentConfigRow {
  id: 1
  model_name: string
  token_budget: number
  temperature: number
  max_reports_per_run: number
  auto_publish_enabled: number
  include_patterns: number
  include_glossary: number
  include_notes: number
  active_prompt_version_id: string | null
  sonnet_model: string
  haiku_model: string
  max_tool_calls_per_run: number
  max_tool_calls_per_candidate: number
  token_budget_ceiling: number
  max_turns: number
  max_run_duration_ms: number
  stream_watchdog_ms: number
  tool_timeout_ms: number
  created_at: string
  updated_at: string
}

export interface SystemPromptVersionRow {
  id: string
  version_label: string
  prompt_text: string
  change_summary: string
  is_active: number
  created_by: string
  created_at: string
  activated_at: string | null
}

export function getConfig(): AgentConfigRow {
  const db = getScout9Database()
  return db.prepare('SELECT * FROM agent_config WHERE id = 1').get() as AgentConfigRow
}

export function updateConfig(updates: Partial<Omit<AgentConfigRow, 'id' | 'created_at' | 'updated_at'>>): void {
  const db = getScout9Database()

  const fields: string[] = []
  const values: unknown[] = []

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }

  if (fields.length === 0) return

  fields.push("updated_at = datetime('now')")
  values.push(1)

  db.prepare(`UPDATE agent_config SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function listPromptVersions(): SystemPromptVersionRow[] {
  const db = getScout9Database()
  return db.prepare(
    'SELECT * FROM system_prompt_versions ORDER BY created_at DESC'
  ).all() as SystemPromptVersionRow[]
}

export function getActivePromptVersion(): SystemPromptVersionRow | undefined {
  const db = getScout9Database()
  return db.prepare(
    'SELECT * FROM system_prompt_versions WHERE is_active = 1'
  ).get() as SystemPromptVersionRow | undefined
}

export function createPromptVersion(versionLabel: string, promptText: string, changeSummary = '', createdBy = 'user'): SystemPromptVersionRow {
  const db = getScout9Database()
  return db.prepare(`
    INSERT INTO system_prompt_versions (version_label, prompt_text, change_summary, is_active, created_by)
    VALUES (?, ?, ?, 0, ?)
    RETURNING *
  `).get(versionLabel, promptText, changeSummary, createdBy) as SystemPromptVersionRow
}

export function activateVersion(versionId: string): void {
  const db = getScout9Database()
  const activate = db.transaction(() => {
    db.prepare(
      "UPDATE system_prompt_versions SET is_active = 0, activated_at = NULL"
    ).run()
    db.prepare(
      "UPDATE system_prompt_versions SET is_active = 1, activated_at = datetime('now') WHERE id = ?"
    ).run(versionId)
    db.prepare(
      "UPDATE agent_config SET active_prompt_version_id = ?, updated_at = datetime('now') WHERE id = 1"
    ).run(versionId)
  })
  activate()
}
