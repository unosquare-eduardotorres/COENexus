import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import { COE_BONUS_PALETTE } from '../../../../components/charts/coeBonusEchartsTheme'
import { useCoeBonusContext } from '../CoeBonusPage'
import { useCoeBonusData } from '../../hooks/useCoeBonusData'
import { coeBonusService } from '../../services/coeBonusService'
import { SectionCard, TabError, TabLoading } from '../../components/coe-bonus/BonusUi'
import MeasureGauge from '../../components/coe-bonus/MeasureGauge'
import StatusPill from '../../components/coe-bonus/StatusPill'

export default function FillRateTab() {
  const { filters } = useCoeBonusContext()
  const { data, loading, error } = useCoeBonusData(coeBonusService.getFillRate, filters)

  const groupedOption = useMemo<EChartsOption>(() => {
    if (!data) return {}
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
      legend: { bottom: 0, data: ['Fill Rate', 'Goal'] },
      grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
      xAxis: { type: 'category', data: data.roles.map(r => r.role) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: 'Fill Rate',
          type: 'bar',
          barWidth: 42,
          itemStyle: { borderRadius: [6, 6, 0, 0], color: COE_BONUS_PALETTE[0] },
          label: { show: true, position: 'top', formatter: '{c}%', color: 'inherit' },
          data: data.roles.map(r => r.fillRate),
        },
        {
          name: 'Goal',
          type: 'bar',
          barWidth: 42,
          itemStyle: { borderRadius: [6, 6, 0, 0], color: 'rgba(148,163,184,0.35)' },
          label: { show: true, position: 'top', formatter: '{c}%', color: 'inherit' },
          data: data.roles.map(r => r.goal),
        },
      ],
    }
  }, [data])

  const ttmOption = useMemo<EChartsOption>(() => {
    if (!data) return {}
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
      legend: { bottom: 0 },
      grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: data.ttm.map(t => t.period) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        { name: 'SWE', type: 'line', smooth: true, symbolSize: 6, data: data.ttm.map(t => t.swe) },
        { name: 'QE', type: 'line', smooth: true, symbolSize: 6, data: data.ttm.map(t => t.qe) },
      ],
    }
  }, [data])

  if (loading && !data) return <TabLoading label="Loading fill rate…" />
  if (error) return <TabError message={error} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {data.roles.map(r => (
          <SectionCard
            key={r.role}
            title={r.role}
            subtitle={`${r.filledPositions} filled of ${r.openPositions} open · TTM`}
            action={<StatusPill status={r.status} />}
          >
            <MeasureGauge value={r.fillRate} goal={r.goal} min={Math.max(0, r.goal - 30)} max={r.goal + 25} status={r.status} height={190} />
            <p className="text-center text-xs text-muted -mt-2">Goal {r.goal}%</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="SWE vs. QE Fill Rate" subtitle="Achievement against role-specific goals (60% / 70%)">
        <EChart option={groupedOption} height={280} />
      </SectionCard>

      <SectionCard title="Trailing-Twelve-Month Trend" subtitle="Rolling fill rate by role">
        <EChart option={ttmOption} height={280} />
      </SectionCard>

      <SectionCard title="Role Breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b minimal-divider">
                <th className="py-2 pr-4 font-semibold">Role</th>
                <th className="py-2 pr-4 font-semibold text-right">Open</th>
                <th className="py-2 pr-4 font-semibold text-right">Filled</th>
                <th className="py-2 pr-4 font-semibold text-right">Fill Rate</th>
                <th className="py-2 pr-4 font-semibold text-right">Goal</th>
                <th className="py-2 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.roles.map(r => (
                <tr key={r.role} className="border-b minimal-divider last:border-0">
                  <td className="py-2 pr-4 text-primary">{r.role}</td>
                  <td className="py-2 pr-4 text-right text-secondary">{r.openPositions}</td>
                  <td className="py-2 pr-4 text-right text-secondary">{r.filledPositions}</td>
                  <td className={`py-2 pr-4 text-right font-semibold ${r.fillRate >= r.goal ? 'text-emerald-500' : 'text-amber-500'}`}>{r.fillRate}%</td>
                  <td className="py-2 pr-4 text-right text-secondary">{r.goal}%</td>
                  <td className="py-2 text-right"><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
