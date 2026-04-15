import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessionService } from './sessionService'

describe('sessionService (renderer)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSession', () => {
    it('should call window.api.sessions.create with payload', async () => {
      const mockResponse = {
        id: 1,
        name: 'Test Session',
        contextType: 'resume',
        status: 'active',
        createdAt: '2026-04-14T00:00:00Z',
        updatedAt: '2026-04-14T00:00:00Z',
      }
      vi.mocked(window.api.sessions.create).mockResolvedValue(mockResponse)

      const payload = {
        name: 'Test Session',
        contextType: 'resume',
        processingMode: 'manual',
        refinementMode: 'none',
        status: 'active',
      }

      const result = await sessionService.createSession(payload)

      expect(window.api.sessions.create).toHaveBeenCalledWith(payload)
      expect(result.id).toBe(1)
      expect(result.name).toBe('Test Session')
      expect(result.status).toBe('active')
    })

    it('should pass optional fields correctly', async () => {
      vi.mocked(window.api.sessions.create).mockResolvedValue({
        id: 2,
        name: 'JD Session',
        contextType: 'match',
        status: 'active',
        createdAt: '2026-04-14',
        updatedAt: '2026-04-14',
      })

      const payload = {
        name: 'JD Session',
        contextType: 'match',
        contextId: 42,
        contextName: 'Position X',
        processingMode: 'auto',
        refinementMode: 'ai',
        jobDescription: 'Need a React developer',
        jobDescriptionSource: 'custom',
        status: 'active',
      }

      await sessionService.createSession(payload)

      expect(window.api.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contextId: 42,
          contextName: 'Position X',
          jobDescription: 'Need a React developer',
        })
      )
    })
  })
})
