import { Link } from 'react-router-dom'
import { AlertTriangle, UserPlus, Info } from 'lucide-react'
import type { HealthBreakdown } from '../types'
import EffectivenessRing from './EffectivenessRing'

interface TrackingCardProps {
  name: string
  effectivenessPercent: number
  totalPositions: number
  coveredPositions: number
  healthBreakdown: HealthBreakdown
  href: string
  description?: string
  subtitle?: string
  virtualPositions?: number
}

export default function TrackingCard({
  name,
  effectivenessPercent,
  totalPositions,
  coveredPositions,
  healthBreakdown,
  href,
  description,
  subtitle,
  virtualPositions,
}: TrackingCardProps) {
  const uncoveredCount = totalPositions - coveredPositions
  const isVirtualOnly = totalPositions === 0 && (virtualPositions ?? 0) > 0
  const coveragePercent = totalPositions > 0 ? Math.round((coveredPositions / totalPositions) * 100) : 0

  const barColor =
    coveragePercent < 50 ? 'bg-red-500'
    : coveragePercent < 80 ? 'bg-amber-500'
    : 'bg-emerald-500'

  return (
    <Link to={href} className="block glass-card-hover p-5 transition-all group">
      {/* Section 1: Title row */}
      <div className="flex items-start gap-4">
        <EffectivenessRing
          percent={effectivenessPercent}
          size="sm"
          noData={isVirtualOnly}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-primary truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {name}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
          )}
          {description && (
            <p className="text-[11px] text-muted mt-1 line-clamp-1">{description}</p>
          )}
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-secondary">
              {totalPositions} Position{totalPositions !== 1 ? 's' : ''}
              {virtualPositions != null && virtualPositions > 0 && (
                <span className="text-cyan-400 ml-1">(+ {virtualPositions} virtual)</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Coverage progress bar OR virtual-only state */}
      <div className="mt-4">
        {isVirtualOnly ? (
          <div>
            <div className="flex items-center gap-1.5 text-xs text-cyan-400">
              <Info size={12} />
              <span>Virtual only — {virtualPositions} internal position{virtualPositions !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-[10px] text-muted mt-1">
              No client positions open. Commercial team may need to expand.
            </p>
          </div>
        ) : totalPositions > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-secondary">Coverage</span>
              <span className="text-xs font-medium text-primary">
                {coveredPositions} covered · {uncoveredCount} uncovered
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor} transition-all duration-500`}
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Section 3: Action callouts — only show tiers needing attention */}
      {(healthBreakdown.critical > 0 || healthBreakdown.warning > 0) && (
        <div className="mt-3 flex items-center gap-3 text-[10px]">
          {healthBreakdown.critical > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle size={10} />
              {healthBreakdown.critical} Needs Candidates
            </span>
          )}
          {healthBreakdown.warning > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <UserPlus size={10} />
              {healthBreakdown.warning} Needs More
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
