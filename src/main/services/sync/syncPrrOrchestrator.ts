import { upstreamApiService } from '../upstreamApiService'
import { syncRepository, type SyncedProjectReallocationRow } from '../../db/repositories/syncRepository'
import { prrRepository } from '../../db/repositories/prrRepository'
import { createLogger } from '../logger'
import type { SyncEvent, SyncOptions, PrrSyncRecord } from './syncTypes'

const log = createLogger('SyncPrrOrchestrator')

export const syncPrrOrchestrator = {
  async sync(token: string, options: SyncOptions, emitEvent: (event: SyncEvent) => void, signal: AbortSignal): Promise<void> {
    log.info('PRR sync started', { limit: options.limit, skip: options.skip })

    let pageOffset = 0
    let totalRecords = 0
    const pageSize = options.limit ? Math.min(100, options.limit) : 100

    let syncedCount = 0
    let fetchedRecords = 0
    let processedInRun = 0
    const maxToProcess = options.limit ?? Infinity
    const syncedUpstreamIds = new Set<number>()

    while (processedInRun < maxToProcess) {
      if (signal.aborted) break

      const { items, totalRecords: total } = await upstreamApiService.getPrrsPaged(token, pageOffset, pageSize)
      totalRecords = total
      if (items.length === 0) break

      let batch = items

      if (options.skip && options.skip > fetchedRecords) {
        const toSkip = options.skip - fetchedRecords
        batch = batch.slice(toSkip)
      }

      for (const prr of batch) {
        if (signal.aborted) break
        fetchedRecords++
        processedInRun++

        try {
          const presentations = await upstreamApiService.getPrrPresentations(token, prr.id)

          const entity: Omit<SyncedProjectReallocationRow, 'id'> = {
            upstream_id: prr.id,
            employee: prr.employee || '',
            account: prr.account || '',
            team: prr.team || '',
            main_skill: prr.mainSkill || '',
            seniority: prr.seniority || '',
            transition_status: prr.transitionStatus || '',
            transition_sub_type: prr.transitionSubType || '',
            location: prr.location || '',
            request_date: prr.requestDate || null,
            days_since_last_interview: prr.daysSinceLastInterview || '',
            impact: prr.impact || '',
            attrition_risk: prr.attritionRisk || '',
            comments: prr.comments || '',
            presentations_count: presentations.length,
            status: 'synced',
            status_reason: null,
            synced_at: new Date().toISOString(),
          }

          syncRepository.upsertProjectReallocation(entity)
          syncedCount++
          syncedUpstreamIds.add(prr.id)

          const syncedAt = new Date().toISOString()
          for (const pres of presentations) {
            syncRepository.upsertPrrPresentation({
              prr_id: prr.id,
              open_position_id: pres.openPositionId,
              account: pres.account || '',
              open_position_status: pres.openPositionStatus || '',
              location: pres.location || '',
              presented_on: pres.presentedOn || null,
              candidate_status: pres.candidateStatus || '',
              synced_at: syncedAt,
            })
          }

          const record: PrrSyncRecord = {
            id: `prr-${prr.id}`, source: 'project-reallocations', status: 'synced',
            name: prr.employee, email: '', hasResume: false, isBench: false,
            resumeChanged: false, upstreamId: prr.id, syncDetail: 'new',
            syncedAt: new Date().toISOString(),
            employee: prr.employee, account: prr.account, team: prr.team,
            mainSkill: prr.mainSkill, seniority: prr.seniority,
            transitionStatus: prr.transitionStatus, location: prr.location,
            impact: prr.impact, attritionRisk: prr.attritionRisk,
            presentationsCount: presentations.length,
          }
          emitEvent({ type: 'record', record })
        } catch (err) {
          log.error(`PRR sync failed: ${prr.employee} (${prr.id})`, err instanceof Error ? err : new Error(String(err)))
          emitEvent({ type: 'record', record: { id: `prr-${prr.id}`, source: 'project-reallocations', status: 'sync_failed', name: prr.employee || 'Unknown', email: '', hasResume: false, isBench: false, resumeChanged: false, upstreamId: prr.id, syncDetail: 'fetch_failed', syncedAt: new Date().toISOString(), reason: err instanceof Error ? err.message : 'Unknown error' } })
        }

        emitEvent({ type: 'progress', progress: { source: 'project-reallocations', totalRecords, fetchedRecords, syncedCount, incompleteCount: 0, notProcessedCount: 0, updatedCount: 0, unchangedCount: 0, skippedCount: 0, currentRecord: prr.employee, status: 'syncing' } })

        if (processedInRun >= maxToProcess) break
      }

      pageOffset += items.length
      if (pageOffset >= totalRecords) break
    }

    if (!signal.aborted) {
      const localUpstreamIds = prrRepository.getLocalUpstreamIds()
      let markedClosedCount = 0
      let deletedCount = 0

      for (const upstreamId of localUpstreamIds) {
        if (syncedUpstreamIds.has(upstreamId)) continue
        const existing = prrRepository.getByUpstreamId(upstreamId)
        if (!existing) continue

        if (existing.coe_status === 'Closed') {
          if (prrRepository.deleteByUpstreamId(upstreamId)) {
            deletedCount++
          }
          continue
        }

        prrRepository.markClosed(upstreamId)
        markedClosedCount++
      }

      if (markedClosedCount > 0 || deletedCount > 0) {
        log.info('PRR reconciliation completed', { markedClosedCount, deletedCount })
      }
    }

    log.info('PRR sync finished', { totalRecords, fetchedRecords, syncedCount, status: signal.aborted ? 'paused' : 'completed' })
    emitEvent({ type: 'complete', progress: { source: 'project-reallocations', totalRecords, fetchedRecords, syncedCount, incompleteCount: 0, notProcessedCount: 0, updatedCount: 0, unchangedCount: 0, skippedCount: 0, status: signal.aborted ? 'paused' : 'completed' } })
  },
}
