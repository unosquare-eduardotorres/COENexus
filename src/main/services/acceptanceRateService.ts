// Acceptance Rate report (Phase 1): how many candidates were Approved vs Rejected
// per Closed position, with a status-count header and an inferred won/lost grouping.
//
// Taxonomy (real open_position_candidates.candidate_status values):
//   Approved              -> 'Approved'
//   Rejected              -> 'RejectedByClient', 'RejectedByClientSuccess'
//   Declined (excluded)   -> 'CandidateDeclined'
//   Unresolved (rest)     -> 'ProcessInterrupted', 'PresentedToClient(+Success)', 'CustomerInterview', ...
//
// Acceptance rate = Approved / (Approved + Rejected). Declined and unresolved
// candidates are excluded from the denominator.
//
// Outcome per position is derived from the position's own Status (not inferred
// from candidates):
//   won         -> position_status === 'ClosedWon'
//   lost        -> position_status starts with 'ClosedLost' OR 'ClosedModified'
//   no-decision -> any other closure (bare 'Closed', etc.)
// The granular position_status is still returned verbatim (no upstream
// reclassification) — only the won/lost/other bucket folds ClosedModified* into
// Lost. Candidate approved/rejected counts still drive the acceptance-rate %,
// they just no longer decide the bucket.

import { syncRepository } from '../db/repositories/syncRepository'
import type {
  ClosedPositionCandidateRow,
  ClosedPositionOutcomeRow,
} from '../db/repositories/syncRepository'
import type {
  AcceptanceOutcome,
  ReportAcceptanceRateFilters,
  ReportAcceptanceRateResult,
  ReportCandidateOutcome,
  ReportPositionOutcome,
} from '../../shared/ipc-types'
import { bucketForStatus } from '../../shared/acceptanceTaxonomy'

/** Index candidate rows by their open_position_id. */
function groupByPosition(
  candidates: ClosedPositionCandidateRow[],
): Map<number, ClosedPositionCandidateRow[]> {
  const byPosition = new Map<number, ClosedPositionCandidateRow[]>()
  for (const c of candidates) {
    const list = byPosition.get(c.open_position_id)
    if (list) list.push(c)
    else byPosition.set(c.open_position_id, [c])
  }
  return byPosition
}

/**
 * Build a single position's outcome (per-position counts, candidate breakdown,
 * and the inferred won/lost label). Pure — it does not accumulate into any
 * report-level totals, so callers decide whether the position counts toward the
 * headline (dated, in-quarter) or is surfaced separately (undated).
 */
function buildPositionOutcome(
  pos: ClosedPositionOutcomeRow,
  rows: ClosedPositionCandidateRow[],
): ReportPositionOutcome {
  let approved = 0
  let rejected = 0
  let declined = 0
  let unresolved = 0

  const candidates: ReportCandidateOutcome[] = rows.map(r => {
    const bucket = bucketForStatus(r.candidate_status)
    if (bucket === 'approved') approved++
    else if (bucket === 'rejected') rejected++
    else if (bucket === 'declined') declined++
    else unresolved++
    return {
      candidateRequisitionId: r.candidate_requisition_id,
      candidateName: r.candidate_name,
      mainSkill: r.main_skill,
      candidateStatus: r.candidate_status,
      bucket,
      isEmployee: r.is_employee === 1,
      rate: r.rate,
      startDate: r.start_date,
    }
  })

  const ps = pos.position_status
  const outcome: AcceptanceOutcome =
    ps === 'ClosedWon' ? 'won'
    : ps.startsWith('ClosedLost') || ps.startsWith('ClosedModified') ? 'lost'
    : 'no-decision' // bare 'Closed', anything else -> "Other"

  return {
    upstreamId: pos.upstream_id,
    account: pos.account,
    jobTitle: pos.job_title,
    mainSkill: pos.main_skill,
    coe: pos.coe,
    practice: pos.practice,
    positionStatus: ps,
    closedDate: pos.closed_date,
    approved,
    rejected,
    declined,
    unresolved,
    outcome,
    candidates,
  }
}

const QUARTER_START_MONTH: Record<ReportAcceptanceRateFilters['quarter'], number> = {
  Q1: 1,
  Q2: 4,
  Q3: 7,
  Q4: 10,
}

/** Inclusive start / exclusive end ISO date strings for a calendar quarter. */
function quarterRange(year: number, quarter: ReportAcceptanceRateFilters['quarter']): {
  startDate: string
  endDateExclusive: string
} {
  const startMonth = QUARTER_START_MONTH[quarter]
  const pad = (n: number) => String(n).padStart(2, '0')
  const startDate = `${year}-${pad(startMonth)}-01`
  const endDateExclusive =
    quarter === 'Q4' ? `${year + 1}-01-01` : `${year}-${pad(startMonth + 3)}-01`
  return { startDate, endDateExclusive }
}

export const acceptanceRateService = {
  /** Distinct COE values across Closed positions, for the filter dropdown. */
  getCoes(): string[] {
    return syncRepository.getDistinctClosedCoes()
  },

  evaluate(filters: ReportAcceptanceRateFilters): ReportAcceptanceRateResult {
    const { startDate, endDateExclusive } = quarterRange(filters.year, filters.quarter)
    const coe = filters.coe && filters.coe !== 'all' ? filters.coe : null

    // Dated, in-quarter closures — these drive the headline acceptance rate.
    const { positions, candidates } = syncRepository.getClosedPositionsWithOutcomes({
      startDate,
      endDateExclusive,
      coe,
    })
    const byPosition = groupByPosition(candidates)

    const byStatus: Record<string, number> = {}
    // Raw per-position-status counts for the quarter-closed set (drives the
    // Position Status Breakdown). Grouped from the dated positions we already
    // fetched — no extra query.
    const positionStatusCounts: Record<string, number> = {}
    let approved = 0
    let rejected = 0
    let declined = 0
    let unresolvedTotal = 0

    const won: ReportPositionOutcome[] = []
    const lost: ReportPositionOutcome[] = []
    const noDecision: ReportPositionOutcome[] = []

    for (const pos of positions) {
      const outcome = buildPositionOutcome(pos, byPosition.get(pos.upstream_id) ?? [])
      approved += outcome.approved
      rejected += outcome.rejected
      declined += outcome.declined
      unresolvedTotal += outcome.unresolved
      for (const c of outcome.candidates) {
        byStatus[c.candidateStatus] = (byStatus[c.candidateStatus] ?? 0) + 1
      }

      positionStatusCounts[pos.position_status] =
        (positionStatusCounts[pos.position_status] ?? 0) + 1

      if (outcome.outcome === 'won') won.push(outcome)
      else if (outcome.outcome === 'lost') lost.push(outcome)
      else noDecision.push(outcome)
    }

    // Undated closures — Closed but no upstream close date. They can't be placed
    // on the quarter axis, so they are surfaced in their own group and excluded
    // from the headline rate / status counts to keep the quarter accurate.
    const undatedData = syncRepository.getClosedPositionsWithoutDate(coe)
    const undatedByPosition = groupByPosition(undatedData.candidates)
    const undated: ReportPositionOutcome[] = undatedData.positions.map(pos =>
      buildPositionOutcome(pos, undatedByPosition.get(pos.upstream_id) ?? []),
    )

    const denominator = approved + rejected
    const acceptanceRate = denominator > 0 ? Math.round((approved / denominator) * 1000) / 10 : 0

    const syncStatus = syncRepository.getOpenPositionSyncStatus()

    return {
      summary: {
        acceptanceRate,
        approved,
        rejected,
        declined,
        unresolvedTotal,
        byStatus,
        positionStatusCounts,
        wonCount: won.length,
        lostCount: lost.length,
        noDecisionCount: noDecision.length,
        totalClosedPositions: positions.length,
        candidatesEvaluated: candidates.length,
        undatedCount: undated.length,
        lastSyncedAt: syncStatus.lastSyncedAt,
      },
      groups: { won, lost, noDecision, undated },
    }
  },
}
