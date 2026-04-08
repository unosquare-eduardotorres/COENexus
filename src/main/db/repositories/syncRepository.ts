import { getDatabase } from '../connection'
import { buildUpsertSql } from '../../services/utils/upsertBuilder'

type SyncTable = 'synced_employees' | 'synced_candidates' | 'synced_open_positions'

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
  job_title: string
  status: string
  status_reason: string | null
  failed: number
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
  status: string
  status_reason: string | null
  failed: number
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
  status: string
  status_reason: string | null
  failed: number
  synced_at: string
}

const EMPLOYEE_COLUMNS = [
  'upstream_id', 'full_name', 'email', 'seniority', 'main_skill', 'country',
  'gross_monthly_salary', 'salary_currency', 'last_account', 'last_account_start_date', 'rate',
  'has_resume', 'resume_note_id', 'resume_date_created', 'resume_filename', 'is_bench', 'job_title',
  'status', 'status_reason', 'failed', 'synced_at',
]

const CANDIDATE_COLUMNS = [
  'upstream_id', 'full_name', 'email', 'seniority', 'main_skill', 'country',
  'current_salary', 'salary_currency', 'coe_certified', 'candidate_status', 'last_status_update',
  'salary_expectations', 'salary_expectations_currency', 'has_resume', 'resume_note_id',
  'resume_date_created', 'resume_filename', 'status', 'status_reason', 'failed', 'synced_at',
]

const POSITION_COLUMNS = [
  'upstream_id', 'account', 'coe', 'practice', 'stakeholder', 'main_skill',
  'countries', 'seniorities', 'available_range', 'account_overview', 'job_description', 'job_title',
  'position_status', 'aging', 'created', 'ready_date', 'last_modification', 'sourcing', 'replacement',
  'status', 'status_reason', 'failed', 'synced_at',
]

const EMPLOYEE_UPSERT = buildUpsertSql({ table: 'synced_employees', columns: EMPLOYEE_COLUMNS, conflictColumns: ['upstream_id'] })
const CANDIDATE_UPSERT = buildUpsertSql({ table: 'synced_candidates', columns: CANDIDATE_COLUMNS, conflictColumns: ['upstream_id'] })
const POSITION_UPSERT = buildUpsertSql({ table: 'synced_open_positions', columns: POSITION_COLUMNS, conflictColumns: ['upstream_id'] })

export const syncRepository = {
  upsertEmployee(data: Omit<SyncedEmployeeRow, 'id'>): number {
    const db = getDatabase()
    const result = db.prepare(EMPLOYEE_UPSERT).run(data)
    return Number(result.lastInsertRowid)
  },

  upsertCandidate(data: Omit<SyncedCandidateRow, 'id'>): number {
    const db = getDatabase()
    const result = db.prepare(CANDIDATE_UPSERT).run(data)
    return Number(result.lastInsertRowid)
  },

  upsertOpenPosition(data: Omit<SyncedOpenPositionRow, 'id'>): number {
    const db = getDatabase()
    const result = db.prepare(POSITION_UPSERT).run(data)
    return Number(result.lastInsertRowid)
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
    return db.prepare('SELECT * FROM synced_employees WHERE is_bench = 1 ORDER BY full_name LIMIT ? OFFSET ?').all(limit, offset) as SyncedEmployeeRow[]
  },

  searchEmployees(query: string, limit: number = 50): SyncedEmployeeRow[] {
    const db = getDatabase()
    const pattern = `%${query}%`
    return db.prepare(`
      SELECT * FROM synced_employees
      WHERE full_name LIKE ? OR email LIKE ? OR main_skill LIKE ?
      ORDER BY full_name LIMIT ?
    `).all(pattern, pattern, pattern, limit) as SyncedEmployeeRow[]
  },

  searchCandidates(query: string, limit: number = 50): SyncedCandidateRow[] {
    const db = getDatabase()
    const pattern = `%${query}%`
    return db.prepare(`
      SELECT * FROM synced_candidates
      WHERE full_name LIKE ? OR email LIKE ? OR main_skill LIKE ?
      ORDER BY full_name LIMIT ?
    `).all(pattern, pattern, pattern, limit) as SyncedCandidateRow[]
  },

  updateStatus(table: SyncTable, id: number, status: string, statusReason?: string): void {
    const db = getDatabase()
    db.prepare(`UPDATE ${table} SET status = ?, status_reason = ? WHERE id = ?`).run(status, statusReason ?? null, id)
  },

  markFailed(table: SyncTable, id: number, reason: string): void {
    const db = getDatabase()
    db.prepare(`UPDATE ${table} SET failed = 1, status = 'failed', status_reason = ? WHERE id = ?`).run(reason, id)
  },

  clearTable(dataSource: 'employees' | 'candidates' | 'positions'): void {
    const db = getDatabase()
    const tableMap: Record<string, SyncTable> = {
      employees: 'synced_employees',
      candidates: 'synced_candidates',
      positions: 'synced_open_positions',
    }
    const table = tableMap[dataSource]
    if (table) {
      db.prepare(`DELETE FROM ${table}`).run()
    }
  },

  getCountByStatus(table: SyncTable): { total: number; synced: number; failed: number; processing: number } {
    const db = getDatabase()
    const total = (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c
    const synced = (db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE status = 'synced'`).get() as { c: number }).c
    const failed = (db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE failed = 1`).get() as { c: number }).c
    const processing = (db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE status = 'processing'`).get() as { c: number }).c
    return { total, synced, failed, processing }
  },
}
