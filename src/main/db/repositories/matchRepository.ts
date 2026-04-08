import { getDatabase } from '../connection'

interface MatchSessionRow {
  id: number
  name: string
  match_flow_type: string
  data_source: string
  top_n: number
  search_mode: string
  job_description: string
  jd_source: string
  constraints_json: string | null
  pipeline_stats_json: string | null
  pipeline_stages_json: string | null
  results_json: string | null
  status: string
  created_at: string
  completed_at: string | null
}

interface OpenPositionCandidateRow {
  id: number
  open_position_id: number
  candidate_requisition_id: number
  candidate_id: number
  candidate_name: string
  main_skill: string
  is_employee: number
  candidate_status: string
  rate: number
  start_date: string | null
  synced_at: string
}

export const matchRepository = {
  createSession(data: Omit<MatchSessionRow, 'id'>): number {
    const db = getDatabase()
    const result = db.prepare(`
      INSERT INTO match_sessions (name, match_flow_type, data_source, top_n, search_mode,
        job_description, jd_source, constraints_json, pipeline_stats_json, pipeline_stages_json,
        results_json, status, created_at, completed_at)
      VALUES (@name, @match_flow_type, @data_source, @top_n, @search_mode,
        @job_description, @jd_source, @constraints_json, @pipeline_stats_json, @pipeline_stages_json,
        @results_json, @status, @created_at, @completed_at)
    `).run(data)
    return Number(result.lastInsertRowid)
  },

  updateSession(id: number, data: Partial<Omit<MatchSessionRow, 'id'>>): void {
    const db = getDatabase()
    const fields: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }

    if (fields.length === 0) return
    values.push(id)

    db.prepare(`UPDATE match_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  getSession(id: number): MatchSessionRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM match_sessions WHERE id = ?').get(id) as MatchSessionRow | undefined
  },

  getSessionParsed(id: number): (Omit<MatchSessionRow, 'constraints_json' | 'pipeline_stats_json' | 'pipeline_stages_json' | 'results_json'> & {
    constraints: unknown
    pipelineStats: unknown
    pipelineStages: unknown
    results: unknown
  }) | undefined {
    const row = this.getSession(id)
    if (!row) return undefined
    return {
      ...row,
      constraints: row.constraints_json ? JSON.parse(row.constraints_json) : null,
      pipelineStats: row.pipeline_stats_json ? JSON.parse(row.pipeline_stats_json) : null,
      pipelineStages: row.pipeline_stages_json ? JSON.parse(row.pipeline_stages_json) : null,
      results: row.results_json ? JSON.parse(row.results_json) : null,
    }
  },

  listSessions(limit = 100, offset = 0): MatchSessionRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM match_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as MatchSessionRow[]
  },

  deleteSession(id: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM match_sessions WHERE id = ?').run(id)
  },

  upsertOpenPositionCandidate(data: Omit<OpenPositionCandidateRow, 'id'>): number {
    const db = getDatabase()
    const result = db.prepare(`
      INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id,
        candidate_name, main_skill, is_employee, candidate_status, rate, start_date, synced_at)
      VALUES (@open_position_id, @candidate_requisition_id, @candidate_id,
        @candidate_name, @main_skill, @is_employee, @candidate_status, @rate, @start_date, @synced_at)
      ON CONFLICT(open_position_id, candidate_requisition_id) DO UPDATE SET
        candidate_id = excluded.candidate_id, candidate_name = excluded.candidate_name,
        main_skill = excluded.main_skill, is_employee = excluded.is_employee,
        candidate_status = excluded.candidate_status, rate = excluded.rate,
        start_date = excluded.start_date, synced_at = excluded.synced_at
    `).run(data)
    return Number(result.lastInsertRowid)
  },

  getOpenPositionCandidates(positionId: number): OpenPositionCandidateRow[] {
    const db = getDatabase()
    return db.prepare(
      'SELECT * FROM open_position_candidates WHERE open_position_id = ? ORDER BY candidate_name'
    ).all(positionId) as OpenPositionCandidateRow[]
  },

  getOpenPositionCandidateCount(positionId: number): number {
    const db = getDatabase()
    const result = db.prepare(
      'SELECT COUNT(*) as c FROM open_position_candidates WHERE open_position_id = ?'
    ).get(positionId) as { c: number }
    return result.c
  },
}
