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
  ProcessingProcessAllParams,
  ProcessingResetStatusParams,
  MatchSearchRequest,
  MatchConfirmHaikuParams,
  MatchResumeTextParams,
  MatchRankPositionsParams,
  MatchRankPositionsForTextParams,
  MatchToPositionsParams,
  AiChatParams,
  DatabaseSaveConfigParams,
  DatabaseImportParams,
  SyncProgressEvent,
  ProcessingProgressEvent,
  PipelineProgressEvent,
  PipelineStartParams,
  PipelineRetryParams,
  PipelineRetrySingleParams,
  PositionPipelineStartParams,
  PositionPipelineVectorizeSyncedParams,
  MatchSearchEvent,
  BenchBurnEvent,
  ReportStalledThresholds,
  ReportStalledPositionResult,
  ReportAcceptanceRateFilters,
  ReportFillRateFilters,
  PlacementMarginSyncParams,
  OffboardingSyncParams,
  PrrUpdateCoeStatusParams,
  PrrAddCommentParams,
  PrrReportItem,
  PresentCreateSessionParams,
  PresentUpdateSessionParams,
  PresentAddEntryParams,
  PresentUpdateEntryParams,
  PresentCheckResumeFormatParams,
  PresentTransformResumeParams,
  PresentGenerateIntroParams,
  PresentGenerateCandidateProfileParams,
  PresentGenerateHtmlParams,
  IpcContracts,
  IpcEventContracts,
} from '../shared/ipc-types'
import type { CreateOrUpdateTransformSession, BenchBurnRequest, ExternalCandidateMatchRequest } from '../renderer/apps/resume/types'
import type { ErrorReportRequest, ErrorNewEvent, NomicoreCalculateParams, MailSmtpConfig, ResponsivenessAddLeadParams, ResponsivenessAnalyzeRequest, PositionAttentionProgress, CatalogCreateParams, CatalogUpdateParams, CatalogJunctionParams, BonusTier } from '../shared/ipc-types'
import type { ModelConfig } from '../shared/model-config-types'

const api = {
  sync: {
    validateToken: (token: string, source: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_VALIDATE_TOKEN, { token, source }),
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
    backfillSalaryNormalization: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_BACKFILL_SALARY_NORMALIZATION),
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
    processAll: (params: ProcessingProcessAllParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROCESSING_PROCESS_ALL, params),
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

  pipeline: {
    start: (params: PipelineStartParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_START, params),
    pause: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_PAUSE),
    retryAllFailed: (params: PipelineRetryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_RETRY_ALL_FAILED, params),
    retrySingle: (params: PipelineRetrySingleParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_RETRY_SINGLE, params),
    getFailed: (source: 'employees' | 'candidates') =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_GET_FAILED, source),
    getState: (source: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_GET_STATE, source),
    clearState: (source: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_CLEAR_STATE, source),
    onProgress: (callback: (data: PipelineProgressEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: PipelineProgressEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.PIPELINE_PROGRESS_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PIPELINE_PROGRESS_EVENT, handler)
    },
  },

  positionPipeline: {
    start: (params: PositionPipelineStartParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.POSITION_PIPELINE_START, params),
    pause: () =>
      ipcRenderer.invoke(IPC_CHANNELS.POSITION_PIPELINE_PAUSE),
    vectorizeSynced: (params: PositionPipelineVectorizeSyncedParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.POSITION_PIPELINE_VECTORIZE_SYNCED, params),
    retryAllFailed: (params: PipelineRetryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.POSITION_PIPELINE_RETRY_ALL_FAILED, params),
    retrySingle: (params: PipelineRetrySingleParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.POSITION_PIPELINE_RETRY_SINGLE, params),
    getFailed: () =>
      ipcRenderer.invoke(IPC_CHANNELS.POSITION_PIPELINE_GET_FAILED),
    getState: () =>
      ipcRenderer.invoke(IPC_CHANNELS.POSITION_PIPELINE_GET_STATE),
    clearState: () =>
      ipcRenderer.invoke(IPC_CHANNELS.POSITION_PIPELINE_CLEAR_STATE),
    onProgress: (callback: (data: PipelineProgressEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: PipelineProgressEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.POSITION_PIPELINE_PROGRESS_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.POSITION_PIPELINE_PROGRESS_EVENT, handler)
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
    getCandidateCount: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_CANDIDATE_COUNT) as Promise<number>,
    getEmployeeCount: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_EMPLOYEE_COUNT) as Promise<number>,
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
    getAnalysisCacheStats: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_ANALYSIS_CACHE_STATS) as Promise<{ totalEntries: number; oldestEntry: string | null }>,
    clearAnalysisCache: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_CLEAR_ANALYSIS_CACHE) as Promise<{ deleted: number }>,
    rankPositions: (params: MatchRankPositionsParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_RANK_POSITIONS, params),
    rankPositionsForText: (params: MatchRankPositionsForTextParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_RANK_POSITIONS_FOR_TEXT, params),
    matchToPositions: (params: MatchToPositionsParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.MATCH_TO_POSITIONS, params),
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

  present: {
    createSession: (params: PresentCreateSessionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_CREATE_SESSION, params),
    updateSession: (id: number, data: PresentUpdateSessionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_UPDATE_SESSION, id, data),
    getSession: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_GET_SESSION, id),
    listSessions: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_LIST_SESSIONS),
    deleteSession: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_DELETE_SESSION, id),
    addEntry: (params: PresentAddEntryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_ADD_ENTRY, params),
    updateEntry: (id: number, data: PresentUpdateEntryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_UPDATE_ENTRY, id, data),
    deleteEntry: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_DELETE_ENTRY, id),
    checkResumeFormat: (params: PresentCheckResumeFormatParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_CHECK_RESUME_FORMAT, params),
    transformResume: (params: PresentTransformResumeParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_TRANSFORM_RESUME, params),
    generateIntro: (params: PresentGenerateIntroParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_GENERATE_INTRO, params),
    generateCandidateProfile: (params: PresentGenerateCandidateProfileParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_GENERATE_CANDIDATE_PROFILE, params),
    generateHtml: (params: PresentGenerateHtmlParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRESENT_GENERATE_HTML, params),
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
    getHealth: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_HEALTH),
    syncCheck: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_SYNC_CHECK),
    syncStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_SYNC_STATUS),
    importLatest: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_IMPORT_LATEST),
    onSyncUpdate: (callback: (manifest: unknown) => void) => {
      const handler = (_event: IpcRendererEvent, manifest: unknown) => callback(manifest)
      ipcRenderer.on(IPC_CHANNELS.DATABASE_SYNC_UPDATE, handler)
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.DATABASE_SYNC_UPDATE, handler) }
    },
    selectDirectory: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_SELECT_DIRECTORY),
  },

  ai: {
    chat: (model: string, messages: { role: string; content: string }[], maxTokens?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { model, messages, maxTokens } satisfies AiChatParams),
    checkConnection: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHECK_CONNECTION),
    getTokenUsage: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_TOKEN_USAGE),
    resetTokenUsage: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_RESET_TOKEN_USAGE),
    getSubscriptionStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_SUBSCRIPTION_STATUS),
  },

  report: {
    evaluatePositions: (thresholds: ReportStalledThresholds) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_EVALUATE_POSITIONS, thresholds),
    getPositionDetail: (upstreamId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_POSITION_DETAIL, upstreamId),
    exportCsv: (results: ReportStalledPositionResult[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_EXPORT_CSV, results),
    getSyncStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_GET_SYNC_STATUS),
    getFeedbackCatalog: (token: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_GET_FEEDBACK_CATALOG, token),
    getFeedbackCatalogLocal: () =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_GET_FEEDBACK_CATALOG_LOCAL),
    deletePosition: (upstreamId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_DELETE_POSITION, upstreamId),
    exportPdf: () =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_EXPORT_PDF),
    exportXlsx: (results: ReportStalledPositionResult[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_EXPORT_XLSX, results) as Promise<IpcContracts[typeof IPC_CHANNELS.REPORT_EXPORT_XLSX]['response']>,
    getAcceptanceRate: (filters: ReportAcceptanceRateFilters) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_ACCEPTANCE_RATE, filters) as Promise<IpcContracts[typeof IPC_CHANNELS.REPORT_ACCEPTANCE_RATE]['response']>,
    getAcceptanceRateCoes: () =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_ACCEPTANCE_RATE_COES) as Promise<IpcContracts[typeof IPC_CHANNELS.REPORT_ACCEPTANCE_RATE_COES]['response']>,
    getPlacementMargin: (year: number, quarter: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_PLACEMENT_MARGIN, { year, quarter }) as Promise<IpcContracts[typeof IPC_CHANNELS.REPORT_PLACEMENT_MARGIN]['response']>,
    getPlacementMarginSyncStatus: (year: number, quarter: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_PLACEMENT_MARGIN_STATUS, { year, quarter }) as Promise<IpcContracts[typeof IPC_CHANNELS.SYNC_PLACEMENT_MARGIN_STATUS]['response']>,
    syncPlacementMargin: (params: PlacementMarginSyncParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_PLACEMENT_MARGIN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.SYNC_PLACEMENT_MARGIN]['response']>,
    getFillRate: (filters: ReportFillRateFilters) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_FILL_RATE, filters) as Promise<IpcContracts[typeof IPC_CHANNELS.REPORT_FILL_RATE]['response']>,
    syncOffboarding: (params: OffboardingSyncParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_OFFBOARDING, params) as Promise<IpcContracts[typeof IPC_CHANNELS.SYNC_OFFBOARDING]['response']>,
    getOffboardingSyncStatus: (year: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_OFFBOARDING_STATUS, { year }) as Promise<IpcContracts[typeof IPC_CHANNELS.SYNC_OFFBOARDING_STATUS]['response']>,
    getOffboarding: (year: number, quarter: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_OFFBOARDING, { year, quarter }) as Promise<IpcContracts[typeof IPC_CHANNELS.REPORT_OFFBOARDING]['response']>,
  },

  coeTracking: {
    getOverview: () =>
      ipcRenderer.invoke(IPC_CHANNELS.COE_TRACKING_GET_OVERVIEW),
    getCoeDetail: (coe: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.COE_TRACKING_GET_COE_DETAIL, coe),
    getPracticeDetail: (coe: string, practice: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.COE_TRACKING_GET_PRACTICE_DETAIL, { coe, practice }),
    getPracticePositions: (coe: string, practice: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.COE_TRACKING_GET_PRACTICE_POSITIONS, { coe, practice }),
    getSkillPositions: (coe: string, practice: string, skill: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.COE_TRACKING_GET_SKILL_POSITIONS, { coe, practice, skill }),
    getCoePositions: (coe: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.COE_TRACKING_GET_COE_POSITIONS, coe),
    getPositionDetail: (upstreamId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.COE_TRACKING_GET_POSITION_DETAIL, upstreamId),
    getSyncStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.COE_TRACKING_GET_SYNC_STATUS),
  },

  prr: {
    getAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PRR_GET_ALL),
    getDetail: (upstreamId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRR_GET_DETAIL, upstreamId),
    updateCoeStatus: (upstreamId: PrrUpdateCoeStatusParams['upstreamId'], coeStatus: PrrUpdateCoeStatusParams['coeStatus']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRR_UPDATE_COE_STATUS, { upstreamId, coeStatus } satisfies PrrUpdateCoeStatusParams),
    addComment: (upstreamId: PrrAddCommentParams['upstreamId'], text: PrrAddCommentParams['text'], author: PrrAddCommentParams['author']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRR_ADD_COMMENT, { upstreamId, text, author } satisfies PrrAddCommentParams),
    delete: (upstreamId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRR_DELETE, upstreamId),
    getSyncStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PRR_GET_SYNC_STATUS),
    exportXlsx: (items: PrrReportItem[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRR_EXPORT_XLSX, items) as Promise<IpcContracts[typeof IPC_CHANNELS.PRR_EXPORT_XLSX]['response']>,
  },


  bug: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ERRORS_LIST),
    clear: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ERRORS_CLEAR),
    markReported: (errorId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ERRORS_MARK_REPORTED, errorId),
    generateDescription: (params: { errorId: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.ERRORS_GENERATE_DESCRIPTION, params),
    report: (params: ErrorReportRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.ERRORS_REPORT, params),
    getLogPath: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ERRORS_GET_LOG_PATH),
    onNewError: (callback: (data: ErrorNewEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: ErrorNewEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.ERRORS_NEW_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ERRORS_NEW_EVENT, handler)
    },
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
    showItemInFolder: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_SHOW_ITEM_IN_FOLDER, filePath),
    openPath: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_PATH, filePath),
    onNavigate: (callback: (data: { path: string }) => void) => {
      const handler = (_e: IpcRendererEvent, data: { path: string }) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.APP_NAVIGATE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_NAVIGATE, handler)
    },
  },

  mail: {
    getConfig: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MAIL_GET_CONFIG),
    saveConfig: (params: MailSmtpConfig) =>
      ipcRenderer.invoke(IPC_CHANNELS.MAIL_SAVE_CONFIG, params),
    clearConfig: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MAIL_CLEAR_CONFIG),
    testConnection: (params: MailSmtpConfig) =>
      ipcRenderer.invoke(IPC_CHANNELS.MAIL_TEST_CONNECTION, params),
  },


  nomicore: {
    login: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NOMICORE_LOGIN),
    checkSession: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NOMICORE_CHECK_SESSION),
    calculate: (params: NomicoreCalculateParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOMICORE_CALCULATE, params),
  },
  modelConfig: {
    get: () =>
      ipcRenderer.invoke(IPC_CHANNELS.MODEL_CONFIG_GET) as Promise<ModelConfig>,
    save: (config: ModelConfig) =>
      ipcRenderer.invoke(IPC_CHANNELS.MODEL_CONFIG_SAVE, config) as Promise<{ saved: boolean }>,
    checkLocalHealth: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MODEL_CONFIG_LOCAL_HEALTH, { url }) as Promise<{ available: boolean; models: string[] }>,
    getLocalModels: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MODEL_CONFIG_LOCAL_MODELS, { url }) as Promise<{ models: string[] }>,
  },

  catalog: {
    getCoes: () =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_GET_COES),
    getCoe: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_GET_COE, id),
    createCoe: (params: CatalogCreateParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_CREATE_COE, params),
    updateCoe: (params: CatalogUpdateParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_UPDATE_COE, params),
    toggleCoe: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_TOGGLE_COE, id),
    addPracticeToCoe: (params: CatalogJunctionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_ADD_PRACTICE_TO_COE, params),
    removePracticeFromCoe: (params: CatalogJunctionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_REMOVE_PRACTICE_FROM_COE, params),

    getPractices: () =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_GET_PRACTICES),
    getPractice: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_GET_PRACTICE, id),
    createPractice: (params: CatalogCreateParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_CREATE_PRACTICE, params),
    updatePractice: (params: CatalogUpdateParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_UPDATE_PRACTICE, params),
    togglePractice: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_TOGGLE_PRACTICE, id),
    addSkillToPractice: (params: CatalogJunctionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_ADD_SKILL_TO_PRACTICE, params),
    removeSkillFromPractice: (params: CatalogJunctionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_REMOVE_SKILL_FROM_PRACTICE, params),

    getSkills: () =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_GET_SKILLS),
    getSkill: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_GET_SKILL, id),
    createSkill: (params: CatalogCreateParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_CREATE_SKILL, params),
    updateSkill: (params: CatalogUpdateParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_UPDATE_SKILL, params),
    toggleSkill: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATALOG_TOGGLE_SKILL, id),
  },

  responsiveness: {
    getReport: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSIVENESS_GET_REPORT) as Promise<IpcContracts[typeof IPC_CHANNELS.RESPONSIVENESS_GET_REPORT]['response']>,
    getLeads: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSIVENESS_GET_LEADS) as Promise<IpcContracts[typeof IPC_CHANNELS.RESPONSIVENESS_GET_LEADS]['response']>,
    addLead: (params: ResponsivenessAddLeadParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSIVENESS_ADD_LEAD, params) as Promise<IpcContracts[typeof IPC_CHANNELS.RESPONSIVENESS_ADD_LEAD]['response']>,
    removeLead: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSIVENESS_REMOVE_LEAD, id) as Promise<IpcContracts[typeof IPC_CHANNELS.RESPONSIVENESS_REMOVE_LEAD]['response']>,
    getPositionDiscussions: (positionUpstreamId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSIVENESS_GET_POSITION_DISCUSSIONS, positionUpstreamId) as Promise<IpcContracts[typeof IPC_CHANNELS.RESPONSIVENESS_GET_POSITION_DISCUSSIONS]['response']>,
    analyzeMentions: (request: ResponsivenessAnalyzeRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSIVENESS_ANALYZE_MENTIONS, request) as Promise<IpcContracts[typeof IPC_CHANNELS.RESPONSIVENESS_ANALYZE_MENTIONS]['response']>,
    generateFullReport: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSIVENESS_GENERATE_FULL_REPORT) as Promise<IpcContracts[typeof IPC_CHANNELS.RESPONSIVENESS_GENERATE_FULL_REPORT]['response']>,
    getLastReport: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RESPONSIVENESS_GET_LAST_REPORT) as Promise<IpcContracts[typeof IPC_CHANNELS.RESPONSIVENESS_GET_LAST_REPORT]['response']>,
    onGenerateProgress: (callback: (progress: PositionAttentionProgress) => void) => {
      const handler = (_e: IpcRendererEvent, progress: PositionAttentionProgress) => callback(progress)
      ipcRenderer.on(IPC_CHANNELS.RESPONSIVENESS_GENERATE_PROGRESS, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.RESPONSIVENESS_GENERATE_PROGRESS, handler)
    },
  },

  practiceLeadBonus: {
    getPlacements: (year: number, quarter: string, tiers?: BonusTier[]): Promise<IpcContracts[typeof IPC_CHANNELS.PRACTICE_LEAD_BONUS_PLACEMENTS]['response']> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRACTICE_LEAD_BONUS_PLACEMENTS, { year, quarter, tiers }),
    getOffboardings: (year: number, quarter: string, tiers?: BonusTier[]): Promise<IpcContracts[typeof IPC_CHANNELS.PRACTICE_LEAD_BONUS_OFFBOARDINGS]['response']> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRACTICE_LEAD_BONUS_OFFBOARDINGS, { year, quarter, tiers }),
    getOverview: (year: number, quarter: string, tiers?: BonusTier[]): Promise<IpcContracts[typeof IPC_CHANNELS.PRACTICE_LEAD_BONUS_OVERVIEW]['response']> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRACTICE_LEAD_BONUS_OVERVIEW, { year, quarter, tiers }),
    getPracticeLeads: (): Promise<IpcContracts[typeof IPC_CHANNELS.PRACTICE_LEAD_BONUS_GET_PRACTICE_LEADS]['response']> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRACTICE_LEAD_BONUS_GET_PRACTICE_LEADS),
    saveGmOverride: (year: number, employee: string, offboardingDate: string | null, account: string, gmOverride: number): Promise<IpcContracts[typeof IPC_CHANNELS.PRACTICE_LEAD_BONUS_SAVE_GM_OVERRIDE]['response']> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRACTICE_LEAD_BONUS_SAVE_GM_OVERRIDE, { year, employee, offboardingDate, account, gmOverride }),
  },
} as const

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
