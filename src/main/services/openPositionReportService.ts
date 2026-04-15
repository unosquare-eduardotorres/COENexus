import { syncRepository, type SyncedOpenPositionRow, type OpenPositionDiscussionRow } from '../db/repositories/syncRepository'
import { matchRepository } from '../db/repositories/matchRepository'
import { createLogger } from './logger'
import {
  type StalledCriterionKey,
  type StalledThresholds,
  type CriterionActor,
  CRITERIA_CONFIG,
  ACTIVE_CANDIDATE_STATUSES,
  normalizeStatus,
} from './openPositionReportConfig'

const log = createLogger('OpenPositionReportService')

interface CandidateRow {
  candidate_status: string
  start_date: string | null
}

export interface StalledPositionResult {
  position: SyncedOpenPositionRow
  matchingCriteria: StalledCriterionKey[]
  actors: CriterionActor[]
}

export interface OpenPositionReportResult {
  results: StalledPositionResult[]
  totalPositions: number
  lastSyncedAt: string | null
}

export interface PositionDetailResult {
  position: SyncedOpenPositionRow
  candidates: Array<{
    candidateRequisitionId: number
    candidateId: number
    candidateName: string
    mainSkill: string
    isEmployee: boolean
    candidateStatus: string
    rate: number
    startDate: string | null
  }>
  discussions: Array<{
    commentId: number
    author: string
    date: string
    message: string
    parentCommentId: number | null
  }>
}

function daysSince(dateStr: string | null, now: Date): number {
  if (!dateStr) return Infinity
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return Infinity
  return Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24))
}

function evaluateStalledPosition(
  position: SyncedOpenPositionRow,
  candidates: CandidateRow[],
  discussions: OpenPositionDiscussionRow[],
  thresholdDays: number,
  now: Date
): boolean {
  const candidateDates = candidates
    .map(c => c.start_date)
    .filter((d): d is string => !!d && !isNaN(new Date(d).getTime()))
  const commentDates = discussions
    .map(c => c.date)
    .filter(d => d && !isNaN(new Date(d).getTime()))
  const allDates = [
    ...candidateDates,
    ...(position.last_modification ? [position.last_modification] : []),
    ...commentDates,
  ].filter(d => d && !isNaN(new Date(d).getTime()))

  if (allDates.length === 0) return true

  const maxDate = allDates.reduce((max, d) => (new Date(d) > new Date(max) ? d : max))
  return daysSince(maxDate, now) > thresholdDays
}

function evaluateNoActiveCandidates(
  position: SyncedOpenPositionRow,
  candidates: CandidateRow[],
  thresholdDays: number,
  now: Date
): boolean {
  if (candidates.length === 0) {
    return daysSince(position.created, now) > thresholdDays
  }
  const hasActive = candidates.some(c =>
    (ACTIVE_CANDIDATE_STATUSES as readonly string[]).includes(normalizeStatus(c.candidate_status))
  )
  return !hasActive && daysSince(position.created, now) > thresholdDays
}

function evaluateIdleStatus(
  candidates: CandidateRow[],
  targetStatus: string,
  thresholdDays: number,
  now: Date
): boolean {
  return candidates.some(
    c => normalizeStatus(c.candidate_status) === targetStatus && daysSince(c.start_date, now) > thresholdDays
  )
}

function evaluateDraftPosition(
  position: SyncedOpenPositionRow,
  thresholdDays: number,
  now: Date
): boolean {
  return daysSince(position.created, now) > thresholdDays
}

export const openPositionReportService = {
  evaluate(thresholds: StalledThresholds): OpenPositionReportResult {
    const now = new Date()
    const positions = syncRepository.getActiveOpenPositions()
    const positionIds = positions.map(p => p.upstream_id)

    const discussionsMap = syncRepository.getDiscussionsByPositionIds(positionIds)

    const candidatesMap = new Map<number, CandidateRow[]>()
    for (const posId of positionIds) {
      const rows = matchRepository.getOpenPositionCandidates(posId)
      candidatesMap.set(posId, rows.map(r => ({
        candidate_status: r.candidate_status,
        start_date: r.start_date,
      })))
    }

    const isEvaluable = (status: string) => status === 'Active' || status === 'Draft'

    const results: StalledPositionResult[] = positions
      .map(position => {
        const matchingCriteria: StalledCriterionKey[] = []

        if (isEvaluable(position.position_status)) {
          const candidates = candidatesMap.get(position.upstream_id) ?? []
          const discussions = discussionsMap.get(position.upstream_id) ?? []

          if (position.position_status === 'Draft') {
            if (evaluateDraftPosition(position, thresholds['draft-positions'], now)) {
              matchingCriteria.push('draft-positions')
            }
          } else {
            if (evaluateStalledPosition(position, candidates, discussions, thresholds['stalled-position'], now)) {
              matchingCriteria.push('stalled-position')
            }
            if (evaluateNoActiveCandidates(position, candidates, thresholds['no-active-candidates'], now)) {
              matchingCriteria.push('no-active-candidates')
            }
            if (evaluateIdleStatus(candidates, 'PresentedToCGX', thresholds['idle-cgx'], now)) {
              matchingCriteria.push('idle-cgx')
            }
            if (evaluateIdleStatus(candidates, 'PresentedToClient', thresholds['idle-client'], now)) {
              matchingCriteria.push('idle-client')
            }
            if (evaluateIdleStatus(candidates, 'CustomerInterview', thresholds['idle-customer-interview'], now)) {
              matchingCriteria.push('idle-customer-interview')
            }
          }
        }

        const actorSet = new Set(
          matchingCriteria.map(criterion => CRITERIA_CONFIG.find(c => c.key === criterion)!.actor)
        )

        return {
          position,
          matchingCriteria,
          actors: [...actorSet] as CriterionActor[],
        }
      })
      .sort((a, b) => b.position.aging - a.position.aging)

    const syncStatus = syncRepository.getOpenPositionSyncStatus()

    const flaggedCount = results.filter(r => r.matchingCriteria.length > 0).length
    log.info('Open position report evaluated', { totalPositions: positions.length, evaluated: results.length, flagged: flaggedCount })

    return {
      results,
      totalPositions: positions.length,
      lastSyncedAt: syncStatus.lastSyncedAt,
    }
  },

  getPositionDetail(upstreamId: number): PositionDetailResult | null {
    const position = syncRepository.getOpenPositionByUpstreamId(upstreamId)
    if (!position) return null

    const candidateRows = matchRepository.getOpenPositionCandidates(upstreamId)
    const discussionRows = syncRepository.getDiscussionsByPositionId(upstreamId)

    return {
      position,
      candidates: candidateRows.map(r => ({
        candidateRequisitionId: r.candidate_requisition_id,
        candidateId: r.candidate_id,
        candidateName: r.candidate_name,
        mainSkill: r.main_skill,
        isEmployee: r.is_employee === 1,
        candidateStatus: r.candidate_status,
        rate: r.rate,
        startDate: r.start_date,
        rejectionFeedback: r.rejection_feedback ? JSON.parse(r.rejection_feedback) as number[] : [],
        rejectionComments: r.rejection_comments || '',
        rejectionActionDate: r.rejection_action_date,
      })),
      discussions: discussionRows.map(r => ({
        commentId: r.comment_id,
        author: r.author,
        date: r.date,
        message: r.message,
        parentCommentId: r.parent_comment_id,
      })),
    }
  },

  getSyncStatus(): { total: number; lastSyncedAt: string | null } {
    return syncRepository.getOpenPositionSyncStatus()
  },

  generateCsv(results: StalledPositionResult[]): string {
    const headers = ['ID', 'Account', 'Stakeholder', 'COE', 'Practice', 'Main Skill', 'Aging', 'Action Needed', 'Criteria']
    const rows = results.map(r => [
      r.position.upstream_id,
      r.position.account,
      r.position.stakeholder,
      r.position.coe,
      r.position.practice,
      r.position.main_skill,
      r.position.aging,
      r.actors.join(' / '),
      r.matchingCriteria.map(c => CRITERIA_CONFIG.find(cfg => cfg.key === c)?.label ?? c).join(', '),
    ])

    const csvBody = [headers, ...rows]
      .map(row => row.map(cell => {
        const str = String(cell ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')
        return `"${str}"`
      }).join(','))
      .join('\r\n')

    return '\uFEFF' + csvBody
  },
}
