import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aiService } from './aiService'

// Stub localStorage for environments where jsdom doesn't provide it
const localStorageMap = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => localStorageMap.get(key) ?? null,
    setItem: (key: string, value: string) => localStorageMap.set(key, value),
    removeItem: (key: string) => localStorageMap.delete(key),
    clear: () => localStorageMap.clear(),
  },
  writable: true,
  configurable: true,
})

describe('aiService (renderer)', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorageMap.clear() })

  describe('checkConnection', () => {
    it('should return true when available', async () => {
      vi.mocked(window.api.ai.checkConnection).mockResolvedValue({ available: true })
      const result = await aiService.checkConnection()
      expect(window.api.ai.checkConnection).toHaveBeenCalledOnce()
      expect(result).toBe(true)
    })

    it('should return false when not available', async () => {
      vi.mocked(window.api.ai.checkConnection).mockResolvedValue({ available: false })
      const result = await aiService.checkConnection()
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      vi.mocked(window.api.ai.checkConnection).mockRejectedValue(new Error('fail'))
      const result = await aiService.checkConnection()
      expect(result).toBe(false)
    })
  })

  describe('getConfig', () => {
    it('should return stored config from localStorage', () => {
      const config = aiService.getConfig()
      expect(config).toHaveProperty('model')
    })
  })

  describe('extractResumeData', () => {
    it('should surface IPC error message instead of crashing on [0] access', async () => {
      vi.mocked(window.api.ai.chat).mockResolvedValue({
        __ipcError: true,
        message: 'Claude API unavailable',
        channel: 'ai:chat',
      } as any)

      await expect(
        aiService.extractResumeData('resume text', 'test.pdf')
      ).rejects.toThrow('Resume extraction failed: Claude API unavailable')
    })

    it('should return extracted resume when AI call succeeds', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              candidateName: 'Jane Doe',
              email: 'jane@example.com',
              phone: '555-1234',
              location: 'Austin, TX',
              summary: 'Senior engineer',
              experience: [],
              education: [],
              skills: [],
              certifications: [],
            }),
          },
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }
      vi.mocked(window.api.ai.chat).mockResolvedValue(mockResponse as any)

      const result = await aiService.extractResumeData('resume text', 'test.pdf')
      expect(result.resume.candidateName).toBe('Jane Doe')
      expect(result.metrics.extractionTokens).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      })
    })
  })
})
