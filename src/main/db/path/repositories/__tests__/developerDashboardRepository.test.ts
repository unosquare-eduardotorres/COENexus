import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PATH_SCHEMA } from './testPathSchema'
import { developerDashboardRepository } from '../developerDashboardRepository'

let testDb: Database.Database

vi.mock('../../pathConnection', () => ({
  getPathDatabase: () => testDb,
}))

vi.mock('../../../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

function castText(n: number): string {
  const result = testDb.prepare('SELECT CAST(? AS TEXT) AS v').get(n) as { v: string }
  return result.v
}

function seedPathAndEnroll(userId: number, progress = 50, status = 'in_progress'): number {
  const userText = castText(userId)
  const pathResult = testDb.prepare(`
    INSERT INTO learning_paths (path_key, title, summary, difficulty_level, status, created_at, updated_at)
    VALUES (?, 'Test Path', '', 'intermediate', 'active', datetime('now'), datetime('now'))
  `).run(`path-${Date.now()}-${Math.random()}`)
  const pathId = Number(pathResult.lastInsertRowid)

  testDb.prepare(`
    INSERT INTO path_enrollments (user_id, path_id, cohort_key, enrolled_at, status, progress_percent)
    VALUES (?, ?, '', datetime('now'), ?, ?)
  `).run(userText, pathId, status, progress)

  return pathId
}

describe('developerDashboardRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(PATH_SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  it('should return dashboard row with default values when no enrollment data', () => {
    const result = developerDashboardRepository.getByDeveloperId(42)
    expect(result).toBeDefined()
    expect(result?.developer_id).toBe(42)
    expect(result?.completion_percent).toBe(0)
    expect(result?.active_learning_path_id).toBeNull()
    expect(result?.pending_threads).toBe(0)
  })

  it('should return correct completion_percent from path_enrollments', () => {
    seedPathAndEnroll(1, 75)
    seedPathAndEnroll(1, 25)

    const result = developerDashboardRepository.getByDeveloperId(1)
    expect(result?.completion_percent).toBe(50)
  })

  it('should return active_learning_path_id for enrolled developer', () => {
    const pathId = seedPathAndEnroll(5, 30, 'enrolled')

    const result = developerDashboardRepository.getByDeveloperId(5)
    expect(result?.active_learning_path_id).toBe(pathId)
  })

  it('should return pending_threads count from discussion_threads', () => {
    const authorText = castText(10)
    testDb.prepare(`
      INSERT INTO discussion_threads (thread_key, title, context_type, context_id, author_id, status, created_at, updated_at)
      VALUES ('t1', 'Thread 1', 'path', '1', ?, 'open', datetime('now'), datetime('now'))
    `).run(authorText)
    testDb.prepare(`
      INSERT INTO discussion_threads (thread_key, title, context_type, context_id, author_id, status, created_at, updated_at)
      VALUES ('t2', 'Thread 2', 'path', '1', ?, 'open', datetime('now'), datetime('now'))
    `).run(authorText)
    testDb.prepare(`
      INSERT INTO discussion_threads (thread_key, title, context_type, context_id, author_id, status, created_at, updated_at)
      VALUES ('t3', 'Closed', 'path', '1', ?, 'closed', datetime('now'), datetime('now'))
    `).run(authorText)

    const result = developerDashboardRepository.getByDeveloperId(10)
    expect(result?.pending_threads).toBe(2)
  })

  it('should not count threads from other authors', () => {
    const otherAuthor = castText(99)
    testDb.prepare(`
      INSERT INTO discussion_threads (thread_key, title, context_type, context_id, author_id, status, created_at, updated_at)
      VALUES ('t1', 'Other Thread', 'path', '1', ?, 'open', datetime('now'), datetime('now'))
    `).run(otherAuthor)

    const result = developerDashboardRepository.getByDeveloperId(10)
    expect(result?.pending_threads).toBe(0)
  })
})
