import { app } from 'electron'
import { join, basename } from 'path'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { getDatabase, closeDatabase, initDatabase } from '../db/connection'
import { createLogger } from './logger'

const log = createLogger('DatabaseSharing')

interface DatabaseSharingConfig {
  sharedPath: string
  exporterName: string
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
}

interface ImportResult {
  success: boolean
  tablesRestored: number
  recordCounts: Record<string, number>
}

interface DatabaseStatus {
  recordCounts: Record<string, number>
  lastImportedAt: string | null
  lastImportedFile: string | null
}

const TABLES = [
  'synced_employees',
  'synced_candidates',
  'synced_open_positions',
  'resume_embeddings',
  'match_sessions',
  'resume_sessions',
  'transform_sessions',
  'open_position_candidates',
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

function importDatabaseFile(sourcePath: string, displayFilename: string): { tablesRestored: number; recordCounts: Record<string, number> } {
  closeDatabase()
  const dbPath = getDbPath()
  const backupPath = `${dbPath}.backup`

  try {
    if (existsSync(dbPath)) copyFileSync(dbPath, backupPath)
    copyFileSync(sourcePath, dbPath)
    initDatabase()

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

    log.info('Database imported successfully', { file: displayFilename, tables: TABLES.length, records: recordCounts })
    return { tablesRestored: TABLES.length, recordCounts }
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

    const meta: SnapshotMeta = {
      exportedAt: new Date().toISOString(),
      exportedBy: config.exporterName || 'unknown',
      tables: [...TABLES],
      recordCounts,
      sizeBytes: stat.size,
      version: '1.0',
    }

    writeFileSync(`${destPath}.meta.json`, JSON.stringify(meta, null, 2), 'utf-8')

    log.info('Snapshot exported', { filename, sizeBytes: stat.size, records: recordCounts })

    return {
      filename,
      sizeBytes: stat.size,
      recordCounts,
      exportedAt: meta.exportedAt,
    }
  },

  importSnapshot(filename: string): ImportResult {
    const config = this.getConfig()
    if (!config.sharedPath) throw new Error('Shared path not configured')
    const sourcePath = join(config.sharedPath, filename)
    if (!existsSync(sourcePath)) throw new Error(`Snapshot not found: ${filename}`)
    log.info('Snapshot import started', { filename })
    const { tablesRestored, recordCounts } = importDatabaseFile(sourcePath, filename)
    return { success: true, tablesRestored, recordCounts }
  },

  importFromAbsolutePath(sourcePath: string): { success: boolean; filePath: string; tablesRestored: number; recordCounts: Record<string, number> } {
    if (!existsSync(sourcePath)) throw new Error(`File not found: ${sourcePath}`)
    log.info('Database file import started', { path: sourcePath })
    const { tablesRestored, recordCounts } = importDatabaseFile(sourcePath, basename(sourcePath))
    return { success: true, filePath: sourcePath, tablesRestored, recordCounts }
  },

  listSnapshots(): SnapshotInfo[] {
    const config = this.getConfig()
    if (!config.sharedPath || !existsSync(config.sharedPath)) return []

    const files = readdirSync(config.sharedPath)
      .filter(f => f.startsWith('nexus-snapshot-') && f.endsWith('.db'))
      .sort()
      .reverse()

    return files.map(filename => {
      const metaPath = join(config.sharedPath, `${filename}.meta.json`)
      const filePath = join(config.sharedPath, filename)
      const stat = statSync(filePath)

      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as SnapshotMeta
          return {
            filename,
            exportedAt: meta.exportedAt,
            exportedBy: meta.exportedBy,
            sizeBytes: meta.sizeBytes,
            recordCounts: meta.recordCounts,
            isNew: false,
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
        isNew: false,
      }
    })
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

    return { recordCounts, lastImportedAt, lastImportedFile }
  },
}
