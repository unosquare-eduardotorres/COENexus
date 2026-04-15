import { describe, it, expect, vi, beforeEach } from 'vitest'
import { benchBurnService } from './benchBurnService'

describe('benchBurnService (renderer)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getBenchEmployees', () => {
    it('should call match.getBenchEmployees', async () => {
      vi.mocked(window.api.match.getBenchEmployees).mockResolvedValue([{ id: 1, name: 'Bench Dev' }])
      const result = await benchBurnService.getBenchEmployees()
      expect(window.api.match.getBenchEmployees).toHaveBeenCalledOnce()
      expect(result).toHaveLength(1)
    })
  })

  describe('getAllEmployees', () => {
    it('should call match.getAllEmployees', async () => {
      vi.mocked(window.api.match.getAllEmployees).mockResolvedValue([])
      const result = await benchBurnService.getAllEmployees()
      expect(window.api.match.getAllEmployees).toHaveBeenCalledOnce()
      expect(result).toEqual([])
    })
  })

  describe('getOpenPositions', () => {
    it('should call match.getOpenPositions', async () => {
      vi.mocked(window.api.match.getOpenPositions).mockResolvedValue([{ id: 1 }])
      const result = await benchBurnService.getOpenPositions()
      expect(result).toHaveLength(1)
    })
  })

  describe('getAllCandidates', () => {
    it('should call match.getAllCandidates', async () => {
      vi.mocked(window.api.match.getAllCandidates).mockResolvedValue([])
      await benchBurnService.getAllCandidates()
      expect(window.api.match.getAllCandidates).toHaveBeenCalledOnce()
    })
  })

  describe('searchCandidates', () => {
    it('should call match.searchCandidates with query', async () => {
      vi.mocked(window.api.match.searchCandidates).mockResolvedValue([])
      await benchBurnService.searchCandidates('react')
      expect(window.api.match.searchCandidates).toHaveBeenCalledWith('react')
    })
  })

  describe('searchEmployees', () => {
    it('should call match.searchEmployees with query', async () => {
      vi.mocked(window.api.match.searchEmployees).mockResolvedValue([])
      await benchBurnService.searchEmployees('java')
      expect(window.api.match.searchEmployees).toHaveBeenCalledWith('java')
    })
  })

  describe('getResumeText', () => {
    it('should call match.getResumeText', async () => {
      vi.mocked(window.api.match.getResumeText).mockResolvedValue({ text: 'Resume text' })
      const result = await benchBurnService.getResumeText('employees', 42)
      expect(window.api.match.getResumeText).toHaveBeenCalledWith({ sourceType: 'employees', upstreamId: 42 })
      expect(result).toBe('Resume text')
    })
  })
})
