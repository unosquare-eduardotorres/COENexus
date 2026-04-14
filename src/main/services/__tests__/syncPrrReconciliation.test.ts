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

vi.mock('../../db/repositories/prrRepository', () => ({
  prrRepository: {
    getLocalUpstreamIds: vi.fn(),
    getByUpstreamId: vi.fn(),
    deleteByUpstreamId: vi.fn(),
    markClosed: vi.fn(),
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

import { syncPrrOrchestrator } from '../sync/syncPrrOrchestrator'
import { upstreamApiService } from '../upstreamApiService'
import { syncRepository } from '../../db/repositories/syncRepository'
import { prrRepository } from '../../db/repositories/prrRepository'

function makePrr(overrides: Partial<{ id: number; employee: string }> = {}) {
  return {
    id: 101,
    employee: 'John Doe',
    account: 'Account',
    team: 'Team',
    mainSkill: 'QA',
    seniority: 'Intermediate',
    transitionStatus: 'In Progress',
    transitionSubType: 'Project Reallocation Request',
    location: 'Remote',
    requestDate: '2024-02-16',
    daysSinceLastInterview: '10',
    impact: 'High',
    attritionRisk: 'Low',
    comments: '',
    ...overrides,
  }
}

describe('syncPrrOrchestrator reconciliation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('marks missing local non-closed records as Closed', async () => {
    vi.mocked(upstreamApiService.getPrrsPaged)
      .mockResolvedValueOnce({ items: [makePrr({ id: 1 })], totalRecords: 1 })
      .mockResolvedValueOnce({ items: [], totalRecords: 1 })
    vi.mocked(upstreamApiService.getPrrPresentations).mockResolvedValue([])

    vi.mocked(prrRepository.getLocalUpstreamIds).mockReturnValue([1, 2])
    vi.mocked(prrRepository.getByUpstreamId).mockImplementation((id: number) => {
      if (id === 2) {
        return {
          id: 200,
          upstream_id: 2,
          employee: 'Missing',
          account: '',
          team: '',
          main_skill: '',
          seniority: '',
          transition_status: '',
          transition_sub_type: '',
          location: '',
          request_date: null,
          days_since_last_interview: '',
          impact: '',
          attrition_risk: '',
          comments: '',
          presentations_count: 0,
          coe_status: 'Active',
          coe_comments: '[]',
          status: 'synced',
          status_reason: null,
          synced_at: new Date().toISOString(),
        }
      }
      return undefined
    })

    await syncPrrOrchestrator.sync('token', {}, vi.fn(), new AbortController().signal)

    expect(syncRepository.upsertProjectReallocation).toHaveBeenCalledTimes(1)
    expect(prrRepository.markClosed).toHaveBeenCalledWith(2)
    expect(prrRepository.deleteByUpstreamId).not.toHaveBeenCalled()
  })

  it('deletes missing local records that are already Closed', async () => {
    vi.mocked(upstreamApiService.getPrrsPaged)
      .mockResolvedValueOnce({ items: [makePrr({ id: 1 })], totalRecords: 1 })
      .mockResolvedValueOnce({ items: [], totalRecords: 1 })
    vi.mocked(upstreamApiService.getPrrPresentations).mockResolvedValue([])

    vi.mocked(prrRepository.getLocalUpstreamIds).mockReturnValue([1, 3])
    vi.mocked(prrRepository.getByUpstreamId).mockImplementation((id: number) => {
      if (id === 3) {
        return {
          id: 300,
          upstream_id: 3,
          employee: 'Closed Local',
          account: '',
          team: '',
          main_skill: '',
          seniority: '',
          transition_status: '',
          transition_sub_type: '',
          location: '',
          request_date: null,
          days_since_last_interview: '',
          impact: '',
          attrition_risk: '',
          comments: '',
          presentations_count: 0,
          coe_status: 'Closed',
          coe_comments: '[]',
          status: 'synced',
          status_reason: null,
          synced_at: new Date().toISOString(),
        }
      }
      return undefined
    })
    vi.mocked(prrRepository.deleteByUpstreamId).mockReturnValue(true)

    await syncPrrOrchestrator.sync('token', {}, vi.fn(), new AbortController().signal)

    expect(prrRepository.deleteByUpstreamId).toHaveBeenCalledWith(3)
    expect(prrRepository.markClosed).not.toHaveBeenCalledWith(3)
  })

  it('skips reconciliation when sync is aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await syncPrrOrchestrator.sync('token', {}, vi.fn(), controller.signal)

    expect(prrRepository.getLocalUpstreamIds).not.toHaveBeenCalled()
    expect(prrRepository.markClosed).not.toHaveBeenCalled()
    expect(prrRepository.deleteByUpstreamId).not.toHaveBeenCalled()
  })
})
