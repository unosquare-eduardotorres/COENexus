// Acceptance Rate V2 tab: monthly cohort view with Paper Math Card + audit trail.
//
// Layout:
//   [CandidateAcceptanceHero — QTD headline]
//   [Month sub-tabs: Apr | May | Jun]
//   [AcceptanceMathCard — Paper Math for the selected month]
//   [OutcomeGroup: Won]
//   [OutcomeGroup: Lost]
//   [OutcomeGroup: Other]

import { useState, useMemo } from 'react'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { useCoeBonusContext } from '../CoeBonusPage'
import { useCoeBonusData } from '../../hooks/useCoeBonusData'
import { coeBonusService } from '../../services/coeBonusService'
import { SectionCard, TabLoading, TabError } from '../../components/coe-bonus/BonusUi'
import AcceptanceSummaryHeader from '../../components/coe-bonus/AcceptanceSummaryHeader'
import AcceptanceMathCard from '../../components/coe-bonus/AcceptanceMathCard'
import PositionOutcomeRow from '../../components/coe-bonus/PositionOutcomeRow'
import { shortMonth } from '../../components/coe-bonus/acceptanceStatus'
import type { ReportMonthBreakdown, ReportPositionOutcomeV2, ReportAcceptanceRateResultV2 } from '../../types/coeBonus'

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronRight
      className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
      aria-hidden="true"
    />
  )
}

function OutcomeGroup({
  title,
  subtitle,
  positions,
  badgeClass,
  defaultOpen = true,
}: {
  title: string
  subtitle: string
  positions: ReportPositionOutcomeV2[]
  badgeClass: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      action={
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-muted hover:text-primary transition-colors"
        >
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
            {positions.length}
          </span>
          <Chevron open={open} />
        </button>
      }
    >
      {open &&
        (positions.length === 0 ? (
          <p className="text-xs text-muted py-2">No positions in this group for the selected scope.</p>
        ) : (
          <div className="space-y-1.5">
            {positions.map(p => (
              <PositionOutcomeRow key={p.upstreamId} position={p} />
            ))}
          </div>
        ))}
    </SectionCard>
  )
}

function MonthSubTabs({
  months,
  activeIndex,
  onSelect,
}: {
  months: ReportMonthBreakdown[]
  activeIndex: number
  onSelect: (index: number) => void
}) {
  return (
    <div className="flex items-center gap-1 glass-panel-subtle rounded-lg p-1 w-fit">
      {months.map((m, i) => {
        const active = i === activeIndex
        return (
          <button
            key={m.month}
            type="button"
            onClick={() => onSelect(i)}
            className={`
              px-4 py-1.5 rounded-md text-xs font-medium transition-colors
              ${active
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-muted hover:text-primary hover:bg-white/5'
              }
            `}
          >
            <span className="font-semibold">{shortMonth(m.month)}</span>
            <span className="ml-1.5 font-mono text-[10px] opacity-70">{(m as MonthWithAdjustment).adjusted ? (m as MonthWithAdjustment).adjusted!.rate : m.math.rate}%</span>
          </button>
        )
      })}
    </div>
  )
}

/** A month with optional adjustment overrides computed from denominator toggles. */
type MonthWithAdjustment = ReportMonthBreakdown & {
  adjusted?: {
    extraDenominator: number
    netDenominator: number
    rate: number
    qtd: {
      cumulativeNumerator: number
      cumulativeDenominator: number
      rate: number
    }
  }
}

function MonthView({
  breakdown,
  denominatorInclusions,
  onToggleInclusion,
  onIncludeAll,
  onExcludeAll,
}: {
  breakdown: MonthWithAdjustment
  denominatorInclusions: Set<string>
  onToggleInclusion: (status: string) => void
  onIncludeAll: () => void
  onExcludeAll: () => void
}) {
  // Partition positions by outcome
  const won = breakdown.positions.filter(p => p.outcome === 'won')
  const lost = breakdown.positions.filter(p => p.outcome === 'lost')
  const other = breakdown.positions.filter(p => p.outcome === 'no-decision')

  return (
    <div className="space-y-4">
      <AcceptanceMathCard
        breakdown={breakdown}
        adjusted={breakdown.adjusted}
        denominatorInclusions={denominatorInclusions}
        onToggleInclusion={onToggleInclusion}
        onIncludeAll={onIncludeAll}
        onExcludeAll={onExcludeAll}
      />

      <OutcomeGroup
        title="Closed Won"
        subtitle="Positions with a Won status"
        positions={won}
        badgeClass="bg-emerald-500/15 text-emerald-500 border-emerald-500/25"
      />
      <OutcomeGroup
        title="Closed Lost"
        subtitle="Positions with a Lost or modified-requirements status"
        positions={lost}
        badgeClass="bg-red-500/15 text-red-400 border-red-500/25"
      />
      <OutcomeGroup
        title="Other Closures"
        subtitle="Generic Closed with no Won/Lost reason"
        positions={other}
        badgeClass="bg-slate-500/15 text-slate-400 border-slate-500/25"
        defaultOpen={false}
      />
    </div>
  )
}

export default function AcceptanceRateTab() {
  const { filters } = useCoeBonusContext()
  const { data, loading, error } = useCoeBonusData(coeBonusService.getAcceptanceRate, filters)
  const [activeMonth, setActiveMonth] = useState(0)

  // ── Denominator inclusion toggles (what-if reconciliation) ──
  const [denominatorInclusions, setDenominatorInclusions] = useState<Set<string>>(new Set())

  const toggleInclusion = (status: string) => {
    setDenominatorInclusions(prev => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const includeAll = () => {
    if (!data) return
    const allStatuses = new Set<string>()
    for (const m of data.months) {
      for (const s of Object.keys(m.math.excludedByStatus)) allStatuses.add(s)
    }
    setDenominatorInclusions(allStatuses)
  }

  const excludeAll = () => setDenominatorInclusions(new Set())

  // ── Adjusted month + QTD calculations ──
  const { adjustedMonths, adjustedSummary } = useMemo(() => {
    if (!data) return { adjustedMonths: [] as MonthWithAdjustment[], adjustedSummary: undefined }

    const isAdjusted = denominatorInclusions.size > 0
    let cumNum = 0, cumDen = 0, totalExcluded = 0, totalDeduped = 0

    const months: MonthWithAdjustment[] = data.months.map(m => {
      const extra = Object.entries(m.math.excludedByStatus)
        .filter(([status]) => denominatorInclusions.has(status))
        .reduce((sum, [, count]) => sum + count, 0)

      const adjDenominator = m.math.netDenominator + extra
      const adjRate = adjDenominator > 0
        ? Math.round((m.math.netNumerator / adjDenominator) * 1000) / 10
        : 0

      cumNum += m.math.netNumerator
      cumDen += adjDenominator
      totalExcluded += m.math.excludedTotal - extra
      totalDeduped += m.math.dedupRemovedDenominator

      return {
        ...m,
        adjusted: isAdjusted ? {
          extraDenominator: extra,
          netDenominator: adjDenominator,
          rate: adjRate,
          qtd: {
            cumulativeNumerator: cumNum,
            cumulativeDenominator: cumDen,
            rate: cumDen > 0
              ? Math.round((cumNum / cumDen) * 1000) / 10
              : 0,
          },
        } : undefined,
      }
    })

    const adjSummary: ReportAcceptanceRateResultV2['summary'] | undefined = isAdjusted ? {
      ...data.summary,
      acceptanceRate: cumDen > 0 ? Math.round((cumNum / cumDen) * 1000) / 10 : 0,
      totalDenominator: cumDen,
      totalExcluded,
      totalDeduped,
    } : undefined

    return { adjustedMonths: months, adjustedSummary: adjSummary }
  }, [data, denominatorInclusions])

  if (loading && !data) return <TabLoading label="Loading acceptance rate…" />
  if (error) return <TabError message={error} />
  if (!data) return null

  const displayMonths = adjustedMonths.length > 0 ? adjustedMonths : data.months
  const displaySummary = adjustedSummary ?? data.summary
  const currentBreakdown = displayMonths[activeMonth] as MonthWithAdjustment | undefined

  return (
    <div className="space-y-4">
      <AcceptanceSummaryHeader
        data={{ ...data, summary: displaySummary }}
        isAdjusted={denominatorInclusions.size > 0}
      />

      {displayMonths.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Breakdown</span>
            <MonthSubTabs
              months={displayMonths}
              activeIndex={activeMonth}
              onSelect={setActiveMonth}
            />
          </div>

          {currentBreakdown && (
            <MonthView
              breakdown={currentBreakdown}
              denominatorInclusions={denominatorInclusions}
              onToggleInclusion={toggleInclusion}
              onIncludeAll={includeAll}
              onExcludeAll={excludeAll}
            />
          )}
        </>
      )}
    </div>
  )
}
