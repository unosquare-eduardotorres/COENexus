import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../upstreamApiService', () => ({
  upstreamApiService: {
    getEmployeeDetail: vi.fn(),
    getEmployeeContracts: vi.fn(),
    getEmployeeRates: vi.fn(),
    getEmployeeNotes: vi.fn(),
    getEmployeesPaged: vi.fn(),
  },
}))

vi.mock('../catalogService', () => ({
  catalogService: {
    getSeniorities: vi.fn(),
    getMainSkills: vi.fn(),
    getCountries: vi.fn(),
  },
}))

vi.mock('../embeddingJobQueue', () => ({
  embeddingJobQueue: {
    enqueue: vi.fn(),
  },
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    findEmployeeByUpstreamId: vi.fn(),
    upsertEmployee: vi.fn(),
    updateStatus: vi.fn(),
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
  getConfig: vi.fn(),
}))

import { syncOrchestrator } from '../syncOrchestrator'
import { upstreamApiService } from '../upstreamApiService'
import { catalogService } from '../catalogService'
import { embeddingJobQueue } from '../embeddingJobQueue'
import { syncRepository } from '../../db/repositories/syncRepository'

describe('syncOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call upstream API and return sync records', async () => {
    vi.mocked(catalogService.getSeniorities).mockResolvedValue(new Map([[1, 'Senior']]))
    vi.mocked(catalogService.getMainSkills).mockResolvedValue(new Map([[10, 'TypeScript']]))
    vi.mocked(catalogService.getCountries).mockResolvedValue(new Map([[20, 'Mexico']]))
    vi.mocked(upstreamApiService.getEmployeeDetail).mockResolvedValue({
      userId: 7,
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      seniority: 1,
      mainSkillId: 10,
      countryId: 20,
      accountName: 'Acme',
      jobTitle: 'Engineer',
      mainSkillName: 'TypeScript',
      officeName: 'Mexico',
    })
    vi.mocked(upstreamApiService.getEmployeeContracts).mockResolvedValue([
      { salary: 1000, currencyCode: 'USD', startDate: '2024-01-01', netSalary: null, annualCost: null },
    ])
    vi.mocked(upstreamApiService.getEmployeeRates).mockResolvedValue([
      { accountName: 'Acme', projectName: 'Project A', rate: 80, startDate: '2024-02-01' },
    ])
    vi.mocked(upstreamApiService.getEmployeeNotes).mockResolvedValue([
      {
        personaNoteId: 55,
        noteTypeName: 'Resume',
        noteContent: '',
        fullName: 'Jane Doe',
        dateCreated: '2024-03-01T00:00:00.000Z',
        filename: 'resume.pdf',
      },
    ])
    vi.mocked(syncRepository.findEmployeeByUpstreamId).mockReturnValue(undefined)
    vi.mocked(syncRepository.upsertEmployee).mockReturnValue(101)

    const result = await syncOrchestrator.syncSingle('employees', 'token-1', 7)

    expect(upstreamApiService.getEmployeeDetail).toHaveBeenCalledWith('token-1', 7)
    expect(syncRepository.upsertEmployee).toHaveBeenCalledTimes(1)
    expect(embeddingJobQueue.enqueue).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      id: 'emp-7',
      source: 'employees',
      upstreamId: 7,
      name: 'Jane Doe',
      hasResume: true,
    })
  })

  it('should handle sync errors gracefully', async () => {
    const emitEvent = vi.fn()
    vi.mocked(catalogService.getSeniorities).mockRejectedValue(new Error('catalog unavailable'))

    await syncOrchestrator.syncAsync('employees', 'token-2', {}, emitEvent)

    expect(emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'catalog unavailable',
      })
    )
  })
})
