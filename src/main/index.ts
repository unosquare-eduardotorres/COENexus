import { app, BrowserWindow, shell, session, nativeImage } from 'electron'
import { join } from 'path'
import { registerAllHandlers } from './ipc'
import { createMenu } from './menu'
import { initDatabase, closeDatabase } from './db/connection'
import { initPathDatabase, closePathDatabase } from './db/path/pathConnection'
import { initScout9Database, closeScout9Database } from './db/scout9/scout9Connection'
import { embeddingWorker } from './services/embeddingWorker'
import { initAutoUpdater, stopAutoUpdater } from './updater'
import { createLogger } from './services/logger'

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
    initScout9Database()
  } catch (err) {
    log.error('Scout-9 database initialization failed', err instanceof Error ? err : new Error(String(err)))
  }

  try {
    registerAllHandlers()
  } catch (err) {
    log.error('IPC handler registration failed', err instanceof Error ? err : new Error(String(err)))
  }

  try {
    embeddingWorker.start()
  } catch (err) {
    log.error('Embedding worker start failed', err instanceof Error ? err : new Error(String(err)))
  }

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  embeddingWorker.stop()
  stopAutoUpdater()
  closeDatabase()
  closePathDatabase()
  closeScout9Database()
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
