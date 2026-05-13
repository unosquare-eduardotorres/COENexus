import { Link } from 'react-router-dom'
import type { HealthBreakdown } from '../types'
import EffectivenessRing from './EffectivenessRing'
import HealthMiniBar from './HealthMiniBar'

interface TrackingCardProps {
  name: string
  effectivenessPercent: number
  totalPositions: number
  coveredPositions: number
  healthBreakdown: HealthBreakdown
  href: string
  description?: string
  subtitle?: string
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
}: TrackingCardProps) {
  const uncoveredCount = totalPositions - coveredPositions

  return (
    <Link to={href} className="block glass-card-hover p-5 transition-all group">
      <div className="flex items-start gap-4">
        <EffectivenessRing percent={effectivenessPercent} size="sm" />
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
            </p>
            {uncoveredCount > 0 && (
              <p className="text-xs text-red-500 dark:text-red-400">
                {uncoveredCount} Uncovered
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <HealthMiniBar breakdown={healthBreakdown} />
      </div>
    </Link>
  )
}
