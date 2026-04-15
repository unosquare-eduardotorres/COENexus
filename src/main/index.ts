import { app, BrowserWindow, shell, session, nativeImage } from 'electron'
import { join } from 'path'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { registerAllHandlers } from './ipc'
import { createMenu } from './menu'
import { initDatabase, closeDatabase } from './db/connection'
import { initPathDatabase, closePathDatabase } from './db/path/pathConnection'
import { initAgentsDatabase, closeAgentsDatabase } from './db/agents/agentsConnection'
import { embeddingWorker } from './services/embeddingWorker'
import { vigilScheduler } from './services/vigilScheduler'
import { vigilExecutor } from './services/vigilExecutor'
import { getVigilToken } from './services/vigilTokenStore'
import type { VigilStatusEvent } from '../shared/ipc-types'
import { toVigilActivityEvent } from './services/vigilEventMapper'
import { initAutoUpdater, stopAutoUpdater } from './updater'
import { createLogger } from './services/logger'

function validateNativeModules(): void {
  try {
    require('better-sqlite3')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('NODE_MODULE_VERSION')) {
      const fix = 'Run: npm run rebuild'
      console.error(`\n❌ Native module ABI mismatch!\n${message}\n\nFix: ${fix}\n`)
      const { dialog } = require('electron')
      dialog.showErrorBox(
        'Native Module Error',
        `better-sqlite3 was compiled for the wrong Node.js version.\n\n${fix}`
      )
      process.exit(1)
    }
    throw err
  }
}

validateNativeModules()

const log = createLogger('Main')

let mainWindow: BrowserWindow | null = null

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore()
    mainWindow?.focus()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: join(__dirname, '../preload/index.cjs')
    },
    icon: join(__dirname, '../../resources/icon.png')
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (!app.isPackaged) {
      mainWindow?.webContents.openDevTools()
    }
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      console.log(`[Renderer:${level}] ${message} (${sourceId}:${line})`)
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    safeOpenExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url)
    if (parsed.origin !== 'file://' && !url.startsWith('http://localhost')) {
      event.preventDefault()
      safeOpenExternal(url)
    }
  })
}

function safeOpenExternal(url: string): void {
  try {
    const parsed = new URL(url)
    if (['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
      shell.openExternal(url)
    }
  } catch (err) {
    log.error('Invalid or unsafe external URL blocked', err instanceof Error ? err : new Error(String(err)), { url })
  }
}

function setupCSP(): void {
  const isDev = !app.isPackaged

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' http://localhost:*;"
      : "script-src 'self' 'wasm-unsafe-eval';"
    const connectSrc = isDev
      ? "connect-src 'self' http://localhost:* ws://localhost:* https://unpkg.com https://www.gstatic.com;"
      : "connect-src 'self' http://localhost:* https://unpkg.com https://www.gstatic.com;"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; ${scriptSrc} style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; ${connectSrc}`
        ]
      }
    })
  })
}

function setupPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['notifications']
    callback(allowed.includes(permission))
  })
}

function emitToRenderer(channel: string, payload: unknown): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload)
  }
}



app.whenReady().then(async () => {
  app.setName('COE Nexus')
  setupCSP()
  setupPermissions()

  try {
    initDatabase()
  } catch (err) {
    log.error('Database initialization failed', err instanceof Error ? err : new Error(String(err)))
  }

  try {
    initPathDatabase()
  } catch (err) {
    log.error('PATH database initialization failed', err instanceof Error ? err : new Error(String(err)))
  }

  try {
    initAgentsDatabase()
  } catch (err) {
    log.error('Agents database initialization failed', err instanceof Error ? err : new Error(String(err)))
  }

  try {
    registerAllHandlers()
  } catch (err) {
    log.error('IPC handler registration failed', err instanceof Error ? err : new Error(String(err)))
  }

  // Embedding worker is NOT auto-started — extraction and vectorization
  // are user-initiated steps via the Data Sync pipeline UI

  try {
    initAutoUpdater()
  } catch (err) {
    log.error('Auto-updater initialization failed', err instanceof Error ? err : new Error(String(err)))
  }

  if (process.platform === 'darwin' && !app.isPackaged) {
    const dockIcon = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png'))
    app.dock.setIcon(dockIcon)
  }

  createWindow()
  createMenu()
  vigilScheduler.start({
    getToken: () => getVigilToken(),
    run: async ({ token, sources, options }) => {
      const runningStatus: VigilStatusEvent = {
        status: 'running',
        run_id: null,
        timestamp: new Date().toISOString(),
      }
      emitToRenderer(IPC_CHANNELS.VIGIL_STATUS_EVENT, runningStatus)

      try {
        const run = await vigilExecutor.run({
          token,
          triggerType: 'scheduled',
          sources,
          options,
          emitEvent: (syncEvent) => {
            emitToRenderer(IPC_CHANNELS.VIGIL_ACTIVITY_EVENT, toVigilActivityEvent(syncEvent))
          },
        })

        const completedStatus: VigilStatusEvent = {
          status: run.status,
          run_id: run.id,
          timestamp: new Date().toISOString(),
        }
        emitToRenderer(IPC_CHANNELS.VIGIL_STATUS_EVENT, completedStatus)
        return run
      } catch (error) {
        const failedStatus: VigilStatusEvent = {
          status: 'failed',
          run_id: null,
          timestamp: new Date().toISOString(),
        }
        emitToRenderer(IPC_CHANNELS.VIGIL_STATUS_EVENT, failedStatus)
        throw error
      }
    },
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  embeddingWorker.stop()
  vigilScheduler.stop()
  stopAutoUpdater()
  closeDatabase()
  closePathDatabase()
  closeAgentsDatabase()
})

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event, webPreferences) => {
    delete webPreferences.preload
    webPreferences.nodeIntegration = false
    event.preventDefault()
  })
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
