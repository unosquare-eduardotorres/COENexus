// Acceptance Rate report — a real operational view of Approved vs Rejected
// candidates per Closed position, with a status-count header and a won/lost
// grouped, expandable per-position list (list view is the default).

import { useState } from 'react'
import { useCoeBonusContext } from '../CoeBonusPage'
import { useCoeBonusData } from '../../hooks/useCoeBonusData'
import { coeBonusService } from '../../services/coeBonusService'
import { SectionCard, TabError, TabLoading } from '../../components/coe-bonus/BonusUi'
import AcceptanceSummaryHeader from '../../components/coe-bonus/AcceptanceSummaryHeader'
import PositionOutcomeRow from '../../components/coe-bonus/PositionOutcomeRow'
import type { PositionOutcome } from '../../types/coeBonus'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 text-muted transition-transform ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
    </svg>
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
  positions: PositionOutcome[]
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

export default function AcceptanceRateTab() {
  const { filters } = useCoeBonusContext()
  const { data, loading, error } = useCoeBonusData(coeBonusService.getAcceptanceRate, filters)

  if (loading && !data) return <TabLoading label="Loading acceptance rate…" />
  if (error) return <TabError message={error} />
  if (!data) return null

  return (
    <div className="space-y-4">
      <AcceptanceSummaryHeader summary={data.summary} />

      <OutcomeGroup
        title="Closed Won"
        subtitle="Positions with a Won status"
        positions={data.groups.won}
        badgeClass="bg-emerald-500/15 text-emerald-500 border-emerald-500/25"
      />
      <OutcomeGroup
        title="Closed Lost"
        subtitle="Positions with a Lost or modified-requirements status"
        positions={data.groups.lost}
        badgeClass="bg-red-500/15 text-red-400 border-red-500/25"
      />
      <OutcomeGroup
        title="Other Closures"
        subtitle="Generic Closed with no Won/Lost reason"
        positions={data.groups.noDecision}
        badgeClass="bg-slate-500/15 text-slate-400 border-slate-500/25"
        defaultOpen={false}
      />
      <OutcomeGroup
        title="Unknown / Undated"
        subtitle="Absence-detected closures with no authoritative upstream close date — excluded from quarterly totals"
        positions={data.groups.undated}
        badgeClass="bg-slate-500/15 text-slate-400 border-slate-500/25"
        defaultOpen={false}
      />
    </div>
  )
}
