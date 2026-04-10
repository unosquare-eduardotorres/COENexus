import type { IpcMainInvokeEvent } from 'electron'
import { dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { DatabaseSaveConfigParams, DatabaseImportParams } from '../../../shared/ipc-types'
import { validateSender } from '../validate'
import { databaseSharingService } from '../../services/databaseSharingService'
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
        claudeProxy: { baseUrl: appConfig.claudeProxy.baseUrl },
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

      if (c.voyage || c.claudeProxy) {
        const current = getConfig()
        if (c.voyage) {
          if (c.voyage.apiKeys) current.voyage.apiKeys = c.voyage.apiKeys
          if (c.voyage.defaultModel) current.voyage.defaultModel = c.voyage.defaultModel
        }
        if (c.claudeProxy) {
          if (c.claudeProxy.baseUrl) current.claudeProxy.baseUrl = c.claudeProxy.baseUrl
        }
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
}
