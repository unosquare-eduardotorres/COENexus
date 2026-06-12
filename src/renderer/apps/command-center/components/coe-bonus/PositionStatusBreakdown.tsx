// Position-grain status breakdown for the Acceptance Rate report.
//
// Driven by `summary.positionStatusCounts` (quarter-closed positions only). Rolls
// the raw upstream statuses into Won / Lost / Other, with the Lost bucket
// expanded into per-reason sub-rows, plus a compact horizontal stacked bar.

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import { STATUS_COLORS } from '../../../../components/charts/coeBonusEchartsTheme'
import type { AcceptanceRateSummary } from '../../types/coeBonus'
import { humanizeStatus, positionOutcomeFor } from './acceptanceStatus'

const OTHER_COLOR = '#64748b' // slate
const OUTCOME_COLOR = {
  won: STATUS_COLORS['on-track'],
  lost: STATUS_COLORS.missed,
  other: OTHER_COLOR,
} as const

function StatRow({
  label,
  count,
  dotColor,
  indent = false,
  bold = false,
}: {
  label: string
  count: number
  dotColor?: string
  indent?: boolean
  bold?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1 ${indent ? 'pl-5' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        {dotColor && (
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        )}
        <span className={`truncate ${bold ? 'text-sm font-semibold text-primary' : 'text-xs text-muted'}`}>
          {label}
        </span>
      </div>
      <span className={`font-mono shrink-0 ${bold ? 'text-sm font-semibold text-primary' : 'text-xs text-muted'}`}>
        {count}
      </span>
    </div>
  )
}

export default function PositionStatusBreakdown({ summary }: { summary: AcceptanceRateSummary }) {
  const { wonCount, lostReasons, lostTotal, otherCount, total } = useMemo(() => {
    const entries = Object.entries(summary.positionStatusCounts)
    let won = 0
    let other = 0
    const lost: Array<[string, number]> = []
    for (const [status, count] of entries) {
      const kind = positionOutcomeFor(status)
      if (kind === 'won') won += count
      else if (kind === 'other') other += count
      else lost.push([status, count])
    }
    lost.sort((a, b) => b[1] - a[1])
    const lostSum = lost.reduce((acc, [, c]) => acc + c, 0)
    return {
      wonCount: won,
      lostReasons: lost,
      lostTotal: lostSum,
      otherCount: other,
      total: won + lostSum + other,
    }
  }, [summary.positionStatusCounts])

  const barOption = useMemo<EChartsOption>(() => {
    return {
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      tooltip: { trigger: 'item', formatter: '{a}: {c}' },
      xAxis: { type: 'value', max: total || 1, show: false },
      yAxis: { type: 'category', data: [''], show: false },
      series: [
        { name: 'Won', type: 'bar', stack: 'x', barWidth: 18, data: [wonCount], itemStyle: { color: OUTCOME_COLOR.won } },
        { name: 'Lost', type: 'bar', stack: 'x', barWidth: 18, data: [lostTotal], itemStyle: { color: OUTCOME_COLOR.lost } },
        { name: 'Other', type: 'bar', stack: 'x', barWidth: 18, data: [otherCount], itemStyle: { color: OUTCOME_COLOR.other } },
      ],
    }
  }, [wonCount, lostTotal, otherCount, total])

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[120px] text-sm text-muted">
        No closed positions in this scope
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <EChart option={barOption} height={26} />

      <div className="divide-y divide-white/5">
        <StatRow label="Closed Won" count={wonCount} dotColor={OUTCOME_COLOR.won} bold />

        <div className="py-1">
          <StatRow label="Closed Lost" count={lostTotal} dotColor={OUTCOME_COLOR.lost} bold />
          {lostReasons.map(([status, count]) => (
            <StatRow key={status} label={humanizeStatus(status)} count={count} indent />
          ))}
        </div>

        <StatRow label="Other (generic Closed)" count={otherCount} dotColor={OUTCOME_COLOR.other} bold />
      </div>
    </div>
  )
}
