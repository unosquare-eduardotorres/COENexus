import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminService } from './adminService'

describe('adminService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getOrgAnalytics', () => {
    it('should return org analytics data', async () => {
      const result = await adminService.getOrgAnalytics()
      expect(result).toBeDefined()
    })
  })

  describe('getPromotionVelocity', () => {
    it('should return array of velocity data points', async () => {
      const result = await adminService.getPromotionVelocity()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getAtRiskCandidates', () => {
    it('should return array of at-risk candidates', async () => {
      const result = await adminService.getAtRiskCandidates()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getSettings', () => {
    it('should return settings with expected shape', async () => {
      const result = await adminService.getSettings()
      expect(result).toHaveProperty('assessmentReminderDays')
      expect(result).toHaveProperty('discussionModerationEnabled')
      expect(result).toHaveProperty('dossierAutoArchiveDays')
      expect(result).toHaveProperty('defaultPageSize')
    })
  })

  describe('saveSettings', () => {
    it('should return result object', async () => {
      const result = await adminService.saveSettings({ assessmentReminderDays: 30 })
      expect(result).toBeDefined()
    })
  })
})
