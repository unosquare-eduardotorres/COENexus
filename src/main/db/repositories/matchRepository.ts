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

interface CandidateAnalysisCacheRow {
  id: number
  candidate_upstream_id: number
  candidate_source_type: string
  jd_hash: string
  analysis_json: string
  model_used: string
  created_at: string
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
  rejection_feedback: string
  rejection_comments: string
  rejection_action_date: string | null
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

  updateCandidateRejectionDetails(
    openPositionId: number,
    candidateRequisitionId: number,
    data: { rejection_feedback: string; rejection_comments: string; rejection_action_date: string | null }
  ): void {
    const db = getDatabase()
    db.prepare(`
      UPDATE open_position_candidates
      SET rejection_feedback = @rejection_feedback,
          rejection_comments = @rejection_comments,
          rejection_action_date = @rejection_action_date
      WHERE open_position_id = @openPositionId AND candidate_requisition_id = @candidateRequisitionId
    `).run({ ...data, openPositionId, candidateRequisitionId })
  },

  getOpenPositionCandidateCount(positionId: number): number {
    const db = getDatabase()
    const result = db.prepare(
      'SELECT COUNT(*) as c FROM open_position_candidates WHERE open_position_id = ?'
    ).get(positionId) as { c: number }
    return result.c
  },

  getCachedAnalysis(candidateUpstreamId: number, sourceType: string, jdHash: string): Record<string, unknown> | null {
    const db = getDatabase()
    const row = db.prepare(
      'SELECT analysis_json FROM candidate_analysis_cache WHERE candidate_upstream_id = ? AND candidate_source_type = ? AND jd_hash = ?'
    ).get(candidateUpstreamId, sourceType, jdHash) as { analysis_json: string } | undefined
    if (!row) return null
    return JSON.parse(row.analysis_json) as Record<string, unknown>
  },

  cacheAnalysis(candidateUpstreamId: number, sourceType: string, jdHash: string, analysis: Record<string, unknown>, modelUsed: string): void {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO candidate_analysis_cache (candidate_upstream_id, candidate_source_type, jd_hash, analysis_json, model_used, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(candidate_upstream_id, candidate_source_type, jd_hash) DO UPDATE SET
        analysis_json = excluded.analysis_json,
        model_used = excluded.model_used,
        created_at = excluded.created_at
    `).run(candidateUpstreamId, sourceType, jdHash, JSON.stringify(analysis), modelUsed, new Date().toISOString())
  },

  invalidateCacheForCandidate(candidateUpstreamId: number): number {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM candidate_analysis_cache WHERE candidate_upstream_id = ?').run(candidateUpstreamId)
    return result.changes
  },

  clearAnalysisCache(): { deleted: number } {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM candidate_analysis_cache').run()
    return { deleted: result.changes }
  },

  getAnalysisCacheStats(): { totalEntries: number; oldestEntry: string | null } {
    const db = getDatabase()
    const count = db.prepare('SELECT COUNT(*) as c FROM candidate_analysis_cache').get() as { c: number }
    const oldest = db.prepare('SELECT MIN(created_at) as oldest FROM candidate_analysis_cache').get() as { oldest: string | null }
    return { totalEntries: count.c, oldestEntry: oldest.oldest }
  },

  getFeedbackCatalog(): Record<number, string> {
    const db = getDatabase()
    const rows = db.prepare('SELECT id, label FROM feedback_catalog').all() as { id: number; label: string }[]
    const result: Record<number, string> = {}
    for (const row of rows) result[row.id] = row.label
    return result
  },

  upsertFeedbackCatalog(entries: Map<number, string>): void {
    const db = getDatabase()
    const upsert = db.prepare(`
      INSERT INTO feedback_catalog (id, label, synced_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT (id) DO UPDATE SET
        label = excluded.label,
        synced_at = excluded.synced_at
    `)
    const tx = db.transaction(() => {
      for (const [id, label] of entries) {
        upsert.run(id, label)
      }
    })
    tx()
  },

  getFeedbackCatalogSyncedAt(): string | null {
    const db = getDatabase()
    const row = db.prepare('SELECT MAX(synced_at) as last_sync FROM feedback_catalog').get() as { last_sync: string | null } | undefined
    return row?.last_sync ?? null
  },
}
