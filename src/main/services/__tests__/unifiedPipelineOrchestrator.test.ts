import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../upstreamApiService', () => ({
  upstreamApiService: {
    getEmployeesPaged: vi.fn().mockResolvedValue({ totalRecords: 0, items: [] }),
    getCandidatesPaged: vi.fn().mockResolvedValue({ totalRecords: 0, items: [] }),
  },
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    findEmployeeByUpstreamId: vi.fn(),
    findCandidateByUpstreamId: vi.fn(),
    getFailedRecords: vi.fn().mockReturnValue([]),
    findPositionsByUpstreamIds: vi.fn().mockReturnValue(new Map()),
    upsertSyncFailed: vi.fn(),
    markFailed: vi.fn(),
  },
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    upsertEmbedding: vi.fn(),
    getEmbeddingBySourceAndId: vi.fn(),
  },
}))

vi.mock('../matchEngineService', () => ({
  matchEngineService: { invalidateFilterCache: vi.fn() },
}))

vi.mock('../sync/syncEmployeeOrchestrator', () => ({
  syncEmployeeOrchestrator: { syncSingle: vi.fn().mockResolvedValue({ resumeChanged: true, syncDetail: 'new' }) },
}))

vi.mock('../sync/syncCandidateOrchestrator', () => ({
  syncCandidateOrchestrator: { syncSingle: vi.fn().mockResolvedValue({ resumeChanged: true, syncDetail: 'new' }) },
}))

vi.mock('../processingUtils', () => ({
  extractSingleRecord: vi.fn().mockResolvedValue({ text: 'resume text', tokens: 100 }),
  vectorizeSingleRecord: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../config', () => ({
  getConfig: () => ({ voyage: { defaultModel: 'voyage-3-large' } }),
}))

import { unifiedPipelineOrchestrator } from '../unifiedPipelineOrchestrator'
import { upstreamApiService } from '../upstreamApiService'
import { syncRepository } from '../../db/repositories/syncRepository'

describe('unifiedPipelineOrchestrator', () => {
  beforeEach(() => {
    vi.mocked(upstreamApiService.getEmployeesPaged).mockReset().mockResolvedValue({ totalRecords: 0, items: [] } as any)
    vi.mocked(upstreamApiService.getCandidatesPaged).mockReset().mockResolvedValue({ totalRecords: 0, items: [] } as any)
    vi.mocked(syncRepository.getFailedRecords).mockReset().mockReturnValue([])
  })

  it('should emit complete event when no records exist', async () => {
    const events: unknown[] = []
    await unifiedPipelineOrchestrator.run(
      { source: 'employees', token: 'test-token' },
      (e) => events.push(e),
    )

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
    expect(complete.progress.status).toBe('completed')
    expect(complete.progress.totalRecords).toBe(0)
  })

  it('should emit progress and record events when items are returned', async () => {
    vi.mocked(upstreamApiService.getEmployeesPaged)
      .mockResolvedValueOnce({
        totalRecords: 1,
        items: [{ userId: 1, fullName: 'John', email: 'j@t.com', isActive: true }],
      } as any)
      .mockResolvedValueOnce({ totalRecords: 1, items: [] } as any)

    vi.mocked(syncRepository.findEmployeeByUpstreamId).mockReturnValue({
      id: 1, full_name: 'John', has_resume: 1, resume_note_id: 10,
      resume_filename: 'resume.pdf', is_bench: 0, seniority: 'Senior',
      main_skill: 'React', status: 'synced',
    } as any)

    const events: unknown[] = []
    await unifiedPipelineOrchestrator.run(
      { source: 'employees', token: 'test-token' },
      (e) => events.push(e),
    )

    const progressEvents = events.filter((e: any) => e.type === 'progress')
    expect(progressEvents.length).toBeGreaterThan(0)

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
    expect(complete.progress.processedRecords).toBeGreaterThanOrEqual(1)
  })

  it('should pause when requestPause() is called', async () => {
    let callCount = 0
    vi.mocked(upstreamApiService.getEmployeesPaged).mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        setTimeout(() => unifiedPipelineOrchestrator.requestPause(), 0)
        return {
          totalRecords: 100,
          items: Array.from({ length: 10 }, (_, i) => ({
            userId: i, fullName: `E${i}`, email: `e${i}@t.com`, isActive: true,
          })),
        } as any
      }
      return { totalRecords: 100, items: [] } as any
    })

    const events: unknown[] = []
    await unifiedPipelineOrchestrator.run(
      { source: 'employees', token: 'test-token' },
      (e) => events.push(e),
    )

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
  })

  it('should retryAllFailed with empty failed records', async () => {
    vi.mocked(syncRepository.getFailedRecords).mockReturnValue([])

    const events: unknown[] = []
    await unifiedPipelineOrchestrator.retryAllFailed(
      { source: 'employees', token: 'test-token' },
      (e) => events.push(e),
    )

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
    expect(complete.progress.totalRecords).toBe(0)
  })

  it('should retrySingle return failed for missing upstream_id', async () => {
    vi.mocked(syncRepository.getFailedRecords).mockReturnValue([])

    const result = await unifiedPipelineOrchestrator.retrySingle({
      source: 'employees',
      token: 'test-token',
      upstreamId: 999,
    })

    expect(result.outcome).toBe('failed')
    expect(result.error).toContain('not found')
  })

  it('should emit record events for processed candidates', async () => {
    vi.mocked(upstreamApiService.getCandidatesPaged)
      .mockResolvedValueOnce({
        totalRecords: 1,
        items: [{ candidateId: 42, fullName: 'Jane', email: 'jane@test.com' }],
      } as any)
      .mockResolvedValueOnce({ totalRecords: 1, items: [] } as any)

    vi.mocked(syncRepository.findCandidateByUpstreamId).mockReturnValue({
      id: 42, full_name: 'Jane', has_resume: 1, resume_note_id: 5,
      resume_filename: 'resume.pdf', is_bench: 0, seniority: 'Mid',
      main_skill: 'TypeScript', status: 'synced',
    } as any)

    const events: unknown[] = []
    await unifiedPipelineOrchestrator.run(
      { source: 'candidates', token: 'test-token' },
      (e) => events.push(e),
    )

    const recordEvents = events.filter((e: any) => e.type === 'record')
    expect(recordEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('should include correct processed/total counts', async () => {
    vi.mocked(upstreamApiService.getEmployeesPaged)
      .mockResolvedValueOnce({
        totalRecords: 2,
        items: [
          { userId: 1, fullName: 'E1', email: 'e1@t.com', isActive: true },
          { userId: 2, fullName: 'E2', email: 'e2@t.com', isActive: true },
        ],
      } as any)
      .mockResolvedValueOnce({ totalRecords: 2, items: [] } as any)

    vi.mocked(syncRepository.findEmployeeByUpstreamId).mockReturnValue({
      id: 1, full_name: 'E', has_resume: 0, resume_note_id: null,
      resume_filename: null, is_bench: 0, seniority: 'Jr', main_skill: 'JS', status: 'synced',
    } as any)

    const events: unknown[] = []
    await unifiedPipelineOrchestrator.run(
      { source: 'employees', token: 'test-token' },
      (e) => events.push(e),
    )

    const complete = events.find((e: any) => e.type === 'complete') as any
    expect(complete).toBeDefined()
    expect(complete.progress.processedRecords).toBe(2)
  })
})
