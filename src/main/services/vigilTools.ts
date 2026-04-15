import { getDatabase } from '../db/connection'
import { getAgentsDatabase } from '../db/agents/agentsConnection'
import { createLogger } from './logger'

const log = createLogger('VigilTools')

export function withTimeout<T>(fn: () => Promise<T>, ms: number, toolName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Tool ${toolName} timed out after ${ms}ms`)),
      ms
    )
    fn().then(
      (result) => { clearTimeout(timer); resolve(result) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

export class ToolCallTracker {
  total = 0
  byTool: Record<string, number> = {}
  private readonly maxPerRun: number
  private readonly maxPerTool: number

  constructor(config: { maxPerRun: number; maxPerTool: number }) {
    this.maxPerRun = config.maxPerRun
    this.maxPerTool = config.maxPerTool
  }

  check(toolName: string): { allowed: boolean; reason?: string } {
    if (this.total >= this.maxPerRun) {
      return { allowed: false, reason: `Run budget exhausted (${this.maxPerRun} calls)` }
    }

    if ((this.byTool[toolName] ?? 0) >= this.maxPerTool) {
      return { allowed: false, reason: `Tool budget exhausted (${this.maxPerTool} calls)` }
    }

    return { allowed: true }
  }

  record(toolName: string): void {
    this.total++
    this.byTool[toolName] = (this.byTool[toolName] ?? 0) + 1
  }
}

export interface ToolDefinition {
  name: string
  description: string
  execute: (args: Record<string, unknown>) => Promise<string>
}

export function createVigilTools(tracker: ToolCallTracker, toolTimeoutMs: number): ToolDefinition[] {
  return [
    {
      name: 'get_vigil_config',
      description: 'Get current Vigil scheduler and sync configuration',
      execute: async () => {
        const check = tracker.check('get_vigil_config')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_vigil_config')

        return withTimeout(async () => {
          const db = getAgentsDatabase()
          const config = db.prepare('SELECT * FROM vigil_config WHERE id = 1').get() as Record<string, unknown> | undefined
          return JSON.stringify(config ?? {})
        }, toolTimeoutMs, 'get_vigil_config')
      },
    },
    {
      name: 'get_recent_vigil_activity',
      description: 'Get recent Vigil activity events by optional severity and limit',
      execute: async (args) => {
        const check = tracker.check('get_recent_vigil_activity')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_recent_vigil_activity')

        return withTimeout(async () => {
          const db = getAgentsDatabase()
          const severity = typeof args.severity === 'string' ? args.severity : undefined
          const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(200, args.limit)) : 20

          const rows = severity
            ? db.prepare(
                `SELECT run_id, event_type, source, severity, message, created_at
                 FROM vigil_activity_log
                 WHERE severity = ?
                 ORDER BY created_at DESC
                 LIMIT ?`
              ).all(severity, limit)
            : db.prepare(
                `SELECT run_id, event_type, source, severity, message, created_at
                 FROM vigil_activity_log
                 ORDER BY created_at DESC
                 LIMIT ?`
              ).all(limit)

          return JSON.stringify(rows)
        }, toolTimeoutMs, 'get_recent_vigil_activity')
      },
    },
    {
      name: 'get_recent_vigil_runs',
      description: 'Get recent Vigil run statuses and timestamps',
      execute: async (args) => {
        const check = tracker.check('get_recent_vigil_runs')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_recent_vigil_runs')

        return withTimeout(async () => {
          const db = getAgentsDatabase()
          const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(100, args.limit)) : 10
          const rows = db.prepare(
            `SELECT id, trigger_type, status, started_at, completed_at
             FROM vigil_runs
             ORDER BY started_at DESC
             LIMIT ?`
          ).all(limit)
          return JSON.stringify(rows)
        }, toolTimeoutMs, 'get_recent_vigil_runs')
      },
    },
    {
      name: 'get_sync_snapshot',
      description: 'Get top-level counts from synchronized upstream tables',
      execute: async () => {
        const check = tracker.check('get_sync_snapshot')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_sync_snapshot')

        return withTimeout(async () => {
          const db = getDatabase()
          const employees = db.prepare('SELECT COUNT(*) AS count FROM synced_employees').get() as { count: number }
          const candidates = db.prepare('SELECT COUNT(*) AS count FROM synced_candidates').get() as { count: number }
          const positions = db.prepare('SELECT COUNT(*) AS count FROM synced_open_positions').get() as { count: number }
          const prr = db.prepare('SELECT COUNT(*) AS count FROM synced_project_reallocations').get() as { count: number }

          return JSON.stringify({
            employees: employees.count,
            candidates: candidates.count,
            open_positions: positions.count,
            project_reallocations: prr.count,
          })
        }, toolTimeoutMs, 'get_sync_snapshot')
      },
    },
    {
      name: 'get_vigil_chat_context',
      description: 'Get recent Vigil chat history for conversational context',
      execute: async (args) => {
        const check = tracker.check('get_vigil_chat_context')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_vigil_chat_context')

        return withTimeout(async () => {
          const db = getAgentsDatabase()
          const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(100, args.limit)) : 20
          const rows = db.prepare(
            `SELECT role, content, created_at
             FROM vigil_chat_messages
             ORDER BY created_at DESC
             LIMIT ?`
          ).all(limit) as Array<{ role: string; content: string; created_at: string }>

          return rows
            .reverse()
            .map(row => `[${row.created_at}] ${row.role}: ${row.content}`)
            .join('\n')
        }, toolTimeoutMs, 'get_vigil_chat_context')
      },
    },
  ]
}
