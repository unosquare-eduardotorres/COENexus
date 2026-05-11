import { describe, expect, it, vi, beforeEach } from 'vitest'

const {
  mockCreateRun, mockUpdateRun, mockCreateActivityLog,
  mockGetRunById, mockGetActiveRun, mockSyncAsync, mockRequestPause,
} = vi.hoisted(() => ({
  mockCreateRun: vi.fn(),
  mockUpdateRun: vi.fn(),
  mockCreateActivityLog: vi.fn(),
  mockGetRunById: vi.fn(),
  mockGetActiveRun: vi.fn(),
  mockSyncAsync: vi.fn(),
  mockRequestPause: vi.fn(),
}))

vi.mock('../../db/agents/repositories/vigilRepository', () => ({
  vigilRepository: {
    createRun: mockCreateRun,
    updateRun: mockUpdateRun,
    createActivityLog: mockCreateActivityLog,
    getRunById: mockGetRunById,
    getActiveRun: mockGetActiveRun,
  },
}))

vi.mock('../syncOrchestrator', () => ({
  syncOrchestrator: {
    syncAsync: mockSyncAsync,
    requestPause: mockRequestPause,
  },
}))

vi.mock('../agentStepEmitter', () => ({
  createStepEmitter: () => ({
    narrate: vi.fn(),
    emitDirect: vi.fn(),
  }),
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

const fakeRun = {
  id: 'run-123',
  trigger_type: 'manual',
  status: 'running',
  sources_json: '["employees"]',
  results_json: null,
  started_at: '2026-01-01T00:00:00.000Z',
  completed_at: null,
  token_hash: 'abc123',
}

describe('vigilExecutor', () => {
  let vigilExecutor: typeof import('../vigilExecutor').vigilExecutor

  beforeEach(async () => {
    vi.resetModules()
    mockCreateRun.mockReset().mockReturnValue({ ...fakeRun })
    mockUpdateRun.mockReset().mockReturnValue(true)
    mockCreateActivityLog.mockReset().mockReturnValue({ id: 'log-1' })
    mockGetRunById.mockReset().mockReturnValue({ ...fakeRun, status: 'completed' })
    mockGetActiveRun.mockReset().mockReturnValue(undefined)
    mockSyncAsync.mockReset().mockImplementation((_source, _token, _opts, cb) => {
      cb?.({ type: 'complete', progress: { totalRecords: 10, fetchedRecords: 10, syncedCount: 10, updatedCount: 0, unchangedCount: 0, incompleteCount: 0, notProcessedCount: 0, skippedCount: 0, status: 'completed' } })
      return Promise.resolve()
    })
    mockRequestPause.mockReset()

    const mod = await import('../vigilExecutor')
    vigilExecutor = mod.vigilExecutor
  })

  it('should throw when token is empty/whitespace', async () => {
    await expect(vigilExecutor.run({ token: '   ' })).rejects.toThrow('Token is required')
  })

  it('should throw when already running (activeRunId set)', async () => {
    const slowSync = () => new Promise<void>(() => {})
    mockSyncAsync.mockImplementation(slowSync)

    const firstRun = vigilExecutor.run({ token: 'valid-token', sources: ['employees'] })

    await expect(vigilExecutor.run({ token: 'valid-token' })).rejects.toThrow('Vigil run already in progress')

    mockSyncAsync.mockImplementation((_s, _t, _o, cb) => {
      cb?.({ type: 'complete', progress: { totalRecords: 0, fetchedRecords: 0, syncedCount: 0, updatedCount: 0, unchangedCount: 0, incompleteCount: 0, notProcessedCount: 0, skippedCount: 0, status: 'completed' } })
      return Promise.resolve()
    })
  })

  it('should create vigilRepository run record with correct fields', async () => {
    await vigilExecutor.run({ token: 'valid-token', triggerType: 'scheduled', sources: ['employees'] })

    expect(mockCreateRun).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_type: 'scheduled',
        status: 'running',
        sources_json: '["employees"]',
      })
    )
  })

  it('should call syncOrchestrator.syncAsync for each source', async () => {
    await vigilExecutor.run({ token: 'valid-token', sources: ['employees', 'candidates'] })

    expect(mockSyncAsync).toHaveBeenCalledTimes(2)
    expect(mockSyncAsync.mock.calls[0][0]).toBe('employees')
    expect(mockSyncAsync.mock.calls[1][0]).toBe('candidates')
  })

  it('should retry failed source (max 2 attempts via runSourceWithRetry)', async () => {
    let callCount = 0
    mockSyncAsync.mockImplementation((_source, _token, _opts, cb) => {
      callCount++
      if (callCount === 1) {
        cb?.({ type: 'error', message: 'Connection failed' })
      } else {
        cb?.({ type: 'complete', progress: { totalRecords: 5, fetchedRecords: 5, syncedCount: 5, updatedCount: 0, unchangedCount: 0, incompleteCount: 0, notProcessedCount: 0, skippedCount: 0, status: 'completed' } })
      }
      return Promise.resolve()
    })

    await vigilExecutor.run({ token: 'valid-token', sources: ['employees'] })

    expect(mockSyncAsync).toHaveBeenCalledTimes(2)
  })

  it('should return completed run on success', async () => {
    const result = await vigilExecutor.run({ token: 'valid-token', sources: ['employees'] })

    expect(result).toBeDefined()
    expect(mockUpdateRun).toHaveBeenCalledWith(
      'run-123',
      expect.objectContaining({ status: 'completed' })
    )
  })

  it('should mark run as failed when source fails both attempts', async () => {
    mockSyncAsync.mockImplementation((_source, _token, _opts, cb) => {
      cb?.({ type: 'error', message: 'Persistent failure' })
      return Promise.resolve()
    })

    await vigilExecutor.run({ token: 'valid-token', sources: ['employees'] })

    expect(mockUpdateRun).toHaveBeenCalledWith(
      'run-123',
      expect.objectContaining({ status: 'failed' })
    )
  })

  it('should collect failed records up to MAX_FAILED_RECORDS', async () => {
    const emitEvent = vi.fn()
    mockSyncAsync.mockImplementation((_source, _token, _opts, cb) => {
      for (let i = 0; i < 3; i++) {
        cb?.({
          type: 'record',
          record: {
            id: `rec-${i}`,
            source: 'employees',
            status: 'sync_failed',
            name: `Failed ${i}`,
            email: `fail${i}@test.com`,
            hasResume: false,
            isBench: false,
            resumeChanged: false,
            upstreamId: i,
            syncedAt: '2026-01-01T00:00:00.000Z',
            reason: 'Error',
            seniority: 'Mid',
            mainSkill: 'JS',
            country: 'US',
          },
        })
      }
      cb?.({ type: 'complete', progress: { totalRecords: 3, fetchedRecords: 3, syncedCount: 0, updatedCount: 0, unchangedCount: 0, incompleteCount: 0, notProcessedCount: 0, skippedCount: 3, status: 'completed' } })
      return Promise.resolve()
    })

    await vigilExecutor.run({ token: 'valid-token', sources: ['employees'], emitEvent })

    const updateCall = mockUpdateRun.mock.calls.find(
      (c: unknown[]) => (c[1] as { results_json?: string }).results_json
    )
    expect(updateCall).toBeDefined()
    const results = JSON.parse((updateCall![1] as { results_json: string }).results_json)
    expect(results.failedRecords.length).toBe(3)
  })

  it('should cancel run and call syncOrchestrator.requestPause', async () => {
    mockGetActiveRun.mockReturnValue(undefined)

    const result = vigilExecutor.cancel('run-123')

    expect(result).toBe(true)
    expect(mockRequestPause).toHaveBeenCalled()
    expect(mockUpdateRun).toHaveBeenCalledWith(
      'run-123',
      expect.objectContaining({ status: 'canceled' })
    )
  })

  it('should return idle status when no active run', () => {
    mockGetActiveRun.mockReturnValue(undefined)

    const status = vigilExecutor.getStatus()

    expect(status.status).toBe('idle')
    expect(status.run_id).toBeNull()
  })
})
