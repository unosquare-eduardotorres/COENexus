import { Database, Filter, Search, ListChecks, Cpu, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type SubTaskStatus = 'pending' | 'running' | 'done' | 'failed'

export interface SubTask {
  id: string
  label: string
  detail: string
  icon: 'db' | 'filter' | 'query' | 'compute' | 'ai' | 'emit'
}

export interface StepBlueprint {
  stepIndex: number
  title: string
  subTasks: SubTask[]
}

export const ICON_MAP: Record<SubTask['icon'], LucideIcon> = {
  db: Database,
  filter: Filter,
  query: Search,
  compute: ListChecks,
  ai: Cpu,
  emit: Sparkles,
}

export const STEP_BLUEPRINTS: StepBlueprint[] = [
  {
    stepIndex: 0,
    title: 'Fetch Positions',
    subTasks: [
      { id: '1.1', label: 'Connect to Database', detail: 'nexus.db → synced_open_positions table', icon: 'db' },
      { id: '1.2', label: 'Apply Scope Filters', detail: "Filter by: position_status = 'Active', COE, Client, Vertical, Preset", icon: 'filter' },
      { id: '1.3', label: 'Apply Preset Logic', detail: 'no-candidates: candidates_presented = 0 / stalled-30d: aging ≥ 30 / high-priority: aging ≥ 14 + no candidates', icon: 'filter' },
      { id: '1.4', label: 'Execute Query', detail: 'SELECT ... FROM synced_open_positions WHERE ... ORDER BY aging DESC', icon: 'query' },
      { id: '1.5', label: 'Emit Position Count', detail: 'Stats → positionsFound: N', icon: 'emit' },
    ],
  },
  {
    stepIndex: 1,
    title: 'Gather Candidates',
    subTasks: [
      { id: '2.1', label: 'Query Candidate Pool', detail: "nexus.db → resume_embeddings JOIN synced_candidates WHERE source_type = 'candidates'", icon: 'query' },
      { id: '2.2', label: 'Query Employee Pool', detail: "nexus.db → resume_embeddings JOIN synced_employees WHERE source_type = 'employees'", icon: 'query' },
      { id: '2.3', label: 'Build Unified Pool', detail: 'Merge candidates + employees into CandidatePoolEntry[]', icon: 'compute' },
      { id: '2.4', label: 'Assign Pool to Positions', detail: 'Map each position → full candidate pool', icon: 'compute' },
      { id: '2.5', label: 'Emit Candidate Count', detail: 'Stats → candidatesGathered: N, poolSize: N', icon: 'emit' },
    ],
  },
  {
    stepIndex: 2,
    title: 'Cross-Reference',
    subTasks: [
      { id: '3.1', label: 'For Each Position', detail: 'Loop synced_open_positions', icon: 'compute' },
      { id: '3.2', label: 'Query Presented Candidates', detail: 'nexus.db → open_position_candidates WHERE open_position_id = ?', icon: 'query' },
      { id: '3.3', label: 'Build Exclusion Set', detail: 'Set<candidateId> per position (already-presented)', icon: 'compute' },
      { id: '3.4', label: 'Emit Cross-Ref Stats', detail: 'Stats → crossReferencedPairs: N', icon: 'emit' },
    ],
  },
  {
    stepIndex: 3,
    title: 'Agentic Analysis',
    subTasks: [
      { id: '4.1', label: 'Assemble Brain', detail: 'scout9.db → rules, glossary, patterns, notes → token budget trimming', icon: 'ai' },
      { id: '4.2', label: 'Load System Prompt', detail: 'scout9.db → system_prompt_versions WHERE is_active = 1', icon: 'db' },
      { id: '4.3', label: 'Build Position Summaries', detail: 'Filter out already-presented candidates per position', icon: 'compute' },
      { id: '4.4', label: 'Construct Analysis Prompt', detail: 'JSON payload of positions + available candidates', icon: 'compute' },
      { id: '4.5', label: 'AI Analysis (Stub)', detail: "Currently returns fitScore: 50 / 'Pending AI analysis' — pending Agent SDK wiring", icon: 'ai' },
      { id: '4.6', label: 'Persist Report', detail: 'scout9.db → agent_reports + report_candidates via reportRepository', icon: 'db' },
    ],
  },
]

export function deriveSubTaskStatus(stepStatus: string, _subTaskIndex: number, _totalSubTasks: number): SubTaskStatus {
  switch (stepStatus) {
    case 'idle': return 'pending'
    case 'running': return 'running'
    case 'completed': return 'done'
    case 'failed': return 'failed'
    default: return 'pending'
  }
}
