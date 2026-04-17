import { Lightbulb, CheckCircle2, Clock } from 'lucide-react'
import type { BraniacPattern } from '../../../../../shared/ipc-types'

interface BraniacPatternListProps {
  patterns: BraniacPattern[]
}

function approvalBadge(status: string) {
  if (status === 'auto_applied') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
        <CheckCircle2 className="h-3 w-3" />
        Auto-applied
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      <Clock className="h-3 w-3" />
      Pending review
    </span>
  )
}

function confidenceBar(score: number) {
  const pct = Math.round(score * 100)
  const color = score >= 0.9
    ? 'bg-green-500'
    : score >= 0.6
      ? 'bg-amber-500'
      : 'bg-red-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-dark-muted/30 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted tabular-nums">{pct}%</span>
    </div>
  )
}

export default function BraniacPatternList({ patterns }: BraniacPatternListProps) {
  if (patterns.length === 0) {
    return (
      <div className="glass-panel p-5 rounded-2xl">
        <h2 className="text-base font-semibold text-primary mb-3">Learned Patterns</h2>
        <p className="text-sm text-muted">No patterns inferred yet. Run a Braniac job to discover patterns.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary">Learned Patterns</h2>
        <span className="text-xs text-muted">{patterns.length} patterns</span>
      </div>

      <div className="space-y-2">
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className="p-3 rounded-xl bg-gray-50/50 dark:bg-dark-surface/50 border border-gray-100 dark:border-dark-border/30 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-primary">{pattern.pattern_name}</h3>
                  <p className="text-xs text-secondary mt-0.5 line-clamp-2">{pattern.pattern_text}</p>
                </div>
              </div>
              {approvalBadge(pattern.approval_status)}
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex-1 max-w-[160px]">
                {confidenceBar(pattern.confidence_score)}
              </div>
              <span className="text-muted">{pattern.data_points_count} data points</span>
              {pattern.account && (
                <span className="text-muted">{pattern.account}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
