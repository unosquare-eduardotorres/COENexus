import { app } from 'electron'
import { join, basename } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import Database from 'better-sqlite3'
import { getDatabase, closeDatabase, initDatabase } from '../db/connection'
import { createLogger } from './logger'

const log = createLogger('DatabaseSharing')

interface DatabaseSharingConfig {
  sharedPath: string
  exporterName: string
}

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

interface SnapshotMeta {
  exportedAt: string
  exportedBy: string
  tables: string[]
  recordCounts: Record<string, number>
  sizeBytes: number
  version: string
}

interface SnapshotInfo {
  filename: string
  exportedAt: string
  exportedBy: string
  sizeBytes: number
  recordCounts: Record<string, number>
  isNew: boolean
}

interface ExportResult {
  filename: string
  sizeBytes: number
  recordCounts: Record<string, number>
  exportedAt: string
  hash: string
}

interface ImportResult {
  success: boolean
  tablesRestored: number
  recordCounts: Record<string, number>
  vecEntriesRebuilt: number
}

interface DatabaseStatus {
  recordCounts: Record<string, number>
  lastImportedAt: string | null
  lastImportedFile: string | null
  localDbHash: string | null
}

const MANIFEST_FILENAME = 'nexus-manifest.json'
const MAX_PREVIOUS_SNAPSHOTS = 5

const TABLES = [
  'synced_employees',
  'synced_candidates',
  'synced_open_positions',
  'resume_embeddings',
  'match_sessions',
  'resume_sessions',
  'transform_sessions',
  'open_position_candidates',
  'open_position_discussions',
  'candidate_analysis_cache',
  'synced_project_reallocations',
  'prr_presentations',
  'synced_placement_margins',
  'synced_placement_margin_summary',
  'synced_offboardings',
] as const

function getConfigFilePath(): string {
  return join(app.getPath('userData'), 'db-sharing-config.json')
}

function getDbPath(): string {
  return join(app.getPath('userData'), 'nexus.db')
}

function getRecordCounts(): Record<string, number> {
  const db = getDatabase()
  const counts: Record<string, number> = {}
  for (const table of TABLES) {
    const result = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }
    counts[table] = result.c
  }
  return counts
}

function computeFileHash(filePath: string): string {
  const fileBuffer = readFileSync(filePath)
  return createHash('sha256').update(fileBuffer).digest('hex')
}

function getSchemaVersion(): number {
  const db = getDatabase()
  const row = db.prepare('SELECT MAX(version) as v FROM schema_migrations').get() as { v: number } | undefined
  return row?.v ?? 0
}

function validateSchemaCompatibility(sourcePath: string): void {
  const tempDb = new Database(sourcePath, { readonly: true })
  try {
    const hasTable = tempDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
    ).get()
    if (!hasTable) {
      throw new Error('Snapshot is missing schema_migrations table — cannot verify compatibility')
    }

    const row = tempDb.prepare('SELECT MAX(version) as v FROM schema_migrations').get() as { v: number } | undefined
    const remoteVersion = row?.v ?? 0
    const localVersion = getSchemaVersion()

    if (remoteVersion > localVersion) {
      throw new Error(
        `Snapshot requires schema v${remoteVersion} but this app is at v${localVersion}. ` +
        'Update the app before importing.'
      )
    }
  } finally {
    tempDb.close()
  }
}

function rebuildVecIndex(): number {
  const db = getDatabase()

  const hasVecTable = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='vec_embeddings'"
  ).get()
  if (!hasVecTable) {
    log.warn('vec_embeddings table not found — skipping index rebuild (sqlite-vec may not be loaded)')
    return 0
  }

  const embeddings = db.prepare(
    'SELECT id, embedding FROM resume_embeddings WHERE embedding IS NOT NULL'
  ).all() as { id: number; embedding: Buffer }[]

  let rebuilt = 0
  const deleteStmt = db.prepare('DELETE FROM vec_embeddings WHERE rowid = ?')
  const insertStmt = db.prepare('INSERT INTO vec_embeddings(rowid, embedding) VALUES (?, ?)')
  const rebuildVec = db.transaction((id: bigint, buf: Buffer) => {
    deleteStmt.run(id)
    insertStmt.run(id, buf)
  })

  for (const row of embeddings) {
    if (row.embedding.length > 0) {
      rebuildVec(BigInt(row.id), row.embedding)
      rebuilt++
    }
  }

  if (rebuilt > 0) {
    log.info('Vec index rebuilt after import', { newEntries: rebuilt, totalEmbeddings: embeddings.length })
  }

  return rebuilt
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

function writeManifest(sharedPath: string, manifest: SyncManifest): void {
  const manifestPath = join(sharedPath, MANIFEST_FILENAME)
  const tempPath = `${manifestPath}.tmp`
  writeFileSync(tempPath, JSON.stringify(manifest, null, 2), 'utf-8')
  renameSync(tempPath, manifestPath)
}

function importDatabaseFile(
  sourcePath: string,
  displayFilename: string
): { tablesRestored: number; recordCounts: Record<string, number>; vecEntriesRebuilt: number } {
  validateSchemaCompatibility(sourcePath)

  closeDatabase()
  const dbPath = getDbPath()
  const backupPath = `${dbPath}.backup`

  try {
    if (existsSync(dbPath)) copyFileSync(dbPath, backupPath)
    copyFileSync(sourcePath, dbPath)
    initDatabase()

    const vecEntriesRebuilt = rebuildVecIndex()
    const recordCounts = getRecordCounts()

    const importMeta = {
      lastImportedAt: new Date().toISOString(),
      lastImportedFile: displayFilename,
    }
    writeFileSync(
      join(app.getPath('userData'), 'last-import.json'),
      JSON.stringify(importMeta, null, 2),
      'utf-8'
    )

    log.info('Database imported successfully', {
      file: displayFilename,
      tables: TABLES.length,
      records: recordCounts,
      vecRebuilt: vecEntriesRebuilt,
    })
    return { tablesRestored: TABLES.length, recordCounts, vecEntriesRebuilt }
  } catch (err) {
    log.error('Database import failed, attempting rollback', err instanceof Error ? err : new Error(String(err)), { file: displayFilename })
    if (existsSync(backupPath)) {
      copyFileSync(backupPath, dbPath)
    }
    initDatabase()
    throw err
  }
}

export const databaseSharingService = {
  getConfig(): DatabaseSharingConfig {
    const path = getConfigFilePath()
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf-8')) as DatabaseSharingConfig
      } catch (err) {
        log.error('Failed to read config, using defaults', err instanceof Error ? err : new Error(String(err)))
        return { sharedPath: '', exporterName: '' }
      }
    }
    return { sharedPath: '', exporterName: '' }
  },

  saveConfig(config: DatabaseSharingConfig): void {
    writeFileSync(getConfigFilePath(), JSON.stringify(config, null, 2), 'utf-8')
    log.info('Sharing config saved', { sharedPath: config.sharedPath, exporterName: config.exporterName })
  },

  exportSnapshot(): ExportResult {
    const config = this.getConfig()
    if (!config.sharedPath) throw new Error('Shared path not configured')

    log.info('Snapshot export started', { sharedPath: config.sharedPath })

    if (!existsSync(config.sharedPath)) {
      mkdirSync(config.sharedPath, { recursive: true })
    }

    const dbPath = getDbPath()
    if (!existsSync(dbPath)) throw new Error('Database file not found')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const exporterSuffix = config.exporterName ? `-${config.exporterName.replace(/\s+/g, '_')}` : ''
    const filename = `nexus-snapshot-${timestamp}${exporterSuffix}.db`
    const destPath = join(config.sharedPath, filename)

    getDatabase().pragma('wal_checkpoint(TRUNCATE)')
    copyFileSync(dbPath, destPath)

    const recordCounts = getRecordCounts()
    const stat = statSync(destPath)
    const hash = computeFileHash(destPath)

    const meta: SnapshotMeta = {
      exportedAt: new Date().toISOString(),
      exportedBy: config.exporterName || 'unknown',
      tables: [...TABLES],
      recordCounts,
      sizeBytes: stat.size,
      version: '1.0',
    }
    writeFileSync(`${destPath}.meta.json`, JSON.stringify(meta, null, 2), 'utf-8')

    const existingManifest = readManifest(config.sharedPath)
    const previousSnapshots = existingManifest?.previousSnapshots ?? []
    if (existingManifest?.latestSnapshot) {
      previousSnapshots.unshift({
        filename: existingManifest.latestSnapshot,
        hash: existingManifest.latestHash,
        exportedAt: existingManifest.exportedAt,
        exportedBy: existingManifest.exportedBy,
      })
      if (previousSnapshots.length > MAX_PREVIOUS_SNAPSHOTS) {
        previousSnapshots.length = MAX_PREVIOUS_SNAPSHOTS
      }
    }

    const manifest: SyncManifest = {
      latestSnapshot: filename,
      latestHash: hash,
      exportedAt: meta.exportedAt,
      exportedBy: meta.exportedBy,
      schemaVersion: getSchemaVersion(),
      recordCounts,
      sizeBytes: stat.size,
      previousSnapshots,
    }
    writeManifest(config.sharedPath, manifest)

    log.info('Snapshot exported with manifest', { filename, hash: hash.slice(0, 12), sizeBytes: stat.size })

    return {
      filename,
      sizeBytes: stat.size,
      recordCounts,
      exportedAt: meta.exportedAt,
      hash,
    }
  },

  importSnapshot(filename: string): ImportResult {
    const config = this.getConfig()
    if (!config.sharedPath) throw new Error('Shared path not configured')
    const sourcePath = join(config.sharedPath, filename)
    if (!existsSync(sourcePath)) throw new Error(`Snapshot not found: ${filename}`)
    log.info('Snapshot import started', { filename })
    const { tablesRestored, recordCounts, vecEntriesRebuilt } = importDatabaseFile(sourcePath, filename)
    return { success: true, tablesRestored, recordCounts, vecEntriesRebuilt }
  },

  importFromAbsolutePath(sourcePath: string): { success: boolean; filePath: string; tablesRestored: number; recordCounts: Record<string, number>; vecEntriesRebuilt: number } {
    if (!existsSync(sourcePath)) throw new Error(`File not found: ${sourcePath}`)
    log.info('Database file import started', { path: sourcePath })
    const { tablesRestored, recordCounts, vecEntriesRebuilt } = importDatabaseFile(sourcePath, basename(sourcePath))
    return { success: true, filePath: sourcePath, tablesRestored, recordCounts, vecEntriesRebuilt }
  },

  importLatest(): ImportResult {
    const config = this.getConfig()
    if (!config.sharedPath) throw new Error('Shared path not configured')

    const manifest = readManifest(config.sharedPath)
    if (!manifest) throw new Error('No manifest found in shared folder')

    const sourcePath = join(config.sharedPath, manifest.latestSnapshot)
    if (!existsSync(sourcePath)) throw new Error(`Latest snapshot not found: ${manifest.latestSnapshot}`)

    log.info('Auto-import from manifest', { filename: manifest.latestSnapshot, exportedBy: manifest.exportedBy })
    const { tablesRestored, recordCounts, vecEntriesRebuilt } = importDatabaseFile(sourcePath, manifest.latestSnapshot)
    return { success: true, tablesRestored, recordCounts, vecEntriesRebuilt }
  },

  listSnapshots(): SnapshotInfo[] {
    const config = this.getConfig()
    if (!config.sharedPath || !existsSync(config.sharedPath)) return []

    const manifest = readManifest(config.sharedPath)
    const localHash = this.getLocalDbHash()

    const files = readdirSync(config.sharedPath)
      .filter(f => f.startsWith('nexus-snapshot-') && f.endsWith('.db'))
      .sort()
      .reverse()

    return files.map(filename => {
      const metaPath = join(config.sharedPath, `${filename}.meta.json`)
      const filePath = join(config.sharedPath, filename)
      const stat = statSync(filePath)

      const isLatest = manifest?.latestSnapshot === filename
      const isNew = isLatest && manifest?.latestHash !== localHash

      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as SnapshotMeta
          return {
            filename,
            exportedAt: meta.exportedAt,
            exportedBy: meta.exportedBy,
            sizeBytes: meta.sizeBytes,
            recordCounts: meta.recordCounts,
            isNew,
          }
        } catch (err) {
          log.error(`Failed to parse snapshot metadata for ${filename}`, err instanceof Error ? err : new Error(String(err)))
        }
      }

      return {
        filename,
        exportedAt: stat.mtime.toISOString(),
        exportedBy: 'unknown',
        sizeBytes: stat.size,
        recordCounts: {},
        isNew,
      }
    })
  },

  getManifest(): SyncManifest | null {
    const config = this.getConfig()
    if (!config.sharedPath) return null
    return readManifest(config.sharedPath)
  },

  getLocalDbHash(): string | null {
    const dbPath = getDbPath()
    if (!existsSync(dbPath)) return null
    try {
      getDatabase().pragma('wal_checkpoint(PASSIVE)')
      return computeFileHash(dbPath)
    } catch (err) {
      log.error('Failed to compute local DB hash', err instanceof Error ? err : new Error(String(err)))
      return null
    }
  },

  checkForUpdates(): { hasUpdate: boolean; manifest: SyncManifest | null; localHash: string | null } {
    const config = this.getConfig()
    if (!config.sharedPath) return { hasUpdate: false, manifest: null, localHash: null }

    const manifest = readManifest(config.sharedPath)
    if (!manifest) return { hasUpdate: false, manifest: null, localHash: null }

    const localHash = this.getLocalDbHash()
    const hasUpdate = localHash !== manifest.latestHash

    return { hasUpdate, manifest, localHash }
  },

  getStatus(): DatabaseStatus {
    const recordCounts = getRecordCounts()
    const importMetaPath = join(app.getPath('userData'), 'last-import.json')

    let lastImportedAt: string | null = null
    let lastImportedFile: string | null = null

    if (existsSync(importMetaPath)) {
      try {
        const meta = JSON.parse(readFileSync(importMetaPath, 'utf-8'))
        lastImportedAt = meta.lastImportedAt ?? null
        lastImportedFile = meta.lastImportedFile ?? null
      } catch (err) {
        log.error('Failed to parse last import metadata', err instanceof Error ? err : new Error(String(err)))
      }
    }

    const localDbHash = this.getLocalDbHash()

    return { recordCounts, lastImportedAt, lastImportedFile, localDbHash }
  },
}
