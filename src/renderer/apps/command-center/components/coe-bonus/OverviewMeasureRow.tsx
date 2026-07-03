// Single row in the Overview calculator table.
// Shows measure name, editable weight/goal/floor, current value from lock or
// manual input, attainment, status, and bonus earned.

import StatusPill from './StatusPill'
import { computeAttainment } from '../../services/bonusConfigStorage'
import type { MeasureConfig, MeasureLock } from '../../types/bonusConfig'
import type { MeasureStatus } from '../../types/coeBonus'

interface OverviewMeasureRowProps {
  measureKey: string
  label: string
  config: MeasureConfig
  lock: MeasureLock | null
  bonusPool: number
  isManual?: boolean
  onConfigChange: (patch: Partial<MeasureConfig>) => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function InlineInput({
  value,
  onChange,
  suffix = '%',
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  suffix?: string
  className?: string
}) {
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-12 bg-transparent text-right text-sm font-medium text-primary border-b border-slate-600 focus:border-emerald-500 focus:outline-none py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-xs text-muted">{suffix}</span>
    </div>
  )
}

export default function OverviewMeasureRow({
  label,
  config: mc,
  lock,
  bonusPool,
  isManual = false,
  onConfigChange,
}: OverviewMeasureRowProps) {
  const achievement = lock?.achievement ?? mc.achievement ?? null
  const hasValue = achievement !== null && achievement !== undefined
  const attainment = hasValue ? computeAttainment(achievement, mc.goal, mc.floor) : 0
  const earned = hasValue ? bonusPool * (mc.weight / 100) * attainment : 0
  const status: MeasureStatus = hasValue
    ? (attainment >= 0.9 ? 'on-track' : attainment >= 0.5 ? 'at-risk' : 'missed')
    : 'missed'

  return (
    <tr className={`border-b minimal-divider last:border-0 ${!hasValue && !isManual ? 'opacity-40' : ''}`}>
      {/* Measure name */}
      <td className="py-3 pr-4">
        <div className="text-sm font-medium text-primary">{label}</div>
      </td>

      {/* Weight */}
      <td className="py-3 pr-4 text-right">
        <InlineInput value={mc.weight} onChange={v => onConfigChange({ weight: v })} />
      </td>

      {/* Goal */}
      <td className="py-3 pr-4 text-right">
        <InlineInput value={mc.goal} onChange={v => onConfigChange({ goal: v })} />
      </td>

      {/* Floor */}
      <td className="py-3 pr-4 text-right">
        <InlineInput value={mc.floor} onChange={v => onConfigChange({ floor: v })} />
      </td>

      {/* Current value */}
      <td className="py-3 pr-4 text-right">
        {isManual ? (
          <div>
            <InlineInput
              value={mc.achievement ?? 0}
              onChange={v => onConfigChange({ achievement: v })}
            />
            <div className="text-[10px] text-slate-500 mt-0.5">manual</div>
          </div>
        ) : hasValue ? (
          <div>
            <div className="text-sm font-semibold text-primary">{achievement.toFixed(1)}%</div>
            <div className="text-[10px] text-slate-500">{lock?.periodLabel}</div>
            {lock?.lockedAt && (
              <div className="text-[10px] text-slate-600">{relativeTime(lock.lockedAt)}</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500">Not locked</div>
        )}
      </td>

      {/* Attainment */}
      <td className="py-3 pr-4 text-right">
        {hasValue ? (
          <span className="text-sm font-semibold text-primary">{Math.round(attainment * 100)}%</span>
        ) : (
          <span className="text-xs text-slate-500">—</span>
        )}
      </td>

      {/* Status */}
      <td className="py-3 pr-4 text-right">
        {hasValue ? <StatusPill status={status} className="text-[9px]" /> : null}
      </td>

      {/* Bonus earned */}
      <td className="py-3 text-right">
        <span className={`text-sm font-semibold ${hasValue ? 'text-primary' : 'text-slate-500'}`}>
          ${Math.round(earned).toLocaleString()}
        </span>
      </td>
    </tr>
  )
}
