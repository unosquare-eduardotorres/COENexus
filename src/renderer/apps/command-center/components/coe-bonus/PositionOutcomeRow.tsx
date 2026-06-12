// Compact, expandable row for one Closed position. Collapsed leads with
// #ID · main skill · client · role, a color-coded outcome badge, and a compact
// accept/reject mini-bar. Expanded: inline candidate breakdown.

import { useState } from 'react'
import type { PositionOutcome } from '../../types/coeBonus'
import {
  formatClosedDate,
  humanizeStatus,
  positionOutcomeFor,
  POSITION_OUTCOME_ACCENT,
  POSITION_OUTCOME_CHIP,
} from './acceptanceStatus'
import AcceptanceMini from './AcceptanceMini'
import CandidateOutcomeBreakdown from './CandidateOutcomeBreakdown'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 shrink-0 text-muted transition-transform ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
    </svg>
  )
}

export default function PositionOutcomeRow({ position }: { position: PositionOutcome }) {
  const [open, setOpen] = useState(false)
  const outcome = positionOutcomeFor(position.positionStatus)

  return (
    <div className="glass-panel-subtle rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-stretch text-left hover:bg-gray-50 dark:hover:bg-dark-hover/40 transition-colors"
      >
        {/* Outcome accent bar */}
        <div className={`w-1 shrink-0 ${POSITION_OUTCOME_ACCENT[outcome]}`} aria-hidden="true" />
        <div className="flex items-center gap-3 px-3 py-2.5 min-w-0 flex-1">
          <Chevron open={open} />
          <div className="min-w-0 flex-1">
            {/* Primary: #ID · main skill · client · role */}
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="shrink-0 px-1 py-0.5 rounded font-mono text-[10px] text-secondary bg-slate-500/10 border border-slate-500/20">
                #{position.upstreamId}
              </span>
              <span className="shrink-0 text-xs font-semibold text-primary">{position.mainSkill || '—'}</span>
              <span className="shrink-0 text-[11px] text-secondary truncate max-w-[40%]">{position.account}</span>
              <span className="text-[11px] text-muted truncate">{position.jobTitle || 'Untitled position'}</span>
            </div>
            {/* Meta: COE · practice (only if differs) · closed date */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-muted">
              {position.coe && <span>{position.coe}</span>}
              {position.practice && position.practice !== position.coe && <span>· {position.practice}</span>}
              <span>· {formatClosedDate(position.closedDate)}</span>
            </div>
          </div>
          {/* Fixed-width right rail: mini-bar │ status — column-aligned across rows */}
          <div className="flex items-center shrink-0">
            <div className="w-px self-stretch bg-slate-500/15" aria-hidden="true" />
            <div className="w-[132px] flex justify-start px-3">
              <AcceptanceMini
                approved={position.approved}
                rejected={position.rejected}
                declined={position.declined}
                unresolved={position.unresolved}
              />
            </div>
            <div className="w-px self-stretch bg-slate-500/15" aria-hidden="true" />
            <div className="w-[200px] flex justify-end pl-3">
              {position.positionStatus && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${POSITION_OUTCOME_CHIP[outcome]}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {humanizeStatus(position.positionStatus)}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t minimal-divider">
          <CandidateOutcomeBreakdown candidates={position.candidates} />
        </div>
      )}
    </div>
  )
}
