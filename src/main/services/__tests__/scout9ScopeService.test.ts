import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

const mockDb = {
  prepare: vi.fn(),
}

vi.mock('../../db/connection', () => ({
  getDatabase: () => mockDb,
}))

import { getScopeOptions, invalidateScopeCache } from '../scout9ScopeService'

function setupDbMocks() {
  const stmts: Record<string, { all: () => unknown[]; get: () => unknown }> = {
    coe: { all: () => [{ coe: 'COE-A' }], get: () => ({}) },
    vertical: { all: () => [{ vertical_industry: 'Finance' }], get: () => ({}) },
    account: { all: () => [{ account: 'Acme' }], get: () => ({}) },
    countAll: { all: () => [], get: () => ({ c: 10 }) },
    countNoCandidates: { all: () => [], get: () => ({ c: 3 }) },
    countStalled: { all: () => [], get: () => ({ c: 2 }) },
    countHighPri: { all: () => [], get: () => ({ c: 1 }) },
  }

  let callIndex = 0
  const order = ['coe', 'vertical', 'account', 'countAll', 'countNoCandidates', 'countStalled', 'countHighPri']
  mockDb.prepare.mockImplementation(() => {
    const key = order[callIndex % order.length]
    callIndex++
    return stmts[key]
  })
}

describe('scout9ScopeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    invalidateScopeCache()
    setupDbMocks()
  })

  afterEach(() => {
    invalidateScopeCache()
  })

  describe('getScopeOptions', () => {
    it('should return scope options with coes, verticals, clients, and presets', () => {
      const result = getScopeOptions()
      expect(result.coes).toEqual(['COE-A'])
      expect(result.verticals).toEqual(['Finance'])
      expect(result.clients).toEqual(['Acme'])
      expect(result.presets).toHaveLength(4)
      expect(result.presets[0]).toEqual({ name: 'all-active', label: 'All Active', count: 10 })
    })

    it('should cache results on subsequent calls', () => {
      getScopeOptions()
      const callCount = mockDb.prepare.mock.calls.length

      getScopeOptions()
      expect(mockDb.prepare.mock.calls.length).toBe(callCount)
    })

    it('should refresh after cache invalidation', () => {
      getScopeOptions()
      const callCount = mockDb.prepare.mock.calls.length

      invalidateScopeCache()
      getScopeOptions()
      expect(mockDb.prepare.mock.calls.length).toBeGreaterThan(callCount)
    })
  })

  describe('invalidateScopeCache', () => {
    it('should clear the cache so next call fetches fresh data', () => {
      getScopeOptions()
      invalidateScopeCache()
      getScopeOptions()
      expect(mockDb.prepare.mock.calls.length).toBe(14)
    })
  })
})
