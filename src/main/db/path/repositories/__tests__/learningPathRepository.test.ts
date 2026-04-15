import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PATH_SCHEMA } from './testPathSchema'
import { learningPathRepository } from '../learningPathRepository'

let testDb: Database.Database

vi.mock('../../pathConnection', () => ({
  getPathDatabase: () => testDb,
}))

vi.mock('../../../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

function seedRole(title: string): number {
  const result = testDb.prepare(
    `INSERT INTO role_catalog (role_key, title) VALUES (?, ?)`
  ).run(title.toLowerCase().replace(/\s+/g, '-'), title)
  return Number(result.lastInsertRowid)
}

function seedPath(overrides: Partial<{
  path_key: string
  title: string
  summary: string
  owner_role_id: number | null
  difficulty_level: string
  status: string
}> = {}): number {
  const result = testDb.prepare(`
    INSERT INTO learning_paths (path_key, title, summary, owner_role_id, difficulty_level, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    overrides.path_key ?? `key-${Date.now()}-${Math.random()}`,
    overrides.title ?? 'Test Path',
    overrides.summary ?? '',
    overrides.owner_role_id ?? null,
    overrides.difficulty_level ?? 'intermediate',
    overrides.status ?? 'draft',
  )
  return Number(result.lastInsertRowid)
}

describe('learningPathRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(PATH_SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  describe('create', () => {
    it('should insert a learning path and return its id', () => {
      const id = learningPathRepository.create({
        title: 'React Mastery',
        role: 'Frontend',
        level: 'intermediate',
        description: 'Learn React deeply',
        ownerId: 1,
      })
      expect(id).toBeGreaterThan(0)
    })

    it('should generate a unique path_key from title', () => {
      const id = learningPathRepository.create({
        title: 'My Path!',
        role: '',
        level: 'beginner',
        ownerId: 0,
      })
      const row = testDb.prepare('SELECT path_key FROM learning_paths WHERE id = ?').get(id) as { path_key: string }
      expect(row.path_key).toMatch(/^my-path-\d+$/)
    })

    it('should resolve role to role_catalog.id when role exists', () => {
      const roleId = seedRole('Backend Developer')
      const id = learningPathRepository.create({
        title: 'Backend Path',
        role: 'Backend Developer',
        level: 'advanced',
        ownerId: 1,
      })
      const row = testDb.prepare('SELECT owner_role_id FROM learning_paths WHERE id = ?').get(id) as { owner_role_id: number | null }
      expect(row.owner_role_id).toBe(roleId)
    })

    it('should set owner_role_id to null when role not found in catalog', () => {
      const id = learningPathRepository.create({
        title: 'Unknown Role Path',
        role: 'NonExistentRole',
        level: 'beginner',
        ownerId: 1,
      })
      const row = testDb.prepare('SELECT owner_role_id FROM learning_paths WHERE id = ?').get(id) as { owner_role_id: number | null }
      expect(row.owner_role_id).toBeNull()
    })
  })

  describe('list', () => {
    it('should return empty array when no paths exist', () => {
      const result = learningPathRepository.list({})
      expect(result).toEqual([])
    })

    it('should return paths sorted by updated_at desc', () => {
      testDb.prepare(`
        INSERT INTO learning_paths (path_key, title, summary, difficulty_level, status, created_at, updated_at)
        VALUES ('a', 'Older', '', 'beginner', 'draft', '2024-01-01', '2024-01-01')
      `).run()
      testDb.prepare(`
        INSERT INTO learning_paths (path_key, title, summary, difficulty_level, status, created_at, updated_at)
        VALUES ('b', 'Newer', '', 'beginner', 'draft', '2024-06-01', '2024-06-01')
      `).run()

      const result = learningPathRepository.list({})
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Newer')
      expect(result[1].title).toBe('Older')
    })

    it('should filter by search term on title', () => {
      seedPath({ path_key: 'react-path', title: 'React Mastery' })
      seedPath({ path_key: 'java-path', title: 'Java Basics' })

      const result = learningPathRepository.list({ search: 'React' })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('React Mastery')
    })

    it('should paginate with page and pageSize', () => {
      for (let i = 0; i < 5; i++) {
        seedPath({ path_key: `path-${i}`, title: `Path ${i}` })
      }

      const page1 = learningPathRepository.list({ page: 1, pageSize: 2 })
      expect(page1).toHaveLength(2)

      const page2 = learningPathRepository.list({ page: 2, pageSize: 2 })
      expect(page2).toHaveLength(2)

      const page3 = learningPathRepository.list({ page: 3, pageSize: 2 })
      expect(page3).toHaveLength(1)
    })

    it('should clamp pageSize between 1 and 200', () => {
      seedPath({ path_key: 'single' })

      const resultMin = learningPathRepository.list({ pageSize: 0 })
      expect(resultMin).toHaveLength(1)

      const resultMax = learningPathRepository.list({ pageSize: 999 })
      expect(resultMax).toHaveLength(1)
    })
  })

  describe('getById', () => {
    it('should return path detail for existing id', () => {
      const id = seedPath({ title: 'Detail Path', summary: 'A summary' })
      const result = learningPathRepository.getById(id)
      expect(result).toBeDefined()
      expect(result?.title).toBe('Detail Path')
      expect(result?.description).toBe('A summary')
    })

    it('should return undefined for non-existent id', () => {
      const result = learningPathRepository.getById(9999)
      expect(result).toBeUndefined()
    })
  })

  describe('listSkills', () => {
    it('should return skill catalog entries', () => {
      testDb.prepare(`
        INSERT INTO skill_catalog (skill_key, display_name, category)
        VALUES ('react', 'React', 'Frontend'), ('node', 'Node.js', 'Backend')
      `).run()

      const pathId = seedPath()
      const skills = learningPathRepository.listSkills(pathId)
      expect(skills).toHaveLength(2)
      expect(skills[0].skill_name).toBe('Node.js')
      expect(skills[1].skill_name).toBe('React')
    })

    it('should return empty array when no skills exist', () => {
      const skills = learningPathRepository.listSkills(1)
      expect(skills).toEqual([])
    })
  })

  describe('update', () => {
    it('should update title and return true', () => {
      const id = seedPath({ title: 'Original' })
      const result = learningPathRepository.update({ id, title: 'Updated' })
      expect(result).toBe(true)

      const updated = learningPathRepository.getById(id)
      expect(updated?.title).toBe('Updated')
    })

    it('should return false for non-existent id', () => {
      const result = learningPathRepository.update({ id: 9999, title: 'Nope' })
      expect(result).toBe(false)
    })

    it('should preserve unchanged fields', () => {
      const id = seedPath({ title: 'Keep Me', summary: 'Keep summary', difficulty_level: 'advanced' })
      learningPathRepository.update({ id, title: 'New Title' })

      const row = testDb.prepare('SELECT summary, difficulty_level FROM learning_paths WHERE id = ?').get(id) as {
        summary: string
        difficulty_level: string
      }
      expect(row.summary).toBe('Keep summary')
      expect(row.difficulty_level).toBe('advanced')
    })
  })

  describe('delete', () => {
    it('should remove path and return true', () => {
      const id = seedPath()
      const result = learningPathRepository.delete(id)
      expect(result).toBe(true)

      const row = testDb.prepare('SELECT id FROM learning_paths WHERE id = ?').get(id)
      expect(row).toBeUndefined()
    })

    it('should return false for non-existent id', () => {
      const result = learningPathRepository.delete(9999)
      expect(result).toBe(false)
    })
  })
})
