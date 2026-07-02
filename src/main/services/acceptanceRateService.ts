// Acceptance Rate V2: per-month cohort based on position created date,
// spec-aligned denominator (all genuinely-presented candidates), person-level
// dedup (same candidate across Account+Stakeholder+MainSkill per month),
// full candidate audit trail, and monthly + QTD breakdowns.

import { syncRepository } from '../db/repositories/syncRepository'
import type {
  AcceptancePositionRow,
  AcceptanceCandidateRow,
} from '../db/repositories/syncRepository'
import type {
  AcceptanceOutcome,
  ReportAcceptanceRateFilters,
  ReportAcceptanceRateResultV2,
  ReportCandidateAudit,
  ReportMonthBreakdown,
  ReportPositionOutcomeV2,
} from '../../shared/ipc-types'
import { classifyCandidate, exclusionReason } from '../../shared/acceptanceTaxonomy'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Return the 3 month strings (YYYY-MM) in a calendar quarter. */
function monthsInQuarter(year: number, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'): string[] {
  const startMonth = ({ Q1: 1, Q2: 4, Q3: 7, Q4: 10 } as const)[quarter]
  const pad = (n: number) => String(n).padStart(2, '0')
  return [0, 1, 2].map(i => `${year}-${pad(startMonth + i)}`)
}

/** Derive won/lost/no-decision from the granular position_status. */
function positionOutcome(positionStatus: string): AcceptanceOutcome {
  if (positionStatus === 'ClosedWon') return 'won'
  if (positionStatus.startsWith('ClosedLost') || positionStatus.startsWith('ClosedModified')) return 'lost'
  return 'no-decision'
}

/** Group candidate rows by their open_position_id. */
function groupCandidatesByPosition(
  candidates: AcceptanceCandidateRow[],
): Map<number, AcceptanceCandidateRow[]> {
  const map = new Map<number, AcceptanceCandidateRow[]>()
  for (const c of candidates) {
    const list = map.get(c.open_position_id)
    if (list) list.push(c)
    else map.set(c.open_position_id, [c])
  }
  return map
}

/** Extract month string (YYYY-MM) from an ISO date. */
function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7)
}

// ── Core evaluation ────────────────────────────────────────────────────────────

function evaluateMonth(
  month: string,
  monthPositions: AcceptancePositionRow[],
  candidatesByPosition: Map<number, AcceptanceCandidateRow[]>,
): ReportMonthBreakdown {
  // Position-grain counts
  let wonCount = 0
  let lostCount = 0
  let otherCount = 0

  // Raw candidate counts BEFORE dedup
  let rawApproved = 0
  let rawPresentedToClient = 0
  let rawCustomerInterview = 0
  let rawRejectedByClient = 0
  const excludedByStatus: Record<string, number> = {}
  let excludedByStatusTotal = 0

  // Dedup tracking: key → first position info
  const dedupSeen = new Map<string, { firstPositionId: number; firstPositionLabel: string }>()
  let dedupRemovedFromNumerator = 0
  let dedupRemovedFromDenominator = 0

  // Net counts (after dedup)
  let netNumerator = 0
  let netDenominator = 0

  const positions: ReportPositionOutcomeV2[] = []

  for (const pos of monthPositions) {
    const outcome = positionOutcome(pos.position_status)
    if (outcome === 'won') wonCount++
    else if (outcome === 'lost') lostCount++
    else otherCount++

    const rows = candidatesByPosition.get(pos.upstream_id) ?? []
    const candidateAudits: ReportCandidateAudit[] = []

    let posCountedNumerator = 0
    let posCountedDenominator = 0
    let posExcluded = 0
    let posDedupSkipped = 0

    for (const r of rows) {
      const disposition = classifyCandidate(r.candidate_status)

      if (disposition === 'excluded') {
        // Excluded by status
        excludedByStatus[r.candidate_status] = (excludedByStatus[r.candidate_status] ?? 0) + 1
        excludedByStatusTotal++
        posExcluded++

        candidateAudits.push({
          candidateRequisitionId: r.candidate_requisition_id,
          candidateId: r.candidate_id,
          candidateName: r.candidate_name,
          mainSkill: r.main_skill,
          candidateStatus: r.candidate_status,
          disposition: 'excluded',
          exclusionReason: exclusionReason(r.candidate_status),
          dedupFirstPositionId: null,
          dedupFirstPositionLabel: null,
          isEmployee: r.is_employee === 1,
          rate: r.rate,
          startDate: r.start_date,
        })
        continue
      }

      // Count raw (before dedup)
      if (r.candidate_status === 'Approved') rawApproved++
      else if (r.candidate_status === 'PresentedToClient') rawPresentedToClient++
      else if (r.candidate_status === 'CustomerInterview') rawCustomerInterview++
      else if (r.candidate_status === 'RejectedByClient') rawRejectedByClient++

      // Person dedup: key = candidateId|account|stakeholder|positionMainSkill
      const dedupKey = `${r.candidate_id}|${pos.account}|${pos.stakeholder}|${pos.main_skill}`
      const existing = dedupSeen.get(dedupKey)

      if (existing) {
        // Already counted in another position this month
        if (disposition === 'numerator') dedupRemovedFromNumerator++
        dedupRemovedFromDenominator++
        posDedupSkipped++

        candidateAudits.push({
          candidateRequisitionId: r.candidate_requisition_id,
          candidateId: r.candidate_id,
          candidateName: r.candidate_name,
          mainSkill: r.main_skill,
          candidateStatus: r.candidate_status,
          disposition: 'dedup-skipped',
          exclusionReason: `Already counted in position #${existing.firstPositionId} (same ${pos.account} / ${pos.stakeholder} / ${pos.main_skill})`,
          dedupFirstPositionId: existing.firstPositionId,
          dedupFirstPositionLabel: existing.firstPositionLabel,
          isEmployee: r.is_employee === 1,
          rate: r.rate,
          startDate: r.start_date,
        })
        continue
      }

      // First time seeing this person in this dedup group — register and count
      dedupSeen.set(dedupKey, {
        firstPositionId: pos.upstream_id,
        firstPositionLabel: `${pos.account} / ${pos.stakeholder} / ${pos.main_skill}`,
      })

      if (disposition === 'numerator') {
        netNumerator++
        posCountedNumerator++
      }
      netDenominator++
      posCountedDenominator++

      candidateAudits.push({
        candidateRequisitionId: r.candidate_requisition_id,
        candidateId: r.candidate_id,
        candidateName: r.candidate_name,
        mainSkill: r.main_skill,
        candidateStatus: r.candidate_status,
        disposition,
        exclusionReason: null,
        dedupFirstPositionId: null,
        dedupFirstPositionLabel: null,
        isEmployee: r.is_employee === 1,
        rate: r.rate,
        startDate: r.start_date,
      })
    }

    positions.push({
      upstreamId: pos.upstream_id,
      account: pos.account,
      stakeholder: pos.stakeholder,
      jobTitle: pos.job_title,
      mainSkill: pos.main_skill,
      coe: pos.coe,
      practice: pos.practice,
      positionStatus: pos.position_status,
      createdDate: pos.created,
      closedDate: pos.closed_date,
      outcome,
      countedInNumerator: posCountedNumerator,
      countedInDenominator: posCountedDenominator,
      excludedCount: posExcluded,
      dedupSkippedCount: posDedupSkipped,
      candidates: candidateAudits,
    })
  }

  const rawDenominator = rawApproved + rawPresentedToClient + rawCustomerInterview + rawRejectedByClient
  const rate = netDenominator > 0 ? Math.round((netNumerator / netDenominator) * 1000) / 10 : 0

  return {
    month,
    positionCount: monthPositions.length,
    wonCount,
    lostCount,
    otherCount,
    math: {
      rawApproved,
      rawPresentedToClient,
      rawCustomerInterview,
      rawRejectedByClient,
      rawDenominator,
      excludedByStatus,
      excludedTotal: excludedByStatusTotal,
      dedupRemovedNumerator: dedupRemovedFromNumerator,
      dedupRemovedDenominator: dedupRemovedFromDenominator,
      netNumerator,
      netDenominator,
      rate,
    },
    qtd: {
      // Filled in by the caller during QTD rolling aggregation
      cumulativeNumerator: 0,
      cumulativeDenominator: 0,
      rate: 0,
    },
    positions,
  }
}

// ── Public service ─────────────────────────────────────────────────────────────

export const acceptanceRateService = {
  /** Distinct COE values across Closed positions, for the filter dropdown. */
  getCoes(): string[] {
    return syncRepository.getDistinctClosedCoes()
  },

  evaluate(filters: ReportAcceptanceRateFilters): ReportAcceptanceRateResultV2 {
    const coe = filters.coe && filters.coe !== 'all' ? filters.coe : null

    const { positions, candidates } = syncRepository.getClosedPositionsByCreatedMonth({
      year: filters.year,
      quarter: filters.quarter,
      coe,
    })

    const candidatesByPosition = groupCandidatesByPosition(candidates)

    // Group positions by created month
    const months = monthsInQuarter(filters.year, filters.quarter)
    const positionsByMonth = new Map<string, AcceptancePositionRow[]>()
    for (const m of months) positionsByMonth.set(m, [])

    for (const p of positions) {
      const m = monthOf(p.created)
      const list = positionsByMonth.get(m)
      if (list) list.push(p)
      // If created falls outside the 3 months (shouldn't happen with the SQL filter), skip
    }

    // Evaluate each month
    const monthBreakdowns: ReportMonthBreakdown[] = []
    for (const m of months) {
      const monthPositions = positionsByMonth.get(m) ?? []
      const breakdown = evaluateMonth(m, monthPositions, candidatesByPosition)
      monthBreakdowns.push(breakdown)
    }

    // QTD rolling aggregation
    let cumulativeNumerator = 0
    let cumulativeDenominator = 0
    for (const mb of monthBreakdowns) {
      cumulativeNumerator += mb.math.netNumerator
      cumulativeDenominator += mb.math.netDenominator
      mb.qtd = {
        cumulativeNumerator,
        cumulativeDenominator,
        rate: cumulativeDenominator > 0
          ? Math.round((cumulativeNumerator / cumulativeDenominator) * 1000) / 10
          : 0,
      }
    }

    // Quarter-level totals
    const totalNumerator = cumulativeNumerator
    const totalDenominator = cumulativeDenominator
    const totalExcluded = monthBreakdowns.reduce((s, mb) => s + mb.math.excludedTotal, 0)
    const totalDeduped = monthBreakdowns.reduce((s, mb) => s + mb.math.dedupRemovedDenominator, 0)

    const syncStatus = syncRepository.getOpenPositionSyncStatus()

    return {
      summary: {
        acceptanceRate: totalDenominator > 0
          ? Math.round((totalNumerator / totalDenominator) * 1000) / 10
          : 0,
        totalPositions: positions.length,
        totalNumerator,
        totalDenominator,
        totalExcluded,
        totalDeduped,
        lastSyncedAt: syncStatus.lastSyncedAt,
      },
      months: monthBreakdowns,
    }
  },
}
