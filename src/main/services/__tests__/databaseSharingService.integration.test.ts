import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const testDir = join(tmpdir(), `nexus-dbsharing-test-${Date.now()}`)

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => name === 'userData' ? testDir : '/tmp',
    getAppPath: () => '/tmp/app',
    isPackaged: false,
  },
}))

vi.mock('../../db/connection', () => ({
  getDatabase: () => ({
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue({ c: 0 }),
    }),
    exec: vi.fn(),
    pragma: vi.fn(),
    backup: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { databaseSharingService } from '../databaseSharingService'

describe('databaseSharingService integration', () => {
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true })
  })

  it('should return default config when no config file exists', () => {
    const config = databaseSharingService.getConfig()
    expect(config.sharedPath).toBe('')
    expect(config.exporterName).toBe('')
  })

  it('should save and read config', () => {
    databaseSharingService.saveConfig({ sharedPath: '/shared/folder', exporterName: 'admin' })
    const config = databaseSharingService.getConfig()
    expect(config.sharedPath).toBe('/shared/folder')
    expect(config.exporterName).toBe('admin')
  })

  it('should list empty snapshots when sharedPath has no db files', () => {
    const sharedDir = join(testDir, 'shared')
    mkdirSync(sharedDir, { recursive: true })
    databaseSharingService.saveConfig({ sharedPath: sharedDir, exporterName: 'admin' })

    const result = databaseSharingService.listSnapshots()
    expect(result.snapshots).toEqual([])
  })

  it('should list empty snapshots when sharedPath does not exist', () => {
    databaseSharingService.saveConfig({ sharedPath: '/nonexistent', exporterName: 'admin' })
    const result = databaseSharingService.listSnapshots()
    expect(result.snapshots).toEqual([])
  })

  it('should report database status', () => {
    const status = databaseSharingService.getStatus()
    expect(status).toBeDefined()
  })
})
