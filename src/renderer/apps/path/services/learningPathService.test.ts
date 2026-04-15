import { describe, it, expect, vi, beforeEach } from 'vitest'
import { learningPathService } from './learningPathService'

describe('learningPathService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('listLearningPaths', () => {
    it('should return fallback data when path API available', async () => {
      const result = await learningPathService.listLearningPaths()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should filter by search term', async () => {
      const all = await learningPathService.listLearningPaths()
      const filtered = await learningPathService.listLearningPaths({ search: 'xyznotexist' })
      expect(filtered.length).toBeLessThanOrEqual(all.length)
    })
  })

  describe('getLearningPath', () => {
    it('should return a career ladder for known id', async () => {
      const all = await learningPathService.listLearningPaths()
      if (all.length > 0) {
        const result = await learningPathService.getLearningPath(all[0].id)
        expect(result).not.toBeNull()
      }
    })

    it('should return null for unknown id', async () => {
      const result = await learningPathService.getLearningPath('nonexistent-999')
      expect(result).toBeNull()
    })
  })

  describe('createLearningPath', () => {
    it('should return an object with id', async () => {
      const result = await learningPathService.createLearningPath({
        title: 'New Path', role: 'Frontend', level: 'senior', ownerId: 1,
      })
      expect(result.id).toBeDefined()
      expect(typeof result.id).toBe('string')
    })
  })

  describe('updateLearningPath', () => {
    it('should return result object', async () => {
      const result = await learningPathService.updateLearningPath({ id: 'ladder-1', title: 'Updated' })
      expect(result).toBeDefined()
    })
  })

  describe('deleteLearningPath', () => {
    it('should return result object', async () => {
      const result = await learningPathService.deleteLearningPath('ladder-1')
      expect(result).toBeDefined()
    })
  })

  describe('listPractices', () => {
    it('should return array of practices', async () => {
      const result = await learningPathService.listPractices()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('listMainSkills', () => {
    it('should return array of skills', async () => {
      const result = await learningPathService.listMainSkills()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
