// Single source of truth for the Acceptance Rate status taxonomy.
// Imported by both the main-process service (acceptanceRateService) and the
// renderer UI helpers (acceptanceStatus) so the bucket sets never drift apart.
//
// Taxonomy (real open_position_candidates.candidate_status values):
//   Approved              -> 'Approved'
//   Rejected              -> 'RejectedByClient', 'RejectedByClientSuccess'
//   Declined (excluded)   -> 'CandidateDeclined'
//   Unresolved (rest)     -> 'ProcessInterrupted', 'PresentedToClient(+Success)', 'CustomerInterview', ...

import type { AcceptanceBucket } from './ipc-types'

export type { AcceptanceBucket }

export const APPROVED_STATUSES = new Set(['Approved'])
export const REJECTED_STATUSES = new Set(['RejectedByClient', 'RejectedByClientSuccess'])
export const DECLINED_STATUSES = new Set(['CandidateDeclined'])

export function bucketForStatus(status: string): AcceptanceBucket {
  if (APPROVED_STATUSES.has(status)) return 'approved'
  if (REJECTED_STATUSES.has(status)) return 'rejected'
  if (DECLINED_STATUSES.has(status)) return 'declined'
  return 'unresolved'
}
