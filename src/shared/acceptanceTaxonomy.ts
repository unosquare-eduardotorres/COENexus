// Single source of truth for the Acceptance Rate V2 status taxonomy.
// Imported by both the main-process service (acceptanceRateService) and the
// renderer UI helpers (acceptanceStatus) so the classification never drifts.
//
// V2 Taxonomy (real open_position_candidates.candidate_status values):
//
//   NUMERATOR (counted in both numerator AND denominator):
//     'Approved'
//
//   DENOMINATOR ONLY (genuinely presented, client decided):
//     'PresentedToClient', 'CustomerInterview', 'RejectedByClient'
//
//   EXCLUDED per spec rule 3(c):
//     'PresentedToClientSuccess'  — never really presented
//     'RejectedByClientSuccess'   — never really presented
//     'ProcessInterrupted'        — decision never made
//     'CandidateDeclined'         — candidate's choice, not client's
//
// Acceptance rate = Approved / (Approved + PresentedToClient + CustomerInterview + RejectedByClient)
// After person-level dedup (same candidate across Account+Stakeholder+MainSkill per month).

// ── V2 classification ──────────────────────────────────────────────────────────

/** Statuses that count in the denominator (genuinely presented to client). */
export const DENOMINATOR_STATUSES = new Set([
  'Approved',
  'PresentedToClient',
  'CustomerInterview',
  'RejectedByClient',
])

// Excluded statuses (spec rule 3(c)): PresentedToClientSuccess, RejectedByClientSuccess,
// ProcessInterrupted, CandidateDeclined. See classifyCandidate() and exclusionReason().

export type CandidateDisposition =
  | 'numerator'      // Approved — counts in both numerator AND denominator
  | 'denominator'    // PresentedToClient, CustomerInterview, RejectedByClient — denominator only
  | 'excluded'       // Spec rule 3(c) exclusions

export function classifyCandidate(status: string): CandidateDisposition {
  if (status === 'Approved') return 'numerator'
  if (DENOMINATOR_STATUSES.has(status)) return 'denominator'
  return 'excluded'
}

export function exclusionReason(status: string): string {
  if (status === 'PresentedToClientSuccess') return 'Never really presented (PresentedToClientSuccess)'
  if (status === 'RejectedByClientSuccess') return 'Never really presented (RejectedByClientSuccess)'
  if (status === 'ProcessInterrupted') return 'Decision never made (ProcessInterrupted)'
  if (status === 'CandidateDeclined') return "Candidate's decision, not client's (CandidateDeclined)"
  return `Status "${status}" not in evaluation set`
}

