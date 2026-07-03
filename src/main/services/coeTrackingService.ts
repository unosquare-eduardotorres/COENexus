import { syncRepository } from '../db/repositories/syncRepository'
import type { SyncedOpenPositionRow } from '../db/repositories/syncRepository'
import { matchRepository } from '../db/repositories/matchRepository'
import { openPositionReportService } from './openPositionReportService'
import type { ReportPositionDetailResult } from '../../shared/ipc-types'
import {
  ACTIVE_CANDIDATE_STATUSES,
  normalizeStatus,
  DEFAULT_THRESHOLDS,
} from './openPositionReportConfig'
import type {
  HealthTier,
  HealthBreakdown,
  CoeTrackingSummary,
  PracticeTrackingSummary,
  SkillTrackingSummary,
  TrackedPosition,
  TrackedPositionDetail,
  CoeTrackingTimelineEvent,
  ReportSyncStatus,
} from '../../shared/ipc-types'
import { createLogger } from './logger'

const log = createLogger('CoeTrackingService')

function computeHealthTier(activeCount: number, hasApproved: boolean): HealthTier {
  if (hasApproved) return 'won'
  if (activeCount === 0) return 'critical'
  if (activeCount === 1) return 'warning'
  if (activeCount === 2) return 'good'
  return 'excellent'
}

function countActiveCandidates(positionUpstreamId: number): {
  activeCount: number
  totalCount: number
  hasApproved: boolean
} {
  const candidates = matchRepository.getOpenPositionCandidates(positionUpstreamId)
  const activeCount = candidates.filter(c =>
    (ACTIVE_CANDIDATE_STATUSES as readonly string[]).includes(
      normalizeStatus(c.candidate_status)
    )
  ).length
  const hasApproved = candidates.some(c => c.candidate_status === 'Approved')
  return { activeCount, totalCount: candidates.length, hasApproved }
}

function buildBreakdownAndCoverage(
  positions: SyncedOpenPositionRow[]
): {
  breakdown: HealthBreakdown
  coveredCount: number
  virtualCount: number
} {
  const breakdown: HealthBreakdown = { critical: 0, warning: 0, good: 0, excellent: 0, won: 0 }
  let coveredCount = 0
  let virtualCount = 0
  for (const pos of positions) {
    if (pos.stakeholder === 'CE') {
      virtualCount++
      continue
    }
    const { activeCount, hasApproved } = countActiveCandidates(pos.upstream_id)
    const tier = computeHealthTier(activeCount, hasApproved)
    breakdown[tier]++
    if (activeCount >= 1 || hasApproved) coveredCount++
  }
  return { breakdown, coveredCount, virtualCount }
}

export const coeTrackingService = {
  getOverview(): CoeTrackingSummary[] {
    const positions = syncRepository.getActiveOpenPositions()

    const coeMap = new Map<string, SyncedOpenPositionRow[]>()
    for (const pos of positions) {
      const coe = pos.coe || 'Unassigned'
      if (!coeMap.has(coe)) coeMap.set(coe, [])
      coeMap.get(coe)!.push(pos)
    }

    const results: CoeTrackingSummary[] = []
    for (const [coe, coePositions] of coeMap) {
      const { breakdown, coveredCount, virtualCount } = buildBreakdownAndCoverage(coePositions)
      const realCount = coePositions.length - virtualCount

      const practiceCounts = new Map<string, number>()
      for (const pos of coePositions) {
        const practice = pos.practice || 'Unspecified'
        practiceCounts.set(practice, (practiceCounts.get(practice) || 0) + 1)
      }
      const topPractices = [...practiceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([practice]) => practice)

      results.push({
        coe,
        totalPositions: realCount,
        coveredPositions: coveredCount,
        effectivenessPercent: realCount > 0
          ? Math.round((coveredCount / realCount) * 100)
          : 0,
        healthBreakdown: breakdown,
        topPractices,
        virtualPositions: virtualCount,
      })
    }

    results.sort((a, b) => a.effectivenessPercent - b.effectivenessPercent)
    log.info('COE overview generated', { coeCount: results.length })
    return results
  },

  getCoeDetail(coe: string): PracticeTrackingSummary[] {
    const positions = syncRepository.getActiveOpenPositions()
      .filter(p => (p.coe || 'Unassigned') === coe)

    const practiceMap = new Map<string, SyncedOpenPositionRow[]>()
    for (const pos of positions) {
      const practice = pos.practice || 'Unspecified'
      if (!practiceMap.has(practice)) practiceMap.set(practice, [])
      practiceMap.get(practice)!.push(pos)
    }

    const results: PracticeTrackingSummary[] = []
    for (const [practice, practicePositions] of practiceMap) {
      const { breakdown, coveredCount, virtualCount } = buildBreakdownAndCoverage(practicePositions)
      const realCount = practicePositions.length - virtualCount

      const distinctSkills = new Set<string>()
      for (const pos of practicePositions) {
        distinctSkills.add(pos.main_skill || 'Unspecified')
      }
      const skillCount = distinctSkills.size
      const singleSkill = skillCount === 1 ? [...distinctSkills][0] : undefined

      results.push({
        practice,
        coe,
        totalPositions: realCount,
        coveredPositions: coveredCount,
        effectivenessPercent: realCount > 0
          ? Math.round((coveredCount / realCount) * 100)
          : 0,
        healthBreakdown: breakdown,
        skillCount,
        singleSkill,
        virtualPositions: virtualCount,
      })
    }

    results.sort((a, b) => a.effectivenessPercent - b.effectivenessPercent)
    log.info('COE detail generated', { coe, practiceCount: results.length })
    return results
  },

  getPracticeDetail(coe: string, practice: string): SkillTrackingSummary[] {
    const positions = syncRepository.getActiveOpenPositions()
      .filter(p =>
        (p.coe || 'Unassigned') === coe &&
        (p.practice || 'Unspecified') === practice
      )

    const skillMap = new Map<string, SyncedOpenPositionRow[]>()
    for (const pos of positions) {
      const skill = pos.main_skill || 'Unspecified'
      if (!skillMap.has(skill)) skillMap.set(skill, [])
      skillMap.get(skill)!.push(pos)
    }

    const results: SkillTrackingSummary[] = []
    for (const [skill, skillPositions] of skillMap) {
      const { breakdown, coveredCount, virtualCount } = buildBreakdownAndCoverage(skillPositions)
      const realCount = skillPositions.length - virtualCount
      results.push({
        skill,
        coe,
        totalPositions: realCount,
        coveredPositions: coveredCount,
        effectivenessPercent: realCount > 0
          ? Math.round((coveredCount / realCount) * 100)
          : 0,
        healthBreakdown: breakdown,
        virtualPositions: virtualCount,
      })
    }

    results.sort((a, b) => a.effectivenessPercent - b.effectivenessPercent)
    log.info('Practice detail generated', { coe, practice, skillCount: results.length })
    return results
  },

  getSkillPositions(coe: string, practice: string, skill: string): TrackedPosition[] {
    const reportResult = openPositionReportService.evaluate(DEFAULT_THRESHOLDS)

    const filtered = reportResult.results.filter(r =>
      (r.position.coe || 'Unassigned') === coe &&
      (r.position.practice || '') === practice &&
      (r.position.main_skill || 'Unspecified') === skill
    )

    const results: TrackedPosition[] = filtered.map(r => {
      const { activeCount, totalCount, hasApproved } = countActiveCandidates(r.position.upstream_id)
      return {
        position: r.position,
        activeCandidateCount: activeCount,
        healthTier: computeHealthTier(activeCount, hasApproved),
        totalCandidates: totalCount,
        matchingCriteria: r.matchingCriteria,
        actors: r.actors,
        isVirtual: r.position.stakeholder === 'CE',
      }
    })

    const tierOrder: Record<HealthTier, number> = { critical: 0, warning: 1, good: 2, excellent: 3, won: 4 }
    results.sort((a, b) => {
      const tierDiff = tierOrder[a.healthTier] - tierOrder[b.healthTier]
      if (tierDiff !== 0) return tierDiff
      return b.position.aging - a.position.aging
    })

    log.info('Skill positions generated', { coe, skill, positionCount: results.length })
    return results
  },

  getPracticePositions(coe: string, practice: string): TrackedPosition[] {
    const reportResult = openPositionReportService.evaluate(DEFAULT_THRESHOLDS)

    const filtered = reportResult.results.filter(r =>
      (r.position.coe || 'Unassigned') === coe &&
      (r.position.practice || '') === practice
    )

    const results: TrackedPosition[] = filtered.map(r => {
      const { activeCount, totalCount, hasApproved } = countActiveCandidates(r.position.upstream_id)
      return {
        position: r.position,
        activeCandidateCount: activeCount,
        healthTier: computeHealthTier(activeCount, hasApproved),
        totalCandidates: totalCount,
        matchingCriteria: r.matchingCriteria,
        actors: r.actors,
        isVirtual: r.position.stakeholder === 'CE',
      }
    })

    const tierOrder: Record<HealthTier, number> = { critical: 0, warning: 1, good: 2, excellent: 3, won: 4 }
    results.sort((a, b) => {
      const tierDiff = tierOrder[a.healthTier] - tierOrder[b.healthTier]
      if (tierDiff !== 0) return tierDiff
      return b.position.aging - a.position.aging
    })

    log.info('Practice positions generated', { coe, practice, positionCount: results.length })
    return results
  },

  getCoePositions(coe: string): TrackedPosition[] {
    const reportResult = openPositionReportService.evaluate(DEFAULT_THRESHOLDS)

    const filtered = reportResult.results.filter(r =>
      (r.position.coe || 'Unassigned') === coe
    )

    const results: TrackedPosition[] = filtered.map(r => {
      const { activeCount, totalCount, hasApproved } = countActiveCandidates(r.position.upstream_id)
      return {
        position: r.position,
        activeCandidateCount: activeCount,
        healthTier: computeHealthTier(activeCount, hasApproved),
        totalCandidates: totalCount,
        matchingCriteria: r.matchingCriteria,
        actors: r.actors,
        isVirtual: r.position.stakeholder === 'CE',
      }
    })

    const tierOrder: Record<HealthTier, number> = { critical: 0, warning: 1, good: 2, excellent: 3, won: 4 }
    results.sort((a, b) => {
      const tierDiff = tierOrder[a.healthTier] - tierOrder[b.healthTier]
      if (tierDiff !== 0) return tierDiff
      return b.position.aging - a.position.aging
    })

    log.info('COE positions generated', { coe, positionCount: results.length })
    return results
  },

  getPositionDetail(upstreamId: number): TrackedPositionDetail | null {
    const rawDetail = openPositionReportService.getPositionDetail(upstreamId)
    if (!rawDetail) return null

    const detail = rawDetail as unknown as ReportPositionDetailResult

    const activeCount = detail.candidates.filter(c =>
      (ACTIVE_CANDIDATE_STATUSES as readonly string[]).includes(
        normalizeStatus(c.candidateStatus)
      )
    ).length
    const hasApproved = detail.candidates.some(c => c.candidateStatus === 'Approved')

    const events: CoeTrackingTimelineEvent[] = []

    if (detail.position.created) {
      events.push({ type: 'created', date: detail.position.created, label: 'Position Created' })
    }
    if (detail.position.ready_date) {
      events.push({ type: 'ready', date: detail.position.ready_date, label: 'Position Ready' })
    }
    if (detail.position.last_modification) {
      events.push({ type: 'modified', date: detail.position.last_modification, label: 'Last Modified' })
    }

    for (const c of detail.candidates) {
      if (c.startDate) {
        if (c.candidateStatus === 'RejectedByClient') {
          events.push({
            type: 'candidate-rejected',
            date: c.rejectionActionDate || c.startDate,
            label: `${c.candidateName} rejected`,
            detail: c.rejectionComments || undefined,
          })
        } else {
          events.push({
            type: 'candidate-presented',
            date: c.startDate,
            label: `${c.candidateName} presented`,
            detail: c.candidateStatus,
          })
        }
      }
    }

    // Discussion events removed from timeline — they live in the Discussion section

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      position: detail.position,
      activeCandidateCount: activeCount,
      healthTier: computeHealthTier(activeCount, hasApproved),
      candidates: detail.candidates,
      discussions: detail.discussions,
      timelineEvents: events,
      isVirtual: detail.position.stakeholder === 'CE',
    }
  },

  getSyncStatus(): ReportSyncStatus {
    return syncRepository.getOpenPositionSyncStatus()
  },
}
