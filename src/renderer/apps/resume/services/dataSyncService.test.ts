import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dataSyncService } from './dataSyncService'

describe('dataSyncService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('validateToken', () => {
    it('should return valid true when token is valid', async () => {
      vi.mocked(window.api.sync.validateToken).mockResolvedValue({ valid: true })
      const result = await dataSyncService.validateToken('good-token')
      expect(window.api.sync.validateToken).toHaveBeenCalledWith('good-token')
      expect(result.valid).toBe(true)
    })

    it('should return valid false with error message on invalid token', async () => {
      vi.mocked(window.api.sync.validateToken).mockResolvedValue({ valid: false, error: 'Expired' })
      const result = await dataSyncService.validateToken('bad-token')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle IPC errors gracefully', async () => {
      vi.mocked(window.api.sync.validateToken).mockResolvedValue({ __ipcError: true, message: 'Connection failed' })
      const result = await dataSyncService.validateToken('token')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Connection failed')
    })

    it('should catch thrown errors', async () => {
      vi.mocked(window.api.sync.validateToken).mockRejectedValue(new Error('Network error'))
      const result = await dataSyncService.validateToken('token')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('fetchSyncStatus', () => {
    it('should call sync.getStatus with source', async () => {
      vi.mocked(window.api.sync.getStatus).mockResolvedValue({ total: 100, synced: 80, failed: 5, processing: 15 })
      const result = await dataSyncService.fetchSyncStatus('employees')
      expect(window.api.sync.getStatus).toHaveBeenCalledWith('employees')
      expect(result.totalRecords).toBe(100)
    })
  })

  describe('fetchRecords', () => {
    it('should return mapped records with pipelineStatus', async () => {
      vi.mocked(window.api.sync.getRecords).mockResolvedValue([{ id: 1, status: 'synced', name: 'Alice' }])
      const result = await dataSyncService.fetchRecords('employees')
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('pipelineStatus', 'synced')
    })

    it('should return empty array for non-array response', async () => {
      vi.mocked(window.api.sync.getRecords).mockResolvedValue(null as any)
      const result = await dataSyncService.fetchRecords('employees')
      expect(result).toEqual([])
    })
  })

  describe('clearRecords', () => {
    it('should clear all sources when source is all', async () => {
      await dataSyncService.clearRecords('all')
      expect(window.api.sync.clear).toHaveBeenCalledTimes(3)
    })

    it('should map open-positions to positions', async () => {
      await dataSyncService.clearRecords('open-positions')
      expect(window.api.sync.clear).toHaveBeenCalledWith('positions')
    })
  })

  describe('syncSingleRecord', () => {
    it('should call syncSingle with correct params', async () => {
      vi.mocked(window.api.sync.syncSingle).mockResolvedValue({ id: 1, status: 'synced' } as any)
      const result = await dataSyncService.syncSingleRecord('employees', 'token', 42)
      expect(window.api.sync.syncSingle).toHaveBeenCalledWith({ source: 'employees', token: 'token', upstreamId: 42 })
      expect(result).toHaveProperty('pipelineStatus', 'synced')
    })
  })
})
