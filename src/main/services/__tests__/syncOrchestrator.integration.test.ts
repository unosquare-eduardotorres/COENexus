import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../upstreamApiService', () => ({
  upstreamApiService: {
    getEmployeesPaged: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 0, page: 1 }),
    getCandidatesPaged: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 0, page: 1 }),
    getOpenPositionsPaged: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 0, page: 1 }),
    getEmployeeDetail: vi.fn().mockResolvedValue(null),
    getEmployeeContracts: vi.fn().mockResolvedValue([]),
    getEmployeeRates: vi.fn().mockResolvedValue([]),
    getEmployeeNotes: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../catalogService', () => ({
  catalogService: {
    getSeniorities: vi.fn().mockResolvedValue([]),
    getMainSkills: vi.fn().mockResolvedValue([]),
    getCountries: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    upsertEmployee: vi.fn(),
    upsertCandidate: vi.fn(),
    upsertOpenPosition: vi.fn(),
    findEmployeeByUpstreamId: vi.fn(),
    findCandidateByUpstreamId: vi.fn(),
    updateStatus: vi.fn(),
    getRecordsBySource: vi.fn().mockReturnValue([]),
    clearBySource: vi.fn(),
  },
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    deleteBySource: vi.fn(),
  },
}))

vi.mock('../../db/repositories/matchRepository', () => ({
  matchRepository: {
    upsertOpenPositionCandidate: vi.fn(),
  },
}))

vi.mock('../../config', () => ({
  getConfig: vi.fn().mockReturnValue({ upstreamApiToken: 'test-token' }),
}))

import { syncOrchestrator } from '../syncOrchestrator'
import { upstreamApiService } from '../upstreamApiService'

describe('syncOrchestrator integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should expose sync methods', () => {
    expect(typeof syncOrchestrator.syncAsync).toBe('function')
    expect(typeof syncOrchestrator.syncSingle).toBe('function')
    expect(typeof syncOrchestrator.requestPause).toBe('function')
  })

  it('should handle sync with empty results from API', async () => {
    const onEvent = vi.fn()
    await syncOrchestrator.syncAsync('employees', 'test-token', { limit: 100, skip: 0 }, onEvent)
    expect(onEvent).toHaveBeenCalled()
  })

  it('should sync employees from upstream API', async () => {
    vi.mocked(upstreamApiService.getEmployeesPaged).mockResolvedValueOnce({
      items: [{ employeeId: 1, firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' }],
      total: 1,
      totalPages: 1,
      page: 1,
    } as never)

    const onEvent = vi.fn()
    await syncOrchestrator.syncAsync('employees', 'test-token', { limit: 100, skip: 0 }, onEvent)
    expect(onEvent).toHaveBeenCalled()
  })
})
