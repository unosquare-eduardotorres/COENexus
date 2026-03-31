import { app, BrowserWindow, shell, Menu, dialog } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';
const FRONTEND_PORT = 3000;
const BACKEND_PORT = 5002;

let mainWindow: BrowserWindow | null = null;
let expressServer: ReturnType<typeof createServer> | null = null;

async function startExpressServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const app = express();

    app.use(cors());
    app.use(express.json());

    const distPath = join(__dirname, '../../dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });

    const server = createServer(app);

    server.listen(FRONTEND_PORT, () => {
      expressServer = server;
      console.log(`Express server running on port ${FRONTEND_PORT}`);
      resolve(FRONTEND_PORT);
    });

    server.on('error', (error) => {
      console.error('Express server error:', error);
      reject(error);
    });
  });
}

function createMainWindow(serverPort: number): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webSecurity: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    icon: process.platform === 'linux' ? join(__dirname, '../../resources/icon.png') : undefined
  });

  const startURL = `http://localhost:${serverPort}`;

  mainWindow.loadURL(startURL);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();

      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== `http://localhost:${serverPort}`) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);

    if (mainWindow) {
      mainWindow.loadFile(join(__dirname, '../renderer/error.html'));
    }
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function showBackendConnectionDialog(): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Backend Connection',
    message: 'Backend server is not running',
    detail: `Could not connect to the backend server at http://localhost:${BACKEND_PORT}.\n\nSome features may not work properly. Please ensure the backend server is running.`,
    buttons: ['Continue Anyway', 'Retry', 'Quit'],
    defaultId: 1,
    cancelId: 0
  });

  switch (result.response) {
    case 0:
      break;
    case 1:
      const isConnected = await checkBackendConnection();
      if (!isConnected) {
        await showBackendConnectionDialog();
      }
      break;
    case 2:
      app.quit();
      break;
  }
}

app.whenReady().then(async () => {
  try {
    const isBackendConnected = await checkBackendConnection();

    if (!isBackendConnected) {
      await showBackendConnectionDialog();
    }

    const serverPort = await startExpressServer();

    createMainWindow(serverPort);
    createMenu();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(serverPort);
      }
    });

  } catch (error) {
    console.error('Failed to start application:', error);

    const result = await dialog.showErrorBox(
      'Startup Error',
      `Failed to start the application: ${error instanceof Error ? error.message : 'Unknown error'}`
    );

    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (expressServer) {
    expressServer.close(() => {
      console.log('Express server closed');
    });
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (expressServer) {
    expressServer.close();
  }
});

if (isDev) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit();
      }
    });
  } else {
    process.on('SIGTERM', () => {
      app.quit();
    });
  }
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Application Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});