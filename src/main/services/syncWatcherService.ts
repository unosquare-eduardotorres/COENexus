import { watch, existsSync, readFileSync } from 'fs'
import type { FSWatcher } from 'fs'
import { join } from 'path'
import { createLogger } from './logger'

const log = createLogger('SyncWatcher')

const MANIFEST_FILENAME = 'nexus-manifest.json'
const POLL_INTERVAL_MS = 60_000
const DEBOUNCE_MS = 2_000

interface SyncManifest {
  latestSnapshot: string
  latestHash: string
  exportedAt: string
  exportedBy: string
  schemaVersion: number
  recordCounts: Record<string, number>
  sizeBytes: number
  previousSnapshots: Array<{
    filename: string
    hash: string
    exportedAt: string
    exportedBy: string
  }>
}

interface SyncWatcherState {
  isWatching: boolean
  sharedPath: string | null
  lastKnownManifestHash: string | null
  lastCheckedAt: string | null
  hasUpdate: boolean
  remoteManifest: SyncManifest | null
}

type SyncUpdateListener = (manifest: SyncManifest) => void

let watcher: FSWatcher | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let listeners: SyncUpdateListener[] = []
let localDbHashFn: (() => string | null) | null = null

let state: SyncWatcherState = {
  isWatching: false,
  sharedPath: null,
  lastKnownManifestHash: null,
  lastCheckedAt: null,
  hasUpdate: false,
  remoteManifest: null,
}

function readManifest(sharedPath: string): SyncManifest | null {
  const manifestPath = join(sharedPath, MANIFEST_FILENAME)
  if (!existsSync(manifestPath)) return null
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as SyncManifest
  } catch (err) {
    log.error('Failed to read manifest', err instanceof Error ? err : new Error(String(err)))
    return null
  }
}

function checkManifest(): void {
  if (!state.sharedPath) return

  const manifest = readManifest(state.sharedPath)
  state.lastCheckedAt = new Date().toISOString()

  if (!manifest) {
    state.remoteManifest = null
    state.hasUpdate = false
    return
  }

  const manifestChanged = manifest.latestHash !== state.lastKnownManifestHash
  state.remoteManifest = manifest

  if (manifestChanged && state.lastKnownManifestHash !== null) {
    const localHash = localDbHashFn?.() ?? null
    const isNewForUs = localHash !== manifest.latestHash

    if (isNewForUs) {
      state.hasUpdate = true
      log.info('New snapshot detected', {
        filename: manifest.latestSnapshot,
        exportedBy: manifest.exportedBy,
        hash: manifest.latestHash.slice(0, 12),
      })
      for (const listener of listeners) {
        try {
          listener(manifest)
        } catch (err) {
          log.error('Sync update listener error', err instanceof Error ? err : new Error(String(err)))
        }
      }
    }
  }

  state.lastKnownManifestHash = manifest.latestHash
}

function debouncedCheck(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    checkManifest()
    debounceTimer = null
  }, DEBOUNCE_MS)
}

function startFileWatcher(sharedPath: string): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }

  const manifestPath = join(sharedPath, MANIFEST_FILENAME)

  try {
    watcher = watch(sharedPath, (eventType, filename) => {
      if (filename === MANIFEST_FILENAME || filename === null) {
        debouncedCheck()
      }
    })

    watcher.on('error', (err) => {
      log.warn('File watcher error — falling back to polling only', { error: err.message })
      if (watcher) {
        watcher.close()
        watcher = null
      }
    })

    log.info('File watcher started', { path: manifestPath })
  } catch (err) {
    log.warn('Failed to start file watcher — using polling only', { error: (err as Error).message })
  }
}

export const syncWatcherService = {
  start(sharedPath: string, getLocalDbHash: () => string | null): void {
    if (state.isWatching) this.stop()

    if (!sharedPath || !existsSync(sharedPath)) {
      log.info('Sync watcher not started — shared path not configured or does not exist', { sharedPath })
      return
    }

    state.sharedPath = sharedPath
    state.isWatching = true
    localDbHashFn = getLocalDbHash

    const manifest = readManifest(sharedPath)
    if (manifest) {
      state.lastKnownManifestHash = manifest.latestHash
      state.remoteManifest = manifest
    }

    startFileWatcher(sharedPath)

    pollTimer = setInterval(() => {
      checkManifest()
    }, POLL_INTERVAL_MS)

    log.info('Sync watcher started', { sharedPath, pollIntervalMs: POLL_INTERVAL_MS })
  },

  stop(): void {
    if (watcher) {
      watcher.close()
      watcher = null
    }
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    state = {
      isWatching: false,
      sharedPath: null,
      lastKnownManifestHash: null,
      lastCheckedAt: null,
      hasUpdate: false,
      remoteManifest: null,
    }
    localDbHashFn = null

    log.info('Sync watcher stopped')
  },

  restart(sharedPath: string, getLocalDbHash: () => string | null): void {
    this.stop()
    this.start(sharedPath, getLocalDbHash)
  },

  onUpdate(listener: SyncUpdateListener): () => void {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  },

  checkNow(): { hasUpdate: boolean; manifest: SyncManifest | null } {
    checkManifest()
    return { hasUpdate: state.hasUpdate, manifest: state.remoteManifest }
  },

  clearUpdateFlag(): void {
    state.hasUpdate = false
  },

  getState(): SyncWatcherState {
    return { ...state }
  },
}
