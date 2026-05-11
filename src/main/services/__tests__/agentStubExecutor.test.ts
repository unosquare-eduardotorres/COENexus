import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { mockNarrate, mockEmitDirect } = vi.hoisted(() => ({
  mockNarrate: vi.fn(),
  mockEmitDirect: vi.fn(),
}))

vi.mock('../agentStepEmitter', () => ({
  createStepEmitter: () => ({
    narrate: mockNarrate,
    emitDirect: mockEmitDirect,
  }),
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { agentStubExecutor } from '../agentStubExecutor'

function makeFakeEvent() {
  return { sender: { send: vi.fn() } } as unknown as import('electron').IpcMainInvokeEvent
}

describe('agentStubExecutor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockNarrate.mockReset().mockResolvedValue(undefined)
    mockEmitDirect.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return success: false for unknown agentId', async () => {
    const result = await agentStubExecutor.run({
      agentId: 'unknown-agent' as any,
      event: makeFakeEvent(),
    })

    expect(result.success).toBe(false)
    expect(result.runId).toBeDefined()
  })

  it('should emit narrate calls for each step in switchboard', async () => {
    const promise = agentStubExecutor.run({
      agentId: 'switchboard',
      event: makeFakeEvent(),
    })

    await vi.advanceTimersByTimeAsync(10_000)
    await promise

    expect(mockNarrate).toHaveBeenCalledTimes(3)
    expect(mockNarrate.mock.calls[0][0]).toBe('Ingesting request context')
    expect(mockNarrate.mock.calls[1][0]).toBe('Mapping dependencies')
    expect(mockNarrate.mock.calls[2][0]).toBe('Publishing routing plan')
  })

  it('should emit emitDirect "Stub run complete" at end', async () => {
    const promise = agentStubExecutor.run({
      agentId: 'switchboard',
      event: makeFakeEvent(),
    })

    await vi.advanceTimersByTimeAsync(10_000)
    await promise

    expect(mockEmitDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        step: 'Stub run complete',
        status: 'completed',
      })
    )
  })

  it('should emit correct step count for sensei agent', async () => {
    const promise = agentStubExecutor.run({
      agentId: 'sensei',
      event: makeFakeEvent(),
    })

    await vi.advanceTimersByTimeAsync(10_000)
    await promise

    expect(mockNarrate).toHaveBeenCalledTimes(3)
    expect(mockNarrate.mock.calls[0][0]).toBe('Reviewing objective')
  })

  it('should re-throw and emit "Stub run failed" on error', async () => {
    mockNarrate.mockRejectedValueOnce(new Error('IPC send failed'))

    await expect(
      agentStubExecutor.run({
        agentId: 'switchboard',
        event: makeFakeEvent(),
      })
    ).rejects.toThrow('IPC send failed')

    expect(mockEmitDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        step: 'Stub run failed',
        status: 'failed',
      })
    )
  })
})
