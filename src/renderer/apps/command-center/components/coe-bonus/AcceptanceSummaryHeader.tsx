// Header summary for the Acceptance Rate report, split into two clearly-labelled
// grain sections so the candidate-grain "goal" never gets confused with the
// position-grain outcomes:
//   ① Candidate Acceptance (candidate grain) — the headline goal, the
//      approved-vs-rejected donut, a 3-way candidate split, and status chips.
//   ② Position Outcomes (position grain) — closed-position KPI + status
//      breakdown (Won / Lost + reasons / Other).

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import type { AcceptanceRateSummary } from '../../types/coeBonus'
import { KpiStat, SectionCard } from './BonusUi'
import { BUCKET_CHIP, bucketForStatus, formatClosedDate, humanizeStatus } from './acceptanceStatus'
import CandidateAcceptanceHero from './CandidateAcceptanceHero'
import PositionStatusBreakdown from './PositionStatusBreakdown'

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

function SectionHeading({ index, title, grain }: { index: string; title: string; grain: 'Candidates' | 'Positions' }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-mono text-muted">{index}</span>
      <h2 className="text-sm font-semibold text-primary">{title}</h2>
      <GrainBadge grain={grain} />
    </div>
  )
}

/** Three-segment proportion bar: Approved / Rejected / Inconclusive. */
function CandidateSplitBar({ approved, rejected, inconclusive }: { approved: number; rejected: number; inconclusive: number }) {
  const total = approved + rejected + inconclusive
  const segs = [
    { label: 'Approved', value: approved, color: '#10b981' },
    { label: 'Rejected', value: rejected, color: '#ef4444' },
    { label: 'Inconclusive', value: inconclusive, color: '#64748b' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {total > 0 ? (
          segs.map(s => (
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
        {segs.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-muted">{s.label}</span>
            <span className="text-xs font-mono text-primary">{s.value}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted">Inconclusive = declined + unresolved (excluded from the rate)</p>
    </div>
  )
}

export default function AcceptanceSummaryHeader({ summary }: { summary: AcceptanceRateSummary }) {
  const donutOption = useMemo<EChartsOption>(() => {
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
            { name: 'Approved', value: summary.approved, itemStyle: { color: '#10b981' } },
            { name: 'Rejected', value: summary.rejected, itemStyle: { color: '#ef4444' } },
          ],
        },
      ],
    }
  }, [summary.approved, summary.rejected])

  // Chips ordered by bucket (approved → rejected → unresolved → declined), then count desc.
  const bucketOrder = { approved: 0, rejected: 1, unresolved: 2, declined: 3 } as const
  const statusChips = Object.entries(summary.byStatus).sort((a, b) => {
    const ba = bucketForStatus(a[0])
    const bb = bucketForStatus(b[0])
    if (bucketOrder[ba] !== bucketOrder[bb]) return bucketOrder[ba] - bucketOrder[bb]
    return b[1] - a[1]
  })

  const inconclusive = summary.declined + summary.unresolvedTotal

  return (
    <div className="space-y-6">
      {/* ① Candidate Acceptance — the goal (candidate grain) */}
      <section className="space-y-4">
        <SectionHeading index="①" title="Candidate Acceptance" grain="Candidates" />

        <CandidateAcceptanceHero summary={summary} />

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Approved vs. Rejected" subtitle="Decision split (excludes declined / unresolved)">
            {summary.approved + summary.rejected > 0 ? (
              <EChart option={donutOption} height={200} />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted">
                No decisions in this scope
              </div>
            )}
          </SectionCard>

          <SectionCard title="Candidate Split" subtitle="Approved / Rejected / Inconclusive">
            <CandidateSplitBar approved={summary.approved} rejected={summary.rejected} inconclusive={inconclusive} />
            <div className="mt-4">
              <KpiStat
                label="Candidates Evaluated"
                value={String(summary.candidatesEvaluated)}
                hint="across closed positions in scope"
              />
            </div>
          </SectionCard>

          <SectionCard title="Candidate Status Breakdown" subtitle="Every status and its count">
            {statusChips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {statusChips.map(([status, count]) => (
                  <span
                    key={status}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${BUCKET_CHIP[bucketForStatus(status)]}`}
                  >
                    {humanizeStatus(status)}
                    <span className="font-mono text-[11px] opacity-90">{count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-sm text-muted">
                No candidates in this scope
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      {/* ② Position Outcomes (position grain) */}
      <section className="space-y-4">
        <SectionHeading index="②" title="Position Outcomes" grain="Positions" />

        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Closed Positions" subtitle="Quarter-closed, in scope" className="lg:col-span-1">
            <KpiStat
              label="Closed Positions"
              value={String(summary.totalClosedPositions)}
              hint={`${summary.wonCount} won · ${summary.lostCount} lost · ${summary.noDecisionCount} other`}
              accentClass="text-blue-500"
            />
          </SectionCard>

          <SectionCard title="Position Status Breakdown" subtitle="Won · Lost (by reason) · Other" className="lg:col-span-2">
            <PositionStatusBreakdown summary={summary} />
          </SectionCard>
        </div>
      </section>

      <div className="space-y-1 text-xs text-muted">
        {summary.lastSyncedAt && (
          <p>Open positions last synced {formatClosedDate(summary.lastSyncedAt)}.</p>
        )}
        {summary.undatedCount > 0 && (
          <p className="text-amber-500/90">
            {summary.undatedCount} absence-detected closure{summary.undatedCount === 1 ? '' : 's'} with no
            authoritative upstream close date {summary.undatedCount === 1 ? 'is' : 'are'} excluded from quarterly
            totals — run a full position sync to backfill.
          </p>
        )}
      </div>
    </div>
  )
}
