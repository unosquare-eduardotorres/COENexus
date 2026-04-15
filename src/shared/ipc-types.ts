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

export type SyncDataSource = 'employees' | 'candidates' | 'open-positions' | 'project-reallocations'
export type SyncClearDataSource = 'employees' | 'candidates' | 'positions' | 'project-reallocations'

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
  job_title: string
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

export interface ReportExportCsvResult {
  saved: boolean
  filePath?: string
}

export interface ReportExportPdfResult {
  saved: boolean
  filePath?: string
}

export interface PathIdParams {
  id: number
}

export interface PathPaginationParams {
  search?: string
  role?: string
  page?: number
  pageSize?: number
}

export interface PathDeveloperDashboard {
  developerId: number
  fullName: string
  role: string
  completionPercent: number
  activeLearningPathId: number | null
  nextAssessmentDueAt: string | null
  pendingThreads: number
}

export interface PathLearningPathSummary {
  id: number
  title: string
  role: string
  level: string
  status: string
  completionPercent: number
  updatedAt: string
}

export interface PathLearningPathSkill {
  id: number
  skillCode: string
  skillName: string
  targetLevel: string
  currentLevel: string
  status: string
}

export interface PathLearningPathDetail extends PathLearningPathSummary {
  description: string
  ownerId: number
  skills: PathLearningPathSkill[]
}

export interface PathCreateLearningPathParams {
  title: string
  role: string
  level: string
  description?: string
  ownerId: number
}

export interface PathUpdateLearningPathParams {
  id: number
  title?: string
  role?: string
  level?: string
  description?: string
  status?: string
}

export interface PathAssessmentSummary {
  id: number
  learningPathId: number
  title: string
  status: string
  score: number | null
  submittedAt: string | null
  updatedAt: string
}

export interface PathAssessmentQuestion {
  id: number
  prompt: string
  category: string
  weight: number
}

export interface PathAssessmentAnswer {
  questionId: number
  score: number
  notes?: string
}

export interface PathAssessmentDetail extends PathAssessmentSummary {
  questions: PathAssessmentQuestion[]
  answers: PathAssessmentAnswer[]
}

export interface PathSaveAssessmentDraftParams {
  assessmentId: number
  answers: PathAssessmentAnswer[]
}

export interface PathSubmitAssessmentParams {
  assessmentId: number
  answers: PathAssessmentAnswer[]
  reviewerId: number
}

export interface PathDiscussionThreadSummary {
  id: number
  learningPathId: number
  title: string
  status: string
  createdBy: number
  replyCount: number
  lastActivityAt: string
}

export interface PathDiscussionPost {
  id: number
  authorId: number
  message: string
  createdAt: string
  parentPostId: number | null
}

export interface PathDiscussionThreadDetail extends PathDiscussionThreadSummary {
  posts: PathDiscussionPost[]
}

export interface PathCreateDiscussionPostParams {
  threadId: number
  authorId: number
  message: string
}

export interface PathReplyDiscussionPostParams {
  threadId: number
  parentPostId: number
  authorId: number
  message: string
}

export interface PathDossierSummary {
  id: number
  developerId: number
  fullName: string
  role: string
  status: string
  updatedAt: string
}

export interface PathDossierDetail extends PathDossierSummary {
  strengths: string[]
  growthAreas: string[]
  managerNotes: string
}

export interface PathUpdateDossierStatusParams {
  dossierId: number
  status: string
  reviewerId: number
}

export interface PathAdminAnalytics {
  totalDevelopers: number
  activeLearningPaths: number
  completedAssessments: number
  pendingDossiers: number
  participationRate: number
}

export interface PathSettings {
  assessmentReminderDays: number
  discussionModerationEnabled: boolean
  dossierAutoArchiveDays: number
  defaultPageSize: number
}

export interface PathSaveSettingsParams {
  assessmentReminderDays?: number
  discussionModerationEnabled?: boolean
  dossierAutoArchiveDays?: number
  defaultPageSize?: number
}

export interface PathSaveAnalyticsEventParams {
  eventName: string
  payload: Record<string, unknown>
}

export interface PathRecalculateReadinessParams {
  developerId: number
}

export interface PathGenerateDefensePrepParams {
  candidateName: string
  targetLevel: string
  rubricScores: Array<{ dimension: string; score: number; maxScore: number }>
  codeReviewStrengths: string[]
}

export interface PathGenerateRemediationParams {
  candidateName: string
  scorecardGaps: Array<{ dimension: string; score: number; threshold: number }>
  evaluatorNotes: string
}

export interface PathSearchDynamicResourcesParams {
  topicName: string
  skillDomain: string
  level: string
  preferredFormats: string[]
}

export type Scout9JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
export type Scout9ScopeType = 'org' | 'project' | 'custom'
export type Scout9ReportStatus = 'draft' | 'published' | 'archived'
export type Scout9CandidateType = 'issue' | 'insight' | 'action'
export type Scout9CandidateStatus = 'pending' | 'approved' | 'rejected' | 'skipped'

export interface Scout9Job {
  id: string
  status: Scout9JobStatus
  scope_type: Scout9ScopeType
  scope_value: string | null
  started_at: string | null
  completed_at: string | null
  canceled_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Scout9Report {
  id: string
  job_id: string
  report_title: string
  report_markdown: string
  confidence_score: number | null
  status: Scout9ReportStatus
  created_at: string
  updated_at: string
}

export interface Scout9ReportCandidate {
  id: string
  report_id: string
  candidate_type: Scout9CandidateType
  title: string
  details: string
  status: Scout9CandidateStatus
  confidence_score: number | null
  created_at: string
  updated_at: string
}

export interface Scout9KnowledgeRule {
  id: string
  rule_name: string
  rule_text: string
  is_active: 0 | 1
  priority: number
  created_at: string
  updated_at: string
}

export interface Scout9KnowledgeGlossaryTerm {
  id: string
  term: string
  definition: string
  synonyms: string
  is_active: 0 | 1
  created_at: string
  updated_at: string
}

export interface Scout9KnowledgeNote {
  id: string
  note_title: string
  note_text: string
  tags_json: string
  is_active: 0 | 1
  created_at: string
  updated_at: string
}

export interface Scout9LearnedPattern {
  id: string
  pattern_name: string
  pattern_text: string
  is_active: 0 | 1
  confidence_score: number
  usage_count: number
  created_at: string
  updated_at: string
}

export interface Scout9PatternApplication {
  id: string
  pattern_id: string
  job_id: string | null
  report_id: string | null
  applied_at: string
  outcome: string | null
}

export interface Scout9SkipFeedback {
  id: string
  candidate_id: string
  reason: string
  notes: string | null
  created_at: string
}

export interface Scout9BrainSnapshot {
  id: string
  snapshot_markdown: string
  token_estimate: number
  created_at: string
}

export interface Scout9PromptVersion {
  id: string
  version_label: string
  prompt_text: string
  is_active: 0 | 1
  created_at: string
  activated_at: string | null
}

export interface Scout9AgentConfig {
  id: 1
  model_name: string
  token_budget: number
  temperature: number
  max_reports_per_run: number
  auto_publish_enabled: 0 | 1
  include_patterns: 0 | 1
  include_glossary: 0 | 1
  include_notes: 0 | 1
  active_prompt_version_id: string | null
  sonnet_model: string
  haiku_model: string
  max_tool_calls_per_run: number
  max_tool_calls_per_candidate: number
  token_budget_ceiling: number
  max_turns: number
  max_run_duration_ms: number
  stream_watchdog_ms: number
  tool_timeout_ms: number
  created_at: string
  updated_at: string
}

export interface Scout9ClientRuleOverride {
  id: string
  client_id: string
  rule_id: string
  override_text: string
  is_active: 0 | 1
  created_at: string
  updated_at: string
}

export interface Scout9ScopeOption {
  id: string
  label: string
  scope_type: Scout9ScopeType
}

export interface Scout9RunParams {
  scope_type: Scout9ScopeType
  scope_value: string | null
}

export interface Scout9ListReportsParams {
  status?: Scout9ReportStatus
  limit?: number
  offset?: number
}

export interface Scout9UpdateCandidateParams {
  id: string
  status: Scout9CandidateStatus
}

export interface Scout9SubmitSkipParams {
  candidate_id: string
  reason: string
  notes?: string
}

export interface Scout9CreateRuleParams {
  rule_name: string
  rule_text: string
  is_active?: 0 | 1
  priority: number
}

export interface Scout9UpdateRuleParams {
  id: string
  rule_name?: string
  rule_text?: string
  is_active?: 0 | 1
  priority?: number
}

export interface Scout9CreateGlossaryTermParams {
  term: string
  definition: string
  synonyms?: string
  is_active?: 0 | 1
}

export interface Scout9UpdateGlossaryTermParams {
  id: string
  term?: string
  definition?: string
  synonyms?: string
  is_active?: 0 | 1
}

export interface Scout9CreateNoteParams {
  note_title: string
  note_text: string
  tags_json?: string
  is_active?: 0 | 1
}

export interface Scout9UpdateNoteParams {
  id: string
  note_title?: string
  note_text?: string
  tags_json?: string
  is_active?: 0 | 1
}

export interface Scout9TogglePatternParams {
  id: string
  is_active: 0 | 1
}

export interface Scout9CreateOverrideParams {
  client_id: string
  rule_id: string
  override_text: string
  is_active?: 0 | 1
}

export interface Scout9UpdateConfigParams {
  model_name?: string
  token_budget?: number
  temperature?: number
  max_reports_per_run?: number
  auto_publish_enabled?: 0 | 1
  include_patterns?: 0 | 1
  include_glossary?: 0 | 1
  include_notes?: 0 | 1
  sonnet_model?: string
  haiku_model?: string
  max_tool_calls_per_run?: number
  max_tool_calls_per_candidate?: number
  token_budget_ceiling?: number
  max_turns?: number
  max_run_duration_ms?: number
  stream_watchdog_ms?: number
  tool_timeout_ms?: number
}

export interface Scout9CreatePromptVersionParams {
  version_label: string
  prompt_text: string
  is_active?: 0 | 1
}

export interface Scout9ActivatePromptVersionParams {
  id: string
}

export interface Scout9PipelineEvent {
  job_id: string
  stage: string
  message: string
  progress: number
  level: 'info' | 'warning' | 'error'
  timestamp: string
}

export interface Scout9StatusEvent {
  status: Scout9JobStatus | 'idle'
  job_id: string | null
  timestamp: string
}

export interface Scout9Response<T> {
  success: boolean
  data?: T
  error?: string
}

export interface Scout9ReportDetail {
  report: Scout9Report
  candidates: Scout9ReportCandidate[]
}

export type VigilSource = 'employees' | 'candidates' | 'open-positions' | 'project-reallocations'
export type VigilRunTriggerType = 'manual' | 'scheduled'
export type VigilRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
export type VigilActivityEventType = 'run_started' | 'run_progress' | 'run_completed' | 'run_failed' | 'chat' | 'system'
export type VigilActivitySeverity = 'info' | 'warning' | 'error'
export type VigilChatRole = 'system' | 'user' | 'assistant' | 'tool'

export interface VigilRun {
  id: string
  trigger_type: VigilRunTriggerType
  status: VigilRunStatus
  sources_json: string
  results_json: string | null
  started_at: string
  completed_at: string | null
  token_hash: string | null
}

export interface VigilActivityLog {
  id: string
  run_id: string | null
  event_type: VigilActivityEventType
  source: VigilSource | 'system'
  severity: VigilActivitySeverity
  message: string
  details_json: string | null
  created_at: string
}

export interface VigilChatMessage {
  id: string
  role: VigilChatRole
  content: string
  metadata_json: string | null
  created_at: string
}

export interface VigilConfig {
  id: 1
  schedule_enabled: 0 | 1
  schedule_hour: number
  schedule_minute: number
  sync_sources_json: string
  candidate_year_filter: number
}

export interface VigilRunParams {
  token: string
  sources?: VigilSource[]
  options?: { limit?: number; skip?: number; year?: number }
}

export interface VigilSyncSourceParams {
  token: string
  source: VigilSource
  options?: { limit?: number; skip?: number; year?: number }
}

export interface VigilCancelRunParams {
  run_id: string
}

export interface VigilListRunsParams {
  status?: VigilRunStatus
  limit?: number
  offset?: number
}

export interface VigilGetActivityLogParams {
  run_id?: string
  source?: VigilSource
  severity?: VigilActivitySeverity
  limit?: number
  offset?: number
}

export interface VigilUpdateConfigParams {
  schedule_enabled?: 0 | 1
  schedule_hour?: number
  schedule_minute?: number
  sync_sources_json?: string
  candidate_year_filter?: number
}

export interface VigilSendChatMessageParams {
  content: string
  metadata_json?: string
}

export interface VigilListChatMessagesParams {
  limit?: number
  offset?: number
}

export interface VigilToolsDryRunParams {
  input: string
}

export interface VigilResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface VigilActivityEvent {
  run_id: string | null
  event_type: VigilActivityEventType
  source: VigilSource | 'system'
  severity: VigilActivitySeverity
  message: string
  details_json?: string | null
  timestamp: string
}

export interface VigilStatusEvent {
  status: VigilRunStatus | 'idle'
  run_id: string | null
  timestamp: string
}

export type PrrCoeStatus = 'Not Set' | 'Pending Evaluation' | 'Ready to Present' | 'Not Applies' | 'Other' | 'Closed'

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
  [IPC_CHANNELS.DATABASE_HEALTH]: { request: void; response: DatabaseHealthResult }

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
  [IPC_CHANNELS.REPORT_DELETE_POSITION]: { request: number; response: { deleted: boolean } }
  [IPC_CHANNELS.REPORT_EXPORT_PDF]: { request: void; response: ReportExportPdfResult }

  [IPC_CHANNELS.PRR_GET_ALL]: { request: void; response: { results: PrrReportItem[]; lastSyncedAt: string | null } }
  [IPC_CHANNELS.PRR_GET_DETAIL]: { request: number; response: PrrDetailResult | null }
  [IPC_CHANNELS.PRR_UPDATE_COE_STATUS]: { request: PrrUpdateCoeStatusParams; response: { success: boolean } }
  [IPC_CHANNELS.PRR_ADD_COMMENT]: { request: PrrAddCommentParams; response: { success: boolean } }
  [IPC_CHANNELS.PRR_DELETE]: { request: number; response: { success: boolean } }
  [IPC_CHANNELS.PRR_GET_SYNC_STATUS]: { request: void; response: PrrSyncStatus }

  [IPC_CHANNELS.PATH_GET_DEVELOPER_DASHBOARD]: { request: PathIdParams; response: PathDeveloperDashboard | null }
  [IPC_CHANNELS.PATH_LIST_LEARNING_PATHS]: { request: PathPaginationParams; response: PathLearningPathSummary[] }
  [IPC_CHANNELS.PATH_GET_LEARNING_PATH]: { request: PathIdParams; response: PathLearningPathDetail | null }
  [IPC_CHANNELS.PATH_CREATE_LEARNING_PATH]: { request: PathCreateLearningPathParams; response: { id: number } }
  [IPC_CHANNELS.PATH_UPDATE_LEARNING_PATH]: { request: PathUpdateLearningPathParams; response: { updated: boolean } }
  [IPC_CHANNELS.PATH_DELETE_LEARNING_PATH]: { request: PathIdParams; response: { deleted: boolean } }
  [IPC_CHANNELS.PATH_LIST_ASSESSMENTS]: { request: PathPaginationParams; response: PathAssessmentSummary[] }
  [IPC_CHANNELS.PATH_GET_ASSESSMENT]: { request: PathIdParams; response: PathAssessmentDetail | null }
  [IPC_CHANNELS.PATH_SAVE_ASSESSMENT_DRAFT]: { request: PathSaveAssessmentDraftParams; response: { saved: boolean } }
  [IPC_CHANNELS.PATH_SUBMIT_ASSESSMENT]: { request: PathSubmitAssessmentParams; response: { submitted: boolean; score: number | null } }
  [IPC_CHANNELS.PATH_LIST_DISCUSSION_THREADS]: { request: PathPaginationParams; response: PathDiscussionThreadSummary[] }
  [IPC_CHANNELS.PATH_GET_DISCUSSION_THREAD]: { request: PathIdParams; response: PathDiscussionThreadDetail | null }
  [IPC_CHANNELS.PATH_CREATE_DISCUSSION_POST]: { request: PathCreateDiscussionPostParams; response: { id: number } }
  [IPC_CHANNELS.PATH_REPLY_DISCUSSION_POST]: { request: PathReplyDiscussionPostParams; response: { id: number } }
  [IPC_CHANNELS.PATH_LIST_DOSSIERS]: { request: PathPaginationParams; response: PathDossierSummary[] }
  [IPC_CHANNELS.PATH_GET_DOSSIER]: { request: PathIdParams; response: PathDossierDetail | null }
  [IPC_CHANNELS.PATH_UPDATE_DOSSIER_STATUS]: { request: PathUpdateDossierStatusParams; response: { updated: boolean } }
  [IPC_CHANNELS.PATH_GET_ADMIN_ANALYTICS]: { request: void; response: PathAdminAnalytics }
  [IPC_CHANNELS.PATH_GET_SETTINGS]: { request: void; response: PathSettings }
  [IPC_CHANNELS.PATH_SAVE_SETTINGS]: { request: PathSaveSettingsParams; response: { saved: boolean } }
  [IPC_CHANNELS.PATH_SAVE_ANALYTICS_EVENT]: { request: PathSaveAnalyticsEventParams; response: boolean }
  [IPC_CHANNELS.PATH_RECALCULATE_READINESS]: { request: PathRecalculateReadinessParams; response: { score: number; recalculated: boolean } }
  [IPC_CHANNELS.PATH_GENERATE_DEFENSE_PREP]: { request: PathGenerateDefensePrepParams; response: { prepKit: string; suggestedQuestions: string[] } }
  [IPC_CHANNELS.PATH_GENERATE_REMEDIATION]: { request: PathGenerateRemediationParams; response: { plan: string; focusAreas: string[]; timeline: string } }
  [IPC_CHANNELS.PATH_SEARCH_DYNAMIC_RESOURCES]: { request: PathSearchDynamicResourcesParams; response: unknown[] }

  [IPC_CHANNELS.SCOUT9_RUN]: { request: Scout9RunParams; response: Scout9Response<Scout9Job> }
  [IPC_CHANNELS.SCOUT9_CANCEL]: { request: void; response: Scout9Response<{ canceled: boolean }> }
  [IPC_CHANNELS.SCOUT9_GET_STATUS]: { request: void; response: Scout9Response<{ active_job: Scout9Job | null }> }
  [IPC_CHANNELS.SCOUT9_GET_SCOPE_OPTIONS]: { request: void; response: Scout9Response<Scout9ScopeOption[]> }
  [IPC_CHANNELS.SCOUT9_LIST_REPORTS]: { request: Scout9ListReportsParams | void; response: Scout9Response<Scout9Report[]> }
  [IPC_CHANNELS.SCOUT9_GET_REPORT]: { request: string; response: Scout9Response<Scout9ReportDetail | null> }
  [IPC_CHANNELS.SCOUT9_UPDATE_CANDIDATE]: { request: Scout9UpdateCandidateParams; response: Scout9Response<Scout9ReportCandidate> }
  [IPC_CHANNELS.SCOUT9_SUBMIT_SKIP]: { request: Scout9SubmitSkipParams; response: Scout9Response<Scout9SkipFeedback> }
  [IPC_CHANNELS.SCOUT9_KB_LIST_RULES]: { request: void; response: Scout9Response<Scout9KnowledgeRule[]> }
  [IPC_CHANNELS.SCOUT9_KB_CREATE_RULE]: { request: Scout9CreateRuleParams; response: Scout9Response<Scout9KnowledgeRule> }
  [IPC_CHANNELS.SCOUT9_KB_UPDATE_RULE]: { request: Scout9UpdateRuleParams; response: Scout9Response<Scout9KnowledgeRule> }
  [IPC_CHANNELS.SCOUT9_KB_DELETE_RULE]: { request: string; response: Scout9Response<{ deleted: boolean }> }
  [IPC_CHANNELS.SCOUT9_KB_LIST_GLOSSARY]: { request: void; response: Scout9Response<Scout9KnowledgeGlossaryTerm[]> }
  [IPC_CHANNELS.SCOUT9_KB_CREATE_GLOSSARY_TERM]: { request: Scout9CreateGlossaryTermParams; response: Scout9Response<Scout9KnowledgeGlossaryTerm> }
  [IPC_CHANNELS.SCOUT9_KB_UPDATE_GLOSSARY_TERM]: { request: Scout9UpdateGlossaryTermParams; response: Scout9Response<Scout9KnowledgeGlossaryTerm> }
  [IPC_CHANNELS.SCOUT9_KB_DELETE_GLOSSARY_TERM]: { request: string; response: Scout9Response<{ deleted: boolean }> }
  [IPC_CHANNELS.SCOUT9_KB_LIST_NOTES]: { request: void; response: Scout9Response<Scout9KnowledgeNote[]> }
  [IPC_CHANNELS.SCOUT9_KB_CREATE_NOTE]: { request: Scout9CreateNoteParams; response: Scout9Response<Scout9KnowledgeNote> }
  [IPC_CHANNELS.SCOUT9_KB_UPDATE_NOTE]: { request: Scout9UpdateNoteParams; response: Scout9Response<Scout9KnowledgeNote> }
  [IPC_CHANNELS.SCOUT9_KB_DELETE_NOTE]: { request: string; response: Scout9Response<{ deleted: boolean }> }
  [IPC_CHANNELS.SCOUT9_KB_COMPILE]: { request: void; response: Scout9Response<{ compiled_markdown: string; token_estimate: number }> }
  [IPC_CHANNELS.SCOUT9_KB_LIST_PATTERNS]: { request: void; response: Scout9Response<Scout9LearnedPattern[]> }
  [IPC_CHANNELS.SCOUT9_KB_TOGGLE_PATTERN]: { request: Scout9TogglePatternParams; response: Scout9Response<Scout9LearnedPattern> }
  [IPC_CHANNELS.SCOUT9_KB_LIST_OVERRIDES]: { request: string | void; response: Scout9Response<Scout9ClientRuleOverride[]> }
  [IPC_CHANNELS.SCOUT9_KB_CREATE_OVERRIDE]: { request: Scout9CreateOverrideParams; response: Scout9Response<Scout9ClientRuleOverride> }
  [IPC_CHANNELS.SCOUT9_KB_DELETE_OVERRIDE]: { request: string; response: Scout9Response<{ deleted: boolean }> }
  [IPC_CHANNELS.SCOUT9_KB_TOKEN_BUDGET]: { request: void; response: Scout9Response<{ token_budget: number; estimated_tokens: number; remaining_tokens: number }> }
  [IPC_CHANNELS.SCOUT9_SETTINGS_GET_CONFIG]: { request: void; response: Scout9Response<Scout9AgentConfig> }
  [IPC_CHANNELS.SCOUT9_SETTINGS_UPDATE_CONFIG]: { request: Scout9UpdateConfigParams; response: Scout9Response<Scout9AgentConfig> }
  [IPC_CHANNELS.SCOUT9_SETTINGS_LIST_PROMPTS]: { request: void; response: Scout9Response<Scout9PromptVersion[]> }
  [IPC_CHANNELS.SCOUT9_SETTINGS_CREATE_PROMPT]: { request: Scout9CreatePromptVersionParams; response: Scout9Response<Scout9PromptVersion> }
  [IPC_CHANNELS.SCOUT9_SETTINGS_ACTIVATE_PROMPT]: { request: Scout9ActivatePromptVersionParams; response: Scout9Response<Scout9PromptVersion> }
  [IPC_CHANNELS.SCOUT9_GET_BRAIN_SNAPSHOT]: { request: void; response: Scout9Response<Scout9BrainSnapshot | null> }

  [IPC_CHANNELS.VIGIL_RUN]: { request: VigilRunParams; response: VigilResponse<VigilRun> }
  [IPC_CHANNELS.VIGIL_CANCEL_RUN]: { request: VigilCancelRunParams; response: VigilResponse<{ canceled: boolean }> }
  [IPC_CHANNELS.VIGIL_GET_STATUS]: { request: void; response: VigilResponse<{ active_run: VigilRun | null }> }
  [IPC_CHANNELS.VIGIL_LIST_RUNS]: { request: VigilListRunsParams | void; response: VigilResponse<VigilRun[]> }
  [IPC_CHANNELS.VIGIL_GET_RUN]: { request: string; response: VigilResponse<VigilRun | null> }
  [IPC_CHANNELS.VIGIL_GET_ACTIVITY_LOG]: { request: VigilGetActivityLogParams | void; response: VigilResponse<VigilActivityLog[]> }
  [IPC_CHANNELS.VIGIL_CLEAR_ACTIVITY_LOG]: { request: void; response: VigilResponse<{ cleared: boolean }> }
  [IPC_CHANNELS.VIGIL_GET_CONFIG]: { request: void; response: VigilResponse<VigilConfig> }
  [IPC_CHANNELS.VIGIL_UPDATE_CONFIG]: { request: VigilUpdateConfigParams; response: VigilResponse<VigilConfig> }
  [IPC_CHANNELS.VIGIL_CHAT_SEND_MESSAGE]: { request: VigilSendChatMessageParams; response: VigilResponse<VigilChatMessage> }
  [IPC_CHANNELS.VIGIL_CHAT_LIST_MESSAGES]: { request: VigilListChatMessagesParams | void; response: VigilResponse<VigilChatMessage[]> }
  [IPC_CHANNELS.VIGIL_CHAT_CLEAR_MESSAGES]: { request: void; response: VigilResponse<{ cleared: boolean }> }
  [IPC_CHANNELS.VIGIL_TOOLS_DRY_RUN]: { request: VigilToolsDryRunParams; response: VigilResponse<Record<string, unknown>> }
  [IPC_CHANNELS.VIGIL_SYNC_SOURCE]: { request: VigilSyncSourceParams; response: VigilResponse<{ started: boolean }> }

  [IPC_CHANNELS.APP_GET_VERSION]: { request: void; response: string }
  [IPC_CHANNELS.APP_GET_PLATFORM]: { request: void; response: string }
  [IPC_CHANNELS.APP_OPEN_EXTERNAL]: { request: string; response: { opened: boolean } }
  [IPC_CHANNELS.APP_CHECK_FOR_UPDATES]: { request: void; response: AppUpdateInfo | null }
  [IPC_CHANNELS.APP_DOWNLOAD_UPDATE]: { request: void; response: { success: boolean } }
  [IPC_CHANNELS.APP_INSTALL_UPDATE]: { request: void; response: void }
  [IPC_CHANNELS.APP_READ_BUNDLED_FILE]: { request: string; response: string }
  [IPC_CHANNELS.APP_SHOW_ITEM_IN_FOLDER]: { request: string; response: void }
  [IPC_CHANNELS.APP_OPEN_PATH]: { request: string; response: void }
}

export interface IpcEventContracts {
  [IPC_CHANNELS.SYNC_PROGRESS_EVENT]: SyncProgressEvent
  [IPC_CHANNELS.PROCESSING_PROGRESS_EVENT]: ProcessingProgressEvent
  [IPC_CHANNELS.MATCH_SEARCH_EVENT]: MatchSearchEvent
  [IPC_CHANNELS.MATCH_BENCH_BURN_EVENT]: BenchBurnEvent
  [IPC_CHANNELS.SCOUT9_PIPELINE_EVENT]: Scout9PipelineEvent
  [IPC_CHANNELS.SCOUT9_STATUS_EVENT]: Scout9StatusEvent
  [IPC_CHANNELS.VIGIL_ACTIVITY_EVENT]: VigilActivityEvent
  [IPC_CHANNELS.VIGIL_STATUS_EVENT]: VigilStatusEvent
  [IPC_CHANNELS.APP_UPDATE_AVAILABLE]: AppUpdateAvailableEvent
  [IPC_CHANNELS.APP_UPDATE_DOWNLOADED]: void
}
