export type UserRole = 'admin' | 'recruiter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface ResumeSection {
  id: string;
  type: 'summary' | 'experience' | 'skills' | 'education' | 'certifications';
  content: string;
  originalContent?: string;
  isEdited: boolean;
  validationStatus: ValidationStatus;
  aiSuggestions?: AISuggestion[];
}

export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  projectName?: string;
  description: string;
  achievements: string[];
  technologies?: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa?: string;
  honors?: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expirationDate?: string;
  credentialId?: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

export interface StructuredResume {
  id: string;
  originalFileName: string;
  originalFileType: 'pdf' | 'docx' | 'txt';
  originalContent: string;
  candidateName: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillCategory[];
  certifications: CertificationEntry[];
  templateSkills?: string[];
  cloudSkills?: string[];
  transformedAt: string;
  status: ResumeStatus;
  validationResults: ValidationResult[];
  overallValidationStatus: ValidationStatus;
  originalFileUrl?: string;
}

export type ResumeStatus =
  | 'pending'
  | 'transforming'
  | 'transformed'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'exported';

export type ValidationStatus = 'valid' | 'warning' | 'error' | 'pending';

export interface ValidationResult {
  field: string;
  status: ValidationStatus;
  message: string;
  rule: string;
}

export interface AISuggestion {
  id: string;
  sectionType: string;
  sectionId?: string;
  originalText: string;
  suggestions: SuggestionOption[];
  selectedIndex?: number;
}

export interface SuggestionOption {
  id: string;
  text: string;
  confidence: number;
  type: 'rephrase' | 'extend' | 'condense' | 'enhance';
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'list' | 'date' | 'entries';
  required: boolean;
  maxLength?: number;
  placeholder?: string;
  helpText?: string;
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  id: string;
  name: string;
  type: 'presence' | 'format' | 'content' | 'length' | 'custom';
  enabled: boolean;
  config: ValidationRuleConfig;
  errorMessage: string;
  severity: 'error' | 'warning';
}

export interface ValidationRuleConfig {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  requiredWords?: string[];
  forbiddenWords?: string[];
  mustStartWithActionVerb?: boolean;
  dateFormat?: string;
  customValidator?: string;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
  sections: TemplateSection[];
  globalValidationRules: ValidationRule[];
  contentGuidelines: ContentGuideline[];
}

export interface TemplateSection {
  id: string;
  name: string;
  type: 'summary' | 'experience' | 'skills' | 'education' | 'certifications';
  required: boolean;
  order: number;
  fields: TemplateField[];
  sectionValidationRules: ValidationRule[];
}

export interface ContentGuideline {
  id: string;
  name: string;
  description: string;
  category: string;
  examples: GuidelineExample[];
  enabled: boolean;
}

export interface GuidelineExample {
  bad: string;
  good: string;
  explanation: string;
}

export interface BatchJob {
  id: string;
  name: string;
  templateId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  totalResumes: number;
  processedResumes: number;
  successfulResumes: number;
  failedResumes: number;
  resumes: BatchResumeItem[];
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

export interface BatchResumeItem {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resumeId?: string;
  error?: string;
}

export interface AIConfig {
  provider: 'local' | 'cloud';
  localEndpoint?: string;
  cloudApiKey?: string;
  cloudEndpoint?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ResumeProcessingMetrics {
  extractionTokens: TokenUsage | null;
  totalTokens: TokenUsage | null;
  processingTimeMs: number;
  modelUsed: string;
  wasAiExtraction: boolean;
}

export interface AppSettings {
  aiConfig: AIConfig;
  defaultTemplate: string;
  autoValidate: boolean;
  showOriginalByDefault: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface ATSCandidate {
  id: string;
  name: string;
  skills: string[];
  positions: ATSPosition[];
  email?: string;
  phone?: string;
  resumeFile?: string;
}

export interface PresentedCandidate {
  id: string;
  name: string;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected';
  rate: number;
  presentedDate: string;
}

export interface ATSPosition {
  id: string;
  title: string;
  department?: string;
  appliedDate: string;
  status: 'active' | 'interviewing' | 'offered' | 'hired' | 'rejected';
  requiredSkills: string[];
  accountName: string;
  stakeholder: string;
  seniorities: string[];
  vertical: string;
  minRate: number;
  maxRate: number;
  candidatesPresented: PresentedCandidate[];
}

export type TransformSource = 'ats' | 'upload';

export type RefinementMode = 'professional-polish' | 'impact-focused' | 'ats-optimized' | 'job-tailoring';

export type ResumeSourceType = 'ats-candidates' | 'employees' | 'upload';

export type ProcessingMode = 'single' | 'batch';

export interface RefinementPrompt {
  id: string;
  mode: RefinementMode;
  name: string;
  description: string;
  promptTemplate: string;
  variables: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchEnginePromptConfig {
  id: string;
  key: 'haiku-triage' | 'opus-analysis';
  name: string;
  description: string;
  promptTemplate: string;
  contextBlocks?: {
    matchEngine: string;
    benchBurn: string;
  };
  variables: string[];
  maxTokens: number;
  temperature: number;
  isDefault: boolean;
  updatedAt: string;
}

export type DataSource = 'bench' | 'all-employees' | 'candidates' | 'all-sources';

export type Seniority = 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Architect' | 'Trainee' | 'Not Specified';

export type Currency = 'USD' | 'MXN' | 'COP' | 'PEN' | 'BOB';

export type SalaryOperator = 'lte' | 'gte';

export interface HardConstraints {
  seniority?: string;
  mainSkill?: string;
  salary?: number;
  salaryOperator?: SalaryOperator;
  salaryCurrency?: string;
  country?: string;
}

export interface FilterOptions {
  seniorities: string[];
  mainSkills: string[];
  countries: string[];
  currencies: string[];
  candidateStatuses: string[];
}

export type FilterField =
  | 'mainSkill' | 'country' | 'seniority'
  | 'currentSalary' | 'salaryExpectation' | 'status' | 'lastStatusUpdate'
  | 'coeCertified';

export type FilterOperator =
  | 'equals' | 'notEquals'
  | 'in' | 'notIn'
  | 'lte' | 'gte';

export type FilterConnector = 'and' | 'or';

export interface FilterRule {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string | number | boolean;
  currency?: string;
  connector: FilterConnector;
}

export interface AdvancedConstraints {
  candidateFilters: FilterRule[];
  employeeFilters: FilterRule[];
}

export type SkillMatchStatus = 'met' | 'surpassed' | 'partial' | 'missing';
export type SkillPriority = 'required' | 'nice-to-have' | 'optional';
export type GapSeverity = 'low' | 'medium' | 'high';
export type CandidateType = 'employee' | 'candidate';

export interface SkillMatch {
  name: string;
  status: SkillMatchStatus;
  years: number;
  priority?: SkillPriority;
}

export interface NonTechSkill {
  label: string;
  priority: SkillPriority;
  status: SkillMatchStatus;
}

export interface DomainExperience {
  name: string;
  confidence: number;
  evidence: string;
}

export interface GapAnalysis {
  skill: string;
  severity: GapSeverity;
  note: string;
}

export interface MatchScores {
  technical: number;
  technicalReason?: string;
  domain: number;
  domainReason?: string;
  leadership: number;
  leadershipReason?: string;
  softSkills: number;
  softSkillsReason?: string;
  availability: number;
  availabilityReason?: string;
}

export interface MatchCandidate {
  id: number;
  name: string;
  type: CandidateType;
  role: string;
  matchScore: number;
  years: number;
  location: string;
  salary: string;
  availability: string;
  scores: MatchScores;
  summary: string;
  skills: SkillMatch[];
  domains: DomainExperience[];
  gaps: GapAnalysis[];
  leadership: string[] | NonTechSkill[];
  softSkills: string[] | NonTechSkill[];
  seniority: Seniority;
  expectedRate: number;
  currency: Currency;
  country: string;
  mainSkill: string;
  isBench: boolean;
  centerOfExcellence?: string;
  candidateStatus?: string;
  upstreamId: number;
  analysis?: SonnetAnalysis;
  salaryExpectations?: number;
  salaryExpectationsCurrency?: string;
  lastStatusUpdate?: string;
}

export interface CandidateTiming {
  name: string;
  phase: 'haiku' | 'sonnet' | 'opus';
  durationMs: number;
  fallback: boolean;
  error?: string;
}

export interface PipelineStats {
  profilesScanned: string;
  preFiltered: string;
  constraintsApplied: string;
  haikuTriage: string;
  sonnetAnalyzed: string;
  searchCost: string;
  time: string;
  timings?: Record<string, number>;
  candidateTimings?: CandidateTiming[];
}

export interface SearchProgress {
  percent: number;
  stage: string;
}

export type MatchFlowType = 'find-for-position' | 'match-to-positions' | 'delivery-to-op' | 'bench-burn' | 'external-candidate-to-op';

export type MatchStepKey = 'intent' | 'job-description' | 'data-source' | 'filters' | 'search-depth' | 'searching' | 'results' | 'deep-dive' | 'bench-burn' | 'delivery-to-op' | 'external-candidate-to-op';

export type DeliveryToOpStepKey = 'employee' | 'positions' | 'summary' | 'analyzing' | 'results';

export type ExternalCandidateToOpStepKey = 'upload' | 'position' | 'summary' | 'analyzing' | 'results';

export interface ExternalResumeFile {
  id: string;
  file: File;
  name: string;
  text: string | null;
  error: string | null;
  status: 'pending' | 'parsing' | 'parsed' | 'error';
}

export interface ExternalCandidateMatchRequest {
  name: string;
  matchFlowType: 'external-candidate-to-op';
  positionUpstreamIds: number[];
  candidates: { name: string; resumeText: string }[];
  opusPromptConfig?: { promptTemplate: string; maxTokens: number; temperature: number };
  customPosition?: { name: string; jobDescription: string };
}

export type JdSource = 'position' | 'custom';

export type BatchFlowType = 'resume-processing' | 'data-extraction';

export interface BatchConfig {
  flow: BatchFlowType;
  refinementMode?: RefinementMode;
  extractionFormat?: 'json' | 'csv';
  fieldsToExtract?: string[];
}

export interface BatchResult {
  id: string;
  fileName: string;
  status: 'success' | 'error';
  flow: BatchFlowType;
  error?: string;
  resumeId?: string;
}

export type BatchStepKey = 'flow' | 'upload' | 'configure' | 'processing' | 'results';

export type SyncSourceType = 'employees' | 'candidates' | 'open-positions';
export type PipelineStatus = 'not-processed' | 'incomplete' | 'synced' | 'extracted' | 'vectorized';

export interface SyncRecord {
  id: string;
  upstreamId: number;
  name: string;
  email?: string;
  source: SyncSourceType;
  pipelineStatus: PipelineStatus;
  failed: boolean;
  reason?: string;
  seniority?: Seniority;
  expectedRate?: number;
  currency?: Currency;
  country?: string;
  mainSkill?: string;
  isBench?: boolean;
  hasResume: boolean;
  resumeNoteId?: number;
  resumeFilename?: string;
  syncDetail?: string;
  syncedAt: string;
  lastAccount?: string;
  lastAccountStartDate?: string;
  grossMonthlySalary?: number;
  resumeDateCreated?: string;
  jobTitle?: string;
  coeCertified?: boolean;
  candidateStatus?: string;
  lastStatusUpdate?: string;
  salaryExpectations?: number;
  salaryExpectationsCurrency?: string;
  account?: string;
  coe?: string;
  practice?: string;
  stakeholder?: string;
  countries?: string;
  seniorities?: string;
  availableRange?: string;
  positionStatus?: string;
  aging?: number;
  hasJobDescription?: boolean;
  candidatesCount?: number;
}

export interface SyncProgress {
  source: SyncSourceType;
  status: 'idle' | 'syncing' | 'paused' | 'completed' | 'error';
  totalRecords: number;
  fetchedRecords: number;
  syncedCount: number;
  incompleteCount: number;
  notProcessedCount: number;
  extractedCount: number;
  vectorizedCount: number;
  skippedCount: number;
  lastSyncedAt?: string;
  errorMessage?: string;
}

export type ProcessingRecordStatus = 'pending' | 'downloading' | 'extracting' | 'vectorizing' | 'completed' | 'failed';
export type ExtractionRecordStatus = 'pending' | 'downloading' | 'extracting' | 'completed' | 'failed';
export type VectorizationRecordStatus = 'pending' | 'vectorizing' | 'completed' | 'failed';

export interface ProcessingRecord {
  id: string;
  upstreamId: number;
  name: string;
  status: ProcessingRecordStatus;
  error?: string;
  resumeSizeKb?: number;
  extractedChunks?: number;
  vectorDimensions?: number;
}

export interface ProcessingProgress {
  source: SyncSourceType;
  status: 'idle' | 'processing' | 'paused' | 'completed' | 'error' | 'auth_failed';
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  currentRecord?: string;
  errorMessage?: string;
}

export type VoyageModel = 'voyage-4-large' | 'voyage-4' | 'voyage-4-lite';

export interface VectorizationConfig {
  model: VoyageModel;
}

export type TopN = 1 | 10 | 20 | 30;

export type SearchMode = 'vector' | 'haiku' | 'opus';

export type FitVerdict = 'strong-fit' | 'good-fit' | 'partial-fit' | 'not-a-fit';

export interface SonnetAnalysis {
  fitVerdict: FitVerdict;
  fitSummary: string;
  whyNotFit: string;
  whyRightFit: string;
  immediateValue: string;
  rampUpEstimate: string;
  riskFactors: string;
  beyondJd: string;
  leadershipDynamics: string;
  industryDepth: string;
  trackRecord: string;
  culturalFit: string;
  retentionPotential: string;
}

export interface PoolCounts {
  bench: number;
  employees: number;
  candidates: number;
  allSources: number;
}

export type PipelineStageKey = 'vectorResults' | 'afterConstraints' | 'afterHaikuTriage' | 'sonnetAnalyzed';

export interface PipelineStageCandidateDto {
  upstreamId: number;
  name: string;
  sourceType: string;
  cosineSimilarity: number;
  seniority?: string;
  mainSkill?: string;
  country?: string;
  isBench: boolean;
  eliminationReason?: string | null;
  haikuScore?: number | null;
}

export interface PipelineStages {
  vectorResults: PipelineStageCandidateDto[];
  afterConstraints: PipelineStageCandidateDto[];
  afterHaikuTriage: PipelineStageCandidateDto[];
}

export interface HaikuConfirmPayload {
  requestedTopN: number;
  passedCount: number;
  highestRejectedScore: number;
  lowestPassedScore: number;
  bestRejected: HaikuRejectedCandidate[];
}

export interface HaikuRejectedCandidate {
  name: string;
  haikuScore: number;
  cosineSimilarity: number;
  seniority?: string;
  mainSkill?: string;
}

export interface MatchSessionSummary {
  id: number;
  name: string;
  matchFlowType: MatchFlowType;
  dataSource: DataSource;
  topN: TopN;
  searchMode?: SearchMode;
  jdSource: JdSource;
  status: 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  candidateCount?: number;
  time?: string;
}

export interface MatchSessionDetail extends MatchSessionSummary {
  jobDescription: string;
  constraints?: AdvancedConstraints;
  stats?: PipelineStats;
  pipelineStages?: PipelineStages;
  candidates: MatchCandidate[];
}

export interface CreateSessionRequest {
  name: string;
  matchFlowType: MatchFlowType;
  jdSource: JdSource;
  jobDescription: string;
  dataSource: DataSource;
  topN: number;
  searchMode: SearchMode;
  constraints?: AdvancedConstraints;
  haikuPromptConfig?: { promptTemplate: string; maxTokens: number; temperature: number };
  opusPromptConfig?: { promptTemplate: string; maxTokens: number; temperature: number };
  candidateUpstreamIds?: number[];
}

export type BenchBurnStepKey = 'data-source' | 'positions' | 'search-depth' | 'searching' | 'results';

export interface BenchEmployee {
  upstreamId: number;
  name: string;
  email: string;
  seniority: string;
  mainSkill: string;
  country: string;
  grossMonthlySalary: number | null;
  salaryCurrency: string | null;
  lastAccount: string | null;
  isVectorized: boolean;
  isBench?: boolean;
}

export interface BenchOpenPosition {
  upstreamId: number;
  id: number;
  account: string;
  coe: string;
  practice: string;
  stakeholder: string;
  mainSkill: string;
  jobTitle: string;
  jobDescription?: string;
  isVectorized: boolean;
}

export interface BenchBurnRequest {
  name: string;
  matchFlowType?: 'bench-burn' | 'delivery-to-op';
  employeeUpstreamIds: number[];
  positionUpstreamIds: number[];
  searchMode: 'opus';
  topNPerEmployee: number;
  topNPerPosition: number;
  opusPromptConfig?: { promptTemplate: string; maxTokens: number; temperature: number };
  customPositions?: { name: string; jobDescription: string }[];
}

export interface CrossMatchResult {
  employeeUpstreamId: number;
  employeeName: string;
  positionUpstreamId: number;
  positionLabel: string;
  matchScore: number;
  cosineSimilarity: number;
  scores: MatchScores;
  skills: SkillMatch[];
  gaps: GapAnalysis[];
  domains: DomainExperience[];
  analysis: SonnetAnalysis | null;
  summary: string;
}

export interface BenchBurnResult {
  sessionId: number;
  employeeResults: Record<number, CrossMatchResult[]>;
  positionResults: Record<number, CrossMatchResult[]>;
  stats: {
    totalPairs: number;
    analyzed: number;
    time: string;
    searchCost: string;
  };
}

export type ResumeSessionStatus = 'active' | 'completed' | 'archived';
export type ResumeUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';
export type ResumeVectorizationStatus = 'pending' | 'vectorizing' | 'completed' | 'failed';
export type ResumeStepKey = 'processing' | 'select' | 'refinement' | 'job-description' | 'review' | 'save';

export interface ResumeSessionSummary {
  id: number;
  name: string;
  sourceType: ResumeSourceType;
  candidateUpstreamId: number | null;
  employeeUpstreamId: number | null;
  currentStepKey: ResumeStepKey;
  processingMode: ProcessingMode;
  uploadStatus: ResumeUploadStatus;
  vectorizationStatus: ResumeVectorizationStatus;
  version: number;
  status: ResumeSessionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ResumeSessionDetail extends ResumeSessionSummary {
  completedSteps: ResumeStepKey[];
  stepperContext: Record<string, unknown> | null;
  resumeContent: StructuredResume | null;
  originalResumeText: string | null;
  originalFileName: string | null;
  originalFileType: string | null;
  refinementMode: RefinementMode | null;
}
