import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import { COE_BONUS_PALETTE, STATUS_COLORS } from '../../../../components/charts/coeBonusEchartsTheme'
import { useCoeBonusContext } from '../CoeBonusPage'
import { useCoeBonusData } from '../../hooks/useCoeBonusData'
import { coeBonusService } from '../../services/coeBonusService'
import { SectionCard, TabError, TabLoading } from '../../components/coe-bonus/BonusUi'
import MeasureGauge from '../../components/coe-bonus/MeasureGauge'
import StatusPill from '../../components/coe-bonus/StatusPill'
import type { MeasureSummary } from '../../types/coeBonus'

function OverallGauge({ attainment }: { attainment: number }) {
  const pct = Math.round(attainment * 100)
  const status = pct >= 85 ? 'on-track' : pct >= 40 ? 'at-risk' : 'missed'
  return <MeasureGauge value={pct} goal={100} status={status} label="Bonus Attainment" height={260} />
}

function MeasureCard({ m }: { m: MeasureSummary }) {
  return (
    <SectionCard
      title={m.label}
      action={<StatusPill status={m.status} />}
    >
      <MeasureGauge
        value={m.achievement}
        goal={m.goal}
        min={Math.max(0, m.floor - 8)}
        max={m.target + 8}
        status={m.status}
        height={180}
      />
      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-muted">Goal {m.goal}{m.unit} · Weight {Math.round(m.weight * 100)}%</span>
        <span className="font-semibold text-primary">{Math.round(m.attainment * 100)}% earned</span>
      </div>
    </SectionCard>
  )
}

export default function OverviewTab() {
  const { filters } = useCoeBonusContext()
  const { data, loading, error } = useCoeBonusData(coeBonusService.getOverview, filters)

  const contributionOption = useMemo<EChartsOption>(() => {
    if (!data) return {}
    const measures = data.measures
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number }) =>
          `${p.name}<br/>Contribution: <b>${p.value}%</b> of 25%`,
      },
      grid: { left: 8, right: 16, top: 10, bottom: 10, containLabel: true },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category', data: measures.map(m => m.shortLabel).reverse() },
      series: [
        {
          type: 'bar',
          barWidth: 18,
          data: measures
            .map((m, i) => ({
              value: Math.round((m.attainment) * 100),
              itemStyle: { color: COE_BONUS_PALETTE[i], borderRadius: [0, 6, 6, 0] },
            }))
            .reverse(),
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%',
            color: 'inherit',
            fontSize: 11,
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: STATUS_COLORS['at-risk'], type: 'dashed' },
            data: [{ xAxis: 100, label: { formatter: 'Full', color: STATUS_COLORS['at-risk'] } }],
          },
        },
      ],
    }
  }, [data])

  const trendOption = useMemo<EChartsOption>(() => {
    if (!data) return {}
    const periods = data.trend.map(t => t.period)
    const mk = (name: string, key: keyof (typeof data.trend)[number]) => ({
      name,
      type: 'line' as const,
      smooth: true,
      symbolSize: 6,
      data: data.trend.map(t => t[key] as number),
    })
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
      legend: { bottom: 0 },
      grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: periods },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        mk('Placement', 'placementMargin'),
        mk('Gross Margin', 'grossMargin'),
        mk('Fill Rate', 'fillRate'),
        mk('Acceptance', 'acceptanceRate'),
      ],
    }
  }, [data])

  if (loading && !data) return <TabLoading label="Loading bonus overview…" />
  if (error) return <TabError message={error} />
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Hero + contribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Overall Bonus Attainment"
          subtitle={`${filters.quarter} ${filters.year}`}
          className="lg:col-span-1"
        >
          <OverallGauge attainment={data.overallAttainment} />
          <p className="text-center text-xs text-muted -mt-2">
            Weighted across all four measures (25% each)
          </p>
        </SectionCard>

        <SectionCard
          title="Contribution to Bonus"
          subtitle="Per-measure attainment of its 25% weight"
          className="lg:col-span-2"
        >
          <EChart option={contributionOption} height={220} />
        </SectionCard>
      </div>

      {/* 4-up measure grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.measures.map(m => (
          <MeasureCard key={m.key} m={m} />
        ))}
      </div>

      {/* QoQ trend */}
      <SectionCard
        title="Quarter-over-Quarter Attainment"
        subtitle="Each measure's earned percentage over the trailing quarters"
      >
        <EChart option={trendOption} height={300} />
      </SectionCard>
    </div>
  )
}
