import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getDatabase } from '../db/connection'
import { createLogger } from './logger'

const log = createLogger('OracleMcpServer')

type QueryParams = Record<string, string | number>

function toTextResult(rows: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(rows, null, 2) }],
  }
}

function normalizeLimit(limit: number | undefined, fallback = 100, max = 1000): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return fallback
  const normalized = Math.floor(limit)
  if (normalized < 1) return 1
  if (normalized > max) return max
  return normalized
}

function addEqualsFilter(
  conditions: string[],
  params: QueryParams,
  column: string,
  value: string | undefined,
  paramName: string
) {
  if (!value) return
  conditions.push(`${column} = @${paramName}`)
  params[paramName] = value
}

function addLikeFilter(
  conditions: string[],
  params: QueryParams,
  column: string,
  value: string | undefined,
  paramName: string
) {
  if (!value) return
  conditions.push(`${column} LIKE @${paramName}`)
  params[paramName] = `%${value}%`
}

function isSafeQuery(sql: string): boolean {
  const trimmed = sql.trim()
  if (!trimmed) return false
  if (!/^select\b/i.test(trimmed)) return false
  if (/--|\/\*/.test(trimmed)) return false
  const withoutTrailingSemicolon = trimmed.replace(/;\s*$/, '')
  if (withoutTrailingSemicolon.includes(';')) return false
  const forbidden = /\b(insert|update|delete|drop|alter|create|attach|detach|pragma)\b/i
  if (forbidden.test(withoutTrailingSemicolon)) return false
  return true
}

export function createOracleMcpServer(): McpServer {
  const db = getDatabase()

  const server = new McpServer({
    name: 'oracle',
    version: '1.0.0',
  })

  server.registerTool(
    'query_positions',
    {
      description: 'Query open positions with operational filters',
      inputSchema: z.object({
        skill: z.string().optional(),
        status: z.string().optional(),
        account: z.string().optional(),
        country: z.string().optional(),
        created_after: z.string().optional(),
        created_before: z.string().optional(),
        min_aging: z.number().int().optional(),
        stakeholder: z.string().optional(),
        limit: z.number().int().optional(),
      }),
    },
    args => {
      log.info('Tool called: query_positions', { skill: args.skill, status: args.status, account: args.account })
      const conditions: string[] = []
      const params: QueryParams = {}

      addLikeFilter(conditions, params, 'main_skill', args.skill, 'skill')
      addEqualsFilter(conditions, params, 'position_status', args.status, 'status')
      addEqualsFilter(conditions, params, 'account', args.account, 'account')
      addLikeFilter(conditions, params, 'countries', args.country, 'country')
      addEqualsFilter(conditions, params, 'stakeholder', args.stakeholder, 'stakeholder')

      if (args.created_after) {
        conditions.push('created >= @createdAfter')
        params.createdAfter = args.created_after
      }

      if (args.created_before) {
        conditions.push('created <= @createdBefore')
        params.createdBefore = args.created_before
      }

      if (typeof args.min_aging === 'number') {
        conditions.push('aging >= @minAging')
        params.minAging = args.min_aging
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      params.limit = normalizeLimit(args.limit, 100, 500)

      const sql = `
        SELECT
          upstream_id,
          account,
          main_skill,
          job_title,
          position_status,
          countries,
          seniorities,
          created,
          aging,
          candidates_presented,
          stakeholder,
          closed_date,
          closed_reason,
          sourcing,
          vertical_industry,
          ready_date
        FROM synced_open_positions
        ${whereClause}
        ORDER BY datetime(created) DESC, aging DESC
        LIMIT @limit
      `

      const rows = db.prepare(sql).all(params)
      return toTextResult(rows)
    }
  )

  server.registerTool(
    'query_employees',
    {
      description: 'Query employee inventory and bench status',
      inputSchema: z.object({
        skill: z.string().optional(),
        bench_status: z.enum(['bench', 'allocated', 'all']).optional(),
        country: z.string().optional(),
        seniority_level: z.string().optional(),
        limit: z.number().int().optional(),
      }),
    },
    args => {
      log.info('Tool called: query_employees', { skill: args.skill, bench_status: args.bench_status, country: args.country })
      const conditions: string[] = []
      const params: QueryParams = {}

      addLikeFilter(conditions, params, 'main_skill', args.skill, 'skill')
      addEqualsFilter(conditions, params, 'country', args.country, 'country')
      addEqualsFilter(conditions, params, 'seniority', args.seniority_level, 'seniority')

      if (args.bench_status === 'bench') {
        conditions.push('is_bench = 1')
      } else if (args.bench_status === 'allocated') {
        conditions.push('is_bench = 0')
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      params.limit = normalizeLimit(args.limit, 100, 500)

      const sql = `
        SELECT
          upstream_id,
          full_name,
          email,
          seniority,
          main_skill,
          country,
          is_bench,
          last_account,
          job_title,
          status,
          synced_at
        FROM synced_employees
        ${whereClause}
        ORDER BY datetime(synced_at) DESC
        LIMIT @limit
      `

      const rows = db.prepare(sql).all(params)
      return toTextResult(rows)
    }
  )

  server.registerTool(
    'query_candidates',
    {
      description: 'Query candidate inventory by status, skills and certification',
      inputSchema: z.object({
        skill: z.string().optional(),
        status: z.string().optional(),
        coe_certified: z.boolean().optional(),
        country: z.string().optional(),
        limit: z.number().int().optional(),
      }),
    },
    args => {
      log.info('Tool called: query_candidates', { skill: args.skill, status: args.status, country: args.country })
      const conditions: string[] = []
      const params: QueryParams = {}

      addLikeFilter(conditions, params, 'main_skill', args.skill, 'skill')
      addEqualsFilter(conditions, params, 'candidate_status', args.status, 'status')
      addEqualsFilter(conditions, params, 'country', args.country, 'country')

      if (typeof args.coe_certified === 'boolean') {
        conditions.push('coe_certified = @coeCertified')
        params.coeCertified = args.coe_certified ? 1 : 0
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      params.limit = normalizeLimit(args.limit, 100, 500)

      const sql = `
        SELECT
          upstream_id,
          full_name,
          email,
          seniority,
          main_skill,
          country,
          candidate_status,
          coe_certified,
          current_salary,
          salary_currency,
          last_status_update,
          status,
          synced_at
        FROM synced_candidates
        ${whereClause}
        ORDER BY datetime(synced_at) DESC
        LIMIT @limit
      `

      const rows = db.prepare(sql).all(params)
      return toTextResult(rows)
    }
  )

  server.registerTool(
    'query_prr',
    {
      description: 'Query project reallocations and attrition risk',
      inputSchema: z.object({
        status: z.string().optional(),
        main_skill: z.string().optional(),
        attrition_risk: z.string().optional(),
        account: z.string().optional(),
        limit: z.number().int().optional(),
      }),
    },
    args => {
      log.info('Tool called: query_prr', { status: args.status, main_skill: args.main_skill, account: args.account })
      const conditions: string[] = []
      const params: QueryParams = {}

      addEqualsFilter(conditions, params, 'transition_status', args.status, 'status')
      addLikeFilter(conditions, params, 'main_skill', args.main_skill, 'mainSkill')
      addEqualsFilter(conditions, params, 'attrition_risk', args.attrition_risk, 'attritionRisk')
      addEqualsFilter(conditions, params, 'account', args.account, 'account')

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      params.limit = normalizeLimit(args.limit, 100, 500)

      const sql = `
        SELECT
          upstream_id,
          employee,
          account,
          team,
          main_skill,
          seniority,
          transition_status,
          transition_sub_type,
          location,
          request_date,
          attrition_risk,
          impact,
          presentations_count,
          coe_status,
          synced_at
        FROM synced_project_reallocations
        ${whereClause}
        ORDER BY datetime(request_date) DESC
        LIMIT @limit
      `

      const rows = db.prepare(sql).all(params)
      return toTextResult(rows)
    }
  )

  server.registerTool(
    'query_position_candidates',
    {
      description: 'Query candidates linked to a specific open position',
      inputSchema: z.object({
        open_position_id: z.number().int(),
        limit: z.number().int().optional(),
      }),
    },
    args => {
      log.info('Tool called: query_position_candidates', { open_position_id: args.open_position_id })
      const limit = normalizeLimit(args.limit, 200, 1000)
      const sql = `
        SELECT
          opc.open_position_id,
          opc.candidate_requisition_id,
          opc.candidate_id,
          opc.candidate_name,
          opc.main_skill,
          opc.is_employee,
          opc.candidate_status,
          opc.rate,
          opc.start_date,
          opc.rejection_feedback,
          opc.rejection_comments,
          opc.rejection_action_date,
          opc.synced_at,
          sop.upstream_id AS position_upstream_id,
          sop.account,
          sop.job_title,
          sop.position_status,
          sop.stakeholder
        FROM open_position_candidates opc
        LEFT JOIN synced_open_positions sop
          ON sop.upstream_id = opc.open_position_id
        WHERE opc.open_position_id = @openPositionId
        ORDER BY datetime(opc.synced_at) DESC
        LIMIT @limit
      `

      const rows = db.prepare(sql).all({
        openPositionId: args.open_position_id,
        limit,
      })
      return toTextResult(rows)
    }
  )

  server.registerTool(
    'query_match_sessions',
    {
      description: 'Query match session history with optional filters',
      inputSchema: z.object({
        status: z.string().optional(),
        data_source: z.string().optional(),
        search_mode: z.string().optional(),
        created_after: z.string().optional(),
        created_before: z.string().optional(),
        limit: z.number().int().optional(),
      }),
    },
    args => {
      log.info('Tool called: query_match_sessions', { status: args.status, data_source: args.data_source })
      const conditions: string[] = []
      const params: QueryParams = {}

      addEqualsFilter(conditions, params, 'status', args.status, 'status')
      addEqualsFilter(conditions, params, 'data_source', args.data_source, 'dataSource')
      addEqualsFilter(conditions, params, 'search_mode', args.search_mode, 'searchMode')

      if (args.created_after) {
        conditions.push('created_at >= @createdAfter')
        params.createdAfter = args.created_after
      }

      if (args.created_before) {
        conditions.push('created_at <= @createdBefore')
        params.createdBefore = args.created_before
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      params.limit = normalizeLimit(args.limit, 100, 500)

      const sql = `
        SELECT
          id,
          name,
          match_flow_type,
          data_source,
          top_n,
          search_mode,
          status,
          created_at,
          completed_at,
          jd_source,
          pipeline_stats_json,
          pipeline_stages_json
        FROM match_sessions
        ${whereClause}
        ORDER BY datetime(created_at) DESC
        LIMIT @limit
      `

      const rows = db.prepare(sql).all(params)
      return toTextResult(rows)
    }
  )

  server.registerTool(
    'aggregate_stats',
    {
      description: 'Aggregate operational metrics across Oracle datasets',
      inputSchema: z.object({
        metric: z.enum([
          'win_rate',
          'positions_by_period',
          'positions_by_status',
          'bench_rate',
          'attrition_risk_distribution',
        ]),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        period: z.enum(['day', 'week', 'month']).optional(),
      }),
    },
    args => {
      log.info('Tool called: aggregate_stats', { metric: args.metric, period: args.period })
      const dateConditions: string[] = []
      const dateParams: QueryParams = {}

      if (args.start_date) {
        dateConditions.push('created >= @startDate')
        dateParams.startDate = args.start_date
      }

      if (args.end_date) {
        dateConditions.push('created <= @endDate')
        dateParams.endDate = args.end_date
      }

      if (args.metric === 'win_rate') {
        const whereClause = dateConditions.length > 0 ? `WHERE ${dateConditions.join(' AND ')}` : ''
        const sql = `
          SELECT
            COUNT(*) AS total_closed,
            SUM(CASE WHEN LOWER(COALESCE(closed_reason, '')) LIKE '%win%' THEN 1 ELSE 0 END) AS won_positions,
            ROUND(
              CASE WHEN COUNT(*) = 0 THEN 0
              ELSE 100.0 * SUM(CASE WHEN LOWER(COALESCE(closed_reason, '')) LIKE '%win%' THEN 1 ELSE 0 END) / COUNT(*)
              END,
              2
            ) AS win_rate
          FROM synced_open_positions
          ${whereClause}${whereClause ? ' AND' : ' WHERE'} closed_date IS NOT NULL
        `
        const rows = db.prepare(sql).all(dateParams)
        return toTextResult(rows)
      }

      if (args.metric === 'positions_by_period') {
        const periodFormat = args.period === 'day'
          ? '%Y-%m-%d'
          : args.period === 'week'
            ? '%Y-W%W'
            : '%Y-%m'

        const whereParts = [...dateConditions, 'created IS NOT NULL']
        const whereClause = `WHERE ${whereParts.join(' AND ')}`
        const sql = `
          SELECT
            strftime('${periodFormat}', created) AS period,
            COUNT(*) AS positions,
            AVG(aging) AS avg_aging
          FROM synced_open_positions
          ${whereClause}
          GROUP BY period
          ORDER BY period ASC
        `

        const rows = db.prepare(sql).all(dateParams)
        return toTextResult(rows)
      }

      if (args.metric === 'positions_by_status') {
        const whereClause = dateConditions.length > 0 ? `WHERE ${dateConditions.join(' AND ')}` : ''
        const sql = `
          SELECT
            position_status,
            COUNT(*) AS total
          FROM synced_open_positions
          ${whereClause}
          GROUP BY position_status
          ORDER BY total DESC
        `

        const rows = db.prepare(sql).all(dateParams)
        return toTextResult(rows)
      }

      if (args.metric === 'bench_rate') {
        const sql = `
          SELECT
            COUNT(*) AS total_employees,
            SUM(CASE WHEN is_bench = 1 THEN 1 ELSE 0 END) AS bench_employees,
            ROUND(
              CASE WHEN COUNT(*) = 0 THEN 0
              ELSE 100.0 * SUM(CASE WHEN is_bench = 1 THEN 1 ELSE 0 END) / COUNT(*)
              END,
              2
            ) AS bench_rate
          FROM synced_employees
        `

        const rows = db.prepare(sql).all()
        return toTextResult(rows)
      }

      const sql = `
        SELECT
          attrition_risk,
          COUNT(*) AS total
        FROM synced_project_reallocations
        GROUP BY attrition_risk
        ORDER BY total DESC
      `
      const rows = db.prepare(sql).all()
      return toTextResult(rows)
    }
  )

  server.registerTool(
    'run_sql',
    {
      description: 'Run read-only SELECT SQL against Oracle datasets',
      inputSchema: z.object({
        sql: z.string().min(1),
        limit: z.number().int().optional(),
      }),
    },
    args => {
      log.info('Tool called: run_sql', { sqlLength: args.sql.length, limit: args.limit })
      const normalizedLimit = normalizeLimit(args.limit, 200, 1000)
      const trimmed = args.sql.trim().replace(/;\s*$/, '')

      if (!isSafeQuery(trimmed)) {
        const message = 'Unsafe query rejected. Only single-statement SELECT queries are allowed.'
        log.warn('Rejected unsafe SQL query', { sql: args.sql })
        return toTextResult({ error: message })
      }

      const sql = /\blimit\b/i.test(trimmed)
        ? trimmed
        : `${trimmed} LIMIT ${normalizedLimit}`

      try {
        const rows = db.prepare(sql).all()
        return toTextResult(rows)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        log.error('Failed to execute SQL query', err, { sql })
        return toTextResult({ error: err.message })
      }
    }
  )

  return server
}
