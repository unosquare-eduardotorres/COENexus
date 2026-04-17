import type { IpcMainInvokeEvent } from 'electron'
import { app, dialog, BrowserWindow } from 'electron'
import { statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { DatabaseSaveConfigParams, DatabaseImportParams } from '../../../shared/ipc-types'
import { validateSender } from '../validate'
import { databaseSharingService } from '../../services/databaseSharingService'
import { syncWatcherService } from '../../services/syncWatcherService'
import { getDatabase } from '../../db/connection'
import { getConfig, saveConfig } from '../../config'
import { validatePayload, databaseSaveConfigSchema, databaseImportSchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'
import { createLogger } from '../../services/logger'

const log = createLogger('DatabaseIPC')

export function registerDatabaseHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.DATABASE_GET_CONFIG,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      const sharingConfig = databaseSharingService.getConfig()
      const appConfig = getConfig()
      return {
        sharing: sharingConfig,
        voyage: { apiKeys: appConfig.voyage.apiKeys, defaultModel: appConfig.voyage.defaultModel },
      }
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_SAVE_CONFIG,
    async (event: IpcMainInvokeEvent, config: DatabaseSaveConfigParams) => {
      validateSender(event)
      const c = validatePayload(databaseSaveConfigSchema, config, IPC_CHANNELS.DATABASE_SAVE_CONFIG)

      if (c.sharing) {
        databaseSharingService.saveConfig({
          sharedPath: c.sharing.sharedPath,
          exporterName: c.sharing.exporterName,
        })
      }

      if (c.voyage) {
        const current = getConfig()
        if (c.voyage.apiKeys) current.voyage.apiKeys = c.voyage.apiKeys
        if (c.voyage.defaultModel) current.voyage.defaultModel = c.voyage.defaultModel
        saveConfig(current)
      }

      log.info('Database config saved', { hasSharingConfig: !!c.sharing, hasVoyageConfig: !!c.voyage })
      return { saved: true }
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_EXPORT,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      log.info('Database export requested')
      return databaseSharingService.exportSnapshot()
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_IMPORT,
    async (event: IpcMainInvokeEvent, data: DatabaseImportParams) => {
      validateSender(event)
      const validated = validatePayload(databaseImportSchema, data, IPC_CHANNELS.DATABASE_IMPORT)
      log.info('Database import requested', { filename: validated.filename })
      return databaseSharingService.importSnapshot(validated.filename)
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_LIST_SNAPSHOTS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return databaseSharingService.listSnapshots()
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_STATUS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return databaseSharingService.getStatus()
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_IMPORT_FILE,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      log.info('Database file import requested via dialog')
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win!, {
        title: 'Import Database File',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true }
      }

      const importResult = databaseSharingService.importFromAbsolutePath(result.filePaths[0])
      return { ...importResult, cancelled: false }
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_HEALTH,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      const db = getDatabase()
      const dbPath = join(app.getPath('userData'), 'nexus.db')
      const stats = statSync(dbPath)
      const walPath = dbPath + '-wal'
      const walSize = existsSync(walPath) ? statSync(walPath).size : 0
      const integrity = db.pragma('integrity_check') as Array<{ integrity_check: string }>
      const version = db.pragma('sqlite_version') as Array<{ sqlite_version: string }>
      const journalMode = db.pragma('journal_mode') as Array<{ journal_mode: string }>
      const foreignKeys = db.pragma('foreign_keys') as Array<{ foreign_keys: number }>

      const tables = ['synced_employees', 'synced_candidates', 'synced_open_positions',
        'resume_embeddings', 'match_sessions', 'resume_sessions',
        'transform_sessions', 'open_position_candidates']
      const recordCounts: Record<string, number> = {}
      for (const t of tables) {
        const row = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get() as { c: number }
        recordCounts[t] = row.c
      }

      return {
        engine: 'sqlite' as const,
        filePath: dbPath,
        fileSizeBytes: stats.size,
        walSizeBytes: walSize,
        sqliteVersion: version[0]?.sqlite_version ?? 'unknown',
        integrityOk: integrity[0]?.integrity_check === 'ok',
        journalMode: journalMode[0]?.journal_mode ?? 'unknown',
        foreignKeys: (foreignKeys[0]?.foreign_keys ?? 0) === 1,
        recordCounts,
        tableCount: tables.length,
      }
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_SYNC_CHECK,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return databaseSharingService.checkForUpdates()
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_SYNC_STATUS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return syncWatcherService.getState()
    })

  registerIpcHandler(IPC_CHANNELS.DATABASE_IMPORT_LATEST,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      log.info('Import latest from manifest requested')
      const result = databaseSharingService.importLatest()
      syncWatcherService.clearUpdateFlag()
      return result
    })
}
