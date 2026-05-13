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

  markPositionClosed(upstreamId: number, closedDate: string): void {
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
}
