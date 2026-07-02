export type LlmProvider = 'claude' | 'local'
export type PresetMode = 'claude' | 'local' | 'custom'

export type FeatureKey =
  | 'resumeSkillExtraction'
  | 'resumeFormatCheck'
  | 'resumeTransform'
  | 'candidateProfile'
  | 'coverLetter'
  | 'matchTriage'
  | 'matchDeepAnalysis'
  | 'benchBurnAnalysis'
  | 'responsivenessAnalysis'
  | 'responsivenessReport'
  | 'bugDescription'
  | 'aiChat'

export interface FeatureModelAssignment {
  provider: LlmProvider
  model: string
}

export interface ModelConfig {
  presetMode: PresetMode
  localServerUrl: string
  localDefaultModel: string
  concurrency: {
    claude: { max: number; haikuMax: number }
    local: { max: number }
  }
  features: Record<FeatureKey, FeatureModelAssignment>
}

export interface FeatureMeta {
  label: string
  description: string
  defaultClaudeModel: string
  claudeTier: 'haiku' | 'sonnet' | 'opus'
}

export const FEATURE_REGISTRY: Record<FeatureKey, FeatureMeta> = {
  resumeSkillExtraction:  { label: 'Resume Skill Extraction',   description: 'Extract structured skills from resume text',       defaultClaudeModel: 'claude-haiku-4-5',  claudeTier: 'haiku' },
  resumeFormatCheck:      { label: 'Resume Format Check',       description: 'Check resume format compatibility',               defaultClaudeModel: 'claude-sonnet-4-6', claudeTier: 'sonnet' },
  resumeTransform:        { label: 'Resume Transform',          description: 'Transform resume for client presentation',        defaultClaudeModel: 'claude-sonnet-4-6', claudeTier: 'sonnet' },
  candidateProfile:       { label: 'Candidate Profile',         description: 'Generate candidate profile summary',              defaultClaudeModel: 'claude-sonnet-4-6', claudeTier: 'sonnet' },
  coverLetter:            { label: 'Cover Letter Generation',   description: 'Generate candidate cover letter',                 defaultClaudeModel: 'claude-sonnet-4-6', claudeTier: 'sonnet' },
  matchTriage:            { label: 'Match Triage',              description: 'Quick relevance filtering of candidates',         defaultClaudeModel: 'claude-haiku-4-5',  claudeTier: 'haiku' },
  matchDeepAnalysis:      { label: 'Match Deep Analysis',       description: 'Detailed candidate-position evaluation',          defaultClaudeModel: 'claude-opus-4-8',   claudeTier: 'opus' },
  benchBurnAnalysis:      { label: 'Bench Burn Analysis',       description: 'Employee/candidate bench-burn matching',          defaultClaudeModel: 'claude-opus-4-8',   claudeTier: 'opus' },
  responsivenessAnalysis: { label: 'Responsiveness Analysis',   description: 'Analyze position discussion mentions',            defaultClaudeModel: 'claude-sonnet-4-6', claudeTier: 'sonnet' },
  responsivenessReport:   { label: 'Responsiveness Report',     description: 'Generate full position attention report',         defaultClaudeModel: 'claude-sonnet-4-6', claudeTier: 'sonnet' },
  bugDescription:         { label: 'Bug Description',           description: 'AI-generated error analysis',                    defaultClaudeModel: 'claude-haiku-4-5',  claudeTier: 'haiku' },
  aiChat:                 { label: 'AI Chat',                   description: 'General-purpose AI chat from renderer',           defaultClaudeModel: 'claude-sonnet-4-6', claudeTier: 'sonnet' },
}

export const CLAUDE_MODELS = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', tier: 'haiku' as const },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'sonnet' as const },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', tier: 'opus' as const },
]

export const ALL_FEATURE_KEYS: FeatureKey[] = Object.keys(FEATURE_REGISTRY) as FeatureKey[]

export function buildDefaultFeatures(mode: PresetMode, localModel: string): Record<FeatureKey, FeatureModelAssignment> {
  const features = {} as Record<FeatureKey, FeatureModelAssignment>
  for (const [key, meta] of Object.entries(FEATURE_REGISTRY) as [FeatureKey, FeatureMeta][]) {
    if (mode === 'local') {
      features[key] = { provider: 'local', model: localModel }
    } else {
      features[key] = { provider: 'claude', model: meta.defaultClaudeModel }
    }
  }
  return features
}
