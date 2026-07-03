import type { MeasureStatus } from '../../types/coeBonus'

const CONFIG: Record<MeasureStatus, { label: string; classes: string; dot: string }> = {
  'on-track': {
    label: 'On Track',
    classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  'at-risk': {
    label: 'At Risk',
    classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  missed: {
    label: 'Missed',
    classes: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    dot: 'bg-red-500',
  },
}

interface StatusPillProps {
  status: MeasureStatus
  className?: string
}

export default function StatusPill({ status, className = '' }: StatusPillProps) {
  const cfg = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${cfg.classes} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
