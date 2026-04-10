import { upstreamApiService, type OpenPositionListItem } from '../upstreamApiService'
import { syncRepository, type SyncedOpenPositionRow } from '../../db/repositories/syncRepository'
import { matchRepository } from '../../db/repositories/matchRepository'
import { matchEngineService } from '../matchEngineService'
import { createLogger } from '../logger'
import type { SyncEvent, SyncOptions, PositionSyncRecord } from './syncTypes'

const log = createLogger('SyncOpenPositionOrchestrator')

export const syncOpenPositionOrchestrator = {
  async sync(token: string, options: SyncOptions, emitEvent: (event: SyncEvent) => void, signal: AbortSignal): Promise<void> {
    log.info('Open positions sync started', { limit: options.limit, skip: options.skip })

    let pageOffset = 0
    let totalRecords = 0
    const pageSize = options.limit ? Math.min(100, options.limit) : 100

    let syncedCount = 0
    let fetchedRecords = 0
    let processedInRun = 0
    const maxToProcess = options.limit ?? Infinity

    while (processedInRun < maxToProcess) {
      if (signal.aborted) break

      const { items, totalRecords: total } = await upstreamApiService.getOpenPositionsPaged(token, pageOffset, pageSize)
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
          const detail = await upstreamApiService.getOpenPositionDetail(token, pos.id)
          const candidates = await upstreamApiService.getPresentedCandidates(token, pos.id)

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
            status: 'synced',
            status_reason: null,
            synced_at: new Date().toISOString(),
          }

          syncRepository.upsertOpenPosition(entity)
          syncedCount++

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

          const hasJd = !!detail?.jobDescription?.trim()
          const record: PositionSyncRecord = {
            id: `pos-${pos.id}`, source: 'open-positions', status: 'synced',
            name: `${pos.account} - ${detail?.jobTitle ?? pos.mainSkill}`,
            email: '', hasResume: false, isBench: false, resumeChanged: false,
            upstreamId: pos.id, syncDetail: 'new',
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

        emitEvent({ type: 'progress', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount: 0, notProcessedCount: 0, updatedCount: 0, unchangedCount: 0, skippedCount: 0, currentRecord: pos.account, status: 'syncing' } })

        if (processedInRun >= maxToProcess) break
      }

      pageOffset += items.length
      if (pageOffset >= totalRecords) break
    }

    matchEngineService.invalidateFilterCache()
    log.info('Open positions sync finished', { totalRecords, fetchedRecords, syncedCount, status: signal.aborted ? 'paused' : 'completed' })
    emitEvent({ type: 'complete', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount: 0, notProcessedCount: 0, updatedCount: 0, unchangedCount: 0, skippedCount: 0, status: signal.aborted ? 'paused' : 'completed' } })
  },
}
