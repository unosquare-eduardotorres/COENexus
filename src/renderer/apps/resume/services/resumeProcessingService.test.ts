import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resumeProcessingService } from './resumeProcessingService'

describe('resumeProcessingService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getProcessingStatus', () => {
    it('should call processing.getStatus', async () => {
      vi.mocked(window.api.processing.getStatus).mockResolvedValue({ total: 10, extracted: 5 })
      const result = await resumeProcessingService.getProcessingStatus()
      expect(window.api.processing.getStatus).toHaveBeenCalledOnce()
      expect(result).toEqual({ total: 10, extracted: 5 })
    })
  })

  describe('vectorizeSingle', () => {
    it('should call processing.vectorizeSingle with source and model', async () => {
      vi.mocked(window.api.processing.vectorizeSingle).mockResolvedValue({ success: true })
      const result = await resumeProcessingService.vectorizeSingle('employees', 42)
      expect(window.api.processing.vectorizeSingle).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'employees', upstreamId: 42 })
      )
      expect(result).toEqual({ success: true })
    })
  })
})
