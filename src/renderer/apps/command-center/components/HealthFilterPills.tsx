import type { HealthBreakdown, HealthTier } from '../types'

type FilterValue = HealthTier | 'all'

interface HealthFilterPillsProps {
  breakdown: HealthBreakdown
  activeFilter: FilterValue
  onFilterChange: (filter: FilterValue) => void
}

const PILL_CONFIG: Array<{
  value: FilterValue
  label: string
  icon: string
  activeClasses: string
}> = [
  {
    value: 'all',
    label: 'All',
    icon: '',
    activeClasses: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    value: 'critical',
    label: 'Critical',
    icon: '🔴',
    activeClasses: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  {
    value: 'warning',
    label: 'Warning',
    icon: '🟡',
    activeClasses: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    value: 'good',
    label: 'Good',
    icon: '🟢',
    activeClasses: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    value: 'excellent',
    label: 'Excellent',
    icon: '🔵',
    activeClasses: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
]

function getCount(breakdown: HealthBreakdown, value: FilterValue): number {
  if (value === 'all') {
    return breakdown.critical + breakdown.warning + breakdown.good + breakdown.excellent
  }
  return breakdown[value]
}

export default function HealthFilterPills({
  breakdown,
  activeFilter,
  onFilterChange,
}: HealthFilterPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PILL_CONFIG.map(pill => {
        const count = getCount(breakdown, pill.value)
        const isActive = activeFilter === pill.value
        const isEmpty = count === 0 && pill.value !== 'all'

        return (
          <button
            key={pill.value}
            onClick={() => onFilterChange(pill.value)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              border transition-all cursor-pointer
              ${isActive
                ? pill.activeClasses
                : isEmpty
                  ? 'bg-white/[0.03] text-gray-500 dark:text-gray-600 border-white/[0.05] opacity-50'
                  : 'bg-white/[0.05] text-muted border-white/[0.08] hover:bg-white/[0.08]'
              }
            `}
          >
            {pill.icon && <span className="text-[10px]">{pill.icon}</span>}
            <span>{pill.label}</span>
            <span className={`
              ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold
              ${isActive ? 'bg-white/10' : 'bg-white/[0.05]'}
            `}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
