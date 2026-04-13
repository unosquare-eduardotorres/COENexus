import { useRef, useEffect } from 'react'
import { Database, Filter, Search, ListChecks, Users, GitMerge, Brain, FileText, Cpu, Sparkles } from 'lucide-react'
import type { StepState } from './PipelineNodeGraph'

type SubTaskStatus = 'pending' | 'running' | 'done' | 'failed'

interface SubTask {
  id: string
  label: string
  detail: string
  icon: 'db' | 'filter' | 'query' | 'compute' | 'ai' | 'emit'
}

interface StepBlueprint {
  stepIndex: number
  title: string
  subTasks: SubTask[]
}

const ICON_MAP = {
  db: Database,
  filter: Filter,
  query: Search,
  compute: ListChecks,
  ai: Cpu,
  emit: Sparkles,
}

const STEP_BLUEPRINTS: StepBlueprint[] = [
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

function deriveSubTaskStatus(stepStatus: StepState['status'], _subTaskIndex: number, _totalSubTasks: number): SubTaskStatus {
  switch (stepStatus) {
    case 'idle': return 'pending'
    case 'running': return 'running'
    case 'completed': return 'done'
    case 'failed': return 'failed'
    default: return 'pending'
  }
}

function SubTaskStatusIcon({ status }: { status: SubTaskStatus }) {
  switch (status) {
    case 'pending':
      return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-400/40 text-[8px] text-gray-400">○</span>
    case 'running':
      return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-green-400 bg-green-400/20 animate-pulse"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /></span>
    case 'done':
      return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-green-500 bg-green-500/20 text-[10px] text-green-500">✓</span>
    case 'failed':
      return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-red-500 bg-red-500/20 text-[10px] text-red-500">✗</span>
  }
}

interface ExecutionPlanProps {
  steps: StepState[]
  activeStepIndex?: number
  logs?: string[]
}

export default function ExecutionPlan({ steps, activeStepIndex }: ExecutionPlanProps) {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (activeStepIndex !== undefined && activeStepIndex >= 0 && activeStepIndex < STEP_BLUEPRINTS.length) {
      stepRefs.current[activeStepIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeStepIndex])

  const isAnyRunning = steps.some(s => s.status === 'running')
  const isAnyCompleted = steps.some(s => s.status === 'completed')

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={14} className="text-violet-400" />
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Execution Plan</h4>
        {!isAnyRunning && !isAnyCompleted && (
          <span className="ml-auto text-[9px] text-muted px-1.5 py-0.5 rounded border border-dashed border-gray-400/30">Blueprint</span>
        )}
        {isAnyRunning && (
          <span className="ml-auto text-[9px] text-green-400 px-1.5 py-0.5 rounded border border-green-400/30 bg-green-400/10 animate-pulse">Running</span>
        )}
        {!isAnyRunning && isAnyCompleted && (
          <span className="ml-auto text-[9px] text-green-400 px-1.5 py-0.5 rounded border border-green-500/30 bg-green-500/10">Complete</span>
        )}
      </div>

      <div className="space-y-3">
        {STEP_BLUEPRINTS.map((blueprint, bIdx) => {
          const stepState = steps[blueprint.stepIndex] ?? { name: blueprint.title, status: 'idle' as const }
          const isActive = activeStepIndex === bIdx
          const isAgentic = blueprint.stepIndex >= 3

          return (
            <div
              key={blueprint.stepIndex}
              ref={el => { stepRefs.current[bIdx] = el }}
              className={`
                glass-panel-subtle rounded-xl p-3 transition-all
                ${isActive ? 'ring-1 ring-violet-400/40' : ''}
                ${isAgentic ? 'border-l-2 border-l-violet-400/30' : ''}
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`
                  flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold
                  ${stepState.status === 'idle' ? 'bg-gray-500/15 text-gray-400' : ''}
                  ${stepState.status === 'running' ? 'bg-green-500/15 text-green-400' : ''}
                  ${stepState.status === 'completed' ? 'bg-green-500/15 text-green-500' : ''}
                  ${stepState.status === 'failed' ? 'bg-red-500/15 text-red-500' : ''}
                `}>
                  {blueprint.stepIndex + 1}
                </div>
                <span className={`text-xs font-semibold ${isAgentic ? 'text-violet-400' : 'text-primary'}`}>
                  {blueprint.title}
                </span>
                {stepState.elapsed !== undefined && stepState.elapsed > 0 && (
                  <span className="text-[9px] text-muted font-mono ml-auto">
                    {stepState.elapsed < 1000 ? `${stepState.elapsed}ms` : `${(stepState.elapsed / 1000).toFixed(1)}s`}
                  </span>
                )}
              </div>

              <div className="space-y-1 ml-2">
                {blueprint.subTasks.map((subTask, stIdx) => {
                  const subStatus = deriveSubTaskStatus(stepState.status, stIdx, blueprint.subTasks.length)
                  const IconComponent = ICON_MAP[subTask.icon]

                  return (
                    <div
                      key={subTask.id}
                      className={`
                        flex items-start gap-2 py-1 px-2 rounded transition-colors
                        ${subStatus === 'running' ? 'bg-green-400/5' : ''}
                        ${subStatus === 'done' ? 'opacity-75' : ''}
                        ${subStatus === 'failed' ? 'bg-red-400/5' : ''}
                      `}
                    >
                      <SubTaskStatusIcon status={subStatus} />
                      <IconComponent size={12} className="text-muted mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium text-secondary">{subTask.id} {subTask.label}</span>
                        <p className="text-[9px] text-muted leading-tight mt-0.5 truncate">{subTask.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {stepState.data && Object.keys(stepState.data).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-2">
                  {Object.entries(stepState.data).map(([key, val]) => (
                    <span key={key} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                      {key}: {typeof val === 'number' ? val.toLocaleString() : String(val)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
