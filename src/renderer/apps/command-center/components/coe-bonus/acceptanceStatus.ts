// UI helpers for the Acceptance Rate V2 report: display formatting and
// disposition-aligned chip/card styling. The status taxonomy itself is single-sourced
// in src/shared/acceptanceTaxonomy.ts and re-exported here for convenience.

import type { MeasureStatus } from '../../types/coeBonus'
import type { ReportCandidateAudit } from '../../types/coeBonus'

// Re-export V2 classification for UI consumers
export { classifyCandidate, exclusionReason } from '../../../../../shared/acceptanceTaxonomy'

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

// ── V2 Disposition types ─────────────────────────────────────────────────────

export type CandidateDispositionKind = ReportCandidateAudit['disposition']

/** Display label per disposition. */
export const DISPOSITION_LABEL: Record<CandidateDispositionKind, string> = {
  numerator: 'Counted in numerator + denominator',
  denominator: 'Counted in denominator only',
  excluded: 'Excluded',
  'dedup-skipped': 'Deduped',
}

/** Badge chip classes per disposition. */
export const DISPOSITION_CHIP: Record<CandidateDispositionKind, string> = {
  numerator: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  denominator: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  excluded: 'bg-slate-500/15 text-slate-400/50 border-slate-500/25',
  'dedup-skipped': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

/** Card background style per disposition. */
export const DISPOSITION_CARD_STYLE: Record<CandidateDispositionKind, string> = {
  numerator: 'bg-emerald-500/10 border border-emerald-500/20',
  denominator: 'bg-blue-500/10 border border-blue-500/20',
  excluded: 'glass-panel-subtle opacity-50',
  'dedup-skipped': 'bg-amber-500/10 border border-amber-500/20',
}

/** Disposition icon prefix. */
export const DISPOSITION_ICON: Record<CandidateDispositionKind, string> = {
  numerator: '✓',
  denominator: '✓',
  excluded: '✗',
  'dedup-skipped': '⊘',
}

export function formatClosedDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format a month string (YYYY-MM) to a readable label (e.g. "Apr 2025"). */
export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const idx = parseInt(month, 10) - 1
  return `${monthNames[idx] ?? month} ${year}`
}

/** Short month label (e.g. "Apr", "May", "Jun"). */
export function shortMonth(monthStr: string): string {
  const month = monthStr.split('-')[1]
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const idx = parseInt(month, 10) - 1
  return monthNames[idx] ?? month
}
