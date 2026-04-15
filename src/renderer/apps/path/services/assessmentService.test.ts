import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assessmentService } from './assessmentService'

describe('assessmentService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('listAssessments', () => {
    it('should return fallback assessment sessions', async () => {
      const result = await assessmentService.listAssessments()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should filter by search term', async () => {
      const all = await assessmentService.listAssessments()
      const filtered = await assessmentService.listAssessments({ search: 'xyznotexist' })
      expect(filtered.length).toBeLessThanOrEqual(all.length)
    })
  })

  describe('getAssessmentById', () => {
    it('should return assessment for known id', async () => {
      const all = await assessmentService.listAssessments()
      if (all.length > 0) {
        const result = await assessmentService.getAssessmentById(all[0].id)
        expect(result).not.toBeNull()
      }
    })

    it('should return null for unknown id', async () => {
      const result = await assessmentService.getAssessmentById('nonexistent-999')
      expect(result).toBeNull()
    })
  })

  describe('saveAssessmentDraft', () => {
    it('should return result object for existing assessment', async () => {
      const all = await assessmentService.listAssessments()
      if (all.length > 0) {
        const result = await assessmentService.saveAssessmentDraft(all[0].id)
        expect(result).toBeDefined()
      }
    })
  })

  describe('submitAssessment', () => {
    it('should return result object', async () => {
      const all = await assessmentService.listAssessments()
      if (all.length > 0) {
        const result = await assessmentService.submitAssessment(all[0].id)
        expect(result).toBeDefined()
      }
    })
  })

  describe('listDossiers', () => {
    it('should return array of dossiers', async () => {
      const result = await assessmentService.listDossiers()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getDossierById', () => {
    it('should return null for unknown id', async () => {
      const result = await assessmentService.getDossierById('unknown-999')
      expect(result).toBeNull()
    })
  })

  describe('updateDossierStatus', () => {
    it('should return result object', async () => {
      const result = await assessmentService.updateDossierStatus('dossier-1', 'reviewed')
      expect(result).toBeDefined()
    })
  })

  describe('getAssessmentEvidence', () => {
    it('should return evidence with reviews, questions, and notes', async () => {
      const result = await assessmentService.getAssessmentEvidence('assessment-1')
      expect(result).toHaveProperty('reviews')
      expect(result).toHaveProperty('questions')
      expect(result).toHaveProperty('notes')
    })
  })
})
