import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetFillRateData = vi.fn()
const mockGetOpenPositionSyncStatus = vi.fn()

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    getFillRateData: (...args: unknown[]) => mockGetFillRateData(...args),
    getOpenPositionSyncStatus: () => mockGetOpenPositionSyncStatus(),
  },
}))

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { fillRateService } from '../fillRateService'
import type { ReportFillRateFilters } from '../../../shared/ipc-types'

function makeFilters(overrides: Partial<ReportFillRateFilters> = {}): ReportFillRateFilters {
  return {
    startDate: '2025-07-01',
    endDate: '2026-06-30',
    coe: 'all',
    includeActive: false,
    ...overrides,
  }
}

function makeRow(overrides: Partial<{ coe: string; position_status: string; closed_date: string | null; created: string | null }> = {}) {
  return {
    coe: 'Software Engineering',
    position_status: 'ClosedWon',
    closed_date: '2025-09-15',
    created: '2025-06-01',
    ...overrides,
  }
}

describe('fillRateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOpenPositionSyncStatus.mockReturnValue({ total: 10, lastSyncedAt: '2026-06-30T12:00:00Z' })
  })

  describe('evaluate', () => {
    it('returns 0% fill rate and empty coes for no data', () => {
      mockGetFillRateData.mockReturnValue([])
      const result = fillRateService.evaluate(makeFilters())

      expect(result.overallFillRate).toBe(0)
      expect(result.overallClosedWon).toBe(0)
      expect(result.overallDenominator).toBe(0)
      expect(result.coes).toEqual([])
      expect(result.trend).toHaveLength(12) // 12 months in window
    })

    it('returns 100% when all positions are ClosedWon', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ coe: 'Software Engineering', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
        makeRow({ coe: 'Software Engineering', position_status: 'ClosedWon', closed_date: '2025-10-20' }),
        makeRow({ coe: 'Software Engineering', position_status: 'ClosedWon', closed_date: '2025-11-05' }),
      ])
      const result = fillRateService.evaluate(makeFilters())

      expect(result.overallFillRate).toBe(100)
      expect(result.overallClosedWon).toBe(3)
      expect(result.overallDenominator).toBe(3)
      expect(result.coes).toHaveLength(1)
      expect(result.coes[0].fillRate).toBe(100)
    })

    it('computes correct percentage for mixed ClosedWon and ClosedLost', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ coe: 'Data', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
        makeRow({ coe: 'Data', position_status: 'ClosedWon', closed_date: '2025-10-01' }),
        makeRow({ coe: 'Data', position_status: 'ClosedLost', closed_date: '2025-11-01' }),
        makeRow({ coe: 'Data', position_status: 'ClosedLostClient', closed_date: '2025-12-01' }),
      ])
      const result = fillRateService.evaluate(makeFilters())

      expect(result.coes).toHaveLength(1)
      expect(result.coes[0].closedWon).toBe(2)
      expect(result.coes[0].closedOther).toBe(2)
      expect(result.coes[0].totalDenominator).toBe(4)
      expect(result.coes[0].fillRate).toBe(50)
    })

    it('includeActive increases denominator and lowers rate', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ coe: 'Software Engineering', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
        makeRow({ coe: 'Software Engineering', position_status: 'ClosedLost', closed_date: '2025-10-01' }),
        makeRow({ coe: 'Software Engineering', position_status: 'Active', closed_date: null, created: '2025-11-01' }),
        makeRow({ coe: 'Software Engineering', position_status: 'Draft', closed_date: null, created: '2025-12-01' }),
      ])
      const result = fillRateService.evaluate(makeFilters({ includeActive: true }))

      expect(result.coes[0].closedWon).toBe(1)
      expect(result.coes[0].activeCount).toBe(2)
      expect(result.coes[0].totalDenominator).toBe(4)
      expect(result.coes[0].fillRate).toBe(25)
    })

    it('scopes to specific COE when coe filter is not "all"', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ coe: 'Quality Engineering', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
      ])
      const result = fillRateService.evaluate(makeFilters({ coe: 'Quality Engineering' }))

      // Verify the repository was called with coe = 'Quality Engineering' (not null)
      expect(mockGetFillRateData).toHaveBeenCalledWith(
        expect.objectContaining({ coe: 'Quality Engineering' })
      )
      expect(result.coes).toHaveLength(1)
      expect(result.coes[0].coe).toBe('Quality Engineering')
    })

    it('passes coe=null to repository when filter is "all"', () => {
      mockGetFillRateData.mockReturnValue([])
      fillRateService.evaluate(makeFilters({ coe: 'all' }))

      expect(mockGetFillRateData).toHaveBeenCalledWith(
        expect.objectContaining({ coe: null })
      )
    })

    it('assigns goal 70 for Quality Engineering', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ coe: 'Quality Engineering', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
      ])
      const result = fillRateService.evaluate(makeFilters())
      expect(result.coes[0].goal).toBe(70)
    })

    it('assigns goal 70 for Quality Assurance', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ coe: 'Quality Assurance', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
      ])
      const result = fillRateService.evaluate(makeFilters())
      expect(result.coes[0].goal).toBe(70)
    })

    it('assigns goal 60 for other COEs', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ coe: 'Software Engineering', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
        makeRow({ coe: 'Data', position_status: 'ClosedWon', closed_date: '2025-10-01' }),
      ])
      const result = fillRateService.evaluate(makeFilters())

      const data = result.coes.find(c => c.coe === 'Data')
      const swe = result.coes.find(c => c.coe === 'Software Engineering')
      expect(data?.goal).toBe(60)
      expect(swe?.goal).toBe(60)
    })

    it('sorts COEs alphabetically', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ coe: 'Software Engineering', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
        makeRow({ coe: 'Data', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
        makeRow({ coe: 'Quality Engineering', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
      ])
      const result = fillRateService.evaluate(makeFilters())

      expect(result.coes.map(c => c.coe)).toEqual(['Data', 'Quality Engineering', 'Software Engineering'])
    })

    it('echoes back filters in the result', () => {
      mockGetFillRateData.mockReturnValue([])
      const filters = makeFilters({ coe: 'Data' })
      const result = fillRateService.evaluate(filters)

      expect(result.filters).toEqual(filters)
    })

    it('includes lastSyncedAt from sync status', () => {
      mockGetFillRateData.mockReturnValue([])
      mockGetOpenPositionSyncStatus.mockReturnValue({ total: 5, lastSyncedAt: '2026-06-15T10:00:00Z' })

      const result = fillRateService.evaluate(makeFilters())
      expect(result.lastSyncedAt).toBe('2026-06-15T10:00:00Z')
    })

    it('treats empty coe as "Unassigned"', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ coe: '', position_status: 'ClosedWon', closed_date: '2025-09-15' }),
      ])
      const result = fillRateService.evaluate(makeFilters())

      expect(result.coes[0].coe).toBe('Unassigned')
    })
  })

  describe('monthly trend', () => {
    it('buckets ClosedWon positions by closed_date month', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ position_status: 'ClosedWon', closed_date: '2025-09-15' }),
        makeRow({ position_status: 'ClosedWon', closed_date: '2025-09-25' }),
        makeRow({ position_status: 'ClosedLost', closed_date: '2025-09-10' }),
        makeRow({ position_status: 'ClosedWon', closed_date: '2025-10-05' }),
      ])
      const result = fillRateService.evaluate(makeFilters())

      const sep = result.trend.find(t => t.month === '2025-09')!
      expect(sep.closedWon).toBe(2)
      expect(sep.totalDenominator).toBe(3)
      // 2/3 = 66.7%
      expect(sep.fillRate).toBe(66.7)

      const oct = result.trend.find(t => t.month === '2025-10')!
      expect(oct.closedWon).toBe(1)
      expect(oct.totalDenominator).toBe(1)
      expect(oct.fillRate).toBe(100)
    })

    it('generates correct number of month points', () => {
      mockGetFillRateData.mockReturnValue([])
      const result = fillRateService.evaluate(makeFilters({
        startDate: '2025-07-01',
        endDate: '2026-06-30',
      }))

      expect(result.trend).toHaveLength(12)
      expect(result.trend[0].month).toBe('2025-07')
      expect(result.trend[0].label).toBe('Jul 2025')
      expect(result.trend[11].month).toBe('2026-06')
      expect(result.trend[11].label).toBe('Jun 2026')
    })

    it('returns 0% for months with no data', () => {
      mockGetFillRateData.mockReturnValue([])
      const result = fillRateService.evaluate(makeFilters())

      for (const point of result.trend) {
        expect(point.fillRate).toBe(0)
        expect(point.closedWon).toBe(0)
        expect(point.totalDenominator).toBe(0)
      }
    })

    it('skips rows with null closed_date for Closed positions', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ position_status: 'ClosedWon', closed_date: null }),
        makeRow({ position_status: 'ClosedWon', closed_date: '2025-09-15' }),
      ])
      const result = fillRateService.evaluate(makeFilters())

      // The null-date row should be in the COE aggregation (it was returned by the query)
      // but NOT in the monthly trend (can't be bucketed)
      expect(result.coes[0].closedWon).toBe(2)

      const sep = result.trend.find(t => t.month === '2025-09')!
      expect(sep.closedWon).toBe(1) // Only the one with a date
    })

    it('buckets Active positions by created date', () => {
      mockGetFillRateData.mockReturnValue([
        makeRow({ position_status: 'Active', closed_date: null, created: '2025-09-15' }),
        makeRow({ position_status: 'ClosedWon', closed_date: '2025-09-20' }),
      ])
      const result = fillRateService.evaluate(makeFilters({ includeActive: true }))

      const sep = result.trend.find(t => t.month === '2025-09')!
      expect(sep.totalDenominator).toBe(2) // 1 Active + 1 ClosedWon
      expect(sep.closedWon).toBe(1)
      expect(sep.fillRate).toBe(50)
    })
  })
})
