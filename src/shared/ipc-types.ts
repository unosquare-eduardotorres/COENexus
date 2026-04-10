import type { IPC_CHANNELS } from './ipc-channels'
import type {
  PoolCounts,
  FilterOptions,
  MatchSessionSummary,
  MatchSessionDetail,
  MatchCandidate,
  PipelineStages,
  PipelineStats,
  TransformSessionSummary,
  TransformSessionDetail,
  CreateOrUpdateTransformSession,
  BenchEmployee,
  SyncedCandidateListItem,
  BenchOpenPosition,
  BenchBurnRequest,
  CrossMatchResult,
  ExternalCandidateMatchRequest,
  CreateSessionRequest,
  HaikuConfirmPayload,
} from '../renderer/apps/resume/types'

export interface SyncStartParams {
  source: string
  token: string
  limit?: number
  skip?: number
  year?: number
}

export interface SyncSingleParams {
  source: string
  token: string
  upstreamId: number
}

export interface SyncRetryParams {
  source: string
  token: string
}

export interface SyncYearFilterParams {
  year: number
}

export interface SyncUploadNoteParams {
  token: string
  personId: number
  noteType: string
  fileName: string
  fileContent: ArrayBuffer
}

export type SyncDataSource = 'employees' | 'candidates' | 'open-positions'
export type SyncClearDataSource = 'employees' | 'candidates' | 'positions'

export interface SyncRecordDto {
  id: string
  source: string
  status: string
  name: string
  email: string
  seniority?: string
  mainSkill?: string
  country?: string
  grossMonthlySalary?: number | null
  expectedRate?: number | null
  currency?: string | null
  lastAccount?: string | null
  lastAccountStartDate?: string | null
  hasResume: boolean
  resumeNoteId?: number | null
  resumeFilename?: string | null
  isBench: boolean
  reason?: string | null
  resumeChanged: boolean
  upstreamId: number
  syncDetail?: string
  syncedAt: string
  resumeDateCreated?: string | null
  coeCertified?: boolean
  lastStatusUpdate?: string | null
  salaryExpectations?: number | null
  salaryExpectationsCurrency?: string | null
  jobTitle?: string
  candidateStatus?: string | null
  account?: string | null
  coe?: string | null
  practice?: string | null
  stakeholder?: string | null
  countries?: string | null
  seniorities?: string | null
  availableRange?: string | null
  positionStatus?: string | null
  aging?: number | null
  hasJobDescription?: boolean
  candidatesCount?: number
}

export interface SyncProgressDto {
  totalRecords: number
  fetchedRecords: number
  syncedCount: number
  incompleteCount: number
  notProcessedCount: number
  updatedCount: number
  unchangedCount: number
  skippedCount: number
  currentRecord?: string
  status: string
}

export interface SyncedEmployeeRow {
  id: number
  upstream_id: number
  full_name: string
  email: string
  seniority: string
  main_skill: string
  country: string
  gross_monthly_salary: number | null
  salary_currency: string | null
  last_account: string | null
  last_account_start_date: string | null
  rate: number | null
  has_resume: number
  resume_note_id: number | null
  resume_date_created: string | null
  resume_filename: string | null
  is_bench: number
  job_title: string
  status: string
  status_reason: string | null
  failed: number
  synced_at: string
}

export interface SyncedCandidateRow {
  id: number
  upstream_id: number
  full_name: string
  email: string | null
  seniority: string | null
  main_skill: string | null
  country: string | null
  current_salary: number | null
  salary_currency: string | null
  coe_certified: number
  candidate_status: string | null
  last_status_update: string | null
  salary_expectations: number | null
  salary_expectations_currency: string | null
  has_resume: number
  resume_note_id: number | null
  resume_date_created: string | null
  resume_filename: string | null
  status: string
  status_reason: string | null
  failed: number
  synced_at: string
}

export interface SyncedOpenPositionRow {
  id: number
  upstream_id: number
  account: string
  coe: string
  practice: string
  stakeholder: string
  main_skill: string
  countries: string
  seniorities: string
  available_range: string
  account_overview: string
  job_description: string
  job_title: string
  position_status: string
  aging: number
  created: string | null
  ready_date: string | null
  last_modification: string | null
  sourcing: string
  replacement: number
  status: string
  status_reason: string | null
  failed: number
  synced_at: string
}

export type SyncRecordsResponse = SyncedEmployeeRow[] | SyncedCandidateRow[] | SyncedOpenPositionRow[]

export interface ProcessingVectorizeSingleParams {
  source: string
  upstreamId: number
  model?: string
}

export interface ProcessingStartExtractionParams {
  source: string
  token: string
}

export interface ProcessingStartVectorizationParams {
  source: string
  model?: string
}

export interface ProcessingResetStatusParams {
  source: string
}

export interface ProcessingStatusBySource {
  employees: { total: number; extracted: number; vectorized: number; failed: number }
  candidates: { total: number; extracted: number; vectorized: number; failed: number }
  positions: { total: number; extracted: number; vectorized: number; failed: number }
}

export interface ProcessingRecordDto {
  id: string
  upstreamId: number
  name: string
  status: string
  error?: string
  resumeSizeKb?: number
  extractedChunks?: number
  vectorDimensions?: number
}

export interface ProcessingProgressDto {
  source: string
  status: string
  totalRecords: number
  processedRecords: number
  successCount: number
  failedCount: number
  skippedCount: number
}

export interface ProcessingVectorizeSingleResult {
  success: boolean
  error?: string
}

export interface MatchSearchRequest extends CreateSessionRequest {}

export interface MatchConfirmHaikuParams {
  searchId: string
  action: string
}

export interface MatchResumeTextParams {
  sourceType: string
  upstreamId: number
}

export interface AiChatParams {
  model: string
  messages: { role: string; content: string }[]
  maxTokens?: number
}

export interface AiChatResponse {
  choices: { message: { role: string; content: string } }[]
}

export interface DatabaseConfig {
  sharing: { sharedPath: string; exporterName: string }
  voyage: { apiKeys: string[]; defaultModel: string }
  claudeProxy: { baseUrl: string }
}

export interface DatabaseSaveConfigParams {
  sharing?: { sharedPath: string; exporterName: string }
  voyage?: { apiKeys?: string[]; defaultModel?: string }
  claudeProxy?: { baseUrl?: string }
}

export interface DatabaseImportParams {
  filename: string
}

export interface DatabaseSnapshot {
  filename: string
  exportedBy: string
  exportedAt: string
  sizeBytes: number
  recordCounts: Record<string, number>
  isNew: boolean
}

export interface DatabaseStatus {
  recordCounts: Record<string, number>
  lastImportedAt: string | null
  lastImportedFile: string | null
}

export interface DatabaseExportResult {
  filename: string
  sizeBytes: number
  recordCounts: Record<string, number>
  exportedAt: string
}

export interface DatabaseImportResult {
  success: boolean
  tablesRestored: number
  recordCounts: Record<string, number>
}

export interface DatabaseImportFileResult {
  success: boolean
  cancelled: boolean
  filePath?: string
  tablesRestored?: number
  recordCounts?: Record<string, number>
}

export interface VoyageKeyStatus {
  configured: boolean
  keyCount: number
  maskedKeys: Array<{ index: number; masked: string }>
  source: 'keychain' | 'config' | ''
}

export interface AddVoyageKeyParams {
  apiKey: string
}

export interface RemoveVoyageKeyParams {
  index: number
}

export interface SyncCountByStatus {
  total: number
  synced: number
  failed: number
  processing: number
}

export type SyncProgressEvent =
  | { type: 'record'; record: SyncRecordDto }
  | { type: 'progress'; progress: SyncProgressDto }
  | { type: 'complete'; progress: SyncProgressDto }
  | { type: 'error'; message: string }

export type ProcessingProgressEvent =
  | { type: 'record'; record: ProcessingRecordDto }
  | { type: 'progress'; progress: ProcessingProgressDto }
  | { type: 'complete'; progress: ProcessingProgressDto }
  | { type: 'error'; message: string }

export type MatchSearchEvent =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'pipelineStages'; stages: PipelineStages }
  | { type: 'haikuConfirm'; payload: HaikuConfirmPayload }
  | { type: 'result'; candidates: MatchCandidate[]; stats: PipelineStats }
  | { type: 'session'; sessionId: number }
  | { type: 'error'; message: string }
  | { type: 'complete' }

export type BenchBurnEvent =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'result'; candidates: CrossMatchResult[]; stats: PipelineStats }
  | { type: 'session'; sessionId: number }
  | { type: 'error'; message: string }
  | { type: 'complete' }

export interface MatchBenchBurnSession {
  id: number
  name: string
  match_flow_type: string
  data_source: string
  top_n: number
  search_mode: string
  job_description: string
  jd_source: string
  status: string
  created_at: string
  completed_at: string | null
  constraints: unknown
  pipelineStats: unknown
  pipelineStages: unknown
  results: unknown
}

export interface AppUpdateInfo {
  version: string
  [key: string]: unknown
}

export interface AppUpdateAvailableEvent {
  version: string
}

export interface IpcContracts {
  [IPC_CHANNELS.SYNC_VALIDATE_TOKEN]: { request: string; response: { valid: boolean; message: string } }
  [IPC_CHANNELS.SYNC_GET_STATUS]: { request: SyncDataSource; response: SyncCountByStatus }
  [IPC_CHANNELS.SYNC_APPLY_YEAR_FILTER]: { request: SyncYearFilterParams; response: { success: boolean; year: number } }
  [IPC_CHANNELS.SYNC_START]: { request: SyncStartParams; response: { started: boolean } }
  [IPC_CHANNELS.SYNC_PAUSE]: { request: void; response: { paused: boolean } }
  [IPC_CHANNELS.SYNC_SINGLE]: { request: SyncSingleParams; response: SyncRecordDto }
  [IPC_CHANNELS.SYNC_RETRY_FAILED]: { request: SyncRetryParams; response: { started: boolean } }
  [IPC_CHANNELS.SYNC_RETRY_NOT_PROCESSED]: { request: SyncRetryParams; response: { started: boolean } }
  [IPC_CHANNELS.SYNC_GET_RECORDS]: { request: SyncDataSource; response: SyncRecordsResponse }
  [IPC_CHANNELS.SYNC_CLEAR]: { request: SyncClearDataSource; response: { cleared: boolean; dataSource: SyncClearDataSource } }
  [IPC_CHANNELS.SYNC_GET_SKILLS]: { request: void; response: string[] }
  [IPC_CHANNELS.SYNC_UPLOAD_NOTE]: { request: SyncUploadNoteParams; response: { success: boolean; noteId: number } }

  [IPC_CHANNELS.PROCESSING_VOYAGE_KEY_STATUS]: { request: void; response: VoyageKeyStatus }
  [IPC_CHANNELS.PROCESSING_GET_STATUS]: { request: void; response: ProcessingStatusBySource }
  [IPC_CHANNELS.PROCESSING_VECTORIZE_SINGLE]: { request: ProcessingVectorizeSingleParams; response: ProcessingVectorizeSingleResult }
  [IPC_CHANNELS.PROCESSING_START_EXTRACTION]: { request: ProcessingStartExtractionParams; response: { started: boolean } }
  [IPC_CHANNELS.PROCESSING_PAUSE_EXTRACTION]: { request: void; response: { paused: boolean } }
  [IPC_CHANNELS.PROCESSING_START_VECTORIZATION]: { request: ProcessingStartVectorizationParams; response: { started: boolean } }
  [IPC_CHANNELS.PROCESSING_PAUSE_VECTORIZATION]: { request: void; response: { paused: boolean } }
  [IPC_CHANNELS.PROCESSING_RETRY_FAILED]: { request: ProcessingStartExtractionParams; response: { started: boolean } }
  [IPC_CHANNELS.PROCESSING_RETRY_FAILED_VECTORIZATION]: { request: ProcessingStartVectorizationParams; response: { started: boolean } }
  [IPC_CHANNELS.PROCESSING_RESET_STATUS]: { request: ProcessingResetStatusParams; response: { reset: boolean } }
  [IPC_CHANNELS.PROCESSING_ADD_VOYAGE_KEY]: { request: AddVoyageKeyParams; response: { saved: boolean } }
  [IPC_CHANNELS.PROCESSING_REMOVE_VOYAGE_KEY]: { request: RemoveVoyageKeyParams; response: { deleted: boolean } }

  [IPC_CHANNELS.MATCH_POOL_COUNTS]: { request: void; response: PoolCounts }
  [IPC_CHANNELS.MATCH_FILTER_OPTIONS]: { request: void; response: FilterOptions }
  [IPC_CHANNELS.MATCH_SEARCH]: { request: MatchSearchRequest; response: { sessionId: number | null } }
  [IPC_CHANNELS.MATCH_CANCEL_SEARCH]: { request: void; response: { cancelled: boolean } }
  [IPC_CHANNELS.MATCH_CONFIRM_HAIKU]: { request: MatchConfirmHaikuParams; response: { confirmed: boolean } }
  [IPC_CHANNELS.MATCH_SEARCH_SESSION]: { request: MatchSearchRequest; response: { sessionId: number | null } }
  [IPC_CHANNELS.MATCH_LIST_SESSIONS]: { request: void; response: MatchSessionSummary[] }
  [IPC_CHANNELS.MATCH_GET_SESSION]: { request: number; response: MatchSessionDetail }
  [IPC_CHANNELS.MATCH_PROXY_STATUS]: { request: void; response: { available: boolean } }
  [IPC_CHANNELS.MATCH_BENCH_EMPLOYEES]: { request: void; response: BenchEmployee[] }
  [IPC_CHANNELS.MATCH_ALL_EMPLOYEES]: { request: void; response: BenchEmployee[] }
  [IPC_CHANNELS.MATCH_ALL_CANDIDATES]: { request: void; response: SyncedCandidateListItem[] }
  [IPC_CHANNELS.MATCH_SEARCH_CANDIDATES]: { request: string; response: SyncedCandidateListItem[] }
  [IPC_CHANNELS.MATCH_SEARCH_EMPLOYEES]: { request: string; response: BenchEmployee[] }
  [IPC_CHANNELS.MATCH_OPEN_POSITIONS]: { request: void; response: BenchOpenPosition[] }
  [IPC_CHANNELS.MATCH_BENCH_BURN_SESSION]: { request: number; response: MatchBenchBurnSession | undefined }
  [IPC_CHANNELS.MATCH_BENCH_BURN]: { request: BenchBurnRequest; response: { sessionId: number | null } }
  [IPC_CHANNELS.MATCH_BENCH_BURN_RETRY]: { request: BenchBurnRequest; response: { sessionId: number | null } }
  [IPC_CHANNELS.MATCH_RESUME_TEXT]: { request: MatchResumeTextParams; response: { text: string | null } }
  [IPC_CHANNELS.MATCH_EXTERNAL_CANDIDATE]: { request: ExternalCandidateMatchRequest; response: { sessionId: number | null } }

  [IPC_CHANNELS.SESSIONS_CREATE]: { request: CreateOrUpdateTransformSession; response: { id: number } }
  [IPC_CHANNELS.SESSIONS_UPDATE]: { request: [id: number, data: Partial<CreateOrUpdateTransformSession>]; response: { success: boolean } }
  [IPC_CHANNELS.SESSIONS_GET]: { request: number; response: TransformSessionDetail | null }
  [IPC_CHANNELS.SESSIONS_LIST]: { request: void; response: TransformSessionSummary[] }
  [IPC_CHANNELS.SESSIONS_DELETE]: { request: number; response: { deleted: boolean } }

  [IPC_CHANNELS.DATABASE_GET_CONFIG]: { request: void; response: DatabaseConfig }
  [IPC_CHANNELS.DATABASE_SAVE_CONFIG]: { request: DatabaseSaveConfigParams; response: { saved: boolean } }
  [IPC_CHANNELS.DATABASE_EXPORT]: { request: void; response: DatabaseExportResult }
  [IPC_CHANNELS.DATABASE_IMPORT]: { request: DatabaseImportParams; response: DatabaseImportResult }
  [IPC_CHANNELS.DATABASE_LIST_SNAPSHOTS]: { request: void; response: DatabaseSnapshot[] }
  [IPC_CHANNELS.DATABASE_STATUS]: { request: void; response: DatabaseStatus }
  [IPC_CHANNELS.DATABASE_IMPORT_FILE]: { request: void; response: DatabaseImportFileResult }

  [IPC_CHANNELS.AI_CHAT]: { request: AiChatParams; response: AiChatResponse }
  [IPC_CHANNELS.AI_CHECK_CONNECTION]: { request: void; response: { available: boolean } }

  [IPC_CHANNELS.APP_GET_VERSION]: { request: void; response: string }
  [IPC_CHANNELS.APP_GET_PLATFORM]: { request: void; response: string }
  [IPC_CHANNELS.APP_OPEN_EXTERNAL]: { request: string; response: { opened: boolean } }
  [IPC_CHANNELS.APP_CHECK_FOR_UPDATES]: { request: void; response: AppUpdateInfo | null }
  [IPC_CHANNELS.APP_DOWNLOAD_UPDATE]: { request: void; response: { success: boolean } }
  [IPC_CHANNELS.APP_INSTALL_UPDATE]: { request: void; response: void }
}

export interface IpcEventContracts {
  [IPC_CHANNELS.SYNC_PROGRESS_EVENT]: SyncProgressEvent
  [IPC_CHANNELS.PROCESSING_PROGRESS_EVENT]: ProcessingProgressEvent
  [IPC_CHANNELS.MATCH_SEARCH_EVENT]: MatchSearchEvent
  [IPC_CHANNELS.MATCH_BENCH_BURN_EVENT]: BenchBurnEvent
  [IPC_CHANNELS.APP_UPDATE_AVAILABLE]: AppUpdateAvailableEvent
  [IPC_CHANNELS.APP_UPDATE_DOWNLOADED]: void
}
