import { Tray, Menu, nativeImage, app, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { createLogger } from './logger'

const log = createLogger('TrayService')

let tray: Tray | null = null
let mainWindowRef: BrowserWindow | null = null

function iconPath(name: string): string {
  return join(__dirname, '../../resources', name)
}

function resolveIcon(active: boolean): Electron.NativeImage {
  if (process.platform === 'darwin') {
    const file = active ? 'tray-activeTemplate.png' : 'tray-idleTemplate.png'
    return nativeImage.createFromPath(iconPath(file))
  }
  const file = active ? 'tray-active.ico' : 'tray-idle.ico'
  const fallback = active ? 'tray-activeTemplate.png' : 'tray-idleTemplate.png'
  try {
    return nativeImage.createFromPath(iconPath(file))
  } catch {
    return nativeImage.createFromPath(iconPath(fallback))
  }
}

export const trayService = {
  init(mainWindow: BrowserWindow): void {
    try {
      const icon = resolveIcon(false)
      tray = new Tray(icon)
      mainWindowRef = mainWindow

      tray.setToolTip('Operation Nexus')
      this.rebuildMenu()

      tray.on('double-click', () => {
        mainWindow.show()
        mainWindow.focus()
      })

      if (process.platform === 'darwin') {
        tray.on('click', () => {
          mainWindow.show()
          mainWindow.focus()
        })
      }

      log.info('Tray initialized')
    } catch (err) {
      log.error('Tray initialization failed', err instanceof Error ? err : new Error(String(err)))
    }
  },

  rebuildMenu(agentStatuses?: Record<string, string>): void {
    if (!tray) return

    const items: MenuItemConstructorOptions[] = [
      {
        label: 'Show Nexus',
        click: () => {
          mainWindowRef?.show()
          mainWindowRef?.focus()
          if (process.platform === 'darwin') {
            app.dock?.show()
          }
        },
      },
      { type: 'separator' },
    ]

    if (agentStatuses) {
      for (const [name, status] of Object.entries(agentStatuses)) {
        items.push({ label: `${name}: ${status}`, enabled: false })
      }
      items.push({ type: 'separator' })
    }

    items.push({
      label: 'Quit Nexus',
      click: () => {
        app.quit()
      },
    })

    tray.setContextMenu(Menu.buildFromTemplate(items))
  },

  setActive(active: boolean): void {
    if (!tray) return
    try {
      tray.setImage(resolveIcon(active))
    } catch (err) {
      log.error('Failed to update tray icon', err instanceof Error ? err : new Error(String(err)))
    }
  },

  destroy(): void {
    tray?.destroy()
    tray = null
    mainWindowRef = null
  },
}
