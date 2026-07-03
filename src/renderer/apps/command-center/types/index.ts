export type StalledCriterionKey =
  | 'stalled-position'
  | 'no-active-candidates'
  | 'idle-cgx'
  | 'idle-client'
  | 'idle-customer-interview'
  | 'draft-positions'

export type CriterionActor = 'COE' | 'CGX'

export interface CriterionConfig {
  key: StalledCriterionKey
  label: string
  description: string
  actor: CriterionActor
  defaultThreshold: number
  colorClass: string
}

export type StalledThresholds = Record<StalledCriterionKey, number>

export interface StalledPositionResult {
  position: {
    upstream_id: number
    account: string
    coe: string
    practice: string
    stakeholder: string
    main_skill: string
    countries: string
    seniorities: string
    available_range: string
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
  }
  matchingCriteria: StalledCriterionKey[]
  actors: CriterionActor[]
}

export interface OpenPositionReportResult {
  results: StalledPositionResult[]
  totalPositions: number
  lastSyncedAt: string | null
}

export interface PositionDetailResult {
  position: StalledPositionResult['position']
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

export const CRITERIA_CONFIG: CriterionConfig[] = [
  {
    key: 'stalled-position',
    label: 'Stalled Position',
    description: 'No updates (new candidate, status change, or discussion) for > X days',
    actor: 'COE',
    defaultThreshold: 2,
    colorClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  },
  {
    key: 'no-active-candidates',
    label: 'No Active Candidates',
    description: 'Position has zero active candidates (Presented to CGX/Client or in Customer Interview)',
    actor: 'COE',
    defaultThreshold: 2,
    colorClass: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  },
  {
    key: 'draft-positions',
    label: 'Draft Position',
    description: 'Position remains in "Draft" status for > X days',
    actor: 'COE',
    defaultThreshold: 3,
    colorClass: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  },
  {
    key: 'idle-cgx',
    label: 'Idle CGX',
    description: 'Candidate(s) stuck in "Presented to CGX" status for > X days',
    actor: 'CGX',
    defaultThreshold: 2,
    colorClass: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
  },
  {
    key: 'idle-client',
    label: 'Idle Client',
    description: 'Candidate(s) stuck in "Presented to Client" status for > X days',
    actor: 'CGX',
    defaultThreshold: 2,
    colorClass: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  },
  {
    key: 'idle-customer-interview',
    label: 'Idle Customer Interview',
    description: 'Candidate(s) stuck in "Customer Interview" status for > X days',
    actor: 'CGX',
    defaultThreshold: 3,
    colorClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  },
]

export const DEFAULT_THRESHOLDS: StalledThresholds = CRITERIA_CONFIG.reduce(
  (acc, config) => ({ ...acc, [config.key]: config.defaultThreshold }),
  {} as StalledThresholds
)

export type PrrCoeStatus = 'Not Set' | 'Pending Evaluation' | 'Ready to Present' | 'Presented' | 'Needs Attention' | 'Not Applies' | 'Other' | 'Closed'
export const PRR_COE_STATUSES: PrrCoeStatus[] = ['Not Set', 'Pending Evaluation', 'Ready to Present', 'Presented', 'Needs Attention', 'Not Applies', 'Other', 'Closed']

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
  coeComments: PrrCommentEntry[]
  daysOpened: number
  syncedAt: string
}

export interface PrrCommentEntry {
  text: string
  author: string
  createdAt: string
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
  position: StalledPositionResult['position']
  activeCandidateCount: number
  healthTier: HealthTier
  totalCandidates: number
  matchingCriteria: StalledCriterionKey[]
  actors: CriterionActor[]
  isVirtual: boolean
}

export interface CoeTrackingTimelineEvent {
  type: 'created' | 'ready' | 'modified' | 'candidate-presented' | 'candidate-rejected' | 'discussion'
  date: string
  label: string
  detail?: string
}

export interface TrackedPositionDetail {
  position: StalledPositionResult['position']
  activeCandidateCount: number
  healthTier: HealthTier
  candidates: PositionDetailResult['candidates']
  discussions: PositionDetailResult['discussions']
  timelineEvents: CoeTrackingTimelineEvent[]
  isVirtual: boolean
}
