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

export type DataSource = 'bench' | 'all-employees' | 'candidates' | 'all-sources';

export type Seniority = 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Architect' | 'Trainee' | 'Not Specified';

export type Currency = 'USD' | 'MXN' | 'COP' | 'PEN' | 'BOB';

export interface HardConstraints {
  seniority?: Seniority;
  maxRate?: number;
  currency?: Currency;
  country?: string;
  mainSkill?: string;
}

export type SkillMatchStatus = 'match' | 'partial' | 'missing';
export type GapSeverity = 'low' | 'medium' | 'high';
export type CandidateType = 'employee' | 'candidate';

export interface SkillMatch {
  name: string;
  status: SkillMatchStatus;
  years: number;
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
  domain: number;
  leadership: number;
  softSkills: number;
  availability: number;
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
  leadership: string[];
  softSkills: string[];
  seniority: Seniority;
  expectedRate: number;
  currency: Currency;
  country: string;
  mainSkill: string;
  isBench: boolean;
  centerOfExcellence?: string;
}

export interface PipelineStats {
  profilesScanned: string;
  preFiltered: string;
  constraintsApplied: string;
  haikuTriage: string;
  sonnetAnalyzed: string;
  searchCost: string;
  time: string;
}

export interface SearchProgress {
  percent: number;
  stage: string;
}

export type MatchFlowType = 'find-for-position' | 'match-to-positions';

export type MatchStepKey = 'intent' | 'job-description' | 'data-source' | 'searching' | 'results' | 'deep-dive';

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

export type SyncSourceType = 'employees' | 'candidates';
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
  status: 'idle' | 'processing' | 'paused' | 'completed' | 'error';
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
