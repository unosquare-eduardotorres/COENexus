import { getAgentsDatabase } from '../agentsConnection'

export type PatternApprovalStatus = 'auto_applied' | 'pending_review'

export interface LearnedPatternRow {
  id: string
  pattern_name: string
  pattern_text: string
  confidence_score: number
  usage_count: number
  is_active: number
  approval_status: PatternApprovalStatus
  account: string | null
  stakeholder: string | null
  source_agent: string
  data_points_count: number
  created_at: string
  updated_at: string
}

export interface PatternApplicationRow {
  id: string
  pattern_id: string
  job_id: string | null
  report_id: string | null
  candidate_id: string | null
  applied_at: string
  outcome: string | null
  details: string
  created_at: string
}

export interface SkipFeedbackRow {
  id: string
  candidate_id: string
  reason: string
  notes: string | null
  created_at: string
}

export interface CreatePatternInput {
  pattern_name: string
  pattern_text: string
  confidence_score?: number
  usage_count?: number
  is_active?: number
  approval_status?: PatternApprovalStatus
  account?: string | null
  stakeholder?: string | null
  source_agent?: string
  data_points_count?: number
}

export interface UpdatePatternInput {
  pattern_name?: string
  pattern_text?: string
  confidence_score?: number
  usage_count?: number
  is_active?: number
  approval_status?: PatternApprovalStatus
  account?: string | null
  stakeholder?: string | null
  source_agent?: string
  data_points_count?: number
}

export interface CreatePatternApplicationInput {
  pattern_id: string
  job_id?: string | null
  report_id?: string | null
  candidate_id?: string | null
  outcome?: string | null
  details?: string
}

export interface CreateSkipFeedbackInput {
  candidate_id: string
  reason: string
  notes?: string | null
}

export const patternRepository = {
  listPatterns(): LearnedPatternRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM learned_patterns
      ORDER BY confidence_score DESC, updated_at DESC
    `).all() as LearnedPatternRow[]
  },

  getPatternById(id: string): LearnedPatternRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare('SELECT * FROM learned_patterns WHERE id = ?').get(id) as LearnedPatternRow | undefined
  },

  createPattern(input: CreatePatternInput): LearnedPatternRow {
    const db = getAgentsDatabase()
    return db.prepare(`
      INSERT INTO learned_patterns (
        pattern_name, pattern_text, confidence_score, usage_count, is_active,
        approval_status, account, stakeholder, source_agent, data_points_count, updated_at
      ) VALUES (
        @pattern_name, @pattern_text, @confidence_score, @usage_count, @is_active,
        @approval_status, @account, @stakeholder, @source_agent, @data_points_count, datetime('now')
      )
      RETURNING *
    `).get({
      pattern_name: input.pattern_name,
      pattern_text: input.pattern_text,
      confidence_score: input.confidence_score ?? 0,
      usage_count: input.usage_count ?? 0,
      is_active: input.is_active ?? 1,
      approval_status: input.approval_status ?? 'pending_review',
      account: input.account ?? null,
      stakeholder: input.stakeholder ?? null,
      source_agent: input.source_agent ?? 'scout9',
      data_points_count: input.data_points_count ?? 0,
    }) as LearnedPatternRow
  },

  updatePattern(id: string, input: UpdatePatternInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    values.push(id)
    const result = db.prepare(`
      UPDATE learned_patterns
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)
    return result.changes > 0
  },

  deletePattern(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM learned_patterns WHERE id = ?').run(id)
    return result.changes > 0
  },

  incrementUsage(patternId: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare(`
      UPDATE learned_patterns
      SET usage_count = usage_count + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(patternId)
    return result.changes > 0
  },

  createApplication(input: CreatePatternApplicationInput): PatternApplicationRow {
    const db = getAgentsDatabase()
    return db.prepare(`
      INSERT INTO pattern_applications (
        pattern_id, job_id, report_id, candidate_id, applied_at, outcome, details
      ) VALUES (
        @pattern_id, @job_id, @report_id, @candidate_id, datetime('now'), @outcome, @details
      )
      RETURNING *
    `).get({
      pattern_id: input.pattern_id,
      job_id: input.job_id ?? null,
      report_id: input.report_id ?? null,
      candidate_id: input.candidate_id ?? null,
      outcome: input.outcome ?? null,
      details: input.details ?? '',
    }) as PatternApplicationRow
  },

  listApplicationsByPattern(patternId: string, limit = 100, offset = 0): PatternApplicationRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM pattern_applications
      WHERE pattern_id = ?
      ORDER BY applied_at DESC
      LIMIT ? OFFSET ?
    `).all(patternId, limit, offset) as PatternApplicationRow[]
  },

  createSkipFeedback(input: CreateSkipFeedbackInput): SkipFeedbackRow {
    const db = getAgentsDatabase()
    return db.prepare(`
      INSERT INTO skip_feedback (
        candidate_id, reason, notes
      ) VALUES (
        @candidate_id, @reason, @notes
      )
      RETURNING *
    `).get({
      candidate_id: input.candidate_id,
      reason: input.reason,
      notes: input.notes ?? null,
    }) as SkipFeedbackRow
  },

  listSkipFeedbackByCandidate(candidateId: string): SkipFeedbackRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM skip_feedback
      WHERE candidate_id = ?
      ORDER BY created_at DESC
    `).all(candidateId) as SkipFeedbackRow[]
  },

  listPatternsByAccount(account: string): LearnedPatternRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM learned_patterns
      WHERE account = ?
      ORDER BY confidence_score DESC, updated_at DESC
    `).all(account) as LearnedPatternRow[]
  },

  listPatternsByApprovalStatus(status: PatternApprovalStatus): LearnedPatternRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM learned_patterns
      WHERE approval_status = ?
      ORDER BY confidence_score DESC, updated_at DESC
    `).all(status) as LearnedPatternRow[]
  },

  listPatternsBySourceAgent(sourceAgent: string): LearnedPatternRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM learned_patterns
      WHERE source_agent = ?
      ORDER BY confidence_score DESC, updated_at DESC
    `).all(sourceAgent) as LearnedPatternRow[]
  },
}
