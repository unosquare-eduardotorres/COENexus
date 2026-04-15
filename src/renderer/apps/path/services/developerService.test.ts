import { describe, it, expect, vi, beforeEach } from 'vitest'
import { developerService } from './developerService'

describe('developerService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('listDevelopers', () => {
    it('should return array of developer profiles', async () => {
      const result = await developerService.listDevelopers()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getDeveloperById', () => {
    it('should return developer for known id', async () => {
      const all = await developerService.listDevelopers()
      if (all.length > 0) {
        const result = await developerService.getDeveloperById(all[0].id)
        expect(result).not.toBeNull()
      }
    })

    it('should return null for unknown id', async () => {
      const result = await developerService.getDeveloperById('unknown-999')
      expect(result).toBeNull()
    })
  })

  describe('getDeveloperTeam', () => {
    it('should return array of team members', async () => {
      const result = await developerService.getDeveloperTeam('dev-1')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getDeveloperActivity', () => {
    it('should return array of activity items', async () => {
      const result = await developerService.getDeveloperActivity('dev-1')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('hydrateDeveloperProfile', () => {
    it('should return null for unknown developer', async () => {
      const result = await developerService.hydrateDeveloperProfile('unknown-999')
      expect(result).toBeNull()
    })

    it('should return enriched profile for known developer', async () => {
      const all = await developerService.listDevelopers()
      if (all.length > 0) {
        const result = await developerService.hydrateDeveloperProfile(all[0].id)
        expect(result).not.toBeNull()
      }
    })
  })
})
