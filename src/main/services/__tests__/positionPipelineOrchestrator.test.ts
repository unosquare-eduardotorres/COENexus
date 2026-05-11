import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../upstreamApiService', () => ({
  upstreamApiService: {
    getOpenPositionsPaged: vi.fn().mockResolvedValue({ totalRecords: 0, items: [] }),
    getAllOpenPositionsPaged: vi.fn().mockResolvedValue({ totalRecords: 0, items: [] }),
    getOpenPositionDetail: vi.fn().mockResolvedValue({ jobDescription: 'Build things', jobTitle: 'Dev', comments: '' }),
    getPresentedCandidates: vi.fn().mockResolvedValue([]),
    getDiscussionComments: vi.fn().mockResolvedValue([]),
    getCandidateRequisitionDetail: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    findPositionsByUpstreamIds: vi.fn().mockReturnValue(new Map()),
    getFailedPositionRecords: vi.fn().mockReturnValue([]),
    upsertOpenPosition: vi.fn().mockReturnValue({ id: 1 }),
    findPositionByUpstreamId: vi.fn(),
    markPositionFailed: vi.fn(),
    markFailed: vi.fn(),
    getFailedRecords: vi.fn().mockReturnValue([]),
    getAllOpenPositions: vi.fn().mockReturnValue([]),
    markPositionClosed: vi.fn(),
    getUnvectorizedPositions: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    upsertEmbedding: vi.fn(),
    getEmbeddingBySourceAndId: vi.fn(),
  },
}))

vi.mock('../../db/repositories/matchRepository', () => ({
  matchRepository: {
    upsertOpenPositionCandidate: vi.fn(),
    updateCandidateRejectionDetails: vi.fn(),
  },
}))

vi.mock('../matchEngineService', () => ({
  matchEngineService: { invalidateFilterCache: vi.fn() },
}))

vi.mock('../voyageEmbeddingService', () => ({
  voyageEmbeddingService: {
    embedText: vi.fn().mockResolvedValue([0.1, 0.2]),
  },
}))

vi.mock('../processingUtils', () => ({
  extractPositionText: vi.fn().mockReturnValue('position text for vectorization'),
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../config', () => ({
  getConfig: () => ({ voyage: { defaultModel: 'voyage-3-large' } }),
}))

import { positionPipelineOrchestrator } from '../positionPipelineOrchestrator'
import { upstreamApiService } from '../upstreamApiService'
import { syncRepository } from '../../db/repositories/syncRepository'

describe('positionPipelineOrchestrator', () => {
  beforeEach(() => {
    vi.mocked(upstreamApiService.getOpenPositionsPaged).mockReset().mockResolvedValue({ totalRecords: 0, items: [] } as any)
    vi.mocked(upstreamApiService.getAllOpenPositionsPaged).mockReset().mockResolvedValue({ totalRecords: 0, items: [] } as any)
    vi.mocked(syncRepository.findPositionsByUpstreamIds).mockReset().mockReturnValue(new Map())
  })

  it('should emit complete event when no positions exist', async () => {
    const events: unknown[] = []
    await positionPipelineOrchestrator.run(
      { token: 'test-token', activeOnly: true },
      (e) => events.push(e),
    )

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
    expect(complete.progress.status).toBe('completed')
    expect(complete.progress.totalRecords).toBe(0)
  })

  it('should process position records and emit progress events', async () => {
    vi.mocked(upstreamApiService.getOpenPositionsPaged)
      .mockResolvedValueOnce({
        totalRecords: 1,
        items: [{
          id: 1, title: 'Dev', account: 'Acme',
          lastModification: null, candidatesPresented: 0, lastDiscussionDate: null,
          mainTechnicalSkill: 'React', seniority: 'Senior',
          jobDescription: 'Build stuff',
        }],
      } as any)
      .mockResolvedValueOnce({ totalRecords: 1, items: [] } as any)

    const events: unknown[] = []
    await positionPipelineOrchestrator.run(
      { token: 'test-token', activeOnly: true },
      (e) => events.push(e),
    )

    const progressEvents = events.filter((e: any) => e.type === 'progress')
    expect(progressEvents.length).toBeGreaterThan(0)

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
  })

  it('should handle pause when requestPause() is called', async () => {
    let callCount = 0
    vi.mocked(upstreamApiService.getOpenPositionsPaged).mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        setTimeout(() => positionPipelineOrchestrator.requestPause(), 0)
        return {
          totalRecords: 50,
          items: Array.from({ length: 5 }, (_, i) => ({
            id: i, title: `P${i}`, account: 'A',
            lastModification: null, candidatesPresented: 0, lastDiscussionDate: null,
          })),
        } as any
      }
      return { totalRecords: 50, items: [] } as any
    })

    const events: unknown[] = []
    await positionPipelineOrchestrator.run(
      { token: 'test-token', activeOnly: true },
      (e) => events.push(e),
    )

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
  })

  it('should retryAllFailed with empty failed records', async () => {
    vi.mocked((syncRepository as any).getFailedPositionRecords).mockReturnValue([])

    const events: unknown[] = []
    await positionPipelineOrchestrator.retryAllFailed(
      { source: 'open-positions' as any, token: 'test-token' },
      (e) => events.push(e),
    )

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
    expect(complete.progress.totalRecords).toBe(0)
  })

  it('should retrySingle return failed for missing upstream_id', async () => {
    vi.mocked((syncRepository as any).getFailedPositionRecords).mockReturnValue([])

    const result = await positionPipelineOrchestrator.retrySingle({
      token: 'test-token',
      upstreamId: 999,
    })

    expect(result.outcome).toBe('failed')
    expect(result.error).toContain('not found')
  })

  it('should emit record or progress events for processed positions', async () => {
    vi.mocked(upstreamApiService.getOpenPositionsPaged)
      .mockResolvedValueOnce({
        totalRecords: 1,
        items: [{
          id: 10, title: 'Dev', account: 'Acme', mainSkill: 'React',
          lastModification: null, candidatesPresented: 0, lastDiscussionDate: null,
          mainTechnicalSkill: 'React', seniority: 'Senior',
        }],
      } as any)
      .mockResolvedValueOnce({ totalRecords: 1, items: [] } as any)

    const events: unknown[] = []
    await positionPipelineOrchestrator.run(
      { token: 'test-token', activeOnly: true },
      (e) => events.push(e),
    )

    const allEvents = events.filter((e: any) => e.type === 'record' || e.type === 'progress')
    expect(allEvents.length).toBeGreaterThanOrEqual(1)

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
    expect(complete.progress.processedRecords).toBeGreaterThanOrEqual(1)
  })

  it('should include correct counts in complete event', async () => {
    vi.mocked(upstreamApiService.getOpenPositionsPaged)
      .mockResolvedValueOnce({
        totalRecords: 2,
        items: [
          { id: 1, title: 'P1', account: 'A', lastModification: null, candidatesPresented: 0, lastDiscussionDate: null, mainTechnicalSkill: 'JS' },
          { id: 2, title: 'P2', account: 'A', lastModification: null, candidatesPresented: 0, lastDiscussionDate: null, mainTechnicalSkill: 'TS' },
        ],
      } as any)
      .mockResolvedValueOnce({ totalRecords: 2, items: [] } as any)

    const events: unknown[] = []
    await positionPipelineOrchestrator.run(
      { token: 'test-token', activeOnly: true },
      (e) => events.push(e),
    )

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
    expect(complete.progress.processedRecords).toBeGreaterThanOrEqual(2)
  })

  it('should not inflate counters on fresh run after a previous paused run', async () => {
    const makeItems = () => Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `P${i + 1}`,
      account: 'Acme',
      mainSkill: 'React',
      lastModification: null,
      candidatesPresented: 0,
      lastDiscussionDate: null,
      mainTechnicalSkill: 'React',
      seniority: 'Senior',
    }))

    vi.mocked(upstreamApiService.getOpenPositionsPaged).mockImplementation(async () => {
      setTimeout(() => positionPipelineOrchestrator.requestPause(), 0)
      return { totalRecords: 5, items: makeItems() } as any
    })

    const firstEvents: unknown[] = []
    await positionPipelineOrchestrator.run(
      { token: 'test-token', activeOnly: true },
      (e) => firstEvents.push(e),
    )

    vi.mocked(upstreamApiService.getOpenPositionsPaged).mockReset()
    vi.mocked(upstreamApiService.getOpenPositionsPaged)
      .mockResolvedValueOnce({ totalRecords: 5, items: makeItems() } as any)
      .mockResolvedValueOnce({ totalRecords: 5, items: [] } as any)

    const secondEvents: unknown[] = []
    await positionPipelineOrchestrator.run(
      { token: 'test-token', activeOnly: true },
      (e) => secondEvents.push(e),
    )

    const complete = secondEvents.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
    expect(complete.progress.processedRecords).toBeLessThanOrEqual(complete.progress.totalRecords)
    expect(complete.progress.skippedCount).toBe(0)
  })
})
