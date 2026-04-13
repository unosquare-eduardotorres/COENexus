import { Check, X } from 'lucide-react'

export interface StepState {
  name: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  elapsed?: number
  data?: Record<string, unknown>
}

interface PipelineNodeGraphProps {
  steps: StepState[]
  onStepClick?: (stepIndex: number) => void
}

const STEP_LABELS = [
  'Fetch Positions',
  'Gather Candidates',
  'Cross-Reference',
  'Analyze (AI)',
  'Score & Rank',
  'Generate Report',
]

function formatElapsed(ms?: number): string {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function StepNode({ step, index, onClick }: { step: StepState; index: number; onClick?: () => void }) {
  const isAgentic = index >= 3

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[100px] cursor-pointer" onClick={onClick}>
      <div
        className={`
          relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all hover:scale-110
          ${step.status === 'idle' ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-dark-surface' : ''}
          ${step.status === 'running' ? 'border-green-400 bg-green-400/20 animate-pulse' : ''}
          ${step.status === 'completed' ? 'border-green-500 bg-green-500/20' : ''}
          ${step.status === 'failed' ? 'border-red-500 bg-red-500/20' : ''}
        `}
      >
        {step.status === 'idle' && (
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{index + 1}</span>
        )}
        {step.status === 'running' && (
          <span className="h-3 w-3 rounded-full bg-green-400 animate-ping" />
        )}
        {step.status === 'completed' && <Check size={16} className="text-green-500" />}
        {step.status === 'failed' && <X size={16} className="text-red-500" />}
      </div>
      <span className={`text-[10px] font-medium text-center leading-tight ${isAgentic ? 'text-violet-400' : 'text-secondary'}`}>
        {step.name}
      </span>
      {step.elapsed !== undefined && step.elapsed > 0 && (
        <span className="text-[9px] text-muted font-mono">{formatElapsed(step.elapsed)}</span>
      )}
      {step.data && Object.keys(step.data).length > 0 && (
        <span className="text-[9px] text-muted">
          {Object.values(step.data).map(v => typeof v === 'number' ? v.toLocaleString() : '').filter(Boolean).join(' ')}
        </span>
      )}
    </div>
  )
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className={`flex-1 h-0.5 min-w-[16px] max-w-[40px] rounded-full transition-colors ${active ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
  )
}

export default function PipelineNodeGraph({ steps, onStepClick }: PipelineNodeGraphProps) {
  const displaySteps: StepState[] = STEP_LABELS.map((label, i) => steps[i] ?? { name: label, status: 'idle' })

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-center flex-wrap gap-1">
        {displaySteps.map((step, i) => (
          <div key={i} className="contents">
            {i === 3 && (
              <div className="flex items-center mx-1">
                <div className="h-6 border-l border-dashed border-violet-400/40" />
              </div>
            )}
            <StepNode step={step} index={i} onClick={() => onStepClick?.(i)} />
            {i < displaySteps.length - 1 && i !== 2 && i !== 5 && (
              <Connector active={step.status === 'completed'} />
            )}
            {i === 2 && <Connector active={step.status === 'completed'} />}
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-2">
        <span className="text-[9px] text-violet-400/60 font-medium border border-dashed border-violet-400/30 rounded px-1.5 py-0.5">
          Agentic Phase (Steps 4-6)
        </span>
      </div>
    </div>
  )
}
