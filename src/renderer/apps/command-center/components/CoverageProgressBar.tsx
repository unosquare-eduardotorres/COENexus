import { AlertTriangle, UserPlus } from 'lucide-react'
import type { HealthBreakdown } from '../types'

interface CoverageProgressBarProps {
  breakdown: HealthBreakdown
  covered: number
  total: number
  /** Compact mode hides the action-needed summary line */
  compact?: boolean
}

export default function CoverageProgressBar({ breakdown, covered, total, compact = false }: CoverageProgressBarProps) {
  if (total === 0) return null

  const percent = Math.round((covered / total) * 100)
  const barColor =
    percent < 50 ? 'bg-red-500'
    : percent < 80 ? 'bg-amber-500'
    : 'bg-emerald-500'

  const needsCandidates = breakdown.critical
  const needsMore = breakdown.warning

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-secondary">Coverage</span>
        <span className="text-xs font-medium text-primary">{covered} of {total}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!compact && (needsCandidates > 0 || needsMore > 0) && (
        <div className="flex items-center gap-3 mt-1.5 text-[10px]">
          {needsCandidates > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle size={10} />
              {needsCandidates} need candidates
            </span>
          )}
          {needsMore > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <UserPlus size={10} />
              {needsMore} need{needsMore === 1 ? 's' : ''} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
