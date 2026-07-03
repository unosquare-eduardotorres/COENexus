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

export type ErrorSeverity = 'warning' | 'error' | 'critical'
export type ErrorScope = 'IPC' | 'Main' | 'DB' | 'Agent' | 'Renderer' | 'ErrorBoundary' | 'Preload' | 'Unknown'
export type ErrorStatus = 'new' | 'reported'

export interface ErrorEntry {
  id: string
  timestamp: string
  scope: ErrorScope
  message: string
  stack?: string
  componentStack?: string
  platform: string
  version: string
  severity: ErrorSeverity
  fingerprint: string
  occurrences: number
  lastOccurrence: string
  status: ErrorStatus
  source?: string
  aiDescription?: string
  url?: string
  userAgent?: string
}

export interface ErrorListResponse {
  errors: ErrorEntry[]
  totalCount: number
  fileSize: number
}

export interface ErrorGenerateDescriptionRequest {
  errorId: string
}

export interface ErrorGenerateDescriptionResponse {
  description: string
}

export interface ErrorReportRequest {
  message: string
  stack?: string
  componentStack?: string
  scope: ErrorScope
  url?: string
}

export interface ErrorNewEvent {
  entry: ErrorEntry
}

export interface SyncStartParams {
  source: string
  token: string
  limit?: number
  skip?: number
  year?: number
  activeOnly?: boolean
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

export type SyncDataSource = 'employees' | 'candidates' | 'open-positions' | 'project-reallocations'
export type SyncClearDataSource = 'employees' | 'candidates' | 'positions' | 'project-reallocations'

export type PipelineMode = 'full' | 'sync-only'

export interface PipelineStartParams {
  source: 'employees' | 'candidates'
  token: string
  mode?: PipelineMode
  model?: string
  limit?: number
  skip?: number
  year?: number
  activeOnly?: boolean
}

export interface PipelineRetryParams {
  source: 'employees' | 'candidates'
  token: string
  model?: string
}

export interface PipelineRetrySingleParams {
  source: 'employees' | 'candidates'
  token: string
  model?: string
  upstreamId: number
}

export interface PipelineRecordEvent {
  upstreamId: number
  name: string
  outcome: 'vectorized' | 'skipped' | 'failed'
  failedStep?: 'sync' | 'extract' | 'vectorize' | 'no_resume'
  error?: string
  seniority?: string
  mainSkill?: string
  jobTitle?: string
  functionalUnit?: string
  businessUnit?: string
  hasResume?: boolean
}

export interface PipelineProgressDto {
  source: string
  status: 'processing' | 'paused' | 'completed'
  totalRecords: number
  processedRecords: number
  succeededCount: number
  failedCount: number
  skippedCount: number
  currentRecord?: string
  pauseReason?: 'user' | 'token-expiring' | 'error'
  errorMessage?: string
}

export type PipelineProgressEvent =
  | { type: 'record'; record: PipelineRecordEvent }
  | { type: 'progress'; progress: PipelineProgressDto }
  | { type: 'complete'; progress: PipelineProgressDto }
  | { type: 'error'; message: string }

export interface PositionPipelineStartParams {
  token: string
  model?: string
  activeOnly: boolean
  limit?: number
  skip?: number
  year?: number
}

export interface PositionPipelineVectorizeSyncedParams {
  token: string
  model?: string
}

export interface PipelineFailedRecord {
  id: number
  upstream_id: number
  full_name: string
  status: string
  status_reason: string | null
  has_resume: number
  resume_note_id: number | null
  resume_filename: string | null
}

export interface PersistedPipelineState {
  source: string
  status: 'paused'
  pauseReason?: string
  errorMessage?: string
  offset: number
  totalRecords: number
  processedRecords: number
  succeededCount: number
  failedCount: number
  skippedCount: number
  succeededRecords: PipelineRecordEvent[]
  failedRecords: PipelineRecordEvent[]
  skippedRecords: PipelineRecordEvent[]
  year?: number
  activeOnly?: boolean
  savedAt: string
}

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
  functionalUnit?: string
  officeLocation?: string
  businessUnit?: string
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
  team?: string
  transitionStatus?: string
  location?: string
  impact?: string
  attritionRisk?: string
  presentationsCount?: number
  employee?: string
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
  bench_team: string | null
  job_title: string
  normalized_monthly_usd: number | null
  inferred_currency: string | null
  currency_confidence: string | null
  status: string
  status_reason: string | null
  failed?: number
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
  normalized_monthly_usd: number | null
  inferred_currency: string | null
  currency_confidence: string | null
  status: string
  status_reason: string | null
  failed?: number
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
  vertical_industry: string
  in_office: number
  csu: string
  cs: string
  closed_date: string | null
  closed_reason: string | null
  is_ready: number
  is_promotion: number
  maximum_rate: number | null
  minimum_rate: number | null
  additional_skills: string
  created_with_assignments_tool: number | null
  candidates_presented: number
  last_discussion_date: string | null
  status: string
  status_reason: string | null
  failed?: number
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

export interface ProcessingProcessAllParams {
  source: string
  token: string
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

export interface MatchRankPositionsParams {
  sourceType: 'candidate' | 'employee'
  upstreamId: number
  topN: number
}

export interface MatchRankPositionsForTextParams {
  resumeText: string
  topN: number
}

export interface MatchRankPositionsResult {
  positions: {
    upstreamId: number
    account: string
    jobTitle: string
    mainSkill: string
    seniorities: string
    positionStatus: string
    aging: number
    countries: string
    coe: string
    cosineSimilarity: number
    isVectorized: boolean
  }[]
}

export interface MatchToPositionsParams {
  name: string
  matchFlowType: 'match-to-positions'
  personSourceType: 'candidate' | 'employee' | 'external'
  upstreamId?: number
  candidateName?: string
  resumeText?: string
  positionUpstreamIds: number[]
  customPositions?: { name: string; jobDescription: string }[]
}

export interface PresentCreateSessionParams {
  name?: string
  mode?: string
  openPositionId?: number
  positionTitle?: string
  accountName?: string
  positionUpstreamId?: number
  jobDescription?: string
}

export interface PresentUpdateSessionParams {
  name?: string
  mode?: string
  introText?: string
  status?: string
  openPositionId?: number
  positionTitle?: string
  accountName?: string
  positionUpstreamId?: number
  jobDescription?: string
}

export interface PresentAddEntryParams {
  sessionId: number
  sourceType: string
  upstreamId: number
  fullName: string
  mainSkill: string
  seniority: string
  country: string
  yearsOfExperience?: string
  availability?: string
  recommendedRate?: string
  techStack?: string[]
  professionalSummary?: string
  domainExperience?: string
  resumeFormatStatus?: string
  transformSessionId?: number
  individualIntroText?: string
  sortOrder?: number
}

export interface PresentUpdateEntryParams extends Partial<Omit<PresentAddEntryParams, 'sessionId'>> {}

export interface PresentCheckResumeFormatParams {
  resumeText: string
}

export interface PresentTransformResumeParams {
  resumeText: string
  fullName: string
  jobDescription?: string
}

export interface PresentGenerateIntroParams {
  candidateNames: string[]
  positionTitle?: string
  accountName?: string
  jobDescription?: string
  mainSkill?: string
}

export interface PresentGenerateCandidateProfileParams {
  resumeText: string
  fullName: string
  mainSkill: string
  jobDescription?: string
  positionTitle?: string
}

export interface PresentGenerateHtmlParams {
  sessionId: number
  mode: string
}

export interface AiChatParams {
  model: string
  messages: { role: string; content: string }[]
  maxTokens?: number
}

export interface AiChatResponse {
  choices: { message: { role: string; content: string } }[]
}

export interface TokenUsageStats {
  inputTokens: number
  outputTokens: number
}

export interface SubscriptionCheckResult {
  claudeCli: { installed: boolean; version: string | null; error: string | null }
  claudeAuth: { authenticated: boolean; accountEmail: string | null; error: string | null }
  claudeMax: { active: boolean; plan: string | null; error: string | null }
}

export interface DatabaseConfig {
  sharing: { sharedPath: string; exporterName: string }
  voyage: { apiKeys: string[]; defaultModel: string }
}

export interface DatabaseSaveConfigParams {
  sharing?: { sharedPath: string; exporterName: string }
  voyage?: { apiKeys?: string[]; defaultModel?: string }
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
  localDbHash: string | null
}

export interface DatabaseExportResult {
  filename: string
  sizeBytes: number
  recordCounts: Record<string, number>
  exportedAt: string
  hash: string
}

export interface DatabaseImportResult {
  success: boolean
  tablesRestored: number
  recordCounts: Record<string, number>
  vecEntriesRebuilt: number
}

export interface DatabaseImportFileResult {
  success: boolean
  cancelled: boolean
  filePath?: string
  tablesRestored?: number
  recordCounts?: Record<string, number>
}

export interface DatabaseHealthResult {
  engine: 'sqlite'
  filePath: string
  fileSizeBytes: number
  walSizeBytes: number
  sqliteVersion: string
  integrityOk: boolean
  journalMode: string
  foreignKeys: boolean
  recordCounts: Record<string, number>
  tableCount: number
}

export interface SyncManifest {
  latestSnapshot: string
  latestHash: string
  exportedAt: string
  exportedBy: string
  schemaVersion: number
  recordCounts: Record<string, number>
  sizeBytes: number
  previousSnapshots: Array<{
    filename: string
    hash: string
    exportedAt: string
    exportedBy: string
  }>
}

export interface SyncCheckResult {
  hasUpdate: boolean
  manifest: SyncManifest | null
  localHash: string | null
}

export interface SyncWatcherStatus {
  isWatching: boolean
  sharedPath: string | null
  lastKnownManifestHash: string | null
  lastCheckedAt: string | null
  hasUpdate: boolean
  remoteManifest: SyncManifest | null
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

export type ReportStalledCriterionKey =
  | 'stalled-position'
  | 'no-active-candidates'
  | 'idle-cgx'
  | 'idle-client'
  | 'idle-customer-interview'
  | 'draft-positions'

export type ReportStalledThresholds = Record<ReportStalledCriterionKey, number>

export interface ReportStalledPositionResult {
  position: SyncedOpenPositionRow
  matchingCriteria: ReportStalledCriterionKey[]
  actors: ('COE' | 'CGX')[]
}

export interface ReportEvaluateResult {
  results: ReportStalledPositionResult[]
  totalPositions: number
  lastSyncedAt: string | null
}

export interface ReportPositionDetailResult {
  position: SyncedOpenPositionRow
  candidates: Array<{
    candidateRequisitionId: number
    candidateId: number
    candidateName: string
    mainSkill: string
    isEmployee: boolean
    candidateStatus: string
    rate: number
    startDate: string | null
    rejectionFeedback: number[]
    rejectionComments: string
    rejectionActionDate: string | null
  }>
  discussions: Array<{
    commentId: number
    author: string
    date: string
    message: string
    parentCommentId: number | null
  }>
}

export interface ReportSyncStatus {
  total: number
  lastSyncedAt: string | null
}

// ---- Acceptance Rate report --------------------------------------------------

export type AcceptanceBucket = 'approved' | 'rejected' | 'declined' | 'unresolved'
export type AcceptanceOutcome = 'won' | 'lost' | 'no-decision'

export interface ReportAcceptanceRateFilters {
  year: number
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  /** Real COE value, or 'all' for no COE scoping. */
  coe: string
}

// ---- Acceptance Rate V2 (monthly cohort + audit trail) -------------------------

export interface ReportCandidateAudit {
  candidateRequisitionId: number
  candidateId: number
  candidateName: string
  mainSkill: string
  candidateStatus: string
  /** How this candidate was classified in the V2 algorithm. */
  disposition: 'numerator' | 'denominator' | 'excluded' | 'dedup-skipped'
  /** Human-readable reason for exclusion or dedup. */
  exclusionReason: string | null
  /** If dedup-skipped, the position where this candidate was already counted. */
  dedupFirstPositionId: number | null
  dedupFirstPositionLabel: string | null
  isEmployee: boolean
  rate: number
  startDate: string | null
}

export interface ReportPositionOutcomeV2 {
  upstreamId: number
  account: string
  stakeholder: string
  jobTitle: string
  mainSkill: string
  coe: string
  practice: string
  positionStatus: string
  createdDate: string
  closedDate: string | null
  outcome: AcceptanceOutcome
  /** Per-position counts (after dedup within this position). */
  countedInNumerator: number
  countedInDenominator: number
  excludedCount: number
  dedupSkippedCount: number
  candidates: ReportCandidateAudit[]
}

export interface ReportMonthBreakdown {
  month: string
  positionCount: number
  wonCount: number
  lostCount: number
  otherCount: number
  math: {
    rawApproved: number
    rawPresentedToClient: number
    rawCustomerInterview: number
    rawRejectedByClient: number
    rawDenominator: number
    excludedByStatus: Record<string, number>
    excludedTotal: number
    dedupRemovedNumerator: number
    dedupRemovedDenominator: number
    netNumerator: number
    netDenominator: number
    rate: number
  }
  qtd: {
    cumulativeNumerator: number
    cumulativeDenominator: number
    rate: number
  }
  positions: ReportPositionOutcomeV2[]
}

export interface ReportAcceptanceRateResultV2 {
  summary: {
    acceptanceRate: number
    totalPositions: number
    totalNumerator: number
    totalDenominator: number
    totalExcluded: number
    totalDeduped: number
    lastSyncedAt: string | null
  }
  months: ReportMonthBreakdown[]
}

export interface ReportExportCsvResult {
  saved: boolean
  filePath?: string
}

export interface ReportExportPdfResult {
  saved: boolean
  filePath?: string
}

export interface ExcelExportResult {
  saved: boolean
  filePath?: string
}

export type PrrCoeStatus = 'Not Set' | 'Pending Evaluation' | 'Ready to Present' | 'Presented' | 'Needs Attention' | 'Not Applies' | 'Other' | 'Closed'

export interface PrrCommentDto {
  text: string
  author: string
  createdAt: string
}

export interface PrrReportItem {
  upstreamId: number
  employee: string
  account: string
  team: string
  mainSkill: string
  seniority: string
  transitionStatus: string
  transitionSubType: string
  location: string
  requestDate: string | null
  daysSinceLastInterview: string
  impact: string
  attritionRisk: string
  comments: string
  presentationsCount: number
  coeStatus: PrrCoeStatus
  coeComments: PrrCommentDto[]
  daysOpened: number
  syncedAt: string
}

export interface PrrDetailResult {
  prr: PrrReportItem
  presentations: Array<{
    openPositionId: number
    account: string
    openPositionStatus: string
    location: string
    presentedOn: string | null
    candidateStatus: string
  }>
}

export interface PrrUpdateCoeStatusParams {
  upstreamId: number
  coeStatus: PrrCoeStatus
}

export interface PrrAddCommentParams {
  upstreamId: number
  text: string
  author: string
}

export interface PrrSyncStatus {
  hasData: boolean
  total: number
  lastSyncedAt: string | null
}

// ── COE Tracking ─────────────────────────────────────────

export type HealthTier = 'critical' | 'warning' | 'good' | 'excellent' | 'won'

export interface HealthBreakdown {
  critical: number
  warning: number
  good: number
  excellent: number
  won: number
}

export interface CoeTrackingSummary {
  coe: string
  totalPositions: number
  coveredPositions: number
  effectivenessPercent: number
  healthBreakdown: HealthBreakdown
  topPractices: string[]
  virtualPositions: number
}

export interface PracticeTrackingSummary {
  practice: string
  coe: string
  totalPositions: number
  coveredPositions: number
  effectivenessPercent: number
  healthBreakdown: HealthBreakdown
  skillCount: number
  singleSkill?: string
  virtualPositions: number
}

export interface SkillTrackingSummary {
  skill: string
  coe: string
  totalPositions: number
  coveredPositions: number
  effectivenessPercent: number
  healthBreakdown: HealthBreakdown
  virtualPositions: number
}

export interface TrackedPosition {
  position: SyncedOpenPositionRow
  activeCandidateCount: number
  healthTier: HealthTier
  totalCandidates: number
  matchingCriteria: ReportStalledCriterionKey[]
  actors: ('COE' | 'CGX')[]
  isVirtual: boolean
}

export interface CoeTrackingTimelineEvent {
  type: 'created' | 'ready' | 'modified' | 'candidate-presented' | 'candidate-rejected' | 'discussion'
  date: string
  label: string
  detail?: string
}

export interface TrackedPositionDetail {
  position: SyncedOpenPositionRow
  activeCandidateCount: number
  healthTier: HealthTier
  candidates: ReportPositionDetailResult['candidates']
  discussions: ReportPositionDetailResult['discussions']
  timelineEvents: CoeTrackingTimelineEvent[]
  isVirtual: boolean
}

export interface CoeTrackingSkillPositionsParams {
  coe: string
  practice: string
  skill: string
}

export interface CoeTrackingPracticeDetailParams {
  coe: string
  practice: string
}

export interface NomicoreCalculateParams {
  country: string
  contractType: string
  grossMonthly: number
  year?: number
}

export interface NomicoreCalculationResult {
  params: NomicoreCalculateParams
  payroll: Record<string, string>
  cost: Record<string, string>
  profitability: Record<string, string>
  rateCard: Record<string, string>
  rawHtml?: string
  screenshotBase64?: string
  calculatedAt: string
  diagnostics?: NomicoreDiagnostics
}

export interface NomicoreDiagnostics {
  phases: { phase: string; status: string; detail?: string }[]
  pageStructure: {
    tableCount: number
    tables: { index: number; rows: number; cells: number; headerText: string; sampleCells: string[] }[]
    headings: string[]
    inputCount: number
    inputs: { type: string; value: string; name: string; id: string }[]
    cardCount: number
    bodyTextSnippet: string
  }
  allTablesData: Record<string, Record<string, string>>
}

export interface MailSmtpConfig {
  senderEmail: string
  displayName: string
  appPassword: string
  smtpHost: string
  smtpPort: number
  useTls: boolean
}

export interface MailMaskedConfig {
  senderEmail: string
  displayName: string
  passwordConfigured: boolean
  smtpHost: string
  smtpPort: number
  useTls: boolean
}

export interface MailTestResult {
  success: boolean
  message: string
}

// ── Responsiveness Report ────────────────────────────────

export interface ResponsivenessMentionItem {
  positionUpstreamId: number
  account: string
  coe: string
  practice: string
  mainSkill: string
  aging: number
  mentionCommentId: number
  mentionMessage: string
  mentionAuthor: string
  mentionAuthorName: string
  mentionDate: string
  taggedLeadName: string
  taggedLeadEmail: string
  waitingSince: string
  waitingDays: number
  responded: boolean
}

/** @deprecated Use ResponsivenessMentionItem */
export type ResponsivenessUnansweredMention = ResponsivenessMentionItem

export interface ResponsivenessLeadSummary {
  name: string
  email: string
  totalMentions: number
  unanswered: number
  responseRate: number
}

export interface ResponsivenessReport {
  totalMentions: number
  unansweredMentions: number
  responseRate: number
  items: ResponsivenessMentionItem[]
  leadSummary: ResponsivenessLeadSummary[]
}

export interface ResponsivenessCoePracticeLead {
  id: number
  display_name: string
  email: string
  coe: string
  active: number
}

export interface ResponsivenessAddLeadParams {
  name: string
  email: string
  coe?: string
}

export interface ResponsivenessDiscussionComment {
  commentId: number
  author: string
  date: string
  message: string
  parentCommentId: number | null
}

// ── AI Analysis Types ──────────────────────────────────

export interface ResponsivenessAiMentionVerdict {
  mentionCommentId: number
  taggedLeadEmail: string
  stillNeedsResponse: boolean
  confidence: number        // 0-100
  reasoning: string         // one-line explanation
}

export interface ResponsivenessAiAnalysisResult {
  positionUpstreamId: number
  verdicts: ResponsivenessAiMentionVerdict[]
  positionSummary: string
}

export interface ResponsivenessAnalyzeRequest {
  positionUpstreamIds: number[]
}

// ── Position Attention Report Types ──────────────────

export type PositionAttentionState =
  | 'needs-coe-action'    // COE/Practice Lead must act
  | 'waiting-on-client'   // Ball is with client/stakeholder
  | 'on-track'            // Active progress, no blockers
  | 'no-activity'         // No discussions at all
  | 'escalated'           // Auto-escalated from waiting-on-client after 7 days of silence

export interface PositionAttentionItem {
  positionUpstreamId: number
  account: string
  coe: string
  practice: string
  mainSkill: string
  jobTitle: string
  aging: number
  candidatesPresented: number
  lastDiscussionDate: string | null
  stakeholder: string
  seniorities: string
  attentionState: PositionAttentionState
  /** Who currently has the ball (person/team name) */
  ballWith: string
  /** AI-generated 1-2 sentence summary of the situation */
  summary: string
  /** AI confidence 0-100 (or -1 for rule-based classification) */
  confidence: number
  /** Which COE lead owns this position */
  ownerEmail: string
  ownerName: string
  /** Original mention data if any exist */
  mentionCount: number
  unansweredMentionCount: number
  /** Was this auto-escalated from waiting-on-client? */
  escalated: boolean
  /** Human-readable explanation of why this position is in its current state */
  flagReason: string
}

export interface PositionAttentionLeadGroup {
  leadName: string
  leadEmail: string
  coePractice: string
  totalPositions: number
  needsAction: number
  waitingOnClient: number
  onTrack: number
  noActivity: number
  escalated: number
  positions: PositionAttentionItem[]
}

export interface PositionAttentionReport {
  generatedAt: string
  totalPositions: number
  needsAction: number
  waitingOnClient: number
  onTrack: number
  noActivity: number
  escalated: number
  leadGroups: PositionAttentionLeadGroup[]
  /** Flat list of all positions (for filtering/search) */
  allPositions: PositionAttentionItem[]
}

export interface PositionAttentionProgress {
  phase: 'loading' | 'analyzing' | 'classifying' | 'done'
  completed: number
  total: number
  currentPosition?: string  // e.g., "#8618 · Axos Bank"
}

// ── Catalog types ──

export interface CatalogCoeRow {
  id: number; name: string; is_active: number;
  sort_order: number; created_at: string; updated_at: string;
}
export interface CatalogPracticeRow {
  id: number; name: string; is_active: number;
  sort_order: number; created_at: string; updated_at: string;
}
export interface CatalogSkillRow {
  id: number; name: string; is_active: number;
  sort_order: number; created_at: string; updated_at: string;
}
export interface CatalogCoe extends CatalogCoeRow {
  practices: { id: number; name: string }[]
}
export interface CatalogPractice extends CatalogPracticeRow {
  skills: { id: number; name: string }[]
  coes: { id: number; name: string }[]
}
export interface CatalogSkill extends CatalogSkillRow {
  practices: { id: number; name: string }[]
}
export interface CatalogCreateParams { name: string }
export interface CatalogUpdateParams { id: number; name?: string; sort_order?: number }
export interface CatalogJunctionParams { parentId: number; childId: number }

// ---- Placement Margin --------------------------------------------------------

export interface PlacementMarginSyncParams {
  token: string
  year: number
  quarter?: string  // optional — defaults to current quarter for YtdTotals scope
}

export interface PlacementMarginMonthPoint {
  month: number
  label: string
  placementMargin: number
  currentMargin: number
}

export interface PlacementMarginAccountRow {
  account: string
  placements: number
  totalRevenue: number
  totalCost: number
  weightedMarginPct: number
}

export interface PlacementMarginEntryDto {
  name: string
  email: string
  account: string
  mainSkill: string
  country: string
  openPositionId: number
  placementDate: string | null
  leaveDate: string | null
  placementRate: number
  placementMargin: number
  currentMargin: number
  placementRevenue: number
  currentRevenue: number
  monthlySalary: number
  currentMonthlySalary: number
  companyTenure: number
  isPromotion: boolean
  firstTimeEntryDate: string | null
  kickoffDelay: number | null
  tacAtPlacement?: number
  currentTac?: number
}

export interface PlacementMarginReportResult {
  ytdMargin: number
  ytdAvgRate: number
  periodMargin: number
  periodAvgRate: number
  monthlyTrend: PlacementMarginMonthPoint[]
  accountBreakdown: PlacementMarginAccountRow[]
  entries: PlacementMarginEntryDto[]
  syncedAt: string
}

export interface PlacementMarginSyncStatus {
  hasSyncedData: boolean
  syncedAt: string | null
  entryCount: number
}

// ---- Offboarding --------------------------------------------------------

export interface OffboardingSyncParams {
  token: string
  year: number
  quarter?: string
}

export interface OffboardingSyncStatus {
  hasSyncedData: boolean
  syncedAt: string | null
  entryCount: number
}

export interface OffboardingEntryDto {
  employee: string
  account: string
  location: string
  seniority: string
  mainSkill: string
  unosquareTenure: number
  monthlyGrossSalary: number
  monthlyTac: number
  rate: number
  gm: number
  offboardingDate: string | null
  offboardingStatus: string
  leaveReasonType: string
  leaveReasonDetails: string
  leaveReason: string
}

export interface OffboardingReportResult {
  totalOffboardings: number
  avgTenure: number
  byReasonType: Record<string, number>
  byAccount: Record<string, number>
  entries: OffboardingEntryDto[]
  syncedAt: string
}

// ── Fill Rate Report ──────────────────────────────────────────────────────────

export interface ReportFillRateFilters {
  /** Start date inclusive (ISO date string, e.g. '2025-07-01') */
  startDate: string
  /** End date inclusive (ISO date string, e.g. '2026-06-30') */
  endDate: string
  /** COE scope — specific COE name, or 'all' for no scoping */
  coe: string
  /** Include Active/Draft positions in the denominator */
  includeActive: boolean
}

export interface ReportFillRateCoeRow {
  coe: string
  closedWon: number
  closedOther: number
  activeCount: number
  totalDenominator: number
  fillRate: number
  goal: number
}

export interface ReportFillRateMonthPoint {
  /** ISO month string, e.g. '2025-07' */
  month: string
  /** Display label, e.g. 'Jul 2025' */
  label: string
  closedWon: number
  totalDenominator: number
  fillRate: number
}

export interface ReportFillRateResult {
  /** Per-COE breakdown */
  coes: ReportFillRateCoeRow[]
  /** Monthly trend within the window */
  trend: ReportFillRateMonthPoint[]
  /** Aggregate fill rate across all COEs in scope */
  overallFillRate: number
  overallClosedWon: number
  overallDenominator: number
  /** The filters that produced this result (echo back for UI confirmation) */
  filters: ReportFillRateFilters
  /** Last sync timestamp */
  lastSyncedAt: string | null
}

// ── Practice Lead Bonus ─────────────────────────────────────────────────────

export interface BonusTier {
  min: number
  max: number
  label: string
  amount: number
}

export interface PLBPlacementEntry {
  name: string
  email: string
  account: string
  mainSkill: string
  country: string
  placementDate: string | null
  placementMargin: number
  placementRate: number
  currentMargin: number
  kickoffDelay: number | null
  isPromotion: boolean
  companyTenure: number
  practiceName: string
  coeName: string
  bonusTierLabel: string
  bonusAmount: number
}

export interface PLBOffboardingEntry {
  employee: string
  account: string
  mainSkill: string
  offboardingDate: string | null
  gm: number
  gmOriginal: number
  seniority: string
  location: string
  leaveReasonType: string
  unosquareTenure: number
  practiceName: string
  coeName: string
  penaltyTierLabel: string
  penaltyAmount: number
}

export interface PLBOverviewRow {
  practiceLeadName: string
  practiceLeadEmail: string
  practiceName: string
  coeName: string
  placementCount: number
  offboardingCount: number
  grossBonus: number
  penalties: number
  netBonus: number
  tierBreakdown: { tier: string; placements: number; offboardings: number }[]
}

export interface PLBOverview {
  rows: PLBOverviewRow[]
  totals: {
    placements: number
    offboardings: number
    grossBonus: number
    penalties: number
    netBonus: number
  }
}

export interface PLBPracticeLeadRow {
  id: number
  display_name: string
  email: string
  coe: string
  active: number
  practice_id: number | null
  practice_name: string | null
  coe_name: string | null
}

export type TokenSource = 'unocore' | 'exec'

export interface IpcContracts {
  [IPC_CHANNELS.SYNC_VALIDATE_TOKEN]: { request: { token: string; source: TokenSource }; response: { valid: boolean; message: string } }
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
  [IPC_CHANNELS.SYNC_BACKFILL_SALARY_NORMALIZATION]: { request: void; response: { candidatesUpdated: number; employeesUpdated: number; errors: number } }

  [IPC_CHANNELS.PIPELINE_START]: { request: PipelineStartParams; response: { started: boolean } }
  [IPC_CHANNELS.PIPELINE_PAUSE]: { request: void; response: { paused: boolean } }
  [IPC_CHANNELS.PIPELINE_RETRY_ALL_FAILED]: { request: PipelineRetryParams; response: { started: boolean } }
  [IPC_CHANNELS.PIPELINE_RETRY_SINGLE]: { request: PipelineRetrySingleParams; response: PipelineRecordEvent }
  [IPC_CHANNELS.PIPELINE_GET_FAILED]: { request: 'employees' | 'candidates'; response: PipelineFailedRecord[] }
  [IPC_CHANNELS.PIPELINE_GET_STATE]: { request: string; response: PersistedPipelineState | null }
  [IPC_CHANNELS.PIPELINE_CLEAR_STATE]: { request: string; response: { cleared: boolean } }

  [IPC_CHANNELS.POSITION_PIPELINE_START]: { request: PositionPipelineStartParams; response: { started: boolean } }
  [IPC_CHANNELS.POSITION_PIPELINE_PAUSE]: { request: void; response: { paused: boolean } }
  [IPC_CHANNELS.POSITION_PIPELINE_VECTORIZE_SYNCED]: { request: PositionPipelineVectorizeSyncedParams; response: { started: boolean } }
  [IPC_CHANNELS.POSITION_PIPELINE_RETRY_ALL_FAILED]: { request: PipelineRetryParams; response: { started: boolean } }
  [IPC_CHANNELS.POSITION_PIPELINE_RETRY_SINGLE]: { request: PipelineRetrySingleParams; response: PipelineRecordEvent }
  [IPC_CHANNELS.POSITION_PIPELINE_GET_FAILED]: { request: void; response: PipelineFailedRecord[] }
  [IPC_CHANNELS.POSITION_PIPELINE_GET_STATE]: { request: void; response: PersistedPipelineState | null }
  [IPC_CHANNELS.POSITION_PIPELINE_CLEAR_STATE]: { request: void; response: { cleared: boolean } }

  [IPC_CHANNELS.PROCESSING_VOYAGE_KEY_STATUS]: { request: void; response: VoyageKeyStatus }
  [IPC_CHANNELS.PROCESSING_GET_STATUS]: { request: void; response: ProcessingStatusBySource }
  [IPC_CHANNELS.PROCESSING_VECTORIZE_SINGLE]: { request: ProcessingVectorizeSingleParams; response: ProcessingVectorizeSingleResult }
  [IPC_CHANNELS.PROCESSING_START_EXTRACTION]: { request: ProcessingStartExtractionParams; response: { started: boolean } }
  [IPC_CHANNELS.PROCESSING_PAUSE_EXTRACTION]: { request: void; response: { paused: boolean } }
  [IPC_CHANNELS.PROCESSING_START_VECTORIZATION]: { request: ProcessingStartVectorizationParams; response: { started: boolean } }
  [IPC_CHANNELS.PROCESSING_PAUSE_VECTORIZATION]: { request: void; response: { paused: boolean } }
  [IPC_CHANNELS.PROCESSING_RETRY_FAILED]: { request: ProcessingStartExtractionParams; response: { started: boolean } }
  [IPC_CHANNELS.PROCESSING_RETRY_FAILED_VECTORIZATION]: { request: ProcessingStartVectorizationParams; response: { started: boolean } }
  [IPC_CHANNELS.PROCESSING_PROCESS_ALL]: { request: ProcessingProcessAllParams; response: { started: boolean } }
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
  [IPC_CHANNELS.MATCH_ANALYSIS_CACHE_STATS]: { request: readonly []; response: { totalEntries: number; oldestEntry: string | null } }
  [IPC_CHANNELS.MATCH_CLEAR_ANALYSIS_CACHE]: { request: readonly []; response: { deleted: number } }
  [IPC_CHANNELS.MATCH_RANK_POSITIONS]: { request: MatchRankPositionsParams; response: MatchRankPositionsResult }
  [IPC_CHANNELS.MATCH_RANK_POSITIONS_FOR_TEXT]: { request: MatchRankPositionsForTextParams; response: MatchRankPositionsResult }
  [IPC_CHANNELS.MATCH_TO_POSITIONS]: { request: MatchToPositionsParams; response: { sessionId: number | null } }

  [IPC_CHANNELS.SESSIONS_CREATE]: { request: CreateOrUpdateTransformSession; response: { id: number } }
  [IPC_CHANNELS.SESSIONS_UPDATE]: { request: [id: number, data: Partial<CreateOrUpdateTransformSession>]; response: { success: boolean } }
  [IPC_CHANNELS.SESSIONS_GET]: { request: number; response: TransformSessionDetail | null }
  [IPC_CHANNELS.SESSIONS_LIST]: { request: void; response: TransformSessionSummary[] }
  [IPC_CHANNELS.SESSIONS_DELETE]: { request: number; response: { deleted: boolean } }

  [IPC_CHANNELS.PRESENT_CREATE_SESSION]: { request: PresentCreateSessionParams; response: { id: number } }
  [IPC_CHANNELS.PRESENT_UPDATE_SESSION]: { request: [id: number, data: PresentUpdateSessionParams]; response: { success: boolean } }
  [IPC_CHANNELS.PRESENT_GET_SESSION]: { request: number; response: Record<string, unknown> | null }
  [IPC_CHANNELS.PRESENT_LIST_SESSIONS]: { request: void; response: Record<string, unknown>[] }
  [IPC_CHANNELS.PRESENT_DELETE_SESSION]: { request: number; response: { deleted: boolean } }
  [IPC_CHANNELS.PRESENT_ADD_ENTRY]: { request: PresentAddEntryParams; response: { id: number } }
  [IPC_CHANNELS.PRESENT_UPDATE_ENTRY]: { request: [id: number, data: PresentUpdateEntryParams]; response: { success: boolean } }
  [IPC_CHANNELS.PRESENT_DELETE_ENTRY]: { request: number; response: { deleted: boolean } }
  [IPC_CHANNELS.PRESENT_CHECK_RESUME_FORMAT]: { request: PresentCheckResumeFormatParams; response: { isFormatted: boolean; details: string[] } }
  [IPC_CHANNELS.PRESENT_TRANSFORM_RESUME]: { request: PresentTransformResumeParams; response: { transformedResumeText: string } }
  [IPC_CHANNELS.PRESENT_GENERATE_INTRO]: { request: PresentGenerateIntroParams; response: { introText: string } }
  [IPC_CHANNELS.PRESENT_GENERATE_CANDIDATE_PROFILE]: { request: PresentGenerateCandidateProfileParams; response: { professionalSummary?: string; techStack?: string[]; domainExperience?: string; yearsOfExperience?: string } }
  [IPC_CHANNELS.PRESENT_GENERATE_HTML]: { request: PresentGenerateHtmlParams; response: { html: string } }

  [IPC_CHANNELS.DATABASE_GET_CONFIG]: { request: void; response: DatabaseConfig }
  [IPC_CHANNELS.DATABASE_SAVE_CONFIG]: { request: DatabaseSaveConfigParams; response: { saved: boolean } }
  [IPC_CHANNELS.DATABASE_EXPORT]: { request: void; response: DatabaseExportResult }
  [IPC_CHANNELS.DATABASE_IMPORT]: { request: DatabaseImportParams; response: DatabaseImportResult }
  [IPC_CHANNELS.DATABASE_LIST_SNAPSHOTS]: { request: void; response: DatabaseSnapshot[] }
  [IPC_CHANNELS.DATABASE_STATUS]: { request: void; response: DatabaseStatus }
  [IPC_CHANNELS.DATABASE_IMPORT_FILE]: { request: void; response: DatabaseImportFileResult }
  [IPC_CHANNELS.DATABASE_HEALTH]: { request: void; response: DatabaseHealthResult }
  [IPC_CHANNELS.DATABASE_SYNC_CHECK]: { request: void; response: SyncCheckResult }
  [IPC_CHANNELS.DATABASE_SYNC_STATUS]: { request: void; response: SyncWatcherStatus }
  [IPC_CHANNELS.DATABASE_IMPORT_LATEST]: { request: void; response: DatabaseImportResult }
  [IPC_CHANNELS.DATABASE_SELECT_DIRECTORY]: { request: void; response: { cancelled: boolean; path: string | null } }

  [IPC_CHANNELS.AI_CHAT]: { request: AiChatParams; response: AiChatResponse }
  [IPC_CHANNELS.AI_CHECK_CONNECTION]: { request: void; response: { available: boolean } }
  [IPC_CHANNELS.AI_TOKEN_USAGE]: { request: void; response: TokenUsageStats }
  [IPC_CHANNELS.AI_RESET_TOKEN_USAGE]: { request: void; response: { ok: boolean } }
  [IPC_CHANNELS.AI_SUBSCRIPTION_STATUS]: { request: void; response: SubscriptionCheckResult }

  [IPC_CHANNELS.REPORT_EVALUATE_POSITIONS]: { request: ReportStalledThresholds; response: ReportEvaluateResult }
  [IPC_CHANNELS.REPORT_POSITION_DETAIL]: { request: number; response: ReportPositionDetailResult | null }
  [IPC_CHANNELS.REPORT_EXPORT_CSV]: { request: readonly [ReportStalledPositionResult[]]; response: ReportExportCsvResult }
  [IPC_CHANNELS.REPORT_GET_SYNC_STATUS]: { request: void; response: ReportSyncStatus }
  [IPC_CHANNELS.REPORT_GET_FEEDBACK_CATALOG]: { request: string; response: Record<number, string> }
  [IPC_CHANNELS.REPORT_GET_FEEDBACK_CATALOG_LOCAL]: { request: void; response: Record<number, string> }
  [IPC_CHANNELS.REPORT_DELETE_POSITION]: { request: number; response: { deleted: boolean } }
  [IPC_CHANNELS.REPORT_EXPORT_PDF]: { request: void; response: ReportExportPdfResult }
  [IPC_CHANNELS.REPORT_EXPORT_XLSX]: { request: readonly [ReportStalledPositionResult[]]; response: ExcelExportResult }
  [IPC_CHANNELS.REPORT_ACCEPTANCE_RATE]: { request: ReportAcceptanceRateFilters; response: ReportAcceptanceRateResultV2 }
  [IPC_CHANNELS.REPORT_ACCEPTANCE_RATE_COES]: { request: void; response: string[] }
  [IPC_CHANNELS.REPORT_PLACEMENT_MARGIN]: { request: { year: number; quarter: string }; response: PlacementMarginReportResult | null }
  [IPC_CHANNELS.REPORT_FILL_RATE]: { request: ReportFillRateFilters; response: ReportFillRateResult }
  [IPC_CHANNELS.SYNC_PLACEMENT_MARGIN]: { request: PlacementMarginSyncParams; response: { started: boolean } }
  [IPC_CHANNELS.SYNC_PLACEMENT_MARGIN_STATUS]: { request: { year: number; quarter: number }; response: PlacementMarginSyncStatus }

  [IPC_CHANNELS.SYNC_OFFBOARDING]: { request: OffboardingSyncParams; response: { started: boolean } }
  [IPC_CHANNELS.SYNC_OFFBOARDING_STATUS]: { request: { year: number }; response: OffboardingSyncStatus }
  [IPC_CHANNELS.REPORT_OFFBOARDING]: { request: { year: number; quarter: string }; response: OffboardingReportResult | null }

  [IPC_CHANNELS.COE_TRACKING_GET_OVERVIEW]: { request: void; response: CoeTrackingSummary[] }
  [IPC_CHANNELS.COE_TRACKING_GET_COE_DETAIL]: { request: string; response: PracticeTrackingSummary[] }
  [IPC_CHANNELS.COE_TRACKING_GET_PRACTICE_DETAIL]: { request: CoeTrackingPracticeDetailParams; response: SkillTrackingSummary[] }
  [IPC_CHANNELS.COE_TRACKING_GET_PRACTICE_POSITIONS]: { request: CoeTrackingPracticeDetailParams; response: TrackedPosition[] }
  [IPC_CHANNELS.COE_TRACKING_GET_SKILL_POSITIONS]: { request: CoeTrackingSkillPositionsParams; response: TrackedPosition[] }
  [IPC_CHANNELS.COE_TRACKING_GET_COE_POSITIONS]: { request: string; response: TrackedPosition[] }
  [IPC_CHANNELS.COE_TRACKING_GET_POSITION_DETAIL]: { request: number; response: TrackedPositionDetail | null }
  [IPC_CHANNELS.COE_TRACKING_GET_SYNC_STATUS]: { request: void; response: ReportSyncStatus }

  [IPC_CHANNELS.PRR_GET_ALL]: { request: void; response: { results: PrrReportItem[]; lastSyncedAt: string | null } }
  [IPC_CHANNELS.PRR_GET_DETAIL]: { request: number; response: PrrDetailResult | null }
  [IPC_CHANNELS.PRR_UPDATE_COE_STATUS]: { request: PrrUpdateCoeStatusParams; response: { success: boolean } }
  [IPC_CHANNELS.PRR_ADD_COMMENT]: { request: PrrAddCommentParams; response: { success: boolean } }
  [IPC_CHANNELS.PRR_DELETE]: { request: number; response: { success: boolean } }
  [IPC_CHANNELS.PRR_GET_SYNC_STATUS]: { request: void; response: PrrSyncStatus }
  [IPC_CHANNELS.PRR_EXPORT_XLSX]: { request: PrrReportItem[]; response: ExcelExportResult }

  [IPC_CHANNELS.APP_GET_VERSION]: { request: void; response: string }
  [IPC_CHANNELS.APP_GET_PLATFORM]: { request: void; response: string }
  [IPC_CHANNELS.APP_OPEN_EXTERNAL]: { request: string; response: { opened: boolean } }
  [IPC_CHANNELS.APP_CHECK_FOR_UPDATES]: { request: void; response: AppUpdateInfo | null }
  [IPC_CHANNELS.APP_DOWNLOAD_UPDATE]: { request: void; response: { success: boolean } }
  [IPC_CHANNELS.APP_INSTALL_UPDATE]: { request: void; response: void }
  [IPC_CHANNELS.APP_READ_BUNDLED_FILE]: { request: string; response: string }
  [IPC_CHANNELS.APP_SHOW_ITEM_IN_FOLDER]: { request: string; response: void }
  [IPC_CHANNELS.APP_OPEN_PATH]: { request: string; response: void }

  [IPC_CHANNELS.ERRORS_LIST]: { request: void; response: ErrorListResponse }
  [IPC_CHANNELS.ERRORS_CLEAR]: { request: void; response: { cleared: boolean } }
  [IPC_CHANNELS.ERRORS_MARK_REPORTED]: { request: string; response: { updated: boolean } }
  [IPC_CHANNELS.ERRORS_GENERATE_DESCRIPTION]: { request: ErrorGenerateDescriptionRequest; response: ErrorGenerateDescriptionResponse }
  [IPC_CHANNELS.ERRORS_REPORT]: { request: ErrorReportRequest; response: { captured: boolean } }
  [IPC_CHANNELS.ERRORS_GET_LOG_PATH]: { request: void; response: string }

  [IPC_CHANNELS.NOMICORE_LOGIN]: { request: void; response: { loggedIn: boolean } }
  [IPC_CHANNELS.NOMICORE_CHECK_SESSION]: { request: void; response: { valid: boolean } }
  [IPC_CHANNELS.NOMICORE_CALCULATE]: { request: NomicoreCalculateParams; response: NomicoreCalculationResult }

  [IPC_CHANNELS.MAIL_GET_CONFIG]: { request: void; response: MailMaskedConfig | null }
  [IPC_CHANNELS.MAIL_SAVE_CONFIG]: { request: MailSmtpConfig; response: { saved: boolean } }
  [IPC_CHANNELS.MAIL_CLEAR_CONFIG]: { request: void; response: { cleared: boolean } }
  [IPC_CHANNELS.MAIL_TEST_CONNECTION]: { request: MailSmtpConfig; response: MailTestResult }

  [IPC_CHANNELS.RESPONSIVENESS_GET_REPORT]: { request: void; response: ResponsivenessReport }
  [IPC_CHANNELS.RESPONSIVENESS_GET_LEADS]: { request: void; response: ResponsivenessCoePracticeLead[] }
  [IPC_CHANNELS.RESPONSIVENESS_ADD_LEAD]: { request: ResponsivenessAddLeadParams; response: ResponsivenessCoePracticeLead }
  [IPC_CHANNELS.RESPONSIVENESS_REMOVE_LEAD]: { request: number; response: { removed: boolean } }
  [IPC_CHANNELS.RESPONSIVENESS_GET_POSITION_DISCUSSIONS]: { request: number; response: ResponsivenessDiscussionComment[] }
  [IPC_CHANNELS.RESPONSIVENESS_ANALYZE_MENTIONS]: { request: ResponsivenessAnalyzeRequest; response: ResponsivenessAiAnalysisResult[] }

  [IPC_CHANNELS.RESPONSIVENESS_GENERATE_FULL_REPORT]: { request: void; response: PositionAttentionReport }
  [IPC_CHANNELS.RESPONSIVENESS_GET_LAST_REPORT]: { request: void; response: PositionAttentionReport | null }

  [IPC_CHANNELS.MODEL_CONFIG_GET]: { request: void; response: import('./model-config-types').ModelConfig }
  [IPC_CHANNELS.MODEL_CONFIG_SAVE]: { request: import('./model-config-types').ModelConfig; response: { saved: boolean } }
  [IPC_CHANNELS.MODEL_CONFIG_LOCAL_HEALTH]: { request: { url: string }; response: { available: boolean; models: string[] } }
  [IPC_CHANNELS.MODEL_CONFIG_LOCAL_MODELS]: { request: { url: string }; response: { models: string[] } }

  // Catalog Management
  [IPC_CHANNELS.CATALOG_GET_COES]: { request: void; response: CatalogCoe[] }
  [IPC_CHANNELS.CATALOG_GET_COE]: { request: number; response: CatalogCoe | null }
  [IPC_CHANNELS.CATALOG_CREATE_COE]: { request: CatalogCreateParams; response: CatalogCoeRow }
  [IPC_CHANNELS.CATALOG_UPDATE_COE]: { request: CatalogUpdateParams; response: CatalogCoeRow }
  [IPC_CHANNELS.CATALOG_TOGGLE_COE]: { request: number; response: CatalogCoeRow }
  [IPC_CHANNELS.CATALOG_ADD_PRACTICE_TO_COE]: { request: CatalogJunctionParams; response: { success: boolean } }
  [IPC_CHANNELS.CATALOG_REMOVE_PRACTICE_FROM_COE]: { request: CatalogJunctionParams; response: { success: boolean } }

  [IPC_CHANNELS.CATALOG_GET_PRACTICES]: { request: void; response: CatalogPractice[] }
  [IPC_CHANNELS.CATALOG_GET_PRACTICE]: { request: number; response: CatalogPractice | null }
  [IPC_CHANNELS.CATALOG_CREATE_PRACTICE]: { request: CatalogCreateParams; response: CatalogPracticeRow }
  [IPC_CHANNELS.CATALOG_UPDATE_PRACTICE]: { request: CatalogUpdateParams; response: CatalogPracticeRow }
  [IPC_CHANNELS.CATALOG_TOGGLE_PRACTICE]: { request: number; response: CatalogPracticeRow }
  [IPC_CHANNELS.CATALOG_ADD_SKILL_TO_PRACTICE]: { request: CatalogJunctionParams; response: { success: boolean } }
  [IPC_CHANNELS.CATALOG_REMOVE_SKILL_FROM_PRACTICE]: { request: CatalogJunctionParams; response: { success: boolean } }

  [IPC_CHANNELS.CATALOG_GET_SKILLS]: { request: void; response: CatalogSkill[] }
  [IPC_CHANNELS.CATALOG_GET_SKILL]: { request: number; response: CatalogSkill | null }
  [IPC_CHANNELS.CATALOG_CREATE_SKILL]: { request: CatalogCreateParams; response: CatalogSkillRow }
  [IPC_CHANNELS.CATALOG_UPDATE_SKILL]: { request: CatalogUpdateParams; response: CatalogSkillRow }
  [IPC_CHANNELS.CATALOG_TOGGLE_SKILL]: { request: number; response: CatalogSkillRow }

  // Practice Lead Bonus
  [IPC_CHANNELS.PRACTICE_LEAD_BONUS_PLACEMENTS]: { request: { year: number; quarter: string; tiers?: BonusTier[] }; response: PLBPlacementEntry[] }
  [IPC_CHANNELS.PRACTICE_LEAD_BONUS_OFFBOARDINGS]: { request: { year: number; quarter: string; tiers?: BonusTier[] }; response: PLBOffboardingEntry[] }
  [IPC_CHANNELS.PRACTICE_LEAD_BONUS_OVERVIEW]: { request: { year: number; quarter: string; tiers?: BonusTier[] }; response: PLBOverview }
  [IPC_CHANNELS.PRACTICE_LEAD_BONUS_GET_PRACTICE_LEADS]: { request: void; response: PLBPracticeLeadRow[] }
  [IPC_CHANNELS.PRACTICE_LEAD_BONUS_SAVE_GM_OVERRIDE]: { request: { year: number; employee: string; offboardingDate: string | null; account: string; gmOverride: number }; response: { success: boolean } }
}

export interface IpcEventContracts {
  [IPC_CHANNELS.SYNC_PROGRESS_EVENT]: SyncProgressEvent
  [IPC_CHANNELS.PROCESSING_PROGRESS_EVENT]: ProcessingProgressEvent
  [IPC_CHANNELS.PIPELINE_PROGRESS_EVENT]: PipelineProgressEvent
  [IPC_CHANNELS.POSITION_PIPELINE_PROGRESS_EVENT]: PipelineProgressEvent
  [IPC_CHANNELS.MATCH_SEARCH_EVENT]: MatchSearchEvent
  [IPC_CHANNELS.MATCH_BENCH_BURN_EVENT]: BenchBurnEvent
  [IPC_CHANNELS.APP_UPDATE_AVAILABLE]: AppUpdateAvailableEvent
  [IPC_CHANNELS.APP_UPDATE_DOWNLOADED]: void
  [IPC_CHANNELS.APP_NAVIGATE]: { path: string }
  [IPC_CHANNELS.ERRORS_NEW_EVENT]: ErrorNewEvent
  [IPC_CHANNELS.RESPONSIVENESS_GENERATE_PROGRESS]: PositionAttentionProgress
}
