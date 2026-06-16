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
  Scout9RunParams,
  Scout9ListReportsParams,
  Scout9UpdateCandidateParams,
  Scout9SubmitSkipParams,
  Scout9CreateRuleParams,
  Scout9UpdateRuleParams,
  Scout9CreateGlossaryTermParams,
  Scout9UpdateGlossaryTermParams,
  Scout9CreateNoteParams,
  Scout9UpdateNoteParams,
  Scout9TogglePatternParams,
  Scout9CreateOverrideParams,
  Scout9UpdateConfigParams,
  Scout9CreatePromptVersionParams,
  Scout9ActivatePromptVersionParams,
  Scout9PipelineEvent,
  Scout9StatusEvent,
  Scout9UpsertSalaryBandParams,
  AgentStepEvent,
  OracleChatStepEvent,
  ChatChunkEvent,
  IpcContracts,
  IpcEventContracts,
} from '../shared/ipc-types'
import type { CreateOrUpdateTransformSession, BenchBurnRequest, ExternalCandidateMatchRequest } from '../renderer/apps/resume/types'
import type { ErrorReportRequest, ErrorNewEvent, NomicoreCalculateParams, MailSmtpConfig, ResponsivenessAddLeadParams } from '../shared/ipc-types'

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

  path: {
    getDeveloperDashboard: (params: IpcContracts[typeof IPC_CHANNELS.PATH_GET_DEVELOPER_DASHBOARD]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_GET_DEVELOPER_DASHBOARD, params),
    listLearningPaths: (params: IpcContracts[typeof IPC_CHANNELS.PATH_LIST_LEARNING_PATHS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_LIST_LEARNING_PATHS, params),
    getLearningPath: (params: IpcContracts[typeof IPC_CHANNELS.PATH_GET_LEARNING_PATH]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_GET_LEARNING_PATH, params),
    createLearningPath: (params: IpcContracts[typeof IPC_CHANNELS.PATH_CREATE_LEARNING_PATH]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_CREATE_LEARNING_PATH, params),
    updateLearningPath: (params: IpcContracts[typeof IPC_CHANNELS.PATH_UPDATE_LEARNING_PATH]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_UPDATE_LEARNING_PATH, params),
    deleteLearningPath: (params: IpcContracts[typeof IPC_CHANNELS.PATH_DELETE_LEARNING_PATH]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_DELETE_LEARNING_PATH, params),
    listAssessments: (params: IpcContracts[typeof IPC_CHANNELS.PATH_LIST_ASSESSMENTS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_LIST_ASSESSMENTS, params),
    getAssessment: (params: IpcContracts[typeof IPC_CHANNELS.PATH_GET_ASSESSMENT]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_GET_ASSESSMENT, params),
    saveAssessmentDraft: (params: IpcContracts[typeof IPC_CHANNELS.PATH_SAVE_ASSESSMENT_DRAFT]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_SAVE_ASSESSMENT_DRAFT, params),
    submitAssessment: (params: IpcContracts[typeof IPC_CHANNELS.PATH_SUBMIT_ASSESSMENT]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_SUBMIT_ASSESSMENT, params),
    listDiscussionThreads: (params: IpcContracts[typeof IPC_CHANNELS.PATH_LIST_DISCUSSION_THREADS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_LIST_DISCUSSION_THREADS, params),
    getDiscussionThread: (params: IpcContracts[typeof IPC_CHANNELS.PATH_GET_DISCUSSION_THREAD]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_GET_DISCUSSION_THREAD, params),
    createDiscussionPost: (params: IpcContracts[typeof IPC_CHANNELS.PATH_CREATE_DISCUSSION_POST]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_CREATE_DISCUSSION_POST, params),
    replyDiscussionPost: (params: IpcContracts[typeof IPC_CHANNELS.PATH_REPLY_DISCUSSION_POST]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_REPLY_DISCUSSION_POST, params),
    listDossiers: (params: IpcContracts[typeof IPC_CHANNELS.PATH_LIST_DOSSIERS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_LIST_DOSSIERS, params),
    getDossier: (params: IpcContracts[typeof IPC_CHANNELS.PATH_GET_DOSSIER]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_GET_DOSSIER, params),
    updateDossierStatus: (params: IpcContracts[typeof IPC_CHANNELS.PATH_UPDATE_DOSSIER_STATUS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_UPDATE_DOSSIER_STATUS, params),
    getAdminAnalytics: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_GET_ADMIN_ANALYTICS),
    getSettings: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_GET_SETTINGS),
    saveSettings: (params: IpcContracts[typeof IPC_CHANNELS.PATH_SAVE_SETTINGS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_SAVE_SETTINGS, params),
    saveAnalyticsEvent: (params: IpcContracts[typeof IPC_CHANNELS.PATH_SAVE_ANALYTICS_EVENT]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_SAVE_ANALYTICS_EVENT, params),
    recalculateReadiness: (params: IpcContracts[typeof IPC_CHANNELS.PATH_RECALCULATE_READINESS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_RECALCULATE_READINESS, params),
    generateDefensePrep: (params: IpcContracts[typeof IPC_CHANNELS.PATH_GENERATE_DEFENSE_PREP]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_GENERATE_DEFENSE_PREP, params),
    generateRemediation: (params: IpcContracts[typeof IPC_CHANNELS.PATH_GENERATE_REMEDIATION]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_GENERATE_REMEDIATION, params),
    searchDynamicResources: (params: IpcContracts[typeof IPC_CHANNELS.PATH_SEARCH_DYNAMIC_RESOURCES]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATH_SEARCH_DYNAMIC_RESOURCES, params),
  },

  scout9: {
    run: (params: Scout9RunParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_RUN, params),
    cancel: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_CANCEL),
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_GET_STATUS),
    getScopeOptions: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_GET_SCOPE_OPTIONS),
    listReports: (params?: Scout9ListReportsParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_LIST_REPORTS, params),
    getReport: (reportId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_GET_REPORT, reportId),
    updateCandidate: (params: Scout9UpdateCandidateParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_UPDATE_CANDIDATE, params),
    submitSkip: (params: Scout9SubmitSkipParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SUBMIT_SKIP, params),
    listRules: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_LIST_RULES),
    createRule: (params: Scout9CreateRuleParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_CREATE_RULE, params),
    updateRule: (params: Scout9UpdateRuleParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_UPDATE_RULE, params),
    deleteRule: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_DELETE_RULE, id),
    listGlossary: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_LIST_GLOSSARY),
    createGlossaryTerm: (params: Scout9CreateGlossaryTermParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_CREATE_GLOSSARY_TERM, params),
    updateGlossaryTerm: (params: Scout9UpdateGlossaryTermParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_UPDATE_GLOSSARY_TERM, params),
    deleteGlossaryTerm: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_DELETE_GLOSSARY_TERM, id),
    listNotes: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_LIST_NOTES),
    createNote: (params: Scout9CreateNoteParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_CREATE_NOTE, params),
    updateNote: (params: Scout9UpdateNoteParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_UPDATE_NOTE, params),
    deleteNote: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_DELETE_NOTE, id),
    compileKnowledgeBase: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_COMPILE),
    listPatterns: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_LIST_PATTERNS),
    togglePattern: (params: Scout9TogglePatternParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_TOGGLE_PATTERN, params),
    listOverrides: (clientId?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_LIST_OVERRIDES, clientId),
    createOverride: (params: Scout9CreateOverrideParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_CREATE_OVERRIDE, params),
    deleteOverride: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_DELETE_OVERRIDE, id),
    getTokenBudget: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_KB_TOKEN_BUDGET),
    getConfig: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SETTINGS_GET_CONFIG),
    updateConfig: (params: Scout9UpdateConfigParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SETTINGS_UPDATE_CONFIG, params),
    listPromptVersions: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SETTINGS_LIST_PROMPTS),
    createPromptVersion: (params: Scout9CreatePromptVersionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SETTINGS_CREATE_PROMPT, params),
    activatePromptVersion: (params: Scout9ActivatePromptVersionParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SETTINGS_ACTIVATE_PROMPT, params),
    getBrainSnapshot: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_GET_BRAIN_SNAPSHOT),
    salaryBands: {
      list: () =>
        ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SALARY_BANDS_LIST),
      byCountry: (code: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SALARY_BANDS_BY_COUNTRY, code),
      upsert: (data: Scout9UpsertSalaryBandParams) =>
        ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SALARY_BANDS_UPSERT, data),
      delete: (id: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_SALARY_BANDS_DELETE, id),
    },
    jobFamilies: {
      list: () =>
        ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_JOB_FAMILIES_LIST),
    },
    countries: {
      list: () =>
        ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_COUNTRIES_LIST),
    },
    chat: (params: IpcContracts[typeof IPC_CHANNELS.SCOUT9_CHAT]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCOUT9_CHAT, params) as Promise<IpcContracts[typeof IPC_CHANNELS.SCOUT9_CHAT]['response']>,
    onChatStepEvent: (callback: (data: string) => void) => {
      const handler = (_e: IpcRendererEvent, data: string) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SCOUT9_CHAT_STEP_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SCOUT9_CHAT_STEP_EVENT, handler)
    },
    onChatChunkEvent: (callback: (data: ChatChunkEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: ChatChunkEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SCOUT9_CHAT_CHUNK_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SCOUT9_CHAT_CHUNK_EVENT, handler)
    },
    onPipelineEvent: (callback: (data: Scout9PipelineEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: Scout9PipelineEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SCOUT9_PIPELINE_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SCOUT9_PIPELINE_EVENT, handler)
    },
    onStatusEvent: (callback: (data: Scout9StatusEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: Scout9StatusEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.SCOUT9_STATUS_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SCOUT9_STATUS_EVENT, handler)
    },
  },

  vigil: {
    run: (params: IpcContracts[typeof IPC_CHANNELS.VIGIL_RUN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_RUN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_RUN]['response']>,
    cancelRun: (params: IpcContracts[typeof IPC_CHANNELS.VIGIL_CANCEL_RUN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_CANCEL_RUN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_CANCEL_RUN]['response']>,
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_GET_STATUS) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_GET_STATUS]['response']>,
    listRuns: (params?: IpcContracts[typeof IPC_CHANNELS.VIGIL_LIST_RUNS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_LIST_RUNS, params) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_LIST_RUNS]['response']>,
    getRun: (runId: IpcContracts[typeof IPC_CHANNELS.VIGIL_GET_RUN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_GET_RUN, runId) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_GET_RUN]['response']>,
    getActivityLog: (params?: IpcContracts[typeof IPC_CHANNELS.VIGIL_GET_ACTIVITY_LOG]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_GET_ACTIVITY_LOG, params) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_GET_ACTIVITY_LOG]['response']>,
    clearActivityLog: () =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_CLEAR_ACTIVITY_LOG) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_CLEAR_ACTIVITY_LOG]['response']>,
    getConfig: () =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_GET_CONFIG) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_GET_CONFIG]['response']>,
    updateConfig: (params: IpcContracts[typeof IPC_CHANNELS.VIGIL_UPDATE_CONFIG]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_UPDATE_CONFIG, params) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_UPDATE_CONFIG]['response']>,

    toolsDryRun: (params: IpcContracts[typeof IPC_CHANNELS.VIGIL_TOOLS_DRY_RUN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_TOOLS_DRY_RUN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_TOOLS_DRY_RUN]['response']>,
    syncSource: (params: IpcContracts[typeof IPC_CHANNELS.VIGIL_SYNC_SOURCE]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.VIGIL_SYNC_SOURCE, params) as Promise<IpcContracts[typeof IPC_CHANNELS.VIGIL_SYNC_SOURCE]['response']>,
    onActivityEvent: (callback: (data: IpcEventContracts[typeof IPC_CHANNELS.VIGIL_ACTIVITY_EVENT]) => void) => {
      const handler = (_e: IpcRendererEvent, data: IpcEventContracts[typeof IPC_CHANNELS.VIGIL_ACTIVITY_EVENT]) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.VIGIL_ACTIVITY_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.VIGIL_ACTIVITY_EVENT, handler)
    },
    onStatusEvent: (callback: (data: IpcEventContracts[typeof IPC_CHANNELS.VIGIL_STATUS_EVENT]) => void) => {
      const handler = (_e: IpcRendererEvent, data: IpcEventContracts[typeof IPC_CHANNELS.VIGIL_STATUS_EVENT]) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.VIGIL_STATUS_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.VIGIL_STATUS_EVENT, handler)
    },

  },

  oracle: {
    sendMessage: (params: IpcContracts[typeof IPC_CHANNELS.ORACLE_CHAT_SEND_MESSAGE]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORACLE_CHAT_SEND_MESSAGE, params) as Promise<IpcContracts[typeof IPC_CHANNELS.ORACLE_CHAT_SEND_MESSAGE]['response']>,
    listMessages: (params?: IpcContracts[typeof IPC_CHANNELS.ORACLE_CHAT_LIST_MESSAGES]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORACLE_CHAT_LIST_MESSAGES, params) as Promise<IpcContracts[typeof IPC_CHANNELS.ORACLE_CHAT_LIST_MESSAGES]['response']>,
    clearMessages: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ORACLE_CHAT_CLEAR_MESSAGES) as Promise<IpcContracts[typeof IPC_CHANNELS.ORACLE_CHAT_CLEAR_MESSAGES]['response']>,
    onStepEvent: (callback: (data: OracleChatStepEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: OracleChatStepEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.ORACLE_CHAT_STEP_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ORACLE_CHAT_STEP_EVENT, handler)
    },
    onChunkEvent: (callback: (data: ChatChunkEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: ChatChunkEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.ORACLE_CHAT_CHUNK_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ORACLE_CHAT_CHUNK_EVENT, handler)
    },
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

  agents: {
    runStub: (params: IpcContracts[typeof IPC_CHANNELS.AGENT_STUB_RUN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_STUB_RUN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.AGENT_STUB_RUN]['response']>,
    onStepEvent: (callback: (data: AgentStepEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: AgentStepEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.AGENT_STEP_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STEP_EVENT, handler)
    },
  },

  braniac: {
    run: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_RUN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_RUN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_RUN]['response']>,
    cancel: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_CANCEL]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_CANCEL, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_CANCEL]['response']>,
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_GET_STATUS) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_STATUS]['response']>,
    listJobs: (params?: IpcContracts[typeof IPC_CHANNELS.BRANIAC_LIST_JOBS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_LIST_JOBS, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_LIST_JOBS]['response']>,
    getJob: (jobId: IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_JOB]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_GET_JOB, jobId) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_JOB]['response']>,
    listPatterns: (params?: IpcContracts[typeof IPC_CHANNELS.BRANIAC_LIST_PATTERNS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_LIST_PATTERNS, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_LIST_PATTERNS]['response']>,
    listProfiles: (params?: IpcContracts[typeof IPC_CHANNELS.BRANIAC_LIST_PROFILES]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_LIST_PROFILES, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_LIST_PROFILES]['response']>,
    getProfile: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_PROFILE]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_GET_PROFILE, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_PROFILE]['response']>,
    getAccounts: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_GET_ACCOUNTS) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_ACCOUNTS]['response']>,
    approvePattern: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_APPROVE_PATTERN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_APPROVE_PATTERN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_APPROVE_PATTERN]['response']>,
    rejectPattern: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_REJECT_PATTERN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_REJECT_PATTERN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_REJECT_PATTERN]['response']>,
    updatePattern: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_UPDATE_PATTERN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_UPDATE_PATTERN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_UPDATE_PATTERN]['response']>,
    onStepEvent: (callback: (data: IpcEventContracts[typeof IPC_CHANNELS.BRANIAC_STEP_EVENT]) => void) => {
      const handler = (_e: IpcRendererEvent, data: IpcEventContracts[typeof IPC_CHANNELS.BRANIAC_STEP_EVENT]) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.BRANIAC_STEP_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.BRANIAC_STEP_EVENT, handler)
    },
    onStatusEvent: (callback: (data: IpcEventContracts[typeof IPC_CHANNELS.BRANIAC_STATUS_EVENT]) => void) => {
      const handler = (_e: IpcRendererEvent, data: IpcEventContracts[typeof IPC_CHANNELS.BRANIAC_STATUS_EVENT]) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.BRANIAC_STATUS_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.BRANIAC_STATUS_EVENT, handler)
    },
    getStakeholders: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_STAKEHOLDERS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_GET_STAKEHOLDERS, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_STAKEHOLDERS]['response']>,
    getAnalysisStatus: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_ANALYSIS_STATUS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_GET_ANALYSIS_STATUS, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_ANALYSIS_STATUS]['response']>,
    createPattern: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_CREATE_PATTERN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_CREATE_PATTERN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_CREATE_PATTERN]['response']>,
    beautifyPattern: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_BEAUTIFY_PATTERN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_BEAUTIFY_PATTERN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_BEAUTIFY_PATTERN]['response']>,
    clearPatterns: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_CLEAR_PATTERNS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_CLEAR_PATTERNS, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_CLEAR_PATTERNS]['response']>,
    listAccountSummaries: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_LIST_ACCOUNT_SUMMARIES) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_LIST_ACCOUNT_SUMMARIES]['response']>,
    getAccountSummary: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_ACCOUNT_SUMMARY]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_GET_ACCOUNT_SUMMARY, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_ACCOUNT_SUMMARY]['response']>,
    deletePattern: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_DELETE_PATTERN]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_DELETE_PATTERN, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_DELETE_PATTERN]['response']>,
    deleteProfile: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_DELETE_PROFILE]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_DELETE_PROFILE, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_DELETE_PROFILE]['response']>,
    clearStakeholder: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_CLEAR_STAKEHOLDER]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_CLEAR_STAKEHOLDER, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_CLEAR_STAKEHOLDER]['response']>,
    clearAccount: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_CLEAR_ACCOUNT]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_CLEAR_ACCOUNT, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_CLEAR_ACCOUNT]['response']>,
    chat: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_CHAT]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_CHAT, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_CHAT]['response']>,
    extractResumeSkills: (params: IpcContracts[typeof IPC_CHANNELS.BRANIAC_EXTRACT_RESUME_SKILLS]['request']) =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_EXTRACT_RESUME_SKILLS, params) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_EXTRACT_RESUME_SKILLS]['response']>,
    getExtractionStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.BRANIAC_GET_EXTRACTION_STATUS) as Promise<IpcContracts[typeof IPC_CHANNELS.BRANIAC_GET_EXTRACTION_STATUS]['response']>,
    onChatStepEvent: (callback: (data: string) => void) => {
      const handler = (_e: IpcRendererEvent, data: string) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.BRANIAC_CHAT_STEP_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.BRANIAC_CHAT_STEP_EVENT, handler)
    },
    onChatChunkEvent: (callback: (data: ChatChunkEvent) => void) => {
      const handler = (_e: IpcRendererEvent, data: ChatChunkEvent) => callback(data)
      ipcRenderer.on(IPC_CHANNELS.BRANIAC_CHAT_CHUNK_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.BRANIAC_CHAT_CHUNK_EVENT, handler)
    },
  },
  nomicore: {
    login: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NOMICORE_LOGIN),
    checkSession: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NOMICORE_CHECK_SESSION),
    calculate: (params: NomicoreCalculateParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOMICORE_CALCULATE, params),
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
  },
} as const

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
