import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PATH_SCHEMA } from './testPathSchema'
import { assessmentRepository } from '../assessmentRepository'

let testDb: Database.Database

vi.mock('../../pathConnection', () => ({
  getPathDatabase: () => testDb,
}))

vi.mock('../../../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

function seedAssessment(title = 'Test Assessment', totalPoints = 10): number {
  const result = testDb.prepare(`
    INSERT INTO assessments (assessment_key, title, description, assessment_type, total_points, pass_score, is_active, created_at, updated_at)
    VALUES (?, ?, 'desc', 'quiz', ?, 70, 1, datetime('now'), datetime('now'))
  `).run(`key-${Date.now()}-${Math.random()}`, title, totalPoints)
  return Number(result.lastInsertRowid)
}

function seedQuestion(assessmentId: number, text: string, points = 5, sortOrder = 0): number {
  const result = testDb.prepare(`
    INSERT INTO assessment_questions (assessment_id, question_text, question_type, points, sort_order, created_at)
    VALUES (?, ?, 'single_choice', ?, ?, datetime('now'))
  `).run(assessmentId, text, points, sortOrder)
  return Number(result.lastInsertRowid)
}

function seedAttempt(assessmentId: number, userId = '0', status = 'in_progress'): number {
  const result = testDb.prepare(`
    INSERT INTO assessment_attempts (assessment_id, user_id, started_at, status, score, max_score, passed)
    VALUES (?, ?, datetime('now'), ?, 0, 0, 0)
  `).run(assessmentId, userId, status)
  return Number(result.lastInsertRowid)
}

describe('assessmentRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(PATH_SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  describe('list', () => {
    it('should return empty array when no assessments exist', () => {
      const result = assessmentRepository.list({})
      expect(result).toEqual([])
    })

    it('should return assessments with latest attempt status', () => {
      const id = seedAssessment('React Quiz')
      seedAttempt(id, '1', 'submitted')

      const result = assessmentRepository.list({})
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('React Quiz')
      expect(result[0].status).toBe('submitted')
    })

    it('should return not_started status when no attempts', () => {
      seedAssessment('Untouched')

      const result = assessmentRepository.list({})
      expect(result[0].status).toBe('not_started')
    })

    it('should filter by search term', () => {
      seedAssessment('React Quiz')
      seedAssessment('Java Quiz')

      const result = assessmentRepository.list({ search: 'React' })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('React Quiz')
    })

    it('should paginate results', () => {
      for (let i = 0; i < 5; i++) {
        seedAssessment(`Assessment ${i}`)
      }

      const page1 = assessmentRepository.list({ page: 1, pageSize: 2 })
      expect(page1).toHaveLength(2)

      const page3 = assessmentRepository.list({ page: 3, pageSize: 2 })
      expect(page3).toHaveLength(1)
    })
  })

  describe('getById', () => {
    it('should return assessment for existing id', () => {
      const id = seedAssessment('Specific Assessment')
      const result = assessmentRepository.getById(id)
      expect(result).toBeDefined()
      expect(result?.title).toBe('Specific Assessment')
    })

    it('should return undefined for non-existent id', () => {
      const result = assessmentRepository.getById(9999)
      expect(result).toBeUndefined()
    })
  })

  describe('listQuestions', () => {
    it('should return questions ordered by sort_order', () => {
      const assessmentId = seedAssessment()
      seedQuestion(assessmentId, 'Second', 5, 2)
      seedQuestion(assessmentId, 'First', 10, 1)

      const questions = assessmentRepository.listQuestions(assessmentId)
      expect(questions).toHaveLength(2)
      expect(questions[0].prompt).toBe('First')
      expect(questions[1].prompt).toBe('Second')
      expect(questions[0].weight).toBe(10)
    })

    it('should return empty array for assessment with no questions', () => {
      const assessmentId = seedAssessment()
      const questions = assessmentRepository.listQuestions(assessmentId)
      expect(questions).toEqual([])
    })
  })

  describe('listAnswers', () => {
    it('should return answers for latest attempt', () => {
      const assessmentId = seedAssessment()
      const q1 = seedQuestion(assessmentId, 'Q1')
      const attemptId = seedAttempt(assessmentId, '0', 'submitted')

      testDb.prepare(`
        INSERT INTO assessment_answers (attempt_id, question_id, answer_text, is_correct, points_awarded, created_at)
        VALUES (?, ?, 'My answer', 0, 4, datetime('now'))
      `).run(attemptId, q1)

      const answers = assessmentRepository.listAnswers(assessmentId)
      expect(answers).toHaveLength(1)
      expect(answers[0].question_id).toBe(q1)
      expect(answers[0].score).toBe(4)
    })

    it('should return empty when no attempts exist', () => {
      const assessmentId = seedAssessment()
      const answers = assessmentRepository.listAnswers(assessmentId)
      expect(answers).toEqual([])
    })
  })

  describe('saveDraft', () => {
    it('should create draft attempt and save answers', () => {
      const assessmentId = seedAssessment()
      const q1 = seedQuestion(assessmentId, 'Q1')
      const q2 = seedQuestion(assessmentId, 'Q2')

      const result = assessmentRepository.saveDraft(assessmentId, [
        { questionId: q1, score: 3, notes: 'Good' },
        { questionId: q2, score: 5 },
      ])
      expect(result).toBe(true)

      const answers = assessmentRepository.listAnswers(assessmentId)
      expect(answers).toHaveLength(2)
    })

    it('should upsert answers idempotently', () => {
      const assessmentId = seedAssessment()
      const q1 = seedQuestion(assessmentId, 'Q1')

      assessmentRepository.saveDraft(assessmentId, [{ questionId: q1, score: 3 }])
      assessmentRepository.saveDraft(assessmentId, [{ questionId: q1, score: 5, notes: 'Updated' }])

      const answers = assessmentRepository.listAnswers(assessmentId)
      expect(answers).toHaveLength(1)
      expect(answers[0].score).toBe(5)
      expect(answers[0].notes).toBe('Updated')
    })
  })

  describe('submit', () => {
    it('should create submitted attempt and calculate score', () => {
      const assessmentId = seedAssessment()
      const q1 = seedQuestion(assessmentId, 'Q1', 5)
      const q2 = seedQuestion(assessmentId, 'Q2', 5)

      const result = assessmentRepository.submit(assessmentId, 1, [
        { questionId: q1, score: 4 },
        { questionId: q2, score: 5 },
      ])

      expect(result.submitted).toBe(true)
      expect(result.score).toBe(9)
    })

    it('should set passed flag when score is at least 70 percent', () => {
      const assessmentId = seedAssessment()
      const q1 = seedQuestion(assessmentId, 'Q1', 10)

      assessmentRepository.submit(assessmentId, 1, [{ questionId: q1, score: 7 }])

      const attempt = testDb.prepare(`
        SELECT passed FROM assessment_attempts WHERE assessment_id = ? AND status = 'submitted'
        ORDER BY id DESC LIMIT 1
      `).get(assessmentId) as { passed: number }
      expect(attempt.passed).toBe(1)
    })

    it('should not set passed when score is below 70 percent', () => {
      const assessmentId = seedAssessment()
      const q1 = seedQuestion(assessmentId, 'Q1', 10)

      assessmentRepository.submit(assessmentId, 1, [{ questionId: q1, score: 6 }])

      const attempt = testDb.prepare(`
        SELECT passed FROM assessment_attempts WHERE assessment_id = ? AND status = 'submitted'
        ORDER BY id DESC LIMIT 1
      `).get(assessmentId) as { passed: number }
      expect(attempt.passed).toBe(0)
    })

    it('should handle zero-max-score edge case', () => {
      const assessmentId = seedAssessment()

      const result = assessmentRepository.submit(assessmentId, 1, [])
      expect(result.submitted).toBe(true)
      expect(result.score).toBe(0)

      const attempt = testDb.prepare(`
        SELECT passed FROM assessment_attempts WHERE assessment_id = ? AND status = 'submitted'
        ORDER BY id DESC LIMIT 1
      `).get(assessmentId) as { passed: number }
      expect(attempt.passed).toBe(0)
    })
  })
})
