import { describe, it, expect, vi, beforeEach } from 'vitest'
import { vectorizationConfigService } from './vectorizationConfigService'

describe('vectorizationConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('getConfig', () => {
    it('should return default config when nothing stored', () => {
      const config = vectorizationConfigService.getConfig()
      expect(config.model).toBe('voyage-4-large')
    })

    it('should return stored config from localStorage', () => {
      localStorage.setItem('vectorization_config', JSON.stringify({ model: 'voyage-3-lite' }))
      const config = vectorizationConfigService.getConfig()
      expect(config.model).toBe('voyage-3-lite')
    })

    it('should fallback to default on invalid JSON', () => {
      localStorage.setItem('vectorization_config', 'not-json')
      const config = vectorizationConfigService.getConfig()
      expect(config.model).toBe('voyage-4-large')
    })
  })

  describe('saveModel', () => {
    it('should save model to localStorage', () => {
      vectorizationConfigService.saveModel('voyage-3-lite' as any)
      const stored = JSON.parse(localStorage.getItem('vectorization_config')!)
      expect(stored.model).toBe('voyage-3-lite')
    })
  })

  describe('checkVoyageKey', () => {
    it('should call processing.getVoyageKeyStatus', async () => {
      vi.mocked(window.api.processing.getVoyageKeyStatus).mockResolvedValue({ configured: true, keyCount: 2 })
      const result = await vectorizationConfigService.checkVoyageKey()
      expect(result.configured).toBe(true)
      expect(result.keyCount).toBe(2)
    })

    it('should return configured false on IPC error', async () => {
      vi.mocked(window.api.processing.getVoyageKeyStatus).mockResolvedValue({ __ipcError: true, message: 'fail' } as any)
      const result = await vectorizationConfigService.checkVoyageKey()
      expect(result.configured).toBe(false)
    })
  })

  describe('addVoyageKey', () => {
    it('should call processing.addVoyageKey', async () => {
      vi.mocked(window.api.processing.addVoyageKey).mockResolvedValue({ saved: true })
      const result = await vectorizationConfigService.addVoyageKey('key-123')
      expect(window.api.processing.addVoyageKey).toHaveBeenCalledWith({ apiKey: 'key-123' })
      expect(result.saved).toBe(true)
    })

    it('should throw on IPC error', async () => {
      vi.mocked(window.api.processing.addVoyageKey).mockResolvedValue({ __ipcError: true, message: 'Storage error' } as any)
      await expect(vectorizationConfigService.addVoyageKey('key')).rejects.toThrow('Storage error')
    })
  })

  describe('removeVoyageKey', () => {
    it('should call processing.removeVoyageKey', async () => {
      vi.mocked(window.api.processing.removeVoyageKey).mockResolvedValue({ deleted: true })
      const result = await vectorizationConfigService.removeVoyageKey(0)
      expect(window.api.processing.removeVoyageKey).toHaveBeenCalledWith({ index: 0 })
      expect(result.deleted).toBe(true)
    })
  })
})
