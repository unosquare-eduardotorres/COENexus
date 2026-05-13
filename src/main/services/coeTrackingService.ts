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

function computeHealthTier(activeCount: number): HealthTier {
  if (activeCount === 0) return 'critical'
  if (activeCount === 1) return 'warning'
  if (activeCount === 2) return 'good'
  return 'excellent'
}

function countActiveCandidates(positionUpstreamId: number): {
  activeCount: number
  totalCount: number
} {
  const candidates = matchRepository.getOpenPositionCandidates(positionUpstreamId)
  const activeCount = candidates.filter(c =>
    (ACTIVE_CANDIDATE_STATUSES as readonly string[]).includes(
      normalizeStatus(c.candidate_status)
    )
  ).length
  return { activeCount, totalCount: candidates.length }
}

function buildBreakdownAndCoverage(
  positions: SyncedOpenPositionRow[]
): {
  breakdown: HealthBreakdown
  coveredCount: number
} {
  const breakdown: HealthBreakdown = { critical: 0, warning: 0, good: 0, excellent: 0 }
  let coveredCount = 0
  for (const pos of positions) {
    const { activeCount } = countActiveCandidates(pos.upstream_id)
    const tier = computeHealthTier(activeCount)
    breakdown[tier]++
    if (activeCount >= 1) coveredCount++
  }
  return { breakdown, coveredCount }
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
      const { breakdown, coveredCount } = buildBreakdownAndCoverage(coePositions)

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
        totalPositions: coePositions.length,
        coveredPositions: coveredCount,
        effectivenessPercent: coePositions.length > 0
          ? Math.round((coveredCount / coePositions.length) * 100)
          : 0,
        healthBreakdown: breakdown,
        topPractices,
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
      const { breakdown, coveredCount } = buildBreakdownAndCoverage(practicePositions)

      const distinctSkills = new Set<string>()
      for (const pos of practicePositions) {
        distinctSkills.add(pos.main_skill || 'Unspecified')
      }
      const skillCount = distinctSkills.size
      const singleSkill = skillCount === 1 ? [...distinctSkills][0] : undefined

      results.push({
        practice,
        coe,
        totalPositions: practicePositions.length,
        coveredPositions: coveredCount,
        effectivenessPercent: practicePositions.length > 0
          ? Math.round((coveredCount / practicePositions.length) * 100)
          : 0,
        healthBreakdown: breakdown,
        skillCount,
        singleSkill,
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
      const { breakdown, coveredCount } = buildBreakdownAndCoverage(skillPositions)
      results.push({
        skill,
        coe,
        totalPositions: skillPositions.length,
        coveredPositions: coveredCount,
        effectivenessPercent: skillPositions.length > 0
          ? Math.round((coveredCount / skillPositions.length) * 100)
          : 0,
        healthBreakdown: breakdown,
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
      const { activeCount, totalCount } = countActiveCandidates(r.position.upstream_id)
      return {
        position: r.position,
        activeCandidateCount: activeCount,
        healthTier: computeHealthTier(activeCount),
        totalCandidates: totalCount,
        matchingCriteria: r.matchingCriteria,
        actors: r.actors,
      }
    })

    const tierOrder: Record<HealthTier, number> = { critical: 0, warning: 1, good: 2, excellent: 3 }
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
      const { activeCount, totalCount } = countActiveCandidates(r.position.upstream_id)
      return {
        position: r.position,
        activeCandidateCount: activeCount,
        healthTier: computeHealthTier(activeCount),
        totalCandidates: totalCount,
        matchingCriteria: r.matchingCriteria,
        actors: r.actors,
      }
    })

    const tierOrder: Record<HealthTier, number> = { critical: 0, warning: 1, good: 2, excellent: 3 }
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
      const { activeCount, totalCount } = countActiveCandidates(r.position.upstream_id)
      return {
        position: r.position,
        activeCandidateCount: activeCount,
        healthTier: computeHealthTier(activeCount),
        totalCandidates: totalCount,
        matchingCriteria: r.matchingCriteria,
        actors: r.actors,
      }
    })

    const tierOrder: Record<HealthTier, number> = { critical: 0, warning: 1, good: 2, excellent: 3 }
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

    for (const d of detail.discussions) {
      events.push({
        type: 'discussion',
        date: d.date,
        label: `Comment by ${d.author.split('@')[0]}`,
        detail: d.message.length > 80 ? d.message.slice(0, 80) + '...' : d.message,
      })
    }

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
      position: detail.position,
      activeCandidateCount: activeCount,
      healthTier: computeHealthTier(activeCount),
      candidates: detail.candidates,
      discussions: detail.discussions,
      timelineEvents: events,
    }
  },

  getSyncStatus(): ReportSyncStatus {
    return syncRepository.getOpenPositionSyncStatus()
  },
}
