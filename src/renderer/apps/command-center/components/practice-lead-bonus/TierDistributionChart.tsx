// EChart stacked bar (placements per tier)

import EChart from '../../../../components/charts/EChart'
import type { PLBOverview } from '../../../../../shared/ipc-types'

interface TierDistributionChartProps {
  overview: PLBOverview
}

export function TierDistributionChart({ overview }: TierDistributionChartProps) {
  const { rows } = overview

  if (rows.length === 0) {
    return (
      <div className="glass-panel-subtle rounded-xl p-6 text-center">
        <p className="text-sm text-muted">No data to chart.</p>
      </div>
    )
  }

  // Collect unique tier labels from the first row that has them
  const tierLabels = rows[0]?.tierBreakdown?.map(t => t.tier) ?? []

  // Build series per tier
  const tierColors = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#64748b']
  const series = tierLabels.map((tierLabel, idx) => ({
    name: tierLabel,
    type: 'bar' as const,
    stack: 'placements',
    data: rows.map(r => {
      const tb = r.tierBreakdown?.find(t => t.tier === tierLabel)
      return tb?.placements ?? 0
    }),
    itemStyle: { color: tierColors[idx % tierColors.length] },
    barMaxWidth: 40,
  }))

  const option = {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
    },
    legend: {
      data: tierLabels,
      bottom: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: rows.map(r => r.practiceName),
      axisLabel: { color: '#94a3b8', fontSize: 11, rotate: rows.length > 6 ? 30 : 0 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series,
  }

  return (
    <div className="glass-panel-subtle rounded-xl p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
        Placements by Tier & Practice
      </h4>
      <EChart option={option} style={{ height: 280 }} />
    </div>
  )
}
