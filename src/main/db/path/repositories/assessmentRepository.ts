import { getPathDatabase } from '../pathConnection'
import { createLogger } from '../../../services/logger'

const log = createLogger('PathAssessmentRepository')

export interface PathAssessmentSummaryRow {
  id: number
  learning_path_id: number
  title: string
  status: string
  score: number | null
  submitted_at: string | null
  updated_at: string
}

export interface PathAssessmentQuestionRow {
  id: number
  prompt: string
  category: string
  weight: number
}

export interface PathAssessmentAnswerRow {
  question_id: number
  score: number
  notes: string | null
}

export interface SaveAssessmentAnswerInput {
  questionId: number
  score: number
  notes?: string
}

export interface ListAssessmentParams {
  search?: string
  page?: number
  pageSize?: number
}

function normalizePaging(params: ListAssessmentParams): { limit: number; offset: number } {
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 200)
  const page = Math.max(params.page ?? 1, 1)
  return { limit: pageSize, offset: (page - 1) * pageSize }
}

function getOrCreateDraftAttempt(assessmentId: number, userId: string): number {
  const db = getPathDatabase()
  const existing = db.prepare(`
    SELECT id
    FROM assessment_attempts
    WHERE assessment_id = ? AND user_id = ? AND status = 'in_progress'
    ORDER BY started_at DESC
    LIMIT 1
  `).get(assessmentId, userId) as { id: number } | undefined

  if (existing) return existing.id

  const inserted = db.prepare(`
    INSERT INTO assessment_attempts (
      assessment_id, user_id, started_at, status, max_score, passed
    ) VALUES (?, ?, datetime('now'), 'in_progress', 0, 0)
  `).run(assessmentId, userId)

  return Number(inserted.lastInsertRowid)
}

export const assessmentRepository = {
  list(params: ListAssessmentParams): PathAssessmentSummaryRow[] {
    const db = getPathDatabase()
    const { limit, offset } = normalizePaging(params)
    const pattern = `%${params.search?.trim() ?? ''}%`

    return db.prepare(`
      SELECT
        a.id,
        0 AS learning_path_id,
        a.title,
        COALESCE(la.status, 'not_started') AS status,
        la.score AS score,
        la.submitted_at AS submitted_at,
        a.updated_at
      FROM assessments a
      LEFT JOIN (
        SELECT aa1.assessment_id, aa1.status, aa1.score, aa1.submitted_at
        FROM assessment_attempts aa1
        INNER JOIN (
          SELECT assessment_id, MAX(id) AS max_id
          FROM assessment_attempts
          GROUP BY assessment_id
        ) x ON x.assessment_id = aa1.assessment_id AND x.max_id = aa1.id
      ) la ON la.assessment_id = a.id
      WHERE (? = '%%' OR a.title LIKE ? OR a.description LIKE ?)
      ORDER BY a.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(pattern, pattern, pattern, limit, offset) as PathAssessmentSummaryRow[]
  },

  getById(id: number): PathAssessmentSummaryRow | undefined {
    const db = getPathDatabase()
    return db.prepare(`
      SELECT
        a.id,
        0 AS learning_path_id,
        a.title,
        COALESCE(la.status, 'not_started') AS status,
        la.score AS score,
        la.submitted_at AS submitted_at,
        a.updated_at
      FROM assessments a
      LEFT JOIN (
        SELECT aa1.assessment_id, aa1.status, aa1.score, aa1.submitted_at
        FROM assessment_attempts aa1
        INNER JOIN (
          SELECT assessment_id, MAX(id) AS max_id
          FROM assessment_attempts
          GROUP BY assessment_id
        ) x ON x.assessment_id = aa1.assessment_id AND x.max_id = aa1.id
      ) la ON la.assessment_id = a.id
      WHERE a.id = ?
    `).get(id) as PathAssessmentSummaryRow | undefined
  },

  listQuestions(assessmentId: number): PathAssessmentQuestionRow[] {
    const db = getPathDatabase()
    return db.prepare(`
      SELECT
        id,
        question_text AS prompt,
        question_type AS category,
        points AS weight
      FROM assessment_questions
      WHERE assessment_id = ?
      ORDER BY sort_order, id
    `).all(assessmentId) as PathAssessmentQuestionRow[]
  },

  listAnswers(assessmentId: number): PathAssessmentAnswerRow[] {
    const db = getPathDatabase()
    const latestAttempt = db.prepare(`
      SELECT id
      FROM assessment_attempts
      WHERE assessment_id = ?
      ORDER BY COALESCE(submitted_at, started_at) DESC, id DESC
      LIMIT 1
    `).get(assessmentId) as { id: number } | undefined

    if (!latestAttempt) return []

    return db.prepare(`
      SELECT
        question_id,
        points_awarded AS score,
        NULLIF(answer_text, '') AS notes
      FROM assessment_answers
      WHERE attempt_id = ?
      ORDER BY question_id
    `).all(latestAttempt.id) as PathAssessmentAnswerRow[]
  },

  saveDraft(assessmentId: number, answers: SaveAssessmentAnswerInput[]): boolean {
    const db = getPathDatabase()
    const attemptId = getOrCreateDraftAttempt(assessmentId, '0')
    const upsert = db.prepare(`
      INSERT INTO assessment_answers (
        attempt_id, question_id, answer_text, is_correct, points_awarded, created_at
      ) VALUES (?, ?, ?, 0, ?, datetime('now'))
      ON CONFLICT(attempt_id, question_id) DO UPDATE SET
        answer_text = excluded.answer_text,
        points_awarded = excluded.points_awarded
    `)

    const tx = db.transaction((items: SaveAssessmentAnswerInput[]) => {
      for (const answer of items) {
        upsert.run(attemptId, answer.questionId, answer.notes ?? '', answer.score)
      }
    })

    tx(answers)
    return true
  },

  submit(assessmentId: number, reviewerId: number, answers: SaveAssessmentAnswerInput[]): { submitted: boolean; score: number | null } {
    const db = getPathDatabase()
    try {
      const createAttempt = db.prepare(`
        INSERT INTO assessment_attempts (
          assessment_id, user_id, started_at, submitted_at, status, score, max_score, passed
        ) VALUES (?, ?, datetime('now'), datetime('now'), 'submitted', 0, 0, 0)
      `)
      const updateAttempt = db.prepare(`
        UPDATE assessment_attempts
        SET score = ?, max_score = ?, passed = ?, status = 'submitted', submitted_at = datetime('now')
        WHERE id = ?
      `)
      const upsert = db.prepare(`
        INSERT INTO assessment_answers (
          attempt_id, question_id, answer_text, is_correct, points_awarded, created_at
        ) VALUES (?, ?, ?, 0, ?, datetime('now'))
        ON CONFLICT(attempt_id, question_id) DO UPDATE SET
          answer_text = excluded.answer_text,
          points_awarded = excluded.points_awarded
      `)

      const tx = db.transaction((items: SaveAssessmentAnswerInput[]) => {
        const attemptResult = createAttempt.run(assessmentId, String(reviewerId))
        const attemptId = Number(attemptResult.lastInsertRowid)
        let score = 0

        for (const answer of items) {
          score += answer.score
          upsert.run(attemptId, answer.questionId, answer.notes ?? '', answer.score)
        }

        const maxScoreRow = db.prepare(`
          SELECT COALESCE(SUM(points), 0) AS total_points
          FROM assessment_questions
          WHERE assessment_id = ?
        `).get(assessmentId) as { total_points: number }
        const maxScore = Number(maxScoreRow.total_points || 0)
        const passed = maxScore > 0 && score >= maxScore * 0.7 ? 1 : 0

        updateAttempt.run(score, maxScore, passed, attemptId)
        return { submitted: true, score }
      })

      return tx(answers)
    } catch (err) {
      log.error('submit failed', err instanceof Error ? err : new Error(String(err)), { assessmentId, reviewerId })
      throw err
    }
  },
}
