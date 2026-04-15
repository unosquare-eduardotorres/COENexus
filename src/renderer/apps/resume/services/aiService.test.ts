import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aiService } from './aiService'

describe('aiService (renderer)', () => {
  beforeEach(() => { vi.clearAllMocks() })

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
})
