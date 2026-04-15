import { describe, it, expect, vi } from 'vitest'

vi.mock('../services/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { wrapIpcHandler } from './errorHandler'
import type { IpcHandlerError } from './errorHandler'

function createMockEvent() {
  return { senderFrame: { url: 'file:///app' } } as any
}

describe('wrapIpcHandler', () => {
  it('should return handler result on success', async () => {
    const handler = vi.fn().mockResolvedValue({ data: 'test' })
    const wrapped = wrapIpcHandler('test:channel', handler)

    const result = await wrapped(createMockEvent())

    expect(result).toEqual({ data: 'test' })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('should catch errors and return IpcHandlerError', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Something failed'))
    const wrapped = wrapIpcHandler('test:channel', handler)

    const result = await wrapped(createMockEvent()) as IpcHandlerError

    expect(result.__ipcError).toBe(true)
    expect(result.message).toBe('Something failed')
    expect(result.channel).toBe('test:channel')
  })

  it('should handle non-Error thrown values', async () => {
    const handler = vi.fn().mockRejectedValue('string error')
    const wrapped = wrapIpcHandler('test:channel', handler)

    const result = await wrapped(createMockEvent()) as IpcHandlerError

    expect(result.__ipcError).toBe(true)
    expect(result.message).toBe('Unknown IPC error')
    expect(result.channel).toBe('test:channel')
  })

  it('should pass event and args to handler', async () => {
    const handler = vi.fn().mockResolvedValue('ok')
    const wrapped = wrapIpcHandler('test:channel', handler)
    const event = createMockEvent()

    await wrapped(event, 'arg1', 42)

    expect(handler).toHaveBeenCalledWith(event, 'arg1', 42)
  })

  it('should preserve the channel in error response', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('fail'))
    const wrapped = wrapIpcHandler('vem:match:search', handler)

    const result = await wrapped(createMockEvent()) as IpcHandlerError

    expect(result.channel).toBe('vem:match:search')
  })
})
