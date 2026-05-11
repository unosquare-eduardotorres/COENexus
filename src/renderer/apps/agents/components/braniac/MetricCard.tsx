import type { ReactNode } from 'react'
import { formatPercent, formatDays, formatCount, formatRate } from './profileUtils'

export type MetricFormat = 'percent' | 'days' | 'count' | 'currency' | 'text'

interface MetricCardProps {
  label: string
  value: number | string | null | undefined
  format?: MetricFormat
  icon?: ReactNode
  tooltip?: string
  accent?: 'blue' | 'green' | 'red' | 'violet' | 'neutral'
}

function formatValue(value: number | string | null | undefined, format: MetricFormat): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  switch (format) {
    case 'percent':
      return formatPercent(value)
    case 'days':
      return formatDays(value)
    case 'count':
      return formatCount(value)
    case 'currency':
      return formatRate(value)
    default:
      return String(value)
  }
}

function accentTone(accent: MetricCardProps['accent']): string {
  switch (accent) {
    case 'green':
      return 'text-green-600 dark:text-green-400'
    case 'red':
      return 'text-red-600 dark:text-red-400'
    case 'blue':
      return 'text-blue-600 dark:text-blue-400'
    case 'violet':
      return 'text-violet-600 dark:text-violet-400'
    default:
      return 'text-primary'
  }
}

export default function MetricCard({
  label,
  value,
  format = 'count',
  icon,
  tooltip,
  accent = 'neutral',
}: MetricCardProps) {
  const formatted = formatValue(value, format)
  const isEmpty = formatted === '—'

  return (
    <div
      className="glass-panel-subtle rounded-lg p-2.5 space-y-1"
      title={tooltip}
    >
      <div className="flex items-center gap-1 text-[10px] text-muted uppercase tracking-wide">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-base font-semibold ${isEmpty ? 'text-muted' : accentTone(accent)}`}>
        {formatted}
      </p>
    </div>
  )
}
