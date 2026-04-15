import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reportService } from './reportService'

describe('reportService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('evaluatePositions', () => {
    it('should call report.evaluatePositions with thresholds', async () => {
      const thresholds = { 'stalled-position': 14 } as any
      vi.mocked(window.api.report.evaluatePositions).mockResolvedValue({ results: [], totalPositions: 0, lastSyncedAt: null })
      const result = await reportService.evaluatePositions(thresholds)
      expect(window.api.report.evaluatePositions).toHaveBeenCalledWith(thresholds)
      expect(result.results).toEqual([])
    })
  })

  describe('getPositionDetail', () => {
    it('should call report.getPositionDetail with upstream id', async () => {
      vi.mocked(window.api.report.getPositionDetail).mockResolvedValue({ position: { id: 1 } } as any)
      const result = await reportService.getPositionDetail(42)
      expect(window.api.report.getPositionDetail).toHaveBeenCalledWith(42)
      expect(result?.position).toBeDefined()
    })

    it('should return null when position not found', async () => {
      vi.mocked(window.api.report.getPositionDetail).mockResolvedValue(null)
      const result = await reportService.getPositionDetail(999)
      expect(result).toBeNull()
    })
  })

  describe('exportCsv', () => {
    it('should call report.exportCsv with results', async () => {
      vi.mocked(window.api.report.exportCsv).mockResolvedValue({ saved: true, filePath: '/tmp/report.csv' })
      const result = await reportService.exportCsv([])
      expect(result.saved).toBe(true)
    })
  })

  describe('getSyncStatus', () => {
    it('should call report.getSyncStatus', async () => {
      vi.mocked(window.api.report.getSyncStatus).mockResolvedValue({ total: 100, lastSyncedAt: '2024-01-01' })
      const result = await reportService.getSyncStatus()
      expect(result.total).toBe(100)
    })
  })

  describe('getFeedbackCatalog', () => {
    it('should call report.getFeedbackCatalog with token', async () => {
      vi.mocked(window.api.report.getFeedbackCatalog).mockResolvedValue({ 1: 'Not a fit' })
      const result = await reportService.getFeedbackCatalog('token-123')
      expect(window.api.report.getFeedbackCatalog).toHaveBeenCalledWith('token-123')
      expect(result[1]).toBe('Not a fit')
    })
  })

  describe('deletePosition', () => {
    it('should call report.deletePosition', async () => {
      vi.mocked(window.api.report.deletePosition).mockResolvedValue({ deleted: true })
      const result = await reportService.deletePosition(42)
      expect(window.api.report.deletePosition).toHaveBeenCalledWith(42)
      expect(result.deleted).toBe(true)
    })
  })
})
