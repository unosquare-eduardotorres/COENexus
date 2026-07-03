import { getDatabase } from '../connection'
import { buildUpsertSql } from '../../services/utils/upsertBuilder'
import { createLogger } from '../../services/logger'

const log = createLogger('SyncRepository')

type SyncTable = 'synced_employees' | 'synced_candidates' | 'synced_open_positions' | 'synced_project_reallocations'

export interface SyncedEmployeeRow {
  id: number
  upstream_id: number
  full_name: string
  email: string
  seniority: string
  main_skill: string
  country: string
  gross_monthly_salary: number | null
  salary_currency: string | null
  last_account: string | null
  last_account_start_date: string | null
  rate: number | null
  has_resume: number
  resume_note_id: number | null
  resume_date_created: string | null
  resume_filename: string | null
  is_bench: number
  bench_team: string | null
  job_title: string
  functional_unit: string
  office_location: string
  business_unit: string
  normalized_monthly_usd: number | null
  inferred_currency: string | null
  currency_confidence: string | null
  status: string
  status_reason: string | null
  failed?: number
  synced_at: string
}

export interface SyncedCandidateRow {
  id: number
  upstream_id: number
  full_name: string
  email: string | null
  seniority: string | null
  main_skill: string | null
  country: string | null
  current_salary: number | null
  salary_currency: string | null
  coe_certified: number
  candidate_status: string | null
  last_status_update: string | null
  salary_expectations: number | null
  salary_expectations_currency: string | null
  has_resume: number
  resume_note_id: number | null
  resume_date_created: string | null
  resume_filename: string | null
  normalized_monthly_usd: number | null
  inferred_currency: string | null
  currency_confidence: string | null
  status: string
  status_reason: string | null
  failed?: number
  synced_at: string
}

export interface SyncedOpenPositionRow {
  id: number
  upstream_id: number
  account: string
  coe: string
  practice: string
  stakeholder: string
  main_skill: string
  countries: string
  seniorities: string
  available_range: string
  account_overview: string
  job_description: string
  job_title: string
  position_status: string
  aging: number
  created: string | null
  ready_date: string | null
  last_modification: string | null
  sourcing: string
  replacement: number
  vertical_industry: string
  in_office: number
  csu: string
  cs: string
  closed_date: string | null
  closed_reason: string | null
  is_ready: number
  is_promotion: number
  maximum_rate: number | null
  minimum_rate: number | null
  additional_skills: string
  created_with_assignments_tool: number | null
  candidates_presented: number
  last_discussion_date: string | null
  status: string
  status_reason: string | null
  failed?: number
  synced_at: string
}

/** Lightweight Closed-position projection used by the Acceptance Rate report. */
export interface ClosedPositionOutcomeRow {
  id: number
  upstream_id: number
  position_status: string
  account: string
  coe: string
  practice: string
  job_title: string
  main_skill: string
  closed_date: string | null
}

/** Candidate projection joined to a Closed position. */
export interface ClosedPositionCandidateRow {
  open_position_id: number
  candidate_requisition_id: number
  candidate_name: string
  main_skill: string
  candidate_status: string
  rate: number
  start_date: string | null
  is_employee: number
}

// ── Acceptance Rate V2 row types ──────────────────────────────────────────────

/** Position projection for the V2 Acceptance Rate report — includes stakeholder + created for cohort/dedup. */
export interface AcceptancePositionRow {
  id: number
  upstream_id: number
  position_status: string
  account: string
  stakeholder: string
  coe: string
  practice: string
  job_title: string
  main_skill: string
  created: string
  closed_date: string | null
}

/** Candidate projection for the V2 Acceptance Rate report — includes candidate_id for person dedup. */
export interface AcceptanceCandidateRow {
  open_position_id: number
  candidate_requisition_id: number
  candidate_id: number
  candidate_name: string
  main_skill: string
  candidate_status: string
  rate: number
  start_date: string | null
  is_employee: number
}

export interface SyncedProjectReallocationRow {
  id: number
  upstream_id: number
  employee: string
  account: string
  team: string
  main_skill: string
  seniority: string
  transition_status: string
  transition_sub_type: string
  location: string
  request_date: string | null
  days_since_last_interview: string
  impact: string
  attrition_risk: string
  comments: string
  presentations_count: number
  status: string
  status_reason: string | null
  synced_at: string
}

export interface PrrPresentationRow {
  id: number
  prr_id: number
  open_position_id: number
  account: string
  open_position_status: string
  location: string
  presented_on: string | null
  candidate_status: string
  synced_at: string
}

export interface OpenPositionDiscussionRow {
  id: number
  open_position_id: number
  comment_id: number
  author: string
  date: string
  message: string
  parent_comment_id: number | null
  synced_at: string
}

export interface CoePracticeLeadRow {
  id: number
  display_name: string
  email: string
  coe: string
  active: number
  practice_id: number | null
}

// ── Placement Margin row types ──────────────────────────────────────────────

export interface SyncedPlacementMarginRow {
  id: number
  year: number
  quarter: number
  email: string
  name: string | null
  account: string | null
  main_skill: string | null
  country: string | null
  open_position_id: number | null
  placement_date: string | null
  leave_date: string | null
  placement_rate: number | null
  placement_margin: number | null
  current_margin: number | null
  placement_revenue: number | null
  current_revenue: number | null
  placement_monthly_salary: number | null
  current_monthly_salary: number | null
  company_tenure: number | null
  allocation: number | null
  is_promotion: number
  first_time_entry_date: string | null
  kickoff_delay: number | null
  tac_at_placement: number | null
  current_tac: number | null
  synced_at: string
}

export interface SyncedOffboardingRow {
  id: number
  year: number
  employee: string
  account: string | null
  location: string | null
  seniority: string | null
  main_skill: string | null
  unosquare_tenure: number | null
  monthly_gross_salary: number | null
  monthly_tac: number | null
  rate: number | null
  gm: number | null
  offboarding_date: string | null
  offboarding_status: string | null
  leave_reason_type: string | null
  leave_reason_details: string | null
  leave_reason: string | null
  synced_at: string
}

export interface SyncedPlacementMarginSummaryRow {
  id: number
  year: number
  quarter: number
  ytd_margin: number | null
  ytd_avg_rate: number | null
  period_margin: number | null
  period_avg_rate: number | null
  monthly_trend_json: string | null
  synced_at: string
}

const EMPLOYEE_COLUMNS = [
  'upstream_id', 'full_name', 'email', 'seniority', 'main_skill', 'country',
  'gross_monthly_salary', 'salary_currency', 'last_account', 'last_account_start_date', 'rate',
  'has_resume', 'resume_note_id', 'resume_date_created', 'resume_filename', 'is_bench', 'bench_team', 'job_title',
  'functional_unit', 'office_location', 'business_unit',
  'normalized_monthly_usd', 'inferred_currency', 'currency_confidence',
  'status', 'status_reason', 'synced_at',
]

const CANDIDATE_COLUMNS = [
  'upstream_id', 'full_name', 'email', 'seniority', 'main_skill', 'country',
  'current_salary', 'salary_currency', 'coe_certified', 'candidate_status', 'last_status_update',
  'salary_expectations', 'salary_expectations_currency', 'has_resume', 'resume_note_id',
  'resume_date_created', 'resume_filename',
  'normalized_monthly_usd', 'inferred_currency', 'currency_confidence',
  'status', 'status_reason', 'synced_at',
]

const POSITION_COLUMNS = [
  'upstream_id', 'account', 'coe', 'practice', 'stakeholder', 'main_skill',
  'countries', 'seniorities', 'available_range', 'account_overview', 'job_description', 'job_title',
  'position_status', 'aging', 'created', 'ready_date', 'last_modification', 'sourcing', 'replacement',
  'vertical_industry', 'in_office', 'csu', 'cs', 'closed_date', 'closed_reason',
  'is_ready', 'is_promotion', 'maximum_rate', 'minimum_rate', 'additional_skills',
  'created_with_assignments_tool', 'candidates_presented', 'last_discussion_date',
  'status', 'status_reason', 'synced_at',
]

const DISCUSSION_COLUMNS = [
  'open_position_id', 'comment_id', 'author', 'date', 'message', 'parent_comment_id', 'synced_at',
]

const DISCUSSION_UPSERT = buildUpsertSql({
  table: 'open_position_discussions',
  columns: DISCUSSION_COLUMNS,
  conflictColumns: ['open_position_id', 'comment_id'],
})

const PRR_COLUMNS = [
  'upstream_id', 'employee', 'account', 'team', 'main_skill', 'seniority',
  'transition_status', 'transition_sub_type', 'location', 'request_date',
  'days_since_last_interview', 'impact', 'attrition_risk', 'comments',
  'presentations_count', 'status', 'status_reason', 'synced_at',
]

const PRR_PRESENTATION_COLUMNS = [
  'prr_id', 'open_position_id', 'account', 'open_position_status',
  'location', 'presented_on', 'candidate_status', 'synced_at',
]

const PRR_UPSERT = buildUpsertSql({ table: 'synced_project_reallocations', columns: PRR_COLUMNS, conflictColumns: ['upstream_id'] })
const PRR_PRESENTATION_UPSERT = buildUpsertSql({ table: 'prr_presentations', columns: PRR_PRESENTATION_COLUMNS, conflictColumns: ['prr_id', 'open_position_id', 'presented_on'] })

const EMPLOYEE_UPSERT = buildUpsertSql({ table: 'synced_employees', columns: EMPLOYEE_COLUMNS, conflictColumns: ['upstream_id'] })
const CANDIDATE_UPSERT = buildUpsertSql({ table: 'synced_candidates', columns: CANDIDATE_COLUMNS, conflictColumns: ['upstream_id'] })
const POSITION_UPSERT = buildUpsertSql({ table: 'synced_open_positions', columns: POSITION_COLUMNS, conflictColumns: ['upstream_id'] })

const PLACEMENT_MARGIN_COLUMNS = [
  'year', 'quarter', 'email', 'name', 'account', 'main_skill', 'country',
  'open_position_id', 'placement_date', 'leave_date', 'placement_rate',
  'placement_margin', 'current_margin', 'placement_revenue', 'current_revenue',
  'placement_monthly_salary', 'current_monthly_salary', 'company_tenure',
  'allocation', 'is_promotion', 'first_time_entry_date', 'kickoff_delay',
  'tac_at_placement', 'current_tac', 'synced_at',
]

const PLACEMENT_MARGIN_SUMMARY_COLUMNS = [
  'year', 'quarter', 'ytd_margin', 'ytd_avg_rate', 'period_margin',
  'period_avg_rate', 'monthly_trend_json', 'synced_at',
]

const PLACEMENT_MARGIN_UPSERT = buildUpsertSql({
  table: 'synced_placement_margins',
  columns: PLACEMENT_MARGIN_COLUMNS,
  conflictColumns: ['year', 'name', 'placement_date', 'account'],
})

const PLACEMENT_MARGIN_SUMMARY_UPSERT = buildUpsertSql({
  table: 'synced_placement_margin_summary',
  columns: PLACEMENT_MARGIN_SUMMARY_COLUMNS,
  conflictColumns: ['year', 'quarter'],
})

const OFFBOARDING_COLUMNS = [
  'year', 'employee', 'account', 'location', 'seniority', 'main_skill',
  'unosquare_tenure', 'monthly_gross_salary', 'monthly_tac', 'rate', 'gm',
  'offboarding_date', 'offboarding_status', 'leave_reason_type',
  'leave_reason_details', 'leave_reason', 'synced_at',
]

const OFFBOARDING_UPSERT = buildUpsertSql({
  table: 'synced_offboardings',
  columns: OFFBOARDING_COLUMNS,
  conflictColumns: ['year', 'employee', 'offboarding_date', 'account'],
})

export const syncRepository = {
  upsertEmployee(data: Omit<SyncedEmployeeRow, 'id'>): number {
    const db = getDatabase()
    try {
      const result = db.prepare(EMPLOYEE_UPSERT).run(data)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error(`upsertEmployee failed for upstream_id=${data.upstream_id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: data.upstream_id, name: data.full_name })
      throw err
    }
  },

  upsertCandidate(data: Omit<SyncedCandidateRow, 'id'>): number {
    const db = getDatabase()
    try {
      const result = db.prepare(CANDIDATE_UPSERT).run(data)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error(`upsertCandidate failed for upstream_id=${data.upstream_id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: data.upstream_id, name: data.full_name })
      throw err
    }
  },

  upsertOpenPosition(data: Omit<SyncedOpenPositionRow, 'id'>): number {
    const db = getDatabase()
    try {
      const result = db.prepare(POSITION_UPSERT).run(data)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error(`upsertOpenPosition failed for upstream_id=${data.upstream_id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: data.upstream_id, account: data.account })
      throw err
    }
  },

  findEmployeeByUpstreamId(upstreamId: number): SyncedEmployeeRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_employees WHERE upstream_id = ?').get(upstreamId) as SyncedEmployeeRow | undefined
  },

  findCandidateByUpstreamId(upstreamId: number): SyncedCandidateRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_candidates WHERE upstream_id = ?').get(upstreamId) as SyncedCandidateRow | undefined
  },

  findPositionByUpstreamId(upstreamId: number): SyncedOpenPositionRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_open_positions WHERE upstream_id = ?').get(upstreamId) as SyncedOpenPositionRow | undefined
  },

  getAllEmployees(limit = 500, offset = 0): SyncedEmployeeRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_employees ORDER BY full_name LIMIT ? OFFSET ?').all(limit, offset) as SyncedEmployeeRow[]
  },

  getAllCandidates(limit = 500, offset = 0): SyncedCandidateRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_candidates ORDER BY full_name LIMIT ? OFFSET ?').all(limit, offset) as SyncedCandidateRow[]
  },

  getAllOpenPositions(limit = 500, offset = 0): SyncedOpenPositionRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_open_positions ORDER BY account LIMIT ? OFFSET ?').all(limit, offset) as SyncedOpenPositionRow[]
  },

  getBenchEmployees(limit = 500, offset = 0): SyncedEmployeeRow[] {
    const db = getDatabase()
    return db.prepare(
      "SELECT * FROM synced_employees WHERE is_bench = 1 AND status != 'inactive' ORDER BY full_name LIMIT ? OFFSET ?"
    ).all(limit, offset) as SyncedEmployeeRow[]
  },

  markStaleEmployees(activeUpstreamIds: Set<number>): number {
    const db = getDatabase()
    const allEmployees = db.prepare(
      'SELECT id, upstream_id FROM synced_employees WHERE status != ?'
    ).all('inactive') as { id: number; upstream_id: number }[]

    let count = 0
    for (const emp of allEmployees) {
      if (!activeUpstreamIds.has(emp.upstream_id)) {
        db.prepare(
          "UPDATE synced_employees SET status = 'inactive', is_bench = 0, bench_team = NULL, synced_at = ? WHERE id = ?"
        ).run(new Date().toISOString(), emp.id)
        count++
      }
    }
    return count
  },

  searchEmployees(query: string, limit: number = 50): SyncedEmployeeRow[] {
    const db = getDatabase()
    const pattern = `%${query.replace(/\s+/g, '%')}%`
    return db.prepare(`
      SELECT * FROM synced_employees
      WHERE full_name LIKE ? OR email LIKE ? OR main_skill LIKE ?
      ORDER BY full_name LIMIT ?
    `).all(pattern, pattern, pattern, limit) as SyncedEmployeeRow[]
  },

  searchCandidates(query: string, limit: number = 50): SyncedCandidateRow[] {
    const db = getDatabase()
    const pattern = `%${query.replace(/\s+/g, '%')}%`
    return db.prepare(`
      SELECT * FROM synced_candidates
      WHERE full_name LIKE ? OR email LIKE ? OR main_skill LIKE ?
      ORDER BY full_name LIMIT ?
    `).all(pattern, pattern, pattern, limit) as SyncedCandidateRow[]
  },

  updateStatus(table: SyncTable, id: number, status: string): void {
    const db = getDatabase()
    db.prepare(`UPDATE ${table} SET status = ?, status_reason = NULL WHERE id = ?`).run(status, id)
  },

  markFailed(table: SyncTable, id: number, failedStatus: string, reason: string): void {
    const db = getDatabase()
    log.info('Marking record as failed', { table, id, failedStatus, reason })
    db.prepare(`UPDATE ${table} SET status = ?, status_reason = ? WHERE id = ?`).run(failedStatus, reason, id)
  },

  clearTable(dataSource: 'employees' | 'candidates' | 'positions' | 'project-reallocations'): void {
    const db = getDatabase()
    if (dataSource === 'project-reallocations') {
      log.warn('Clearing PRR sync tables', { dataSource })
      db.prepare('DELETE FROM prr_presentations').run()
      db.prepare('DELETE FROM synced_project_reallocations').run()
      return
    }
    const tableMap: Record<string, SyncTable> = {
      employees: 'synced_employees',
      candidates: 'synced_candidates',
      positions: 'synced_open_positions',
    }
    const table = tableMap[dataSource]
    if (table) {
      log.warn('Clearing sync table', { dataSource, table })
      db.prepare(`DELETE FROM ${table}`).run()
    }
  },

  getCountByStatus(table: SyncTable): { total: number; synced: number; failed: number; processing: number } {
    const db = getDatabase()
    const total = (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c
    const synced = (db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE status = 'synced'`).get() as { c: number }).c
    const failed = (db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE status IN ('sync_failed', 'extract_failed', 'vectorize_failed')`).get() as { c: number }).c
    const processing = (db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE status = 'processing'`).get() as { c: number }).c
    return { total, synced, failed, processing }
  },

  getCandidateCount(): number {
    const db = getDatabase()
    return (db.prepare('SELECT COUNT(*) as c FROM synced_candidates').get() as { c: number }).c
  },

  getEmployeeCount(): number {
    const db = getDatabase()
    return (db.prepare('SELECT COUNT(*) as c FROM synced_employees').get() as { c: number }).c
  },

  getAvailableOpenPositions(): SyncedOpenPositionRow[] {
    const db = getDatabase()
    return db.prepare(
      "SELECT * FROM synced_open_positions WHERE position_status IN ('Active', 'Draft') ORDER BY account"
    ).all() as SyncedOpenPositionRow[]
  },

  getActiveOpenPositions(): SyncedOpenPositionRow[] {
    const db = getDatabase()
    return db.prepare(
      "SELECT * FROM synced_open_positions WHERE position_status IN ('Active', 'Draft') ORDER BY aging DESC"
    ).all() as SyncedOpenPositionRow[]
  },

  getOpenPositionByUpstreamId(upstreamId: number): SyncedOpenPositionRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_open_positions WHERE upstream_id = ?').get(upstreamId) as SyncedOpenPositionRow | undefined
  },

  /** Distinct, non-empty COE values across Closed positions — used to populate the Acceptance Rate filter. */
  getDistinctClosedCoes(): string[] {
    const db = getDatabase()
    const rows = db.prepare(
      "SELECT DISTINCT coe FROM synced_open_positions WHERE position_status LIKE 'Closed%' AND coe != '' ORDER BY coe"
    ).all() as { coe: string }[]
    return rows.map(r => r.coe)
  },

  /**
   * Closed positions in a date window (optionally scoped to a COE) plus their candidate rows.
   * Two queries total (positions + a single JOIN for candidates) — avoids the N+1 the
   * stalled-report evaluate() does. `closed_date` is ISO-8601 so lexical range comparison is safe.
   */
  getClosedPositionsWithOutcomes(opts: {
    startDate: string
    endDateExclusive: string
    coe: string | null
  }): { positions: ClosedPositionOutcomeRow[]; candidates: ClosedPositionCandidateRow[] } {
    const db = getDatabase()
    const where = ["sop.position_status LIKE 'Closed%'", 'sop.closed_date IS NOT NULL', 'sop.closed_date >= ?', 'sop.closed_date < ?']
    const params: string[] = [opts.startDate, opts.endDateExclusive]
    if (opts.coe) {
      where.push('sop.coe = ?')
      params.push(opts.coe)
    }
    const whereSql = where.join(' AND ')

    const positions = db.prepare(
      `SELECT sop.id, sop.upstream_id, sop.position_status, sop.account, sop.coe, sop.practice, sop.job_title, sop.main_skill, sop.closed_date
       FROM synced_open_positions sop WHERE ${whereSql} ORDER BY sop.closed_date DESC`
    ).all(...params) as ClosedPositionOutcomeRow[]

    if (positions.length === 0) return { positions, candidates: [] }

    const candidates = db.prepare(
      `SELECT opc.open_position_id, opc.candidate_requisition_id, opc.candidate_name,
              opc.main_skill, opc.candidate_status, opc.rate, opc.start_date, opc.is_employee
       FROM open_position_candidates opc
       INNER JOIN synced_open_positions sop ON sop.upstream_id = opc.open_position_id
       WHERE ${whereSql}
       ORDER BY opc.candidate_name`
    ).all(...params) as ClosedPositionCandidateRow[]

    return { positions, candidates }
  },

  /**
   * Closed positions with an unknown close date (`closed_date IS NULL`), optionally
   * scoped to a COE, plus their candidate rows. Same projection/JOIN as
   * getClosedPositionsWithOutcomes so the report can reuse its bucketing loop.
   * These rows can't be placed on the quarter axis and are surfaced separately.
   */
  getClosedPositionsWithoutDate(coe: string | null): {
    positions: ClosedPositionOutcomeRow[]
    candidates: ClosedPositionCandidateRow[]
  } {
    const db = getDatabase()
    // Truly undated closures only: any Closed* status with no upstream close date.
    // Columns are qualified with the `sop` alias so the same WHERE can be reused
    // verbatim in both the positions query and the candidate JOIN.
    const where = ["sop.position_status LIKE 'Closed%'", 'sop.closed_date IS NULL']
    const params: string[] = []
    if (coe) {
      where.push('sop.coe = ?')
      params.push(coe)
    }
    const whereSql = where.join(' AND ')

    const positions = db.prepare(
      `SELECT sop.id, sop.upstream_id, sop.position_status, sop.account, sop.coe, sop.practice, sop.job_title, sop.main_skill, sop.closed_date
       FROM synced_open_positions sop WHERE ${whereSql} ORDER BY sop.account`
    ).all(...params) as ClosedPositionOutcomeRow[]

    if (positions.length === 0) return { positions, candidates: [] }

    const candidates = db.prepare(
      `SELECT opc.open_position_id, opc.candidate_requisition_id, opc.candidate_name,
              opc.main_skill, opc.candidate_status, opc.rate, opc.start_date, opc.is_employee
       FROM open_position_candidates opc
       INNER JOIN synced_open_positions sop ON sop.upstream_id = opc.open_position_id
       WHERE ${whereSql}
       ORDER BY opc.candidate_name`
    ).all(...params) as ClosedPositionCandidateRow[]

    return { positions, candidates }
  },

  /**
   * V2 Acceptance Rate: Closed positions whose `created` date falls within the
   * given quarter, optionally scoped to a COE. Returns the expanded projection
   * needed for month-cohort grouping, stakeholder dedup, and candidate-level audit.
   *
   * Key differences from getClosedPositionsWithOutcomes:
   * - Filters on `created` (not `closed_date`) — positions are bucketed by the
   *   month they were created, regardless of when they closed.
   * - SELECT includes `stakeholder` and `created` for dedup + cohort axis.
   * - Candidate SELECT includes `candidate_id` for person-level dedup.
   */
  getClosedPositionsByCreatedMonth(opts: {
    year: number
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    coe: string | null
  }): { positions: AcceptancePositionRow[]; candidates: AcceptanceCandidateRow[] } {
    const db = getDatabase()

    // Compute quarter date range from created
    const quarterStartMonth: Record<string, number> = { Q1: 1, Q2: 4, Q3: 7, Q4: 10 }
    const startMonth = quarterStartMonth[opts.quarter]
    const pad = (n: number) => String(n).padStart(2, '0')
    const startDate = `${opts.year}-${pad(startMonth)}-01`
    const endDateExclusive = opts.quarter === 'Q4'
      ? `${opts.year + 1}-01-01`
      : `${opts.year}-${pad(startMonth + 3)}-01`

    const where = [
      "sop.position_status LIKE 'Closed%'",
      'sop.created IS NOT NULL',
      'sop.created >= ?',
      'sop.created < ?',
    ]
    const params: (string | number)[] = [startDate, endDateExclusive]
    if (opts.coe) {
      where.push('sop.coe = ?')
      params.push(opts.coe)
    }
    const whereSql = where.join(' AND ')

    const positions = db.prepare(
      `SELECT sop.id, sop.upstream_id, sop.position_status, sop.account,
              sop.stakeholder, sop.coe, sop.practice, sop.job_title,
              sop.main_skill, sop.created, sop.closed_date
       FROM synced_open_positions sop
       WHERE ${whereSql}
       ORDER BY sop.created DESC`
    ).all(...params) as AcceptancePositionRow[]

    if (positions.length === 0) return { positions, candidates: [] }

    const candidates = db.prepare(
      `SELECT opc.open_position_id, opc.candidate_requisition_id, opc.candidate_id,
              opc.candidate_name, opc.main_skill, opc.candidate_status,
              opc.rate, opc.start_date, opc.is_employee
       FROM open_position_candidates opc
       INNER JOIN synced_open_positions sop ON sop.upstream_id = opc.open_position_id
       WHERE ${whereSql}
       ORDER BY opc.candidate_name`
    ).all(...params) as AcceptanceCandidateRow[]

    return { positions, candidates }
  },

  getOpenPositionSyncStatus(): { total: number; lastSyncedAt: string | null } {
    const db = getDatabase()
    const total = (db.prepare(
      "SELECT COUNT(*) as c FROM synced_open_positions WHERE position_status IN ('Active', 'Draft')"
    ).get() as { c: number }).c
    const latest = db.prepare(
      "SELECT MAX(synced_at) as latest FROM synced_open_positions WHERE position_status IN ('Active', 'Draft')"
    ).get() as { latest: string | null }
    return { total, lastSyncedAt: latest?.latest ?? null }
  },

  getFillRateData(opts: {
    startDate: string
    endDate: string
    coe: string | null
    includeActive: boolean
  }): { coe: string; position_status: string; closed_date: string | null; created: string | null }[] {
    const db = getDatabase()
    const conditions: string[] = []
    const params: unknown[] = []

    if (opts.includeActive) {
      conditions.push(`(
        (position_status LIKE 'Closed%' AND closed_date >= ? AND closed_date <= ?)
        OR
        (position_status IN ('Active', 'Draft') AND created >= ? AND created <= ?)
      )`)
      params.push(opts.startDate, opts.endDate, opts.startDate, opts.endDate)
    } else {
      conditions.push(`position_status LIKE 'Closed%'`)
      conditions.push(`closed_date >= ?`)
      conditions.push(`closed_date <= ?`)
      params.push(opts.startDate, opts.endDate)
    }

    if (opts.coe) {
      conditions.push(`coe = ?`)
      params.push(opts.coe)
    }

    const sql = `
      SELECT coe, position_status, closed_date, created
      FROM synced_open_positions
      WHERE ${conditions.join(' AND ')}
      ORDER BY coe
    `
    return db.prepare(sql).all(...params) as { coe: string; position_status: string; closed_date: string | null; created: string | null }[]
  },

  upsertDiscussion(data: Omit<OpenPositionDiscussionRow, 'id'>): number {
    const db = getDatabase()
    try {
      const result = db.prepare(DISCUSSION_UPSERT).run(data)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error(`upsertDiscussion failed for position=${data.open_position_id} comment=${data.comment_id}`, err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  },

  getDiscussionsByPositionId(positionId: number): OpenPositionDiscussionRow[] {
    const db = getDatabase()
    return db.prepare(
      'SELECT * FROM open_position_discussions WHERE open_position_id = ? ORDER BY date DESC'
    ).all(positionId) as OpenPositionDiscussionRow[]
  },

  getDiscussionsByPositionIds(positionIds: number[]): Map<number, OpenPositionDiscussionRow[]> {
    const db = getDatabase()
    const result = new Map<number, OpenPositionDiscussionRow[]>()
    if (positionIds.length === 0) return result

    const placeholders = positionIds.map(() => '?').join(',')
    const rows = db.prepare(
      `SELECT * FROM open_position_discussions WHERE open_position_id IN (${placeholders}) ORDER BY date DESC`
    ).all(...positionIds) as OpenPositionDiscussionRow[]

    for (const row of rows) {
      const existing = result.get(row.open_position_id) ?? []
      existing.push(row)
      result.set(row.open_position_id, existing)
    }
    return result
  },

  clearDiscussions(positionId: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM open_position_discussions WHERE open_position_id = ?').run(positionId)
  },

  upsertProjectReallocation(data: Omit<SyncedProjectReallocationRow, 'id'>): number {
    const db = getDatabase()
    try {
      const result = db.prepare(PRR_UPSERT).run(data)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error(`upsertProjectReallocation failed for upstream_id=${data.upstream_id}`, err instanceof Error ? err : new Error(String(err)), { upstreamId: data.upstream_id, employee: data.employee })
      throw err
    }
  },

  upsertPrrPresentation(data: Omit<PrrPresentationRow, 'id'>): number {
    const db = getDatabase()
    try {
      const result = db.prepare(PRR_PRESENTATION_UPSERT).run(data)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error(`upsertPrrPresentation failed for prr_id=${data.prr_id} op_id=${data.open_position_id}`, err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  },

  getAllProjectReallocations(limit = 500, offset = 0): SyncedProjectReallocationRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_project_reallocations ORDER BY employee LIMIT ? OFFSET ?').all(limit, offset) as SyncedProjectReallocationRow[]
  },

  getPrrPresentationsByPrrId(prrId: number): PrrPresentationRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM prr_presentations WHERE prr_id = ? ORDER BY presented_on DESC').all(prrId) as PrrPresentationRow[]
  },

  getPrrPresentationCount(prrId: number): number {
    const db = getDatabase()
    return (db.prepare('SELECT COUNT(*) as c FROM prr_presentations WHERE prr_id = ?').get(prrId) as { c: number }).c
  },

  /**
   * Mark a position Closed. Pass `closedDate = null` when the real upstream close
   * date is unknown (e.g. absence-detected closures) — never fake it with the
   * sync-run timestamp, or the Acceptance Rate report buckets it in the wrong quarter.
   */
  markPositionClosed(upstreamId: number, closedDate: string | null): void {
    const db = getDatabase()
    db.prepare(
      "UPDATE synced_open_positions SET position_status = 'Closed', closed_date = ? WHERE upstream_id = ?"
    ).run(closedDate, upstreamId)
  },

  deleteOpenPosition(upstreamId: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM open_position_discussions WHERE open_position_id = ?').run(upstreamId)
    db.prepare('DELETE FROM open_position_candidates WHERE open_position_id = ?').run(upstreamId)
    db.prepare('DELETE FROM synced_open_positions WHERE upstream_id = ?').run(upstreamId)
  },

  upsertSyncFailed(table: 'synced_employees' | 'synced_candidates' | 'synced_open_positions', data: {
    upstream_id: number
    full_name: string
    status: string
    status_reason: string
  }): void {
    const db = getDatabase()
    const existing = db.prepare(`SELECT id FROM ${table} WHERE upstream_id = ?`).get(data.upstream_id) as { id: number } | undefined
    if (existing) {
      db.prepare(`UPDATE ${table} SET status = ?, status_reason = ? WHERE id = ?`).run(data.status, data.status_reason, existing.id)
    } else {
      const now = new Date().toISOString()
      if (table === 'synced_employees') {
        db.prepare(`INSERT INTO synced_employees (upstream_id, full_name, email, seniority, main_skill, country, has_resume, is_bench, job_title, status, status_reason, synced_at) VALUES (?, ?, '', '', '', '', 0, 0, '', ?, ?, ?)`).run(data.upstream_id, data.full_name, data.status, data.status_reason, now)
      } else if (table === 'synced_candidates') {
        db.prepare(`INSERT INTO synced_candidates (upstream_id, full_name, email, has_resume, coe_certified, status, status_reason, synced_at) VALUES (?, ?, '', 0, 0, ?, ?, ?)`).run(data.upstream_id, data.full_name, data.status, data.status_reason, now)
      } else {
        db.prepare(`INSERT INTO synced_open_positions (upstream_id, account, coe, practice, stakeholder, main_skill, countries, seniorities, available_range, account_overview, job_description, job_title, position_status, aging, status, status_reason, synced_at) VALUES (?, ?, '', '', '', '', '', '', '', '', '', '', 'Active', 0, ?, ?, ?)`).run(data.upstream_id, data.full_name, data.status, data.status_reason, now)
      }
    }
  },

  getFailedRecords(table: 'synced_employees' | 'synced_candidates' | 'synced_open_positions'): Array<{
    id: number
    upstream_id: number
    full_name: string
    status: string
    status_reason: string | null
    has_resume: number
    resume_note_id: number | null
    resume_filename: string | null
  }> {
    const db = getDatabase()
    if (table === 'synced_open_positions') {
      return db.prepare(
        `SELECT id, upstream_id, account AS full_name, status, status_reason, 0 AS has_resume, NULL AS resume_note_id, NULL AS resume_filename
         FROM synced_open_positions
         WHERE status IN ('sync_failed', 'extract_failed', 'vectorize_failed', 'incomplete')`
      ).all() as Array<{
        id: number
        upstream_id: number
        full_name: string
        status: string
        status_reason: string | null
        has_resume: number
        resume_note_id: number | null
        resume_filename: string | null
      }>
    }
    return db.prepare(
      `SELECT id, upstream_id, full_name, status, status_reason, has_resume, resume_note_id, resume_filename
       FROM ${table}
       WHERE status IN ('sync_failed', 'extract_failed', 'vectorize_failed', 'incomplete')`
    ).all() as Array<{
      id: number
      upstream_id: number
      full_name: string
      status: string
      status_reason: string | null
      has_resume: number
      resume_note_id: number | null
      resume_filename: string | null
    }>
  },

  getRetryableRecords(table: 'synced_employees' | 'synced_candidates'): Array<{
    id: number
    upstream_id: number
    full_name: string
    status: string
    status_reason: string | null
    has_resume: number
    resume_note_id: number | null
    resume_filename: string | null
  }> {
    const db = getDatabase()
    const sourceType = table === 'synced_employees' ? 'employees' : 'candidates'
    return db.prepare(
      `SELECT se.id, se.upstream_id, se.full_name, se.status, se.status_reason,
              se.has_resume, se.resume_note_id, se.resume_filename
       FROM ${table} se
       WHERE se.status IN ('sync_failed', 'extract_failed', 'vectorize_failed', 'incomplete')
          OR (se.status = 'extracted' AND EXISTS (
              SELECT 1 FROM resume_embeddings re
              WHERE re.source_type = ? AND re.source_id = se.id
                AND re.resume_text IS NOT NULL AND re.embedding IS NULL
          ))`
    ).all(sourceType) as Array<{
      id: number
      upstream_id: number
      full_name: string
      status: string
      status_reason: string | null
      has_resume: number
      resume_note_id: number | null
      resume_filename: string | null
    }>
  },

  updateResumeFields(
    id: number,
    fields: {
      has_resume: number
      resume_note_id: number | null
      resume_date_created: string | null
      resume_filename: string | null
      status: string
      status_reason: string | null
      synced_at: string
    }
  ): void {
    const db = getDatabase()
    db.prepare(`
      UPDATE synced_candidates
      SET has_resume = ?, resume_note_id = ?, resume_date_created = ?,
          resume_filename = ?, status = ?, status_reason = ?, synced_at = ?
      WHERE id = ?
    `).run(
      fields.has_resume, fields.resume_note_id, fields.resume_date_created,
      fields.resume_filename, fields.status, fields.status_reason, fields.synced_at, id
    )
  },

  findPositionsByUpstreamIds(upstreamIds: number[]): Map<number, SyncedOpenPositionRow> {
    if (upstreamIds.length === 0) return new Map()
    const db = getDatabase()
    const placeholders = upstreamIds.map(() => '?').join(',')
    const rows = db.prepare(
      `SELECT * FROM synced_open_positions WHERE upstream_id IN (${placeholders})`
    ).all(...upstreamIds) as SyncedOpenPositionRow[]
    const map = new Map<number, SyncedOpenPositionRow>()
    for (const row of rows) {
      map.set(row.upstream_id, row)
    }
    return map
  },

  saveSyncMetadata(key: string, value: string): void {
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO sync_metadata (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`
    ).run(key, value, now, value, now)
  },

  getSyncMetadata(key: string): string | null {
    const db = getDatabase()
    const row = db.prepare('SELECT value FROM sync_metadata WHERE key = ?').get(key) as { value: string } | undefined
    return row ? row.value : null
  },

  clearSyncMetadata(key: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM sync_metadata WHERE key = ?').run(key)
  },

  reconcileStatuses(source: 'employees' | 'candidates'): number {
    const db = getDatabase()
    const syncTable = source === 'employees' ? 'synced_employees' : 'synced_candidates'

    const vectorizedFix = db.prepare(`
      UPDATE ${syncTable} SET status = 'vectorized', status_reason = NULL
      WHERE status NOT IN ('vectorized', 'vectorize_failed', 'inactive') AND has_resume = 1
        AND id IN (
          SELECT re.source_id FROM resume_embeddings re
          WHERE re.source_type = ? AND re.embedding IS NOT NULL
            AND re.resume_text IS NOT NULL AND re.resume_text != ''
        )
    `).run(source)

    const extractedFix = db.prepare(`
      UPDATE ${syncTable} SET status = 'extracted', status_reason = NULL
      WHERE status NOT IN ('extracted', 'vectorized', 'extract_failed', 'vectorize_failed', 'inactive') AND has_resume = 1
        AND id IN (
          SELECT re.source_id FROM resume_embeddings re
          WHERE re.source_type = ? AND re.resume_text IS NOT NULL AND re.resume_text != ''
            AND re.embedding IS NULL
        )
    `).run(source)

    const totalFixed = vectorizedFix.changes + extractedFix.changes
    if (totalFixed > 0) {
      log.warn('Reconciled mismatched statuses', {
        source,
        vectorizedFix: vectorizedFix.changes,
        extractedFix: extractedFix.changes,
      })
    }
    return totalFixed
  },

  // ── COE Practice Leads ───────────────────────────────────

  getCoePracticeLeads(): CoePracticeLeadRow[] {
    const db = getDatabase()
    return db.prepare(
      'SELECT * FROM coe_practice_leads WHERE active = 1 ORDER BY display_name'
    ).all() as CoePracticeLeadRow[]
  },

  getAllActivePositionDiscussions(): Map<number, OpenPositionDiscussionRow[]> {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT d.* FROM open_position_discussions d
      INNER JOIN synced_open_positions p ON d.open_position_id = p.upstream_id
      WHERE p.position_status IN ('Active', 'Draft')
      ORDER BY d.date ASC
    `).all() as OpenPositionDiscussionRow[]

    const map = new Map<number, OpenPositionDiscussionRow[]>()
    for (const row of rows) {
      const existing = map.get(row.open_position_id) ?? []
      existing.push(row)
      map.set(row.open_position_id, existing)
    }
    return map
  },

  addCoePracticeLead(data: { display_name: string; email: string; coe: string; practice_id?: number }): CoePracticeLeadRow {
    const db = getDatabase()
    const result = db.prepare(
      'INSERT INTO coe_practice_leads (display_name, email, coe, practice_id) VALUES (?, ?, ?, ?)'
    ).run(data.display_name, data.email, data.coe, data.practice_id ?? null)
    return {
      id: Number(result.lastInsertRowid),
      display_name: data.display_name,
      email: data.email,
      coe: data.coe,
      active: 1,
      practice_id: data.practice_id ?? null,
    }
  },

  deactivateCoePracticeLead(id: number): void {
    const db = getDatabase()
    db.prepare('UPDATE coe_practice_leads SET active = 0 WHERE id = ?').run(id)
  },

  /** Get leads grouped by practice (for bonus report) */
  getLeadsWithPractices(): (CoePracticeLeadRow & { practice_name: string | null; coe_name: string | null })[] {
    const db = getDatabase()
    return db.prepare(`
      SELECT cpl.*, cp.name AS practice_name, cc.name AS coe_name
      FROM coe_practice_leads cpl
      LEFT JOIN catalog_practices cp ON cpl.practice_id = cp.id
      LEFT JOIN catalog_coe_practices ccp ON cp.id = ccp.practice_id
      LEFT JOIN catalog_coes cc ON ccp.coe_id = cc.id
      WHERE cpl.active = 1 AND cpl.practice_id IS NOT NULL
      ORDER BY cc.name, cp.name, cpl.display_name
    `).all() as (CoePracticeLeadRow & { practice_name: string | null; coe_name: string | null })[]
  },

  // ── Placement Margin ──────────────────────────────────────

  upsertPlacementMargin(data: Omit<SyncedPlacementMarginRow, 'id'>): number {
    const db = getDatabase()
    try {
      const result = db.prepare(PLACEMENT_MARGIN_UPSERT).run(data)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error(`upsertPlacementMargin failed for email=${data.email}`, err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  },

  upsertPlacementMarginSummary(data: Omit<SyncedPlacementMarginSummaryRow, 'id'>): number {
    const db = getDatabase()
    try {
      const result = db.prepare(PLACEMENT_MARGIN_SUMMARY_UPSERT).run(data)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error(`upsertPlacementMarginSummary failed for year=${data.year} q=${data.quarter}`, err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  },

  getPlacementMargins(year: number, quarter: number): SyncedPlacementMarginRow[] {
    const db = getDatabase()
    return db.prepare(
      'SELECT * FROM synced_placement_margins WHERE year = ? AND quarter = ?'
    ).all(year, quarter) as SyncedPlacementMarginRow[]
  },

  getPlacementMarginsForYear(year: number): SyncedPlacementMarginRow[] {
    const db = getDatabase()
    return db.prepare(
      'SELECT * FROM synced_placement_margins WHERE year = ?'
    ).all(year) as SyncedPlacementMarginRow[]
  },

  getPlacementMarginSummary(year: number, quarter: number): SyncedPlacementMarginSummaryRow | undefined {
    const db = getDatabase()
    return db.prepare(
      'SELECT * FROM synced_placement_margin_summary WHERE year = ? AND quarter = ?'
    ).get(year, quarter) as SyncedPlacementMarginSummaryRow | undefined
  },

  clearPlacementMargins(year: number, quarter: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM synced_placement_margins WHERE year = ? AND quarter = ?').run(year, quarter)
    db.prepare('DELETE FROM synced_placement_margin_summary WHERE year = ? AND quarter = ?').run(year, quarter)
  },

  clearPlacementMarginsForYear(year: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM synced_placement_margins WHERE year = ?').run(year)
  },

  getPlacementMarginSyncStatus(): { year: number; quarter: number; count: number; synced_at: string }[] {
    const db = getDatabase()
    return db.prepare(`
      SELECT year, quarter, COUNT(*) as count, MAX(synced_at) as synced_at
      FROM synced_placement_margins GROUP BY year, quarter ORDER BY year DESC, quarter DESC
    `).all() as { year: number; quarter: number; count: number; synced_at: string }[]
  },

  // ── Offboarding ─────────────────────────────────────────────

  upsertOffboarding(data: Omit<SyncedOffboardingRow, 'id'>): number {
    const db = getDatabase()
    try {
      const result = db.prepare(OFFBOARDING_UPSERT).run(data)
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error(`upsertOffboarding failed for employee=${data.employee}`, err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  },

  getOffboardingsForYear(year: number): SyncedOffboardingRow[] {
    const db = getDatabase()
    return db.prepare(
      'SELECT * FROM synced_offboardings WHERE year = ?'
    ).all(year) as SyncedOffboardingRow[]
  },

  clearOffboardingsForYear(year: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM synced_offboardings WHERE year = ?').run(year)
  },

  getOffboardingSyncStatusForYear(year: number): { count: number; synced_at: string | null } {
    const db = getDatabase()
    const row = db.prepare(
      'SELECT COUNT(*) as count, MAX(synced_at) as synced_at FROM synced_offboardings WHERE year = ?'
    ).get(year) as { count: number; synced_at: string | null }
    return row ?? { count: 0, synced_at: null }
  },

  // ── GM Overrides (Practice Lead Bonus) ──────────────────────────────

  /** Read all GM overrides for a year as a Map keyed by "employee|date|account". */
  getGmOverrides(year: number): Map<string, number> {
    const db = getDatabase()
    const rows = db.prepare(
      'SELECT employee, offboarding_date, account, gm_override FROM plb_gm_overrides WHERE year = ?'
    ).all(year) as { employee: string; offboarding_date: string | null; account: string | null; gm_override: number }[]
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(`${r.employee}|${r.offboarding_date ?? ''}|${r.account ?? ''}`, r.gm_override)
    }
    return map
  },

  /** Upsert a single GM override (survives re-syncs). */
  upsertGmOverride(year: number, employee: string, offboardingDate: string | null, account: string, gmOverride: number): void {
    const db = getDatabase()
    db.prepare(
      `INSERT INTO plb_gm_overrides (year, employee, offboarding_date, account, gm_override, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(year, employee, offboarding_date, account)
       DO UPDATE SET gm_override = excluded.gm_override, updated_at = excluded.updated_at`
    ).run(year, employee, offboardingDate, account, gmOverride)
  },
}
