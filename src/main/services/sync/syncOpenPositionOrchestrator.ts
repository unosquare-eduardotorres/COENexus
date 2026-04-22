import { upstreamApiService, type OpenPositionListItem } from '../upstreamApiService'
import { syncRepository, type SyncedOpenPositionRow } from '../../db/repositories/syncRepository'
import { matchRepository } from '../../db/repositories/matchRepository'
import { matchEngineService } from '../matchEngineService'
import { createLogger } from '../logger'
import type { SyncEvent, SyncOptions, PositionSyncRecord } from './syncTypes'

const log = createLogger('SyncOpenPositionOrchestrator')

export const syncOpenPositionOrchestrator = {
  async sync(token: string, options: SyncOptions, emitEvent: (event: SyncEvent) => void, signal: AbortSignal): Promise<void> {
    const activeOnly = options.activeOnly !== false
    log.info('Open positions sync started', { limit: options.limit, skip: options.skip, activeOnly })

    let pageOffset = 0
    let totalRecords = 0
    const pageSize = options.limit ? Math.min(100, options.limit) : 100

    let syncedCount = 0
    let updatedCount = 0
    let unchangedCount = 0
    let fetchedRecords = 0
    let processedInRun = 0
    const maxToProcess = options.limit ?? Infinity
    const syncedUpstreamIds = new Set<number>()

    while (processedInRun < maxToProcess) {
      if (signal.aborted) break

      const { items, totalRecords: total } = activeOnly
        ? await upstreamApiService.getOpenPositionsPaged(token, pageOffset, pageSize)
        : await upstreamApiService.getAllOpenPositionsPaged(token, pageOffset, pageSize)
      totalRecords = total
      if (items.length === 0) break

      let batch = items

      if (options.skip && options.skip > fetchedRecords) {
        const toSkip = options.skip - fetchedRecords
        batch = batch.slice(toSkip)
      }

      for (const pos of batch) {
        if (signal.aborted) break
        fetchedRecords++
        processedInRun++

        try {
          const existing = syncRepository.findPositionByUpstreamId(pos.id)

          const lastModUnchanged = existing
            && existing.last_modification === (pos.lastModification || null)
          const candidatesUnchanged = existing
            && existing.candidates_presented === (pos.candidatesPresented ?? 0)
          const discussionUnchanged = existing
            && existing.last_discussion_date === (pos.lastDiscussionDate || null)

          if (lastModUnchanged && candidatesUnchanged && discussionUnchanged) {
            syncedUpstreamIds.add(pos.id)
            unchangedCount++

            const record: PositionSyncRecord = {
              id: `pos-${pos.id}`, source: 'open-positions', status: existing.status,
              name: `${pos.account} - ${existing.job_title || pos.mainSkill}`,
              email: '', hasResume: false, isBench: false, resumeChanged: false,
              upstreamId: pos.id, syncDetail: 'unchanged',
              syncedAt: existing.synced_at,
              account: pos.account, coe: pos.coe, practice: pos.practice,
              stakeholder: pos.stakeholder, mainSkill: pos.mainSkill,
              countries: pos.countries, seniorities: pos.seniorities,
              availableRange: pos.availableRange, positionStatus: pos.status,
              aging: pos.aging, hasJobDescription: !!existing.job_description?.trim(),
              candidatesCount: existing.candidates_presented,
            }
            emitEvent({ type: 'record', record })

            emitEvent({ type: 'progress', progress: {
              source: 'open-positions', totalRecords, fetchedRecords, syncedCount,
              incompleteCount: 0, notProcessedCount: 0, updatedCount, unchangedCount,
              skippedCount: 0, currentRecord: pos.account, status: 'syncing',
            }})
            continue
          }

          const [detail, candidates, discussions] = await Promise.all([
            upstreamApiService.getOpenPositionDetail(token, pos.id),
            upstreamApiService.getPresentedCandidates(token, pos.id),
            upstreamApiService.getDiscussionComments(token, pos.id),
          ])

          const latestDiscussionDate = discussions.length > 0
            ? discussions.reduce((max, d) => (d.date > max ? d.date : max), '')
            : null

          const entity: Omit<SyncedOpenPositionRow, 'id'> = {
            upstream_id: pos.id,
            account: pos.account || '',
            coe: pos.coe || '',
            practice: pos.practice || '',
            stakeholder: pos.stakeholder || '',
            main_skill: pos.mainSkill || '',
            countries: pos.countries || '',
            seniorities: pos.seniorities || '',
            available_range: pos.availableRange || '',
            account_overview: detail?.comments ?? '',
            job_description: detail?.jobDescription ?? '',
            job_title: detail?.jobTitle ?? '',
            position_status: pos.status || 'Active',
            aging: pos.aging || 0,
            created: pos.created || null,
            ready_date: pos.readyDate || null,
            last_modification: pos.lastModification || null,
            sourcing: pos.sourcing || '',
            replacement: pos.replacement ? 1 : 0,
            vertical_industry: pos.verticalIndustry || '',
            in_office: detail?.inOffice ? 1 : 0,
            csu: detail?.csu ?? '',
            cs: detail?.cs ?? '',
            closed_date: detail?.dateClosed ?? null,
            closed_reason: pos.closedReason || null,
            is_ready: detail?.isReady ? 1 : 0,
            is_promotion: detail?.isPromotion ? 1 : 0,
            maximum_rate: detail?.maximumRate ?? null,
            minimum_rate: detail?.minimumRate ?? null,
            additional_skills: JSON.stringify(detail?.additionalSkills ?? []),
            created_with_assignments_tool: detail?.createdWithAssignmentsTool == null ? null : detail.createdWithAssignmentsTool ? 1 : 0,
            candidates_presented: candidates.length,
            last_discussion_date: latestDiscussionDate,
            status: 'synced',
            status_reason: null,
            synced_at: new Date().toISOString(),
          }

          syncRepository.upsertOpenPosition(entity)
          syncedUpstreamIds.add(pos.id)
          syncedCount++
          if (existing) {
            updatedCount++
          }

          for (const cand of candidates) {
            matchRepository.upsertOpenPositionCandidate({
              open_position_id: pos.id,
              candidate_requisition_id: cand.candidateRequisitionId,
              candidate_id: cand.candidateId,
              candidate_name: cand.candidate || '',
              main_skill: cand.skills || '',
              is_employee: cand.isEmployee ? 1 : 0,
              candidate_status: cand.candidateStatusName || '',
              rate: cand.rate ?? 0,
              start_date: cand.startDate || null,
              synced_at: new Date().toISOString(),
            })
          }

          const rejectedCandidates = candidates.filter(c => c.candidateStatusName === 'RejectedByClient')
          if (rejectedCandidates.length > 0) {
            for (const rejected of rejectedCandidates) {
              try {
                const rejDetail = await upstreamApiService.getCandidateRequisitionDetail(
                  token,
                  rejected.candidateRequisitionId
                )
                if (rejDetail) {
                  matchRepository.updateCandidateRejectionDetails(
                    pos.id,
                    rejected.candidateRequisitionId,
                    {
                      rejection_feedback: JSON.stringify(rejDetail.listFeedback ?? []),
                      rejection_comments: rejDetail.comments ?? '',
                      rejection_action_date: rejDetail.actionDate || null,
                    }
                  )
                }
              } catch (err) {
                log.warn(`Failed to fetch rejection detail for candidateRequisition ${rejected.candidateRequisitionId}`, { positionId: pos.id })
              }
            }
          }

          const syncedAt = new Date().toISOString()
          for (const comment of discussions) {
            syncRepository.upsertDiscussion({
              open_position_id: pos.id,
              comment_id: comment.commentId,
              author: comment.author || '',
              date: comment.date || '',
              message: comment.message || '',
              parent_comment_id: comment.parentCommentId,
              synced_at: syncedAt,
            })
          }

          const hasJd = !!detail?.jobDescription?.trim()
          const record: PositionSyncRecord = {
            id: `pos-${pos.id}`, source: 'open-positions', status: 'synced',
            name: `${pos.account} - ${detail?.jobTitle ?? pos.mainSkill}`,
            email: '', hasResume: false, isBench: false, resumeChanged: false,
            upstreamId: pos.id, syncDetail: existing ? 'updated' : 'new',
            syncedAt: new Date().toISOString(),
            account: pos.account, coe: pos.coe, practice: pos.practice,
            stakeholder: pos.stakeholder, mainSkill: pos.mainSkill,
            countries: pos.countries, seniorities: pos.seniorities,
            availableRange: pos.availableRange, positionStatus: pos.status,
            aging: pos.aging, hasJobDescription: hasJd, candidatesCount: candidates.length,
          }
          emitEvent({ type: 'record', record })
        } catch (err) {
          log.error(`Open position sync failed: ${pos.account} (${pos.id})`, err instanceof Error ? err : new Error(String(err)), { upstreamId: pos.id })
          emitEvent({ type: 'record', record: { id: `pos-${pos.id}`, source: 'open-positions', status: 'sync_failed', name: pos.account || 'Unknown', email: '', hasResume: false, isBench: false, resumeChanged: false, upstreamId: pos.id, syncDetail: 'fetch_failed', syncedAt: new Date().toISOString(), reason: err instanceof Error ? err.message : 'Unknown error' } })
        }

        emitEvent({ type: 'progress', progress: { source: 'open-positions', totalRecords, fetchedRecords, syncedCount, incompleteCount: 0, notProcessedCount: 0, updatedCount, unchangedCount, skippedCount: 0, currentRecord: pos.account, status: 'syncing' } })

        if (processedInRun >= maxToProcess) break
      }

      pageOffset += items.length
      if (pageOffset >= totalRecords) break
    }

    if (!signal.aborted && activeOnly) {
      const allLocalPositions = syncRepository.getAllOpenPositions(100000, 0)
      const closedDate = new Date().toISOString()
      let closedCount = 0
      for (const local of allLocalPositions) {
        if (!syncedUpstreamIds.has(local.upstream_id) && local.position_status !== 'Closed') {
          syncRepository.markPositionClosed(local.upstream_id, closedDate)
          closedCount++
        }
      }
      if (closedCount > 0) {
        log.info('Marked positions as Closed (not in upstream)', { closedCount })
      }
    }

    matchEngineService.invalidateFilterCache()
    log.info('Open positions sync finished', { totalRecords, fetchedRecords, syncedCount, status: signal.aborted ? 'paused' : 'completed' })
    emitEvent({ type: 'complete', progress: { source: 'open-positions', totalRecords, fetchedRecords, syncedCount, incompleteCount: 0, notProcessedCount: 0, updatedCount, unchangedCount, skippedCount: 0, status: signal.aborted ? 'paused' : 'completed' } })
  },
}
