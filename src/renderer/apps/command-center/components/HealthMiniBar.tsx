import type { HealthBreakdown } from '../types'

interface HealthMiniBarProps {
  breakdown: HealthBreakdown
}

const TIERS = [
  { key: 'critical' as const, color: 'bg-red-500', dotColor: 'bg-red-500', label: 'Critical' },
  { key: 'warning' as const, color: 'bg-amber-500', dotColor: 'bg-amber-500', label: 'Warning' },
  { key: 'good' as const, color: 'bg-emerald-500', dotColor: 'bg-emerald-500', label: 'Good' },
  { key: 'excellent' as const, color: 'bg-blue-500', dotColor: 'bg-blue-500', label: 'Excellent' },
]

export default function HealthMiniBar({ breakdown }: HealthMiniBarProps) {
  const total = breakdown.critical + breakdown.warning + breakdown.good + breakdown.excellent
  if (total === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-200/50 dark:bg-dark-border/30">
        {TIERS.map(tier => {
          const count = breakdown[tier.key]
          if (count === 0) return null
          const widthPercent = (count / total) * 100
          return (
            <div
              key={tier.key}
              className={`${tier.color} transition-all duration-300`}
              style={{ width: `${widthPercent}%` }}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {TIERS.map(tier => {
          const count = breakdown[tier.key]
          if (count === 0) return null
          return (
            <div key={tier.key} className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${tier.dotColor}`} />
              <span className="text-[10px] text-muted">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
