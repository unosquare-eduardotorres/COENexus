import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

const mockDb = {
  prepare: vi.fn().mockReturnValue({
    run: vi.fn(),
    get: vi.fn().mockReturnValue({ c: 5 }),
    all: vi.fn().mockReturnValue([]),
  }),
  exec: vi.fn(),
  pragma: vi.fn(),
}

vi.mock('../../db/connection', () => ({
  getDatabase: () => mockDb,
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    countBySourceType: vi.fn().mockReturnValue(10),
    vectorSearch: vi.fn().mockReturnValue([]),
    getResumeText: vi.fn().mockReturnValue('Resume text'),
  },
}))

vi.mock('../../db/repositories/matchRepository', () => ({
  matchRepository: {
    saveSession: vi.fn().mockReturnValue(1),
    listSessions: vi.fn().mockReturnValue([]),
    getSession: vi.fn().mockReturnValue(null),
  },
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    findEmployeeByUpstreamId: vi.fn(),
    findCandidateByUpstreamId: vi.fn(),
  },
}))

vi.mock('../voyageEmbeddingService', () => ({
  voyageEmbeddingService: {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  },
}))

vi.mock('../claudeService', () => ({
  claudeService: {
    scoreCandidate: vi.fn(),
    analyzeCandidate: vi.fn(),
  },
}))

vi.mock('../../config', () => ({
  getConfig: vi.fn().mockReturnValue({}),
}))

import { matchEngineService } from '../matchEngineService'
import { embeddingRepository } from '../../db/repositories/embeddingRepository'
import { matchRepository } from '../../db/repositories/matchRepository'

describe('matchEngineService integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    matchEngineService.invalidateFilterCache()
  })

  it('should return pool counts from embedding repository and db', () => {
    const counts = matchEngineService.getPoolCounts()
    expect(embeddingRepository.countBySourceType).toHaveBeenCalledWith('employees')
    expect(embeddingRepository.countBySourceType).toHaveBeenCalledWith('candidates')
    expect(counts.employees).toBe(10)
    expect(counts.candidates).toBe(10)
  })

  it('should return filter options from database', () => {
    const options = matchEngineService.getFilterOptions()
    expect(options).toBeDefined()
    expect(mockDb.prepare).toHaveBeenCalled()
  })

  it('should cache filter options on second call', () => {
    matchEngineService.getFilterOptions()
    const callCount1 = mockDb.prepare.mock.calls.length
    matchEngineService.getFilterOptions()
    const callCount2 = mockDb.prepare.mock.calls.length
    expect(callCount2).toBe(callCount1)
  })

  it('should invalidate filter cache', () => {
    matchEngineService.getFilterOptions()
    matchEngineService.invalidateFilterCache()
    matchEngineService.getFilterOptions()
    expect(mockDb.prepare.mock.calls.length).toBeGreaterThan(0)
  })

  it('should list sessions from match repository', () => {
    const sessions = matchEngineService.listSessions()
    expect(matchRepository.listSessions).toHaveBeenCalled()
    expect(sessions).toEqual([])
  })

  it('should get resume text from database', () => {
    mockDb.prepare.mockReturnValueOnce({
      get: vi.fn().mockReturnValue({ resume_text: 'Resume content' }),
    })
    const text = matchEngineService.getResumeText('candidate', 42)
    expect(mockDb.prepare).toHaveBeenCalled()
    expect(text).toBe('Resume content')
  })
})
