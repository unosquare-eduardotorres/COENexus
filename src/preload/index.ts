import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type {
  SyncStartParams,
  SyncSingleParams,
  SyncRetryParams,
  SyncYearFilterParams,
  SyncUploadNoteParams,
  ProcessingVectorizeSingleParams,
  ProcessingStartExtractionParams,
  ProcessingStartVectorizationParams,
  ProcessingResetStatusParams,
  MatchSearchRequest,
  MatchConfirmHaikuParams,
  MatchResumeTextParams,
  AiChatParams,
  DatabaseSaveConfigParams,
  DatabaseImportParams,
  SyncProgressEvent,
  ProcessingProgressEvent,
  MatchSearchEvent,
  BenchBurnEvent,
  IpcContracts,
  IpcEventContracts,
} from '../shared/ipc-types'
import type { CreateOrUpdateTransformSession, BenchBurnRequest, ExternalCandidateMatchRequest } from '../renderer/apps/resume/types'

const api = {
  sync: {
    validateToken: (token: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_VALIDATE_TOKEN, token),
    getStatus: (dataSource: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_GET_STATUS, dataSource),
    applyYearFilter: (params: SyncYearFilterParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_APPLY_YEAR_FILTER, params),
    start: (params: SyncStartParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_START, params),
    pause: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_PAUSE),
    syncSingle: (params: SyncSingleParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_SINGLE, params),
    retryFailed: (params: SyncRetryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_RETRY_FAILED, params),
    retryNotProcessed: (params: SyncRetryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_RETRY_NOT_PROCESSED, params),
    getRecords: (dataSource: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_GET_RECORDS, dataSource),
    clear: (dataSource: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_CLEAR, dataSource),
    getSkills: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_GET_SKILLS),
    uploadNote: (params: SyncUploadNoteParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_UPLOAD_NOTE, params),
    onProgress: (callback: (data: SyncProgressEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: SyncProgressEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SYNC_PROGRESS_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SYNC_PROGRESS_EVENT, handler)
    },
  },

  processing: {
    getVoyageKeyStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_VOYAGE_KEY_STATUS),
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_GET_STATUS),
    vectorizeSingle: (params: ProcessingVectorizeSingleParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_VECTORIZE_SINGLE, params),
    startExtraction: (params: ProcessingStartExtractionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_START_EXTRACTION, params),
    pauseExtraction: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_PAUSE_EXTRACTION),
    startVectorization: (params: ProcessingStartVectorizationParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_START_VECTORIZATION, params),
    pauseVectorization: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_PAUSE_VECTORIZATION),
    retryFailed: (params: ProcessingStartExtractionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_RETRY_FAILED, params),
    retryFailedVectorization: (params: ProcessingStartVectorizationParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_RETRY_FAILED_VECTORIZATION, params),
    resetStatus: (params: ProcessingResetStatusParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_RESET_STATUS, params),
    addVoyageKey: (params: { apiKey: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_ADD_VOYAGE_KEY, params),
    removeVoyageKey: (params: { index: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_REMOVE_VOYAGE_KEY, params),
    onProgress: (callback: (data: ProcessingProgressEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: ProcessingProgressEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.PROCESSING_PROGRESS_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PROCESSING_PROGRESS_EVENT, handler)
    },
  },

  match: {
    getPoolCounts: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_POOL_COUNTS),
    getFilterOptions: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_FILTER_OPTIONS),
    search: (request: MatchSearchRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_SEARCH, request),
    cancelSearch: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_CANCEL_SEARCH),
    confirmHaiku: (params: MatchConfirmHaikuParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_CONFIRM_HAIKU, params),
    searchSession: (params: MatchSearchRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_SEARCH_SESSION, params),
    listSessions: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_LIST_SESSIONS),
    getSession: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_GET_SESSION, id),
    getProxyStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_PROXY_STATUS),
    getBenchEmployees: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_BENCH_EMPLOYEES),
    getAllEmployees: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_ALL_EMPLOYEES),
    getAllCandidates: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_ALL_CANDIDATES),
    searchCandidates: (query: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_SEARCH_CANDIDATES, query),
    searchEmployees: (query: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_SEARCH_EMPLOYEES, query),
    getOpenPositions: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_OPEN_POSITIONS),
    getBenchBurnSession: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_BENCH_BURN_SESSION, id),
    benchBurn: (params: BenchBurnRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_BENCH_BURN, params),
    benchBurnRetry: (params: BenchBurnRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_BENCH_BURN_RETRY, params),
    getResumeText: (params: MatchResumeTextParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_RESUME_TEXT, params),
    externalCandidate: (params: ExternalCandidateMatchRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_EXTERNAL_CANDIDATE, params),
    onSearchEvent: (callback: (data: MatchSearchEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: MatchSearchEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.MATCH_SEARCH_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MATCH_SEARCH_EVENT, handler)
    },
    onBenchBurnEvent: (callback: (data: BenchBurnEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: BenchBurnEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.MATCH_BENCH_BURN_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MATCH_BENCH_BURN_EVENT, handler)
    },
  },

  sessions: {
    create: (data: CreateOrUpdateTransformSession) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_CREATE, data),
    update: (...[id, data]: IpcContracts[typeof IPC_CHANNELS.SESSIONS_UPDATE]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_UPDATE, id, data),
    get: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_GET, id),
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_LIST),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_DELETE, id),
  },

  database: {
    getConfig: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_GET_CONFIG),
    saveConfig: (config: DatabaseSaveConfigParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_SAVE_CONFIG, config),
    export: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_EXPORT),
    import: (data: DatabaseImportParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_IMPORT, data),
    listSnapshots: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_LIST_SNAPSHOTS),
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_STATUS),
    importFile: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_IMPORT_FILE),
  },

  ai: {
    chat: (model: string, messages: { role: string; content: string }[], maxTokens?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { model, messages, maxTokens } satisfies AiChatParams),
    checkConnection: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHECK_CONNECTION),
  },

  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORM),
    openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),
    checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_FOR_UPDATES),
    downloadUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APP_DOWNLOAD_UPDATE),
    installUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APP_INSTALL_UPDATE),
    onUpdateAvailable: (callback: (data: IpcEventContracts[typeof IPC_CHANNELS.APP_UPDATE_AVAILABLE]) => void) => {
      const handler = (_e: IpcRendererEvent, data: IpcEventContracts[typeof IPC_CHANNELS.APP_UPDATE_AVAILABLE]) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.APP_UPDATE_AVAILABLE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_UPDATE_AVAILABLE, handler)
    },
    onUpdateDownloaded: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on(IPC_CHANNELS.APP_UPDATE_DOWNLOADED, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_UPDATE_DOWNLOADED, handler)
    },
    readBundledFile: (relativePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_READ_BUNDLED_FILE, relativePath),
  },
} as const

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
