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
  description: string;
  achievements: string[];
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
  transformedAt: string;
  status: ResumeStatus;
  validationResults: ValidationResult[];
  overallValidationStatus: ValidationStatus;
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

export interface AppSettings {
  aiConfig: AIConfig;
  defaultTemplate: string;
  autoValidate: boolean;
  showOriginalByDefault: boolean;
  theme: 'light' | 'dark' | 'system';
}

export type TechSkill = 'C#' | 'Angular' | 'React' | 'Java' | 'Ruby' | 'Python';

export const AVAILABLE_SKILLS: TechSkill[] = ['C#', 'Angular', 'React', 'Java', 'Ruby', 'Python'];

export interface ATSCandidate {
  id: string;
  name: string;
  skills: TechSkill[];
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
  requiredSkills: TechSkill[];
  accountName: string;
  stakeholder: string;
  seniorities: string[];
  vertical: string;
  minRate: number;
  maxRate: number;
  candidatesPresented: PresentedCandidate[];
}

export type TransformSource = 'ats' | 'upload';
