// UI helpers for the Acceptance Rate report: display formatting and
// bucket-aligned chip/card styling. The status taxonomy itself is single-sourced
// in src/shared/acceptanceTaxonomy.ts and re-exported here for convenience.

import type { AcceptanceBucket, MeasureStatus } from '../../types/coeBonus'

export { bucketForStatus } from '../../../../../shared/acceptanceTaxonomy'

// Candidate acceptance goal (single UI source). The 5-point linear scale runs
// from the floor (0% attainment) to the target (100% attainment).
export const ACCEPTANCE_FLOOR = 28
export const ACCEPTANCE_TARGET = 33

/** Map an acceptance rate (%) to a measure status against the goal. */
export function acceptanceStatusFor(rate: number): MeasureStatus {
  if (rate >= ACCEPTANCE_TARGET) return 'on-track'
  if (rate >= ACCEPTANCE_FLOOR) return 'at-risk'
  return 'missed'
}

// Position-grain outcome, mirroring acceptanceRateService.buildPositionOutcome:
// ClosedWon -> won; ClosedLost*/ClosedModified* -> lost; everything else -> other.
export type PositionOutcomeKind = 'won' | 'lost' | 'other'

export function positionOutcomeFor(status: string): PositionOutcomeKind {
  if (status === 'ClosedWon') return 'won'
  if (status.startsWith('ClosedLost') || status.startsWith('ClosedModified')) return 'lost'
  return 'other'
}

/** Border + text + subtle background chip classes per position outcome. */
export const POSITION_OUTCOME_CHIP: Record<PositionOutcomeKind, string> = {
  won: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  lost: 'bg-red-500/15 text-red-400 border-red-500/25',
  other: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
}

/** Solid-ish background classes for the row's left accent bar, per outcome. */
export const POSITION_OUTCOME_ACCENT: Record<PositionOutcomeKind, string> = {
  won: 'bg-emerald-500/70',
  lost: 'bg-red-500/70',
  other: 'bg-slate-500/50',
}

/** "RejectedByClientSuccess" -> "Rejected By Client Success". */
export function humanizeStatus(status: string): string {
  return status.replace(/([A-Z])/g, ' $1').trim()
}

export const BUCKET_LABEL: Record<AcceptanceBucket, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  declined: 'Declined',
  unresolved: 'Unresolved',
}

/** Border + text + subtle background chip classes per bucket. */
export const BUCKET_CHIP: Record<AcceptanceBucket, string> = {
  approved: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/25',
  declined: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  unresolved: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
}

export function formatClosedDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
