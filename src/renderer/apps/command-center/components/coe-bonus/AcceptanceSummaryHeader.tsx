// V2 Header summary for the Acceptance Rate report, showing:
//   Candidate Acceptance (candidate grain) — the QTD headline goal,
//      the numerator-vs-denominator donut, a 4-way candidate split bar, and KPIs.
//   Position Outcomes (position grain) — total closed-position count
//      with won/lost/other breakdown.

import { useMemo } from 'react'
import { Users, Briefcase } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import type { ReportAcceptanceRateResultV2 } from '../../types/coeBonus'
import { KpiStat, SectionCard } from './BonusUi'
import { formatClosedDate } from './acceptanceStatus'
import CandidateAcceptanceHero from './CandidateAcceptanceHero'

/** Small pill labelling which grain a section reports on. */
function GrainBadge({ grain }: { grain: 'Candidates' | 'Positions' }) {
  const cls =
    grain === 'Candidates'
      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25'
      : 'bg-blue-500/15 text-blue-400 border-blue-500/25'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${cls}`}>
      {grain}
    </span>
  )
}

function SectionHeading({ icon: Icon, title, grain }: { icon: LucideIcon; title: string; grain: 'Candidates' | 'Positions' }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-4 h-4 text-slate-400" />
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      <GrainBadge grain={grain} />
    </div>
  )
}

/** Four-segment proportion bar: Approved / In-Progress / Rejected / Excluded. */
function CandidateSplitBar({ numerator, denominator, excluded, deduped }: {
  numerator: number
  denominator: number
  excluded: number
  deduped: number
}) {
  // denominator includes numerator, so "presented but not approved" = denominator - numerator
  const presentedOnly = denominator - numerator
  const total = denominator + excluded + deduped
  const segs = [
    { label: 'Approved', value: numerator, color: '#10b981' },
    { label: 'Presented (not approved)', value: presentedOnly, color: '#3b82f6' },
    { label: 'Excluded', value: excluded, color: '#64748b' },
    { label: 'Deduped', value: deduped, color: '#f59e0b' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {total > 0 ? (
          segs.filter(s => s.value > 0).map(s => (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          ))
        ) : (
          <div className="w-full" />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segs.filter(s => s.value > 0).map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-muted">{s.label}</span>
            <span className="text-xs font-mono text-primary">{s.value}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted">Excluded = statuses not genuinely presented · Deduped = same person across Acct+Stakeholder+Skill</p>
    </div>
  )
}

export default function AcceptanceSummaryHeader({ data, isAdjusted = false, scopeLabel }: { data: ReportAcceptanceRateResultV2; isAdjusted?: boolean; scopeLabel?: string }) {
  const { summary, months } = data

  // Aggregate position status counts across all months for the donut
  const { wonTotal, lostTotal, otherTotal } = useMemo(() => {
    let won = 0, lost = 0, other = 0
    for (const m of months) {
      won += m.wonCount
      lost += m.lostCount
      other += m.otherCount
    }
    return { wonTotal: won, lostTotal: lost, otherTotal: other }
  }, [months])

  const donutOption = useMemo<EChartsOption>(() => {
    const denomOnly = summary.totalDenominator - summary.totalNumerator
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['58%', '82%'],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          data: [
            { name: 'Approved', value: summary.totalNumerator, itemStyle: { color: '#10b981' } },
            { name: 'Presented (not approved)', value: denomOnly, itemStyle: { color: '#3b82f6' } },
          ],
        },
      ],
    }
  }, [summary.totalNumerator, summary.totalDenominator])

  return (
    <div className="space-y-6">
      {/* Candidate Acceptance — the goal (candidate grain) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <SectionHeading icon={Users} title="Candidate Acceptance" grain="Candidates" />
          {isAdjusted && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
              adjusted
            </span>
          )}
        </div>

        <CandidateAcceptanceHero summary={summary} />

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Approved vs. Presented" subtitle="Decision split (QTD, after dedup)">
            {summary.totalDenominator > 0 ? (
              <EChart option={donutOption} height={200} />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted">
                No decisions in this scope
              </div>
            )}
          </SectionCard>

          <SectionCard title="Candidate Split" subtitle="Approved / Presented / Excluded / Deduped">
            <CandidateSplitBar
              numerator={summary.totalNumerator}
              denominator={summary.totalDenominator}
              excluded={summary.totalExcluded}
              deduped={summary.totalDeduped}
            />
          </SectionCard>

          <SectionCard title={`${scopeLabel ?? 'Quarter'} Totals`} subtitle={`Across ${scopeLabel ? 'selected month' : 'all months in scope'}`}>
            <div className="space-y-3">
              <KpiStat
                label="Closed Positions"
                value={String(summary.totalPositions)}
                hint={`${wonTotal} won · ${lostTotal} lost · ${otherTotal} other`}
                accentClass="text-blue-500"
              />
            </div>
          </SectionCard>
        </div>
      </section>

      <div className="space-y-1 text-xs text-muted">
        {summary.lastSyncedAt && (
          <p>Open positions last synced {formatClosedDate(summary.lastSyncedAt)}.</p>
        )}
      </div>
    </div>
  )
}
