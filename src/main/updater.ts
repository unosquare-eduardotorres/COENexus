import { app } from 'electron'
import { getMainWindow } from './index'
import { createLogger } from './services/logger'

const log = createLogger('AutoUpdater')

let updateCheckInterval: ReturnType<typeof setInterval> | null = null

export function initAutoUpdater(): void {
  if (!app.isPackaged) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { autoUpdater } = require('electron-updater')

    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info: { version: string }) => {
      const win = getMainWindow()
      if (win) {
        win.webContents.send('app:update-available', { version: info.version })
      }
    })

    autoUpdater.on('update-downloaded', () => {
      const win = getMainWindow()
      if (win) {
        win.webContents.send('app:update-downloaded')
      }
    })

    autoUpdater.on('error', (err: Error) => {
      log.error('Update error', err instanceof Error ? err : new Error(String(err.message)))
    })

    autoUpdater.checkForUpdates().catch(err => {
      log.error('Initial update check failed', err instanceof Error ? err : new Error(String(err)))
    })

    updateCheckInterval = setInterval(() => {
      autoUpdater.checkForUpdates().catch(err => {
        log.error('Scheduled update check failed', err instanceof Error ? err : new Error(String(err)))
      })
    }, 4 * 60 * 60 * 1000)
  } catch (err) {
    log.error('Failed to initialize updater', err instanceof Error ? err : new Error(String(err)))
    log.warn('electron-updater not available — skipping auto-update setup')
  }
}

export function stopAutoUpdater(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval)
    updateCheckInterval = null
  }
}
