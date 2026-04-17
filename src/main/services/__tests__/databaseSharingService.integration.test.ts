import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs'
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
  closeDatabase: vi.fn(),
  initDatabase: vi.fn(),
}))

vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({ v: 8, name: 'schema_migrations' }),
      }),
      close: vi.fn(),
    })),
  }
})

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
    expect(result).toEqual([])
  })

  it('should list empty snapshots when sharedPath does not exist', () => {
    databaseSharingService.saveConfig({ sharedPath: '/nonexistent', exporterName: 'admin' })
    const result = databaseSharingService.listSnapshots()
    expect(result).toEqual([])
  })

  it('should report database status with localDbHash', () => {
    const status = databaseSharingService.getStatus()
    expect(status).toBeDefined()
    expect(status).toHaveProperty('localDbHash')
    expect(status).toHaveProperty('recordCounts')
    expect(status).toHaveProperty('lastImportedAt')
    expect(status).toHaveProperty('lastImportedFile')
  })

  describe('manifest', () => {
    it('should return null manifest when shared path not configured', () => {
      const manifest = databaseSharingService.getManifest()
      expect(manifest).toBeNull()
    })

    it('should return null manifest when no manifest file exists', () => {
      const sharedDir = join(testDir, 'shared-manifest')
      mkdirSync(sharedDir, { recursive: true })
      databaseSharingService.saveConfig({ sharedPath: sharedDir, exporterName: 'tester' })

      const manifest = databaseSharingService.getManifest()
      expect(manifest).toBeNull()
    })

    it('should read a written manifest from shared folder', () => {
      const sharedDir = join(testDir, 'shared-read')
      mkdirSync(sharedDir, { recursive: true })
      databaseSharingService.saveConfig({ sharedPath: sharedDir, exporterName: 'tester' })

      const testManifest = {
        latestSnapshot: 'test-snapshot.db',
        latestHash: 'testhash123',
        exportedAt: '2026-04-16T00:00:00.000Z',
        exportedBy: 'tester',
        schemaVersion: 8,
        recordCounts: { synced_employees: 50 },
        sizeBytes: 500000,
        previousSnapshots: [],
      }
      writeFileSync(join(sharedDir, 'nexus-manifest.json'), JSON.stringify(testManifest), 'utf-8')

      const manifest = databaseSharingService.getManifest()
      expect(manifest).not.toBeNull()
      expect(manifest!.latestSnapshot).toBe('test-snapshot.db')
      expect(manifest!.latestHash).toBe('testhash123')
      expect(manifest!.exportedBy).toBe('tester')
      expect(manifest!.schemaVersion).toBe(8)
    })
  })

  describe('checkForUpdates', () => {
    it('should return hasUpdate=false when no shared path', () => {
      const result = databaseSharingService.checkForUpdates()
      expect(result.hasUpdate).toBe(false)
      expect(result.manifest).toBeNull()
    })

    it('should return hasUpdate=false when no manifest exists', () => {
      const sharedDir = join(testDir, 'shared-check')
      mkdirSync(sharedDir, { recursive: true })
      databaseSharingService.saveConfig({ sharedPath: sharedDir, exporterName: 'tester' })

      const result = databaseSharingService.checkForUpdates()
      expect(result.hasUpdate).toBe(false)
    })
  })

  describe('snapshot listing with manifest-based isNew', () => {
    it('should mark latest snapshot as isNew when local hash differs', () => {
      const sharedDir = join(testDir, 'shared-new')
      mkdirSync(sharedDir, { recursive: true })
      databaseSharingService.saveConfig({ sharedPath: sharedDir, exporterName: 'admin' })

      const snapshotFilename = 'nexus-snapshot-2026-04-16T00-00-00-admin.db'
      writeFileSync(join(sharedDir, snapshotFilename), 'fake-db-content', 'utf-8')

      const manifest = {
        latestSnapshot: snapshotFilename,
        latestHash: 'remotehash-different',
        exportedAt: '2026-04-16T00:00:00.000Z',
        exportedBy: 'admin',
        schemaVersion: 8,
        recordCounts: {},
        sizeBytes: 100,
        previousSnapshots: [],
      }
      writeFileSync(join(sharedDir, 'nexus-manifest.json'), JSON.stringify(manifest), 'utf-8')

      const snapshots = databaseSharingService.listSnapshots()
      expect(snapshots.length).toBe(1)
      expect(snapshots[0].filename).toBe(snapshotFilename)
      expect(snapshots[0].isNew).toBe(true)
    })
  })
})
