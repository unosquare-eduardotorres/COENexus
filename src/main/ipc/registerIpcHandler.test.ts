import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

vi.mock('./errorHandler', () => ({
  wrapIpcHandler: vi.fn((_channel: string, handler: Function) => handler),
}))

import { ipcMain } from 'electron'
import { registerIpcHandler } from './registerIpcHandler'
import { wrapIpcHandler } from './errorHandler'

describe('registerIpcHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register handler on ipcMain.handle with correct channel', () => {
    const handler = vi.fn()

    registerIpcHandler('app:getVersion' as any, handler)

    expect(ipcMain.handle).toHaveBeenCalledWith('app:getVersion', expect.any(Function))
  })

  it('should wrap handler with wrapIpcHandler for error handling', () => {
    const handler = vi.fn()

    registerIpcHandler('app:getVersion' as any, handler)

    expect(wrapIpcHandler).toHaveBeenCalledWith('app:getVersion', handler)
  })

  it('should register multiple handlers independently', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    registerIpcHandler('app:getVersion' as any, handler1)
    registerIpcHandler('app:getPlatform' as any, handler2)

    expect(ipcMain.handle).toHaveBeenCalledTimes(2)
  })
})
