import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRun, mockCancel, mockGetStatus } = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockCancel: vi.fn(),
  mockGetStatus: vi.fn(),
}))

vi.mock('../braniacExecutor', () => ({
  braniacExecutor: {
    run: mockRun,
    cancel: mockCancel,
    getStatus: mockGetStatus,
  },
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { braniacScheduler } from '../braniacScheduler'

describe('braniacScheduler', () => {
  beforeEach(() => {
    mockRun.mockReset()
    mockCancel.mockReset()
    mockGetStatus.mockReset()
  })

  it('should delegate trigger to braniacExecutor.run when not running', async () => {
    mockGetStatus.mockReturnValue({ running: false, job_id: null })
    const fakeJob = { id: 'job-1', status: 'running', agent_type: 'braniac' }
    mockRun.mockResolvedValue(fakeJob)

    const params = { scope: 'account' as const, account: 'Acme' }
    const result = await braniacScheduler.trigger(params)

    expect(mockRun).toHaveBeenCalledWith(params)
    expect(result).toBe(fakeJob)
  })

  it('should throw when braniacExecutor.getStatus().running === true', async () => {
    mockGetStatus.mockReturnValue({ running: true, job_id: 'existing-job' })

    await expect(
      braniacScheduler.trigger({ scope: 'account' as const, account: 'Acme' })
    ).rejects.toThrow('Braniac job already running')
  })

  it('should delegate cancel to braniacExecutor.cancel', () => {
    mockCancel.mockReturnValue(true)

    const result = braniacScheduler.cancel('job-1')

    expect(mockCancel).toHaveBeenCalledWith('job-1')
    expect(result).toBe(true)
  })

  it('should return braniacExecutor.getStatus() result', () => {
    const status = { running: false, job_id: null }
    mockGetStatus.mockReturnValue(status)

    expect(braniacScheduler.getStatus()).toBe(status)
  })
})
