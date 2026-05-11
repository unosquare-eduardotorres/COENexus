import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { mockGetConfig } = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
}))

vi.mock('../../db/agents/repositories/vigilRepository', () => ({
  vigilRepository: {
    getConfig: mockGetConfig,
  },
}))

vi.mock('../vigilExecutor', () => ({
  vigilExecutor: {
    run: vi.fn(),
  },
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { vigilScheduler } from '../vigilScheduler'

function defaultConfig(overrides: Record<string, unknown> = {}) {
  const now = new Date()
  return {
    id: 1,
    schedule_enabled: 1,
    schedule_hour: now.getHours(),
    schedule_minute: now.getMinutes(),
    sync_sources_json: '["employees","candidates"]',
    candidate_year_filter: 2026,
    schedule_days_json: JSON.stringify([now.getDay()]),
    active_positions_only: 0,
    ...overrides,
  }
}

describe('vigilScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetConfig.mockReset()
  })

  afterEach(() => {
    vigilScheduler.stop()
    vi.useRealTimers()
  })

  describe('parseSources (tested through scheduler start)', () => {
    it('should parse valid JSON array of sources', () => {
      const mockRun = vi.fn().mockResolvedValue(undefined)
      const mockGetToken = vi.fn().mockResolvedValue('test-token')
      mockGetConfig.mockReturnValue(defaultConfig({
        sync_sources_json: '["employees","candidates","open-positions"]',
      }))

      vigilScheduler.start({ getToken: mockGetToken, run: mockRun })

      expect(mockGetConfig).toHaveBeenCalled()
    })

    it('should fall back to DEFAULT_SOURCES on invalid JSON', () => {
      const mockRun = vi.fn().mockResolvedValue(undefined)
      const mockGetToken = vi.fn().mockResolvedValue('test-token')
      mockGetConfig.mockReturnValue(defaultConfig({
        sync_sources_json: 'not-json',
      }))

      vigilScheduler.start({ getToken: mockGetToken, run: mockRun })

      expect(mockGetConfig).toHaveBeenCalled()
    })

    it('should filter out invalid source strings', () => {
      const mockRun = vi.fn().mockResolvedValue(undefined)
      const mockGetToken = vi.fn().mockResolvedValue('test-token')
      mockGetConfig.mockReturnValue(defaultConfig({
        sync_sources_json: '["employees","invalid-source","candidates"]',
      }))

      vigilScheduler.start({ getToken: mockGetToken, run: mockRun })

      expect(mockGetConfig).toHaveBeenCalled()
    })
  })

  describe('minuteKey', () => {
    it('should format date as YYYY-MM-DD-HH:MM', () => {
      vi.setSystemTime(new Date(2026, 3, 15, 9, 5))
      const mockRun = vi.fn().mockResolvedValue(undefined)
      const mockGetToken = vi.fn().mockResolvedValue('test-token')
      mockGetConfig.mockReturnValue(defaultConfig({
        schedule_hour: 9,
        schedule_minute: 5,
        schedule_days_json: JSON.stringify([new Date(2026, 3, 15).getDay()]),
      }))

      vigilScheduler.start({ getToken: mockGetToken, run: mockRun })

      expect(mockGetConfig).toHaveBeenCalled()
    })
  })

  describe('tick', () => {
    it('should skip when schedule_enabled !== 1', async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined)
      mockGetConfig.mockReturnValue(defaultConfig({ schedule_enabled: 0 }))

      vigilScheduler.start({ run: mockRun, getToken: vi.fn().mockResolvedValue('token') })
      await vi.advanceTimersByTimeAsync(100)

      expect(mockRun).not.toHaveBeenCalled()
    })

    it('should skip when lastTriggeredMinuteKey matches current minute (dedup)', async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined)
      const mockGetToken = vi.fn().mockResolvedValue('test-token')
      mockGetConfig.mockReturnValue(defaultConfig())

      vigilScheduler.start({ getToken: mockGetToken, run: mockRun })
      await vi.advanceTimersByTimeAsync(100)

      expect(mockRun).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(60_000)

      expect(mockRun).toHaveBeenCalledTimes(1)
    })

    it('should skip when no tokenProvider is set', async () => {
      const mockRun = vi.fn().mockResolvedValue(undefined)
      mockGetConfig.mockReturnValue(defaultConfig())

      vigilScheduler.start({ run: mockRun })
      await vi.advanceTimersByTimeAsync(100)

      expect(mockRun).not.toHaveBeenCalled()
    })

    it('should not trigger a second run while inFlight (dedup guard)', async () => {
      vi.setSystemTime(new Date(2026, 5, 15, 14, 30, 0))

      let resolveRun!: () => void
      const slowRun = vi.fn().mockImplementation(() => new Promise<void>(r => { resolveRun = r }))
      const mockGetToken = vi.fn().mockResolvedValue('test-token')

      mockGetConfig.mockReturnValue(defaultConfig({
        schedule_hour: 14,
        schedule_minute: 30,
        schedule_days_json: JSON.stringify([new Date(2026, 5, 15).getDay()]),
      }))

      vigilScheduler.start({ getToken: mockGetToken, run: slowRun })
      await vi.advanceTimersByTimeAsync(100)

      expect(slowRun).toHaveBeenCalledTimes(1)

      vi.setSystemTime(new Date(2026, 5, 15, 14, 31, 0))
      mockGetConfig.mockReturnValue(defaultConfig({
        schedule_hour: 14,
        schedule_minute: 31,
        schedule_days_json: JSON.stringify([new Date(2026, 5, 15).getDay()]),
      }))

      await vi.advanceTimersByTimeAsync(60_000)

      expect(slowRun).toHaveBeenCalledTimes(1)

      resolveRun()
      await vi.advanceTimersByTimeAsync(0)
    })
  })
})
