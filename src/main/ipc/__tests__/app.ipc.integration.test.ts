import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  app: {
    getVersion: () => '2.5.0',
    getPath: () => '/tmp',
    getAppPath: () => '/tmp/app',
    isPackaged: false,
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
    showItemInFolder: vi.fn(),
    openPath: vi.fn().mockResolvedValue(''),
  },
}))

vi.mock('../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../errorHandler', () => ({
  wrapIpcHandler: vi.fn((_channel: string, handler: Function) => handler),
}))

import { registerAppHandlers } from '../app.ipc'
import { ipcMain } from 'electron'

const mockHandle = vi.mocked(ipcMain.handle)

function getHandler(channel: string) {
  const call = mockHandle.mock.calls.find(
    ([ch]: [string]) => ch === channel
  )
  if (!call) throw new Error(`Handler for ${channel} not registered`)
  return call[1]
}

const fakeEvent = { senderFrame: { url: 'file:///index.html' } }

describe('app.ipc integration', () => {
  beforeAll(() => {
    registerAppHandlers()
  })

  it('should register multiple handlers', () => {
    expect(mockHandle).toHaveBeenCalled()
    expect(mockHandle.mock.calls.length).toBeGreaterThanOrEqual(5)
  })

  it('app:get-version should return app version', async () => {
    const handler = getHandler('app:get-version')
    const result = await handler(fakeEvent)
    expect(result).toBe('2.5.0')
  })

  it('app:get-platform should return process.platform', async () => {
    const handler = getHandler('app:get-platform')
    const result = await handler(fakeEvent)
    expect(typeof result).toBe('string')
  })

  it('app:open-external should reject unsupported protocols', async () => {
    const handler = getHandler('app:open-external')
    await expect(handler(fakeEvent, 'ftp://evil.com')).rejects.toThrow('Invalid or unsupported URL')
  })

  it('app:open-external should throw when no URL provided', async () => {
    const handler = getHandler('app:open-external')
    await expect(handler(fakeEvent, '')).rejects.toThrow('URL is required')
  })

  it('app:show-item-in-folder should throw when no path provided', async () => {
    const handler = getHandler('app:show-item-in-folder')
    await expect(handler(fakeEvent, '')).rejects.toThrow('File path is required')
  })

  it('app:read-bundled-file should reject path traversal', async () => {
    const handler = getHandler('app:read-bundled-file')
    await expect(handler(fakeEvent, '../../etc/passwd')).rejects.toThrow()
  })

  it('app:read-bundled-file should throw for empty path', async () => {
    const handler = getHandler('app:read-bundled-file')
    await expect(handler(fakeEvent, '')).rejects.toThrow('Relative path is required')
  })
})
