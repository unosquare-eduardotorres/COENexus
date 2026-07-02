import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dataSyncService } from './dataSyncService'

describe('dataSyncService (datasync app)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('validateToken', () => {
    it('should return valid true for valid token', async () => {
      vi.mocked(window.api.sync.validateToken).mockResolvedValue({ valid: true })
      const result = await dataSyncService.validateToken('good-token', 'unocore')
      expect(result.valid).toBe(true)
      expect(window.api.sync.validateToken).toHaveBeenCalledWith('good-token', 'unocore')
    })

    it('should pass exec source to validateToken', async () => {
      vi.mocked(window.api.sync.validateToken).mockResolvedValue({ valid: true })
      const result = await dataSyncService.validateToken('exec-token', 'exec')
      expect(result.valid).toBe(true)
      expect(window.api.sync.validateToken).toHaveBeenCalledWith('exec-token', 'exec')
    })

    it('should handle IPC errors gracefully', async () => {
      vi.mocked(window.api.sync.validateToken).mockResolvedValue({ __ipcError: true, message: 'Timeout' })
      const result = await dataSyncService.validateToken('token', 'unocore')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Timeout')
    })

    it('should catch thrown errors', async () => {
      vi.mocked(window.api.sync.validateToken).mockRejectedValue(new Error('Network'))
      const result = await dataSyncService.validateToken('token', 'unocore')
      expect(result.valid).toBe(false)
    })
  })

  describe('fetchSyncStatus', () => {
    it('should return total records from sync.getStatus', async () => {
      vi.mocked(window.api.sync.getStatus).mockResolvedValue({ total: 50, synced: 40, failed: 5, processing: 5 })
      const result = await dataSyncService.fetchSyncStatus('employees')
      expect(result.totalRecords).toBe(50)
    })
  })

  describe('fetchRecords', () => {
    it('should map records with pipelineStatus', async () => {
      vi.mocked(window.api.sync.getRecords).mockResolvedValue([{ id: 1, status: 'synced' }])
      const result = await dataSyncService.fetchRecords('employees')
      expect(result[0]).toHaveProperty('pipelineStatus', 'synced')
    })
  })
})
