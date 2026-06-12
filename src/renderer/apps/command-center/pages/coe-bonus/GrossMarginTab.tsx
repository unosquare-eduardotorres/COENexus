import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import { COE_BONUS_PALETTE, STATUS_COLORS } from '../../../../components/charts/coeBonusEchartsTheme'
import { useCoeBonusContext } from '../CoeBonusPage'
import { useCoeBonusData } from '../../hooks/useCoeBonusData'
import { coeBonusService } from '../../services/coeBonusService'
import { KpiStat, SectionCard, TabError, TabLoading } from '../../components/coe-bonus/BonusUi'
import MeasureGauge from '../../components/coe-bonus/MeasureGauge'
import StatusPill from '../../components/coe-bonus/StatusPill'

export default function GrossMarginTab() {
  const { filters } = useCoeBonusContext()
  const { data, loading, error } = useCoeBonusData(coeBonusService.getGrossMargin, filters)

  // Ratchet chart: floor as a stepped area that only ever climbs, the 5-point
  // window top, and the actual margin per quarter.
  const ratchetOption = useMemo<EChartsOption>(() => {
    if (!data) return {}
    const periods = data.floorSteps.map(s => s.period)
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
      legend: { bottom: 0 },
      grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: periods },
      yAxis: { type: 'value', scale: true, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: 'Window Top (+5pt)',
          type: 'line',
          step: 'end',
          symbol: 'none',
          lineStyle: { type: 'dashed', color: STATUS_COLORS['at-risk'] },
          data: data.floorSteps.map(s => s.windowTop),
        },
        {
          name: 'Floor (ratchet)',
          type: 'line',
          step: 'end',
          symbol: 'none',
          areaStyle: { color: 'rgba(148,163,184,0.15)' },
          lineStyle: { color: '#94a3b8' },
          data: data.floorSteps.map(s => s.floor),
        },
        {
          name: 'Actual Margin',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3, color: COE_BONUS_PALETTE[0] },
          itemStyle: { color: COE_BONUS_PALETTE[0] },
          data: data.floorSteps.map(s => s.actual),
        },
      ],
    }
  }, [data])

  if (loading && !data) return <TabLoading label="Loading gross margin…" />
  if (error) return <TabError message={error} />
  if (!data) return null

  const s = data.summary
  const current = data.floorSteps[data.floorSteps.length - 1]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStat label="Actual Margin" value={`${s.achievement}%`} accentClass={s.status === 'on-track' ? 'text-emerald-500' : 'text-amber-500'} />
        <KpiStat label="Current Floor" value={`${current.floor}%`} hint="Never decreases" />
        <KpiStat label="Window Top" value={`${current.windowTop}%`} hint="Floor + 5 points" />
        <KpiStat label="Earned" value={`${Math.round(s.attainment * 100)}%`} hint="of this measure" accentClass="text-blue-500" />
      </div>

      <SectionCard
        title="Ratcheting Floor"
        subtitle="The floor steps up whenever a quarter beats it — and never steps back down"
        action={<StatusPill status={s.status} />}
      >
        <EChart option={ratchetOption} height={320} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="This Quarter's Window" className="lg:col-span-1">
          <MeasureGauge
            value={s.achievement}
            goal={current.windowTop}
            min={current.floor - 4}
            max={current.windowTop + 4}
            status={s.status}
            height={200}
          />
          <p className="text-center text-xs text-muted -mt-2">
            Scored on the {current.floor}% → {current.windowTop}% window
          </p>
        </SectionCard>

        <SectionCard title="Quarterly Floor & Actuals" subtitle="How the ratchet has moved" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b minimal-divider">
                  <th className="py-2 pr-4 font-semibold">Quarter</th>
                  <th className="py-2 pr-4 font-semibold text-right">Floor</th>
                  <th className="py-2 pr-4 font-semibold text-right">Window Top</th>
                  <th className="py-2 font-semibold text-right">Actual</th>
                </tr>
              </thead>
              <tbody>
                {data.floorSteps.map(step => (
                  <tr key={step.period} className="border-b minimal-divider last:border-0">
                    <td className="py-2 pr-4 text-primary">{step.period}</td>
                    <td className="py-2 pr-4 text-right text-secondary">{step.floor}%</td>
                    <td className="py-2 pr-4 text-right text-secondary">{step.windowTop}%</td>
                    <td className={`py-2 text-right font-semibold ${step.actual >= step.floor ? 'text-emerald-500' : 'text-red-500'}`}>
                      {step.actual}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
