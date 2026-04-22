import { getDatabase } from '../db/connection'
import { getAgentsDatabase } from '../db/agents/agentsConnection'
import { batchEvaluateFeasibility, buildCountrySalaryMatrix, compareEmploymentCosts } from './salaryFeasibilityService'
import { createLogger } from './logger'

const log = createLogger('Scout9Tools')

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
  byCandidate: Record<number, number> = {}
  private readonly maxPerRun: number
  private readonly maxPerCandidate: number

  constructor(config: { maxPerRun: number; maxPerCandidate: number }) {
    this.maxPerRun = config.maxPerRun
    this.maxPerCandidate = config.maxPerCandidate
  }

  check(toolName: string, candidateId?: number): { allowed: boolean; reason?: string } {
    if (this.total >= this.maxPerRun) {
      return { allowed: false, reason: `Run budget exhausted (${this.maxPerRun} calls)` }
    }
    if (candidateId !== undefined && (this.byCandidate[candidateId] ?? 0) >= this.maxPerCandidate) {
      return { allowed: false, reason: `Per-candidate budget exhausted (${this.maxPerCandidate} calls)` }
    }
    return { allowed: true }
  }

  record(toolName: string, candidateId?: number): void {
    this.total++
    this.byTool[toolName] = (this.byTool[toolName] ?? 0) + 1
    if (candidateId !== undefined) {
      this.byCandidate[candidateId] = (this.byCandidate[candidateId] ?? 0) + 1
    }
  }
}

export interface ToolDefinition {
  name: string
  description: string
  execute: (args: Record<string, unknown>) => Promise<string>
}

export function createScout9Tools(tracker: ToolCallTracker, toolTimeoutMs: number): ToolDefinition[] {
  return [
    {
      name: 'get_resume_text',
      description: 'Get full resume text for a candidate by source type and upstream ID',
      execute: async (args) => {
        const { sourceType, upstreamId } = args as { sourceType: string; upstreamId: number }
        const check = tracker.check('get_resume_text', upstreamId)
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_resume_text', upstreamId)

        return withTimeout(async () => {
          const db = getDatabase()
          const row = db.prepare(
            'SELECT resume_text FROM resume_embeddings WHERE source_type = ? AND upstream_id = ?'
          ).get(sourceType, upstreamId) as { resume_text: string | null } | undefined
          return row?.resume_text ?? 'No resume text available'
        }, toolTimeoutMs, 'get_resume_text')
      },
    },
    {
      name: 'get_position_discussions',
      description: 'Get discussion thread for an open position by upstream ID',
      execute: async (args) => {
        const { positionUpstreamId } = args as { positionUpstreamId: number }
        const check = tracker.check('get_position_discussions')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_position_discussions')

        return withTimeout(async () => {
          const db = getDatabase()
          const rows = db.prepare(
            'SELECT author, date, message FROM open_position_discussions WHERE open_position_id = ? ORDER BY date DESC LIMIT 20'
          ).all(positionUpstreamId) as { author: string; date: string; message: string }[]
          if (rows.length === 0) return 'No discussions found'
          return rows.map(r => `[${r.date}] ${r.author}: ${r.message}`).join('\n')
        }, toolTimeoutMs, 'get_position_discussions')
      },
    },
    {
      name: 'get_candidate_history',
      description: 'Get other positions a candidate has been presented to',
      execute: async (args) => {
        const { candidateId } = args as { candidateId: number }
        const check = tracker.check('get_candidate_history', candidateId)
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_candidate_history', candidateId)

        return withTimeout(async () => {
          const db = getDatabase()
          const rows = db.prepare(`
            SELECT opc.candidate_status, opc.rate, opc.start_date, sop.account, sop.job_title, sop.main_skill
            FROM open_position_candidates opc
            JOIN synced_open_positions sop ON sop.upstream_id = opc.open_position_id
            WHERE opc.candidate_id = ?
            ORDER BY opc.synced_at DESC
          `).all(candidateId) as { candidate_status: string; rate: number; start_date: string | null; account: string; job_title: string; main_skill: string }[]
          if (rows.length === 0) return 'No presentation history found'
          return JSON.stringify(rows)
        }, toolTimeoutMs, 'get_candidate_history')
      },
    },
    {
      name: 'get_position_detail',
      description: 'Get full details for an open position by upstream ID',
      execute: async (args) => {
        const { positionUpstreamId } = args as { positionUpstreamId: number }
        const check = tracker.check('get_position_detail')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_position_detail')

        return withTimeout(async () => {
          const db = getDatabase()
          const row = db.prepare(
            'SELECT * FROM synced_open_positions WHERE upstream_id = ?'
          ).get(positionUpstreamId)
          if (!row) return 'Position not found'
          return JSON.stringify(row)
        }, toolTimeoutMs, 'get_position_detail')
      },
    },
    {
      name: 'get_candidate_salary_info',
      description: 'Get normalized salary data for a candidate or employee by upstream ID and source type. Returns normalized_monthly_usd (USD/month), inferred_currency, currency_confidence, and raw salary fields.',
      execute: async (args) => {
        const { sourceType, upstreamId } = args as { sourceType: 'candidates' | 'employees'; upstreamId: number }
        const check = tracker.check('get_candidate_salary_info', upstreamId)
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_candidate_salary_info', upstreamId)

        return withTimeout(async () => {
          const db = getDatabase()
          if (sourceType === 'candidates') {
            const row = db.prepare(`
              SELECT upstream_id, full_name, country, seniority, main_skill,
                salary_expectations, normalized_monthly_usd, inferred_currency, currency_confidence
              FROM synced_candidates WHERE upstream_id = ?
            `).get(upstreamId) as Record<string, unknown> | undefined
            if (!row) return 'Candidate not found'
            return JSON.stringify(row)
          }
          const row = db.prepare(`
            SELECT upstream_id, full_name, country, seniority, main_skill,
              salary_expectations, normalized_monthly_usd, inferred_currency, currency_confidence
            FROM synced_employees WHERE upstream_id = ?
          `).get(upstreamId) as Record<string, unknown> | undefined
          if (!row) return 'Employee not found'
          return JSON.stringify(row)
        }, toolTimeoutMs, 'get_candidate_salary_info')
      },
    },
    {
      name: 'filter_candidates_by_salary_range',
      description: 'Find candidates/employees whose normalized_monthly_usd falls within a given range. Provide minMonthlyUsd and/or maxMonthlyUsd. Optionally filter by country or seniority. Returns up to 50 results.',
      execute: async (args) => {
        const { minMonthlyUsd, maxMonthlyUsd, country, seniority, sourceType } = args as {
          minMonthlyUsd?: number; maxMonthlyUsd?: number; country?: string; seniority?: string; sourceType?: 'candidates' | 'employees'
        }
        const check = tracker.check('filter_candidates_by_salary_range')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('filter_candidates_by_salary_range')

        return withTimeout(async () => {
          const db = getDatabase()
          const results: Record<string, unknown>[] = []
          const tables = sourceType ? [sourceType] : ['candidates', 'employees'] as const

          for (const table of tables) {
            const tableName = table === 'candidates' ? 'synced_candidates' : 'synced_employees'
            const conditions: string[] = ['normalized_monthly_usd IS NOT NULL']
            const params: unknown[] = []

            if (minMonthlyUsd !== undefined) {
              conditions.push('normalized_monthly_usd >= ?')
              params.push(minMonthlyUsd)
            }
            if (maxMonthlyUsd !== undefined) {
              conditions.push('normalized_monthly_usd <= ?')
              params.push(maxMonthlyUsd)
            }
            if (country) {
              conditions.push('country = ?')
              params.push(country)
            }
            if (seniority) {
              conditions.push('seniority = ?')
              params.push(seniority)
            }

            const rows = db.prepare(`
              SELECT upstream_id, full_name, country, seniority, main_skill,
                normalized_monthly_usd, inferred_currency, currency_confidence
              FROM ${tableName}
              WHERE ${conditions.join(' AND ')}
              ORDER BY normalized_monthly_usd ASC
              LIMIT 50
            `).all(...params) as Record<string, unknown>[]

            results.push(...rows.map(r => ({ ...r, sourceType: table })))
          }

          if (results.length === 0) return 'No candidates found matching the salary range criteria'
          return JSON.stringify(results.slice(0, 50))
        }, toolTimeoutMs, 'filter_candidates_by_salary_range')
      },
    },
    {
      name: 'compare_employment_costs',
      description: 'Compare FTE vs contractor cost for a candidate in a specific country. Especially useful for contractor-heavy countries (BOL, PRY). Returns estimated FTE cost (with overhead), contractor cost, and recommendation.',
      execute: async (args) => {
        const { normalizedMonthlyUsd, country, candidateName } = args as {
          normalizedMonthlyUsd: number; country: string; candidateName: string
        }
        const check = tracker.check('compare_employment_costs')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('compare_employment_costs')

        return withTimeout(async () => {
          const result = compareEmploymentCosts(normalizedMonthlyUsd, country, candidateName)
          return JSON.stringify(result)
        }, toolTimeoutMs, 'compare_employment_costs')
      },
    },
    {
      name: 'get_country_salary_matrix',
      description: 'Get a country-by-seniority feasibility matrix for a position. Shows which country+seniority combinations are feasible, marginal, or not-feasible based on salary bands vs position budget. Includes contractor-heavy country notes.',
      execute: async (args) => {
        const { positionUpstreamId } = args as { positionUpstreamId: number }
        const check = tracker.check('get_country_salary_matrix')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_country_salary_matrix')

        return withTimeout(async () => {
          const matrix = buildCountrySalaryMatrix(positionUpstreamId)
          if (matrix.length === 0) return 'No feasibility data available (position not found or no salary bands)'
          return JSON.stringify(matrix)
        }, toolTimeoutMs, 'get_country_salary_matrix')
      },
    },
    {
      name: 'evaluate_salary_feasibility',
      description: 'Evaluate salary feasibility for candidates against a position budget. Provide positionUpstreamId and an array of candidate objects. Returns verdict (feasible/marginal/not-feasible/unknown), reasoning, seniority flexibility info, and employment type notes for contractor-heavy countries.',
      execute: async (args) => {
        const { positionUpstreamId, candidates } = args as {
          positionUpstreamId: number
          candidates: Array<{
            upstreamId: number; fullName: string; sourceType: 'candidates' | 'employees'
            country: string; seniority: string; normalizedMonthlyUsd: number | null; currencyConfidence: string | null
          }>
        }
        const check = tracker.check('evaluate_salary_feasibility')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('evaluate_salary_feasibility')

        return withTimeout(async () => {
          const results = batchEvaluateFeasibility(positionUpstreamId, candidates)
          return JSON.stringify(results)
        }, toolTimeoutMs, 'evaluate_salary_feasibility')
      },
    },
    {
      name: 'get_stakeholder_profile',
      description: 'Get the inferred stakeholder profile for a client/stakeholder. Returns observed rate ranges, accepted/rejected countries, seniority preferences, rejection reasons, and preference summary. Use this to understand what a specific hiring manager likes/dislikes before recommending candidates.',
      execute: async (args) => {
        const { account, stakeholder } = args as { account: string; stakeholder?: string }
        const check = tracker.check('get_stakeholder_profile')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_stakeholder_profile')

        return withTimeout(async () => {
          const db = getAgentsDatabase()
          const hasTable = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='stakeholder_profiles'"
          ).get()
          if (!hasTable) return 'Stakeholder profiles table not available'

          if (stakeholder) {
            const row = db.prepare(
              'SELECT * FROM stakeholder_profiles WHERE account = ? AND stakeholder_name = ?'
            ).get(account, stakeholder)
            if (!row) return `No profile found for stakeholder "${stakeholder}" at account "${account}"`
            return JSON.stringify(row)
          }

          const rows = db.prepare(
            'SELECT * FROM stakeholder_profiles WHERE account = ? ORDER BY data_points_count DESC'
          ).all(account)
          if ((rows as unknown[]).length === 0) return `No profiles found for account "${account}"`
          return JSON.stringify(rows)
        }, toolTimeoutMs, 'get_stakeholder_profile')
      },
    },
    {
      name: 'get_client_rule_overrides',
      description: 'Get client-specific rule overrides (e.g., "Axos: allow seniority -1", "Axos: max $36/hr"). These override default business rules for specific accounts.',
      execute: async (args) => {
        const { clientId } = args as { clientId: string }
        const check = tracker.check('get_client_rule_overrides')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_client_rule_overrides')

        return withTimeout(async () => {
          const db = getAgentsDatabase()
          const hasTable = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='client_rule_overrides'"
          ).get()
          if (!hasTable) return 'Client rule overrides table not available'

          const rows = db.prepare(
            'SELECT * FROM client_rule_overrides WHERE client_id = ? AND is_active = 1 ORDER BY updated_at DESC'
          ).all(clientId)
          if ((rows as unknown[]).length === 0) return `No active rule overrides found for client "${clientId}"`
          return JSON.stringify(rows)
        }, toolTimeoutMs, 'get_client_rule_overrides')
      },
    },
    {
      name: 'get_knowledge_notes',
      description: 'Get context notes for a specific client or stakeholder',
      execute: async (args) => {
        const { client, stakeholder } = args as { client?: string; stakeholder?: string }
        const check = tracker.check('get_knowledge_notes')
        if (!check.allowed) return check.reason ?? 'Budget exhausted'
        tracker.record('get_knowledge_notes')

        return withTimeout(async () => {
          const db = getAgentsDatabase()
          let query = 'SELECT note_title, note_text, tags_json FROM knowledge_notes WHERE is_active = 1'
          const params: unknown[] = []

          if (client) {
            query += " AND tags_json LIKE ?"
            params.push(`%${client}%`)
          }
          if (stakeholder) {
            query += " AND tags_json LIKE ?"
            params.push(`%${stakeholder}%`)
          }

          const rows = db.prepare(query).all(...params) as { note_title: string; note_text: string; tags_json: string }[]
          if (rows.length === 0) return 'No context notes found'
          return rows.map(r => `[${r.note_title}] ${r.note_text}`).join('\n---\n')
        }, toolTimeoutMs, 'get_knowledge_notes')
      },
    },
  ]
}
