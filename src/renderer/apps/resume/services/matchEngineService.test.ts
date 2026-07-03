import { describe, it, expect, vi, beforeEach } from 'vitest'
import { matchEngineService } from './matchEngineService'

describe('matchEngineService (renderer)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPoolCounts', () => {
    it('should call window.api.match.getPoolCounts', async () => {
      vi.mocked(window.api.match.getPoolCounts).mockResolvedValue({
        candidates: 100,
        employees: 50,
        positions: 25,
      })

      const result = await matchEngineService.getPoolCounts()

      expect(window.api.match.getPoolCounts).toHaveBeenCalledOnce()
      expect(result).toEqual({ candidates: 100, employees: 50, positions: 25 })
    })
  })

  describe('getFilterOptions', () => {
    it('should call window.api.match.getFilterOptions', async () => {
      const mockOptions = { skills: ['React'], seniorities: ['Senior'], accounts: [] }
      vi.mocked(window.api.match.getFilterOptions).mockResolvedValue(mockOptions)

      const result = await matchEngineService.getFilterOptions()

      expect(window.api.match.getFilterOptions).toHaveBeenCalledOnce()
      expect(result).toEqual(mockOptions)
    })
  })

  describe('getProxyStatus', () => {
    it('should call window.api.match.getProxyStatus', async () => {
      vi.mocked(window.api.match.getProxyStatus).mockResolvedValue({ available: true })

      const result = await matchEngineService.getProxyStatus()

      expect(result).toEqual({ available: true })
    })
  })

  describe('listSessions', () => {
    it('should call window.api.match.listSessions', async () => {
      vi.mocked(window.api.match.listSessions).mockResolvedValue([
        { id: 1, name: 'Test', createdAt: '2026-01-01' },
      ])

      const result = await matchEngineService.listSessions()

      expect(window.api.match.listSessions).toHaveBeenCalledOnce()
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('name', 'Test')
    })
  })

  describe('getSession', () => {
    it('should call window.api.match.getSession with id', async () => {
      vi.mocked(window.api.match.getSession).mockResolvedValue({
        id: 42,
        name: 'Session 42',
        candidates: [],
      })

      const result = await matchEngineService.getSession(42)

      expect(window.api.match.getSession).toHaveBeenCalledWith(42)
      expect(result).toHaveProperty('id', 42)
    })
  })

  describe('getResumeText', () => {
    it('should call window.api.match.getResumeText and unwrap text', async () => {
      vi.mocked(window.api.match.getResumeText).mockResolvedValue({
        text: 'Resume content here',
      })

      const result = await matchEngineService.getResumeText('employees', 1001)

      expect(window.api.match.getResumeText).toHaveBeenCalledWith({
        sourceType: 'employees',
        upstreamId: 1001,
      })
      expect(result).toBe('Resume content here')
    })

    it('should return null when no text available', async () => {
      vi.mocked(window.api.match.getResumeText).mockResolvedValue({ text: null })

      const result = await matchEngineService.getResumeText('candidates', 2001)

      expect(result).toBeNull()
    })
  })

  describe('normalizeConstraints', () => {
    it('should handle null constraints in search', () => {
      const onProgress = vi.fn()
      const cleanup = vi.fn()
      vi.mocked(window.api.match.onSearchEvent).mockReturnValue(cleanup)

      matchEngineService.searchCandidates(
        'React developer',
        'candidates' as any,
        10 as any,
        null,
        onProgress
      )

      expect(window.api.match.search).toHaveBeenCalledWith(
        expect.objectContaining({
          constraints: null,
        })
      )
    })
  })
})
