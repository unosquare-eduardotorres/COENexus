import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PATH_SCHEMA } from './testPathSchema'
import { dossierRepository } from '../dossierRepository'

let testDb: Database.Database

vi.mock('../../pathConnection', () => ({
  getPathDatabase: () => testDb,
}))

vi.mock('../../../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

function seedDossier(userId: string, overrides: Partial<{
  summary: string
  strengths: string
  growth_areas: string
  recommendations: string
  last_reviewed_at: string | null
}> = {}): number {
  const result = testDb.prepare(`
    INSERT INTO dossiers (user_id, summary, strengths, growth_areas, recommendations, last_reviewed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    userId,
    overrides.summary ?? '',
    overrides.strengths ?? 'Strong in React',
    overrides.growth_areas ?? 'Needs SQL practice',
    overrides.recommendations ?? 'Focus on databases',
    overrides.last_reviewed_at ?? null,
  )
  return Number(result.lastInsertRowid)
}

describe('dossierRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(PATH_SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  describe('list', () => {
    it('should return empty array when no dossiers exist', () => {
      const result = dossierRepository.list({})
      expect(result).toEqual([])
    })

    it('should return dossiers with inferred status', () => {
      seedDossier('1')
      seedDossier('2', { last_reviewed_at: '2024-06-01' })

      const result = dossierRepository.list({})
      expect(result).toHaveLength(2)
      const statuses = result.map(r => r.status)
      expect(statuses).toContain('pending')
      expect(statuses).toContain('reviewed')
    })

    it('should filter by search term', () => {
      seedDossier('100', { summary: 'Frontend developer profile' })
      seedDossier('200', { summary: 'Backend engineer profile' })

      const result = dossierRepository.list({ search: '100' })
      expect(result).toHaveLength(1)
    })

    it('should paginate results', () => {
      for (let i = 1; i <= 5; i++) {
        seedDossier(String(i))
      }

      const page1 = dossierRepository.list({ page: 1, pageSize: 2 })
      expect(page1).toHaveLength(2)

      const page3 = dossierRepository.list({ page: 3, pageSize: 2 })
      expect(page3).toHaveLength(1)
    })
  })

  describe('getById', () => {
    it('should return detail with pending status when last_reviewed_at is null', () => {
      const id = seedDossier('10', { strengths: 'Good communicator' })
      const result = dossierRepository.getById(id)
      expect(result).toBeDefined()
      expect(result?.status).toBe('pending')
      expect(result?.strengths).toBe('Good communicator')
      expect(result?.growth_areas).toBe('Needs SQL practice')
      expect(result?.manager_notes).toBe('Focus on databases')
    })

    it('should return reviewed status when last_reviewed_at is set', () => {
      const id = seedDossier('11', { last_reviewed_at: '2024-06-15T10:00:00Z' })
      const result = dossierRepository.getById(id)
      expect(result?.status).toBe('reviewed')
    })

    it('should return undefined for non-existent id', () => {
      const result = dossierRepository.getById(9999)
      expect(result).toBeUndefined()
    })
  })

  describe('updateStatus', () => {
    it('should set last_reviewed_at and updated_at and return true', () => {
      const id = seedDossier('20')

      const before = testDb.prepare('SELECT last_reviewed_at FROM dossiers WHERE id = ?').get(id) as { last_reviewed_at: string | null }
      expect(before.last_reviewed_at).toBeNull()

      const result = dossierRepository.updateStatus(id, 'reviewed', 1)
      expect(result).toBe(true)

      const after = testDb.prepare('SELECT last_reviewed_at FROM dossiers WHERE id = ?').get(id) as { last_reviewed_at: string | null }
      expect(after.last_reviewed_at).not.toBeNull()
    })

    it('should return false for non-existent id', () => {
      const result = dossierRepository.updateStatus(9999, 'reviewed', 1)
      expect(result).toBe(false)
    })
  })
})
