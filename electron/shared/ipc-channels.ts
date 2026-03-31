export const IPC_CHANNELS = {
  APP_UPDATE: 'app-update',
  BACKEND_STATUS: 'backend-status',
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
  GET_APP_VERSION: 'get-app-version',
  GET_PLATFORM: 'get-platform',
  OPEN_EXTERNAL_URL: 'open-external-url',
  SHOW_ERROR_DIALOG: 'show-error-dialog',
  SHOW_INFO_DIALOG: 'show-info-dialog',
  GET_BACKEND_STATUS: 'get-backend-status',
  RESTART_APP: 'restart-app'
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];