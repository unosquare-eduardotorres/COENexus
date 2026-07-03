import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prrService } from './prrService'

describe('prrService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getAll', () => {
    it('should call prr.getAll', async () => {
      vi.mocked(window.api.prr.getAll).mockResolvedValue([{ id: 1 }] as any)
      const result = await prrService.getAll()
      expect(window.api.prr.getAll).toHaveBeenCalledOnce()
      expect(result).toHaveLength(1)
    })
  })

  describe('getDetail', () => {
    it('should call prr.getDetail with upstream id', async () => {
      vi.mocked(window.api.prr.getDetail).mockResolvedValue({ upstreamId: 42, candidateName: 'Alice' } as any)
      const result = await prrService.getDetail(42)
      expect(window.api.prr.getDetail).toHaveBeenCalledWith(42)
      expect(result?.candidateName).toBe('Alice')
    })
  })

  describe('updateCoeStatus', () => {
    it('should call prr.updateCoeStatus', async () => {
      vi.mocked(window.api.prr.updateCoeStatus).mockResolvedValue({ updated: true })
      const result = await prrService.updateCoeStatus(1, 'approved' as any)
      expect(window.api.prr.updateCoeStatus).toHaveBeenCalledWith(1, 'approved')
      expect(result.updated).toBe(true)
    })
  })

  describe('addComment', () => {
    it('should call prr.addComment', async () => {
      vi.mocked(window.api.prr.addComment).mockResolvedValue({ comments: [{ text: 'Good', author: 'Admin', createdAt: '2024-01-01' }] })
      const result = await prrService.addComment(1, 'Good', 'Admin')
      expect(window.api.prr.addComment).toHaveBeenCalledWith(1, 'Good', 'Admin')
      expect(result.comments).toHaveLength(1)
    })
  })

  describe('delete', () => {
    it('should call prr.delete', async () => {
      vi.mocked(window.api.prr.delete).mockResolvedValue({ deleted: true })
      const result = await prrService.delete(42)
      expect(window.api.prr.delete).toHaveBeenCalledWith(42)
      expect(result.deleted).toBe(true)
    })
  })

  describe('getSyncStatus', () => {
    it('should call prr.getSyncStatus', async () => {
      vi.mocked(window.api.prr.getSyncStatus).mockResolvedValue({ total: 50, lastSyncedAt: '2024-06-01' })
      const result = await prrService.getSyncStatus()
      expect(result.total).toBe(50)
    })
  })
})
