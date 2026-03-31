# Electron Desktop Application

This directory contains the Electron desktop application setup for Operation Nexus.

## Architecture

The Electron app follows security best practices with proper process isolation:

- **Main Process** (`main/index.ts`): Manages application lifecycle, creates windows, and runs an embedded Express server
- **Preload Script** (`preload/index.ts`): Secure bridge between main and renderer processes using contextBridge
- **Renderer Process**: The React application runs in a sandboxed environment with limited access to Node.js APIs

## Security Features

- ✅ `contextIsolation: true` - Isolates the main world context from the isolated world
- ✅ `nodeIntegration: false` - Prevents direct Node.js API access from renderer
- ✅ `webSecurity: true` - Enables web security (default)
- ✅ `allowRunningInsecureContent: false` - Blocks insecure content
- ✅ Secure window opening with `setWindowOpenHandler`
- ✅ Navigation protection with `will-navigate` event
- ✅ CSP headers via Express middleware

## Development

### Prerequisites

1. Ensure the backend ASP.NET Core API is running on port 5002
2. Build the React frontend first

### Running in Development

```bash
# Build the frontend
npm run build

# Build Electron TypeScript files and start the app
npm run electron:dev
```

### Building for Production

```bash
# Build both frontend and Electron, then package
npm run dist
```

## Express Server Integration

The main process runs an embedded Express server that:

- Serves the built React application from the `dist` folder
- Handles SPA routing with a catch-all route
- Provides CORS support for API communication
- Runs on port 3000 by default

## Backend Communication

The app checks for backend connectivity at startup:

- If backend is not available on port 5002, shows a warning dialog
- Users can choose to continue anyway, retry, or quit
- Backend health check hits `/api/health` endpoint

## IPC Communication

The preload script exposes limited APIs to the renderer:

```typescript
window.electronAPI.platform        // Current platform
window.electronAPI.versions       // Electron, Node, Chrome versions

window.electron.ipcRenderer.invoke()  // Secure two-way communication
window.electron.ipcRenderer.on()      // Event listeners
```

## File Structure

```
electron/
├── main/
│   └── index.ts           # Main process entry point
├── preload/
│   └── index.ts           # Secure preload script
├── renderer/
│   └── error.html         # Error page fallback
├── types/
│   └── global.d.ts        # TypeScript definitions
└── tsconfig.json          # Electron TypeScript config
```

## Build Output

- `dist-electron/` - Compiled Electron TypeScript files
- `dist-app/` - Packaged application binaries
- Application entry point: `dist-electron/main/index.js`

## Platform Support

The app is configured to build for:

- **macOS**: DMG installer (Intel + Apple Silicon)
- **Windows**: NSIS installer (x64)
- **Linux**: AppImage (x64)

## Troubleshooting

### Common Issues

1. **Backend not available**: Ensure ASP.NET Core API is running on port 5002
2. **Frontend not loading**: Build the React app first with `npm run build`
3. **Port conflicts**: Express server uses port 3000, ensure it's available
4. **TypeScript errors**: Check that electron types are properly installed

### Development Tips

- Use Chrome DevTools with `Ctrl/Cmd + Shift + I` in development
- Check main process logs in the terminal
- Renderer process logs appear in DevTools console