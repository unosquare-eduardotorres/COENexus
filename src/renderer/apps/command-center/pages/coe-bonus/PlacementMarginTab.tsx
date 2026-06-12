import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import { STATUS_COLORS } from '../../../../components/charts/coeBonusEchartsTheme'
import { useCoeBonusContext } from '../CoeBonusPage'
import { useCoeBonusData } from '../../hooks/useCoeBonusData'
import { coeBonusService } from '../../services/coeBonusService'
import { KpiStat, SectionCard, TabError, TabLoading } from '../../components/coe-bonus/BonusUi'
import MeasureGauge from '../../components/coe-bonus/MeasureGauge'
import LinearScaleStrip from '../../components/coe-bonus/LinearScaleStrip'
import StatusPill from '../../components/coe-bonus/StatusPill'

function money(n: number): string {
  return `$${(n / 1000).toFixed(0)}k`
}

export default function PlacementMarginTab() {
  const { filters } = useCoeBonusContext()
  const { data, loading, error } = useCoeBonusData(coeBonusService.getPlacementMargin, filters)

  const trendOption = useMemo<EChartsOption>(() => {
    if (!data) return {}
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
      grid: { left: 8, right: 16, top: 16, bottom: 24, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: data.trend.map(t => t.period) },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' }, scale: true },
      series: [
        {
          name: 'Placement Margin',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          areaStyle: { opacity: 0.12 },
          data: data.trend.map(t => t.value),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: STATUS_COLORS['at-risk'], type: 'dashed' },
            data: [{ yAxis: data.summary.goal, label: { formatter: `Goal ${data.summary.goal}%` } }],
          },
        },
      ],
    }
  }, [data])

  if (loading && !data) return <TabLoading label="Loading placement margin…" />
  if (error) return <TabError message={error} />
  if (!data) return null

  const s = data.summary

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStat label="Achievement" value={`${s.achievement}%`} hint={`${s.status === 'on-track' ? 'Meets' : 'Below'} target`} accentClass={s.status === 'on-track' ? 'text-emerald-500' : 'text-amber-500'} />
        <KpiStat label="Goal" value={`${s.goal}%`} hint={`Floor ${s.floor}% → Target ${s.target}%`} />
        <KpiStat label="Weight" value={`${Math.round(s.weight * 100)}%`} hint="of total bonus" />
        <KpiStat label="Earned" value={`${Math.round(s.attainment * 100)}%`} hint="of this measure" accentClass="text-blue-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Achievement vs. Goal" action={<StatusPill status={s.status} />}>
          <MeasureGauge value={s.achievement} goal={s.goal} min={s.floor - 8} max={s.target + 8} status={s.status} height={200} />
        </SectionCard>

        <SectionCard title="Linear Bonus Scale" subtitle="50% floor → 55% target (5-point gap)" className="lg:col-span-2">
          <div className="flex items-center h-full pt-6">
            <LinearScaleStrip floor={s.floor} target={s.target} achievement={s.achievement} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Margin Trend" subtitle="Quarterly placement margin vs. goal">
        <EChart option={trendOption} height={280} />
      </SectionCard>

      <SectionCard title="Account Breakdown" subtitle="Placement margin contribution by account">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b minimal-divider">
                <th className="py-2 pr-4 font-semibold">Account</th>
                <th className="py-2 pr-4 font-semibold text-right">Placements</th>
                <th className="py-2 pr-4 font-semibold text-right">Revenue</th>
                <th className="py-2 pr-4 font-semibold text-right">Cost</th>
                <th className="py-2 font-semibold text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map(row => (
                <tr key={row.account} className="border-b minimal-divider last:border-0">
                  <td className="py-2 pr-4 text-primary">{row.account}</td>
                  <td className="py-2 pr-4 text-right text-secondary">{row.placements}</td>
                  <td className="py-2 pr-4 text-right text-secondary">{money(row.revenue)}</td>
                  <td className="py-2 pr-4 text-right text-secondary">{money(row.cost)}</td>
                  <td className={`py-2 text-right font-semibold ${row.marginPct >= s.goal ? 'text-emerald-500' : row.marginPct >= s.floor ? 'text-amber-500' : 'text-red-500'}`}>
                    {row.marginPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
