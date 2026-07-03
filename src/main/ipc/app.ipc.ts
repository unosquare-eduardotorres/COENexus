import { app, shell } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { readFileSync, existsSync } from 'fs'
import { join, normalize } from 'path'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { validateSender } from './validate'
import { createLogger } from '../services/logger'
import { registerIpcHandler } from './registerIpcHandler'

const log = createLogger('AppIPC')

export function registerAppHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.APP_GET_VERSION,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return app.getVersion()
    })

  registerIpcHandler(IPC_CHANNELS.APP_GET_PLATFORM,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return process.platform
    })

  registerIpcHandler(IPC_CHANNELS.APP_OPEN_EXTERNAL,
    async (event: IpcMainInvokeEvent, url: string) => {
      validateSender(event)
      if (!url || typeof url !== 'string') {
        throw new Error('URL is required')
      }
      try {
        const parsed = new URL(url)
        if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
          throw new Error('Unsupported protocol')
        }
        await shell.openExternal(url)
        return { opened: true }
      } catch (err) {
        log.error('Failed to open external URL', err instanceof Error ? err : undefined, { url })
        throw new Error('Invalid or unsupported URL')
      }
    })

  registerIpcHandler(IPC_CHANNELS.APP_CHECK_FOR_UPDATES,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      try {
        const { autoUpdater } = require('electron-updater')
        const result = await autoUpdater.checkForUpdates()
        return result?.updateInfo ?? null
      } catch (err) {
        log.error('Failed to check for updates', err instanceof Error ? err : undefined)
        return null
      }
    })

  registerIpcHandler(IPC_CHANNELS.APP_DOWNLOAD_UPDATE,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      try {
        const { autoUpdater } = require('electron-updater')
        await autoUpdater.downloadUpdate()
        return { success: true }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Download failed')
      }
    })

  registerIpcHandler(IPC_CHANNELS.APP_INSTALL_UPDATE,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      try {
        const { autoUpdater } = require('electron-updater')
        autoUpdater.quitAndInstall()
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Install failed')
      }
    })

  registerIpcHandler(IPC_CHANNELS.APP_SHOW_ITEM_IN_FOLDER,
    async (event: IpcMainInvokeEvent, filePath: string) => {
      validateSender(event)
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('File path is required')
      }
      shell.showItemInFolder(filePath)
    })

  registerIpcHandler(IPC_CHANNELS.APP_OPEN_PATH,
    async (event: IpcMainInvokeEvent, filePath: string) => {
      validateSender(event)
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('File path is required')
      }
      const errorMessage = await shell.openPath(filePath)
      if (errorMessage) {
        throw new Error(errorMessage)
      }
    })

  registerIpcHandler(IPC_CHANNELS.APP_READ_BUNDLED_FILE,
    async (event: IpcMainInvokeEvent, relativePath: string) => {
      validateSender(event)
      if (!relativePath || typeof relativePath !== 'string') {
        throw new Error('Relative path is required')
      }
      const normalized = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
      if (normalized.includes('..')) {
        throw new Error('Path traversal not allowed')
      }
      const basePath = app.isPackaged
        ? join(process.resourcesPath, 'app.asar', 'resources')
        : join(app.getAppPath(), 'resources')
      const fullPath = join(basePath, normalized)
      if (!existsSync(fullPath)) {
        throw new Error(`Bundled file not found: ${normalized}`)
      }
      const buffer = readFileSync(fullPath)
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    })
}
