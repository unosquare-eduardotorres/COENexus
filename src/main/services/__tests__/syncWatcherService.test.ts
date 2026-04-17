import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { syncWatcherService } from '../syncWatcherService'

const testDir = join(tmpdir(), `nexus-syncwatcher-test-${Date.now()}`)
const sharedDir = join(testDir, 'shared')

function writeManifest(manifest: Record<string, unknown>): void {
  writeFileSync(
    join(sharedDir, 'nexus-manifest.json'),
    JSON.stringify(manifest),
    'utf-8',
  )
}

function createManifest(overrides: Record<string, unknown> = {}) {
  return {
    latestSnapshot: 'nexus-snapshot-2026-04-16.db',
    latestHash: 'abc123hash',
    exportedAt: new Date().toISOString(),
    exportedBy: 'TestUser',
    schemaVersion: 8,
    recordCounts: { synced_employees: 100 },
    sizeBytes: 1024000,
    previousSnapshots: [],
    ...overrides,
  }
}

describe('syncWatcherService', () => {
  beforeEach(() => {
    mkdirSync(sharedDir, { recursive: true })
    syncWatcherService.stop()
  })

  afterEach(() => {
    syncWatcherService.stop()
    if (existsSync(testDir)) rmSync(testDir, { recursive: true })
  })

  it('should start in non-watching state', () => {
    const state = syncWatcherService.getState()
    expect(state.isWatching).toBe(false)
    expect(state.sharedPath).toBeNull()
  })

  it('should start watching when given a valid shared path', () => {
    syncWatcherService.start(sharedDir, () => null)
    const state = syncWatcherService.getState()
    expect(state.isWatching).toBe(true)
    expect(state.sharedPath).toBe(sharedDir)
  })

  it('should not start when shared path does not exist', () => {
    syncWatcherService.start('/nonexistent/path', () => null)
    const state = syncWatcherService.getState()
    expect(state.isWatching).toBe(false)
  })

  it('should read manifest on start and set lastKnownManifestHash', () => {
    const manifest = createManifest()
    writeManifest(manifest)

    syncWatcherService.start(sharedDir, () => null)
    const state = syncWatcherService.getState()
    expect(state.lastKnownManifestHash).toBe('abc123hash')
    expect(state.remoteManifest?.exportedBy).toBe('TestUser')
  })

  it('should detect updates via checkNow when manifest hash changes', () => {
    const manifest = createManifest()
    writeManifest(manifest)
    syncWatcherService.start(sharedDir, () => 'localhash999')

    writeManifest(createManifest({ latestHash: 'newhash456' }))
    const result = syncWatcherService.checkNow()

    expect(result.hasUpdate).toBe(true)
    expect(result.manifest?.latestHash).toBe('newhash456')
  })

  it('should not flag update when local hash matches remote', () => {
    const manifest = createManifest({ latestHash: 'samehash' })
    writeManifest(manifest)
    syncWatcherService.start(sharedDir, () => 'samehash')

    writeManifest(createManifest({ latestHash: 'samehash' }))
    const result = syncWatcherService.checkNow()

    expect(result.hasUpdate).toBe(false)
  })

  it('should notify listeners when new update is detected', () => {
    const manifest = createManifest()
    writeManifest(manifest)
    syncWatcherService.start(sharedDir, () => 'localhash')

    const listener = vi.fn()
    syncWatcherService.onUpdate(listener)

    writeManifest(createManifest({ latestHash: 'changed123', exportedBy: 'Eduardo' }))
    syncWatcherService.checkNow()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].exportedBy).toBe('Eduardo')
    expect(listener.mock.calls[0][0].latestHash).toBe('changed123')
  })

  it('should allow unsubscribing listeners', () => {
    const manifest = createManifest()
    writeManifest(manifest)
    syncWatcherService.start(sharedDir, () => 'localhash')

    const listener = vi.fn()
    const unsub = syncWatcherService.onUpdate(listener)
    unsub()

    writeManifest(createManifest({ latestHash: 'changed456' }))
    syncWatcherService.checkNow()

    expect(listener).not.toHaveBeenCalled()
  })

  it('should clear update flag', () => {
    const manifest = createManifest()
    writeManifest(manifest)
    syncWatcherService.start(sharedDir, () => 'localhash')

    writeManifest(createManifest({ latestHash: 'newhash' }))
    syncWatcherService.checkNow()
    expect(syncWatcherService.getState().hasUpdate).toBe(true)

    syncWatcherService.clearUpdateFlag()
    expect(syncWatcherService.getState().hasUpdate).toBe(false)
  })

  it('should stop watching and reset state', () => {
    syncWatcherService.start(sharedDir, () => null)
    expect(syncWatcherService.getState().isWatching).toBe(true)

    syncWatcherService.stop()
    const state = syncWatcherService.getState()
    expect(state.isWatching).toBe(false)
    expect(state.sharedPath).toBeNull()
    expect(state.remoteManifest).toBeNull()
  })

  it('should handle missing manifest gracefully on checkNow', () => {
    syncWatcherService.start(sharedDir, () => null)
    const result = syncWatcherService.checkNow()
    expect(result.hasUpdate).toBe(false)
    expect(result.manifest).toBeNull()
  })

  it('should handle malformed manifest gracefully', () => {
    writeFileSync(join(sharedDir, 'nexus-manifest.json'), 'not json', 'utf-8')
    syncWatcherService.start(sharedDir, () => null)
    const state = syncWatcherService.getState()
    expect(state.remoteManifest).toBeNull()
  })

  it('should restart with new path', () => {
    syncWatcherService.start(sharedDir, () => null)
    expect(syncWatcherService.getState().sharedPath).toBe(sharedDir)

    const newDir = join(testDir, 'shared2')
    mkdirSync(newDir, { recursive: true })
    syncWatcherService.restart(newDir, () => null)
    expect(syncWatcherService.getState().sharedPath).toBe(newDir)
  })
})
