import { getAgentsDatabase } from '../agentsConnection'

export type Scout9ReportStatus = 'draft' | 'published' | 'archived'
export type Scout9CandidateType = 'issue' | 'insight' | 'action'
export type Scout9CandidateStatus = 'pending' | 'approved' | 'rejected' | 'skipped'

export interface AgentReportRow {
  id: string
  job_id: string
  report_title: string
  report_markdown: string
  status: Scout9ReportStatus
  confidence_score: number | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ReportCandidateRow {
  id: string
  report_id: string
  candidate_type: Scout9CandidateType
  title: string
  details: string
  source_ref: string
  status: Scout9CandidateStatus
  confidence_score: number | null
  metadata_json: string
  created_at: string
  updated_at: string
}

export interface CreateReportInput {
  job_id: string
  report_title: string
  report_markdown?: string
  status?: Scout9ReportStatus
  confidence_score?: number | null
}

export interface UpdateReportInput {
  report_title?: string
  report_markdown?: string
  status?: Scout9ReportStatus
  confidence_score?: number | null
  published_at?: string | null
}

export interface CreateReportCandidateInput {
  candidate_type: Scout9CandidateType
  title: string
  details?: string
  source_ref?: string
  status?: Scout9CandidateStatus
  confidence_score?: number | null
  metadata_json?: string
}

export interface UpdateReportCandidateInput {
  title?: string
  details?: string
  source_ref?: string
  status?: Scout9CandidateStatus
  confidence_score?: number | null
  metadata_json?: string
}

export interface CreateReportWithCandidatesInput {
  report: CreateReportInput
  candidates: CreateReportCandidateInput[]
}

export const reportRepository = {
  listReports(limit = 100, offset = 0): AgentReportRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM agent_reports
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as AgentReportRow[]
  },

  getReportById(id: string): AgentReportRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM agent_reports WHERE id = ?').get(id) as AgentReportRow | undefined
  },

  createReport(input: CreateReportInput): AgentReportRow {
    const db = getAgentsDatabase()
    const row = db.prepare(`
      INSERT INTO agent_reports (
        job_id, report_title, report_markdown, status, confidence_score, updated_at
      ) VALUES (
        @job_id, @report_title, @report_markdown, @status, @confidence_score, datetime('now')
      )
      RETURNING *
    `).get({
      job_id: input.job_id,
      report_title: input.report_title,
      report_markdown: input.report_markdown ?? '',
      status: input.status ?? 'draft',
      confidence_score: input.confidence_score ?? null,
    }) as AgentReportRow
    return row
  },

  updateReport(id: string, input: UpdateReportInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    values.push(id)
    const result = db.prepare(`
      UPDATE agent_reports
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)

    return result.changes > 0
  },

  deleteReport(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM agent_reports WHERE id = ?').run(id)
    return result.changes > 0
  },

  listCandidates(reportId: string): ReportCandidateRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM report_candidates
      WHERE report_id = ?
      ORDER BY created_at ASC
    `).all(reportId) as ReportCandidateRow[]
  },

  getCandidateById(id: string): ReportCandidateRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM report_candidates WHERE id = ?').get(id) as ReportCandidateRow | undefined
  },

  createCandidate(reportId: string, input: CreateReportCandidateInput): ReportCandidateRow {
    const db = getAgentsDatabase()
    const row = db.prepare(`
      INSERT INTO report_candidates (
        report_id, candidate_type, title, details, source_ref, status, confidence_score, metadata_json, updated_at
      ) VALUES (
        @report_id, @candidate_type, @title, @details, @source_ref, @status, @confidence_score, @metadata_json, datetime('now')
      )
      RETURNING *
    `).get({
      report_id: reportId,
      candidate_type: input.candidate_type,
      title: input.title,
      details: input.details ?? '',
      source_ref: input.source_ref ?? '',
      status: input.status ?? 'pending',
      confidence_score: input.confidence_score ?? null,
      metadata_json: input.metadata_json ?? '{}',
    }) as ReportCandidateRow
    return row
  },

  updateCandidate(id: string, input: UpdateReportCandidateInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    values.push(id)
    const result = db.prepare(`
      UPDATE report_candidates
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)

    return result.changes > 0
  },

  deleteCandidate(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM report_candidates WHERE id = ?').run(id)
    return result.changes > 0
  },

  createWithCandidates(input: CreateReportWithCandidatesInput): { report: AgentReportRow; candidates: ReportCandidateRow[] } {
    const db = getAgentsDatabase()
    const tx = db.transaction((payload: CreateReportWithCandidatesInput) => {
      const report = db.prepare(`
        INSERT INTO agent_reports (
          job_id, report_title, report_markdown, status, confidence_score, updated_at
        ) VALUES (
          @job_id, @report_title, @report_markdown, @status, @confidence_score, datetime('now')
        )
        RETURNING *
      `).get({
        job_id: payload.report.job_id,
        report_title: payload.report.report_title,
        report_markdown: payload.report.report_markdown ?? '',
        status: payload.report.status ?? 'draft',
        confidence_score: payload.report.confidence_score ?? null,
      }) as AgentReportRow

      const insertCandidate = db.prepare(`
        INSERT INTO report_candidates (
          report_id, candidate_type, title, details, source_ref, status, confidence_score, metadata_json, updated_at
        ) VALUES (
          @report_id, @candidate_type, @title, @details, @source_ref, @status, @confidence_score, @metadata_json, datetime('now')
        )
        RETURNING *
      `)

      const candidates: ReportCandidateRow[] = []
      for (const candidate of payload.candidates) {
        const row = insertCandidate.get({
          report_id: report.id,
          candidate_type: candidate.candidate_type,
          title: candidate.title,
          details: candidate.details ?? '',
          source_ref: candidate.source_ref ?? '',
          status: candidate.status ?? 'pending',
          confidence_score: candidate.confidence_score ?? null,
          metadata_json: candidate.metadata_json ?? '{}',
        }) as ReportCandidateRow
        candidates.push(row)
      }

      return { report, candidates }
    })

    return tx(input)
  },
}
