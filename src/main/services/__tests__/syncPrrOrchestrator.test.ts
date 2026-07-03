import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../upstreamApiService', () => ({
  upstreamApiService: {
    getPrrsPaged: vi.fn(),
    getPrrPresentations: vi.fn(),
  },
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    upsertProjectReallocation: vi.fn(),
    upsertPrrPresentation: vi.fn(),
  },
}))

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('../../db/repositories/prrRepository', () => ({
  prrRepository: {
    getLocalUpstreamIds: vi.fn().mockReturnValue([]),
    getByUpstreamId: vi.fn().mockReturnValue(null),
    deleteByUpstreamId: vi.fn().mockReturnValue(false),
    markClosed: vi.fn(),
  },
}))

import { syncPrrOrchestrator } from '../sync/syncPrrOrchestrator'
import { upstreamApiService } from '../upstreamApiService'
import { syncRepository } from '../../db/repositories/syncRepository'
import { prrRepository } from '../../db/repositories/prrRepository'

function makePrr(overrides: Partial<{ id: number; employee: string; account: string; team: string; mainSkill: string; seniority: string; transitionStatus: string; transitionSubType: string; location: string; requestDate: string; daysSinceLastInterview: string; impact: string; attritionRisk: string; comments: string }> = {}) {
  return {
    id: 191,
    employee: 'John Doe',
    account: 'Axos Bank',
    team: 'Team A',
    mainSkill: 'QA',
    seniority: 'Intermediate',
    transitionStatus: 'In Progress',
    transitionSubType: 'Project Reallocation Request',
    location: 'Remote',
    requestDate: '2024-02-16',
    daysSinceLastInterview: '787',
    impact: 'High',
    attritionRisk: 'High',
    comments: 'Test comment',
    ...overrides,
  }
}

describe('syncPrrOrchestrator', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prrRepository.getLocalUpstreamIds).mockReturnValue([])
  })

  it('should sync PRRs and emit record events', async () => {
    vi.mocked(upstreamApiService.getPrrsPaged)
      .mockResolvedValueOnce({ items: [makePrr()], totalRecords: 1 })
      .mockResolvedValueOnce({ items: [], totalRecords: 1 })

    vi.mocked(upstreamApiService.getPrrPresentations).mockResolvedValue([
      { openPositionId: 100, account: 'Client A', openPositionStatus: 'Active', location: 'Remote', presentedOn: '2024-03-01', candidateStatus: 'Pending' },
    ])
    vi.mocked(syncRepository.upsertProjectReallocation).mockReturnValue(1)

    const emitEvent = vi.fn()
    const controller = new AbortController()
    await syncPrrOrchestrator.sync('token', {}, emitEvent, controller.signal)

    expect(upstreamApiService.getPrrsPaged).toHaveBeenCalledWith('token', 0, 100)
    expect(upstreamApiService.getPrrPresentations).toHaveBeenCalledWith('token', 191)
    expect(syncRepository.upsertProjectReallocation).toHaveBeenCalledTimes(1)
    expect(syncRepository.upsertPrrPresentation).toHaveBeenCalledTimes(1)

    const recordEvent = emitEvent.mock.calls.find(c => c[0].type === 'record')
    expect(recordEvent).toBeDefined()
    expect(recordEvent![0].record).toMatchObject({
      id: 'prr-191', source: 'project-reallocations', status: 'synced',
      name: 'John Doe', account: 'Axos Bank', presentationsCount: 1,
    })

    const completeEvent = emitEvent.mock.calls.find(c => c[0].type === 'complete')
    expect(completeEvent).toBeDefined()
    expect(completeEvent![0].progress.syncedCount).toBe(1)
  })

  it('should handle API errors gracefully and emit sync_failed', async () => {
    vi.mocked(upstreamApiService.getPrrsPaged)
      .mockResolvedValueOnce({
        items: [makePrr({ id: 999, employee: 'Fail Person', account: 'X' })],
        totalRecords: 1,
      })

    vi.mocked(upstreamApiService.getPrrPresentations).mockRejectedValue(new Error('Network error'))

    const emitEvent = vi.fn()
    const controller = new AbortController()
    await syncPrrOrchestrator.sync('token', {}, emitEvent, controller.signal)

    const allEvents = emitEvent.mock.calls.map(c => ({ type: c[0].type, status: c[0].record?.status }))
    const failedEvent = emitEvent.mock.calls.find(c => c[0].type === 'record' && c[0].record.status === 'sync_failed')
    expect(failedEvent).toBeDefined()
    expect(failedEvent![0].record.name).toBe('Fail Person')
  })

  it('should respect abort signal', async () => {
    const controller = new AbortController()
    controller.abort()

    vi.mocked(upstreamApiService.getPrrsPaged).mockResolvedValueOnce({
      items: [makePrr({ id: 1, employee: 'A', account: 'B' })],
      totalRecords: 1,
    })

    const emitEvent = vi.fn()
    await syncPrrOrchestrator.sync('token', {}, emitEvent, controller.signal)

    expect(syncRepository.upsertProjectReallocation).not.toHaveBeenCalled()
    const completeEvent = emitEvent.mock.calls.find(c => c[0].type === 'complete')
    expect(completeEvent![0].progress.status).toBe('paused')
  })

  it('should respect limit option', async () => {
    vi.mocked(upstreamApiService.getPrrsPaged).mockResolvedValueOnce({
      items: [
        makePrr({ id: 1, employee: 'A', account: 'X' }),
        makePrr({ id: 2, employee: 'B', account: 'Y' }),
      ],
      totalRecords: 10,
    })
    vi.mocked(upstreamApiService.getPrrPresentations).mockResolvedValue([])
    vi.mocked(syncRepository.upsertProjectReallocation).mockReturnValue(1)

    const emitEvent = vi.fn()
    await syncPrrOrchestrator.sync('token', { limit: 1 }, emitEvent, new AbortController().signal)

    expect(syncRepository.upsertProjectReallocation).toHaveBeenCalledTimes(1)
  })

  it('should emit progress events during sync', async () => {
    vi.mocked(upstreamApiService.getPrrsPaged)
      .mockResolvedValueOnce({ items: [makePrr()], totalRecords: 1 })
      .mockResolvedValueOnce({ items: [], totalRecords: 1 })
    vi.mocked(upstreamApiService.getPrrPresentations).mockResolvedValue([])
    vi.mocked(syncRepository.upsertProjectReallocation).mockReturnValue(1)

    const emitEvent = vi.fn()
    await syncPrrOrchestrator.sync('token', {}, emitEvent, new AbortController().signal)

    const progressEvents = emitEvent.mock.calls.filter(c => c[0].type === 'progress')
    expect(progressEvents.length).toBeGreaterThan(0)
    expect(progressEvents[0][0].progress.status).toBe('syncing')
    expect(progressEvents[0][0].progress.currentRecord).toBe('John Doe')
  })

  it('should handle PRRs with no presentations', async () => {
    vi.mocked(upstreamApiService.getPrrsPaged)
      .mockResolvedValueOnce({ items: [makePrr()], totalRecords: 1 })
      .mockResolvedValueOnce({ items: [], totalRecords: 1 })
    vi.mocked(upstreamApiService.getPrrPresentations).mockResolvedValue([])
    vi.mocked(syncRepository.upsertProjectReallocation).mockReturnValue(1)

    const emitEvent = vi.fn()
    await syncPrrOrchestrator.sync('token', {}, emitEvent, new AbortController().signal)

    expect(syncRepository.upsertPrrPresentation).not.toHaveBeenCalled()
    const recordEvent = emitEvent.mock.calls.find(c => c[0].type === 'record' && c[0].record.status === 'synced')
    expect(recordEvent![0].record.presentationsCount).toBe(0)
  })
})
