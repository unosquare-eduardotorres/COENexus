import { Database, Users, GitMerge, Brain, BarChart3, FileText, Check, X, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface StepState {
  name: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  elapsed?: number
  data?: Record<string, unknown>
}

interface StepConfig {
  label: string
  subtitle: string
  icon: LucideIcon
  color: string
  colorClasses: {
    border: string
    iconBg: string
    iconText: string
    stat: string
    ring: string
  }
}

export const STEP_CONFIGS: StepConfig[] = [
  {
    label: 'Fetch Positions',
    subtitle: 'Query open positions',
    icon: Database,
    color: 'blue',
    colorClasses: {
      border: 'border-l-blue-400',
      iconBg: 'bg-blue-400/15',
      iconText: 'text-blue-400',
      stat: 'text-blue-400',
      ring: 'ring-blue-400/50',
    },
  },
  {
    label: 'Gather Candidates',
    subtitle: 'Build candidate pool',
    icon: Users,
    color: 'emerald',
    colorClasses: {
      border: 'border-l-emerald-400',
      iconBg: 'bg-emerald-400/15',
      iconText: 'text-emerald-400',
      stat: 'text-emerald-400',
      ring: 'ring-emerald-400/50',
    },
  },
  {
    label: 'Cross-Reference',
    subtitle: 'Filter presented candidates',
    icon: GitMerge,
    color: 'cyan',
    colorClasses: {
      border: 'border-l-cyan-400',
      iconBg: 'bg-cyan-400/15',
      iconText: 'text-cyan-400',
      stat: 'text-cyan-400',
      ring: 'ring-cyan-400/50',
    },
  },
  {
    label: 'Analyze (AI)',
    subtitle: 'Agentic fit analysis',
    icon: Brain,
    color: 'violet',
    colorClasses: {
      border: 'border-l-violet-400',
      iconBg: 'bg-violet-400/15',
      iconText: 'text-violet-400',
      stat: 'text-violet-400',
      ring: 'ring-violet-400/50',
    },
  },
  {
    label: 'Score & Rank',
    subtitle: 'Rank candidates by fit',
    icon: BarChart3,
    color: 'amber',
    colorClasses: {
      border: 'border-l-amber-400',
      iconBg: 'bg-amber-400/15',
      iconText: 'text-amber-400',
      stat: 'text-amber-400',
      ring: 'ring-amber-400/50',
    },
  },
  {
    label: 'Generate Report',
    subtitle: 'Persist final output',
    icon: FileText,
    color: 'rose',
    colorClasses: {
      border: 'border-l-rose-400',
      iconBg: 'bg-rose-400/15',
      iconText: 'text-rose-400',
      stat: 'text-rose-400',
      ring: 'ring-rose-400/50',
    },
  },
]

function formatElapsed(ms?: number): string {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatStatValue(val: unknown): string {
  if (typeof val === 'number') {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
    return val.toLocaleString()
  }
  return String(val)
}

interface WorkflowNodeProps {
  step: StepState
  index: number
  selected?: boolean
  onClick?: () => void
}

function StatusBadge({ status }: { status: StepState['status'] }) {
  switch (status) {
    case 'idle':
      return <span className="h-2 w-2 rounded-full bg-gray-500/40" />
    case 'running':
      return (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
        </span>
      )
    case 'completed':
      return <Check size={10} className="text-green-400" />
    case 'failed':
      return <X size={10} className="text-red-400" />
  }
}

export default function WorkflowNode({ step, index, selected, onClick }: WorkflowNodeProps) {
  const config = STEP_CONFIGS[index]
  if (!config) return null

  const Icon = config.icon
  const { colorClasses } = config

  const statEntries = step.data ? Object.entries(step.data).filter(([, v]) => typeof v === 'number' && (v as number) > 0) : []
  const firstStat = statEntries[0]

  return (
    <div
      onClick={onClick}
      className={`
        w-full rounded-xl border border-white/10 border-l-[3px] ${colorClasses.border}
        bg-dark-card/80 backdrop-blur-xl shadow-glass
        p-3 cursor-pointer select-none
        transition-all duration-200 hover:scale-[1.03] hover:border-white/20 hover:shadow-glass-lg
        ${selected ? `ring-2 ${colorClasses.ring}` : ''}
        ${step.status === 'running' ? 'border-white/15' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${colorClasses.iconBg} flex-shrink-0`}>
          <Icon size={14} className={colorClasses.iconText} />
        </div>
        <span className="text-xs font-semibold text-primary truncate flex-1">{config.label}</span>
        <div className="ml-auto flex-shrink-0">
          <StatusBadge status={step.status} />
        </div>
      </div>

      <p className="text-[10px] text-muted mt-1 leading-tight">{config.subtitle}</p>

      <div className="h-px bg-white/5 my-1.5" />

      <div className="flex items-center justify-between text-[9px]">
        {firstStat ? (
          <span className={`font-mono ${colorClasses.stat}`}>
            {formatStatValue(firstStat[1])} {firstStat[0]}
          </span>
        ) : (
          <span className="font-mono text-muted">—</span>
        )}
        {step.elapsed !== undefined && step.elapsed > 0 ? (
          <span className="font-mono text-muted">{formatElapsed(step.elapsed)}</span>
        ) : step.status === 'running' ? (
          <Loader2 size={9} className="text-muted animate-spin" />
        ) : null}
      </div>
    </div>
  )
}
