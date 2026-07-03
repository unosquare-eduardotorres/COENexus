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

export const ACTIVE_CANDIDATE_STATUSES = ['PresentedToCGX', 'PresentedToClient', 'CustomerInterview'] as const

export const STATUS_SYNONYMS: Record<string, string> = {
  PresentedToClientSuccess: 'PresentedToCGX',
}

export function normalizeStatus(status: string): string {
  return STATUS_SYNONYMS[status] ?? status
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
