import { upstreamApiService } from './upstreamApiService'
import { syncRepository } from '../db/repositories/syncRepository'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { matchRepository } from '../db/repositories/matchRepository'
import { matchEngineService } from './matchEngineService'
import { voyageEmbeddingService } from './voyageEmbeddingService'
import { extractPositionText } from './processingUtils'
import { createLogger } from './logger'
import { getConfig } from '../config'

const log = createLogger('PositionPipeline')

interface PipelineRecordEvent {
  upstreamId: number
  name: string
  outcome: 'vectorized' | 'skipped' | 'failed'
  failedStep?: 'sync' | 'extract' | 'vectorize' | 'no_resume'
  error?: string
  seniority?: string
  mainSkill?: string
}

interface PipelineProgress {
  source: string
  status: 'processing' | 'paused' | 'completed'
  totalRecords: number
  processedRecords: number
  succeededCount: number
  failedCount: number
  skippedCount: number
  currentRecord?: string
}

type PipelineEvent =
  | { type: 'record'; record: PipelineRecordEvent }
  | { type: 'progress'; progress: PipelineProgress }
  | { type: 'complete'; progress: PipelineProgress }
  | { type: 'error'; message: string }

export interface PositionPipelineStartParams {
  token: string
  model?: string
  activeOnly: boolean
  limit?: number
  skip?: number
}

export interface PositionPipelineVectorizeSyncedParams {
  token: string
  model?: string
}

let activeController: AbortController | null = null
let pausedOffset = 0

function getModel(model?: string): string {
  if (model) return model
  const { voyage } = getConfig()
  return voyage.defaultModel ?? 'voyage-3-large'
}

function makeProgress(
  total: number, processed: number, succeeded: number, failed: number, skipped: number,
  status: 'processing' | 'paused' | 'completed' = 'processing', currentRecord?: string,
): PipelineProgress {
  return { source: 'open-positions', status, totalRecords: total, processedRecords: processed, succeededCount: succeeded, failedCount: failed, skippedCount: skipped, currentRecord }
}

export const positionPipelineOrchestrator = {
  requestPause(): void {
    if (activeController) {
      activeController.abort()
      log.info('Position pipeline pause requested')
    }
  },

  async run(
    params: PositionPipelineStartParams,
    emitEvent: (event: PipelineEvent) => void,
  ): Promise<void> {
    activeController = new AbortController()
    const { signal } = activeController
    const { token, activeOnly, limit, skip } = params
    const model = getModel(params.model)

    log.info('Position pipeline started', { activeOnly, limit, skip, model })

    let totalRecords = 0
    let processedRecords = 0
    let succeededCount = 0
    let failedCount = 0
    let skippedCount = 0
    const pageSize = 100
    let pageOffset = skip ?? pausedOffset
    pausedOffset = 0
    const maxToProcess = limit ?? Infinity
    let processedInRun = 0
    const syncedUpstreamIds = new Set<number>()

    try {
      while (processedInRun < maxToProcess) {
        if (signal.aborted) break

        const { items, totalRecords: total } = activeOnly
          ? await upstreamApiService.getOpenPositionsPaged(token, pageOffset, Math.min(pageSize, maxToProcess - processedInRun))
          : await upstreamApiService.getAllOpenPositionsPaged(token, pageOffset, Math.min(pageSize, maxToProcess - processedInRun))

        totalRecords = total
        if (items.length === 0) break

        for (const pos of items) {
          if (signal.aborted) break
          if (processedInRun >= maxToProcess) break

          processedRecords++
          processedInRun++
          const posName = `${pos.account} — ${pos.mainSkill}`

          emitEvent({ type: 'progress', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'processing', posName) })

          try {
            const existing = syncRepository.findPositionByUpstreamId(pos.id)

            const lastModUnchanged = existing && existing.last_modification === (pos.lastModification || null)
            const candidatesUnchanged = existing && existing.candidates_presented === (pos.candidatesPresented ?? 0)
            const discussionUnchanged = existing && existing.last_discussion_date === (pos.lastDiscussionDate || null)

            if (lastModUnchanged && candidatesUnchanged && discussionUnchanged) {
              syncedUpstreamIds.add(pos.id)

              const alreadyVectorized = existing.status === 'vectorized'
              if (alreadyVectorized) {
                skippedCount++
                emitEvent({ type: 'record', record: { upstreamId: pos.id, name: posName, outcome: 'skipped', mainSkill: pos.mainSkill } })
                emitEvent({ type: 'progress', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'processing', posName) })
                continue
              }

              if (!activeOnly) {
                skippedCount++
                emitEvent({ type: 'record', record: { upstreamId: pos.id, name: posName, outcome: 'skipped', mainSkill: pos.mainSkill } })
                emitEvent({ type: 'progress', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'processing', posName) })
                continue
              }
            }

            const [detail, candidates, discussions] = await Promise.all([
              upstreamApiService.getOpenPositionDetail(token, pos.id),
              upstreamApiService.getPresentedCandidates(token, pos.id),
              upstreamApiService.getDiscussionComments(token, pos.id),
            ])

            const latestDiscussionDate = discussions.length > 0
              ? discussions.reduce((max, d) => (d.date > max ? d.date : max), '')
              : null

            const entity = {
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
              replacement: pos.replacement ? 1 as const : 0 as const,
              vertical_industry: pos.verticalIndustry || '',
              in_office: detail?.inOffice ? 1 as const : 0 as const,
              csu: detail?.csu ?? '',
              cs: detail?.cs ?? '',
              closed_date: detail?.dateClosed ?? null,
              closed_reason: pos.closedReason || null,
              is_ready: detail?.isReady ? 1 as const : 0 as const,
              is_promotion: detail?.isPromotion ? 1 as const : 0 as const,
              maximum_rate: detail?.maximumRate ?? null,
              minimum_rate: detail?.minimumRate ?? null,
              additional_skills: JSON.stringify(detail?.additionalSkills ?? []),
              created_with_assignments_tool: detail?.createdWithAssignmentsTool == null ? null : detail.createdWithAssignmentsTool ? 1 : 0,
              candidates_presented: candidates.length,
              last_discussion_date: latestDiscussionDate,
              status: 'synced' as const,
              status_reason: null,
              synced_at: new Date().toISOString(),
            }

            syncRepository.upsertOpenPosition(entity)
            syncedUpstreamIds.add(pos.id)

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
            for (const rejected of rejectedCandidates) {
              try {
                const rejDetail = await upstreamApiService.getCandidateRequisitionDetail(token, rejected.candidateRequisitionId)
                if (rejDetail) {
                  matchRepository.updateCandidateRejectionDetails(pos.id, rejected.candidateRequisitionId, {
                    rejection_feedback: JSON.stringify(rejDetail.listFeedback ?? []),
                    rejection_comments: rejDetail.comments ?? '',
                    rejection_action_date: rejDetail.actionDate || null,
                  })
                }
              } catch {
                log.warn(`Failed to fetch rejection detail for candidateRequisition ${rejected.candidateRequisitionId}`, { positionId: pos.id })
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

            if (activeOnly) {
              const hasJd = !!(detail?.jobDescription?.trim())
              if (hasJd) {
                const row = syncRepository.findPositionByUpstreamId(pos.id)
                if (row) {
                  const enrichedText = extractPositionText({
                    account: row.account,
                    job_title: row.job_title,
                    main_skill: row.main_skill,
                    job_description: row.job_description,
                  })

                  const vecResult = await vectorizePosition(row.id, pos.id, enrichedText, model)
                  if ('error' in vecResult) {
                    failedCount++
                    emitEvent({ type: 'record', record: { upstreamId: pos.id, name: posName, outcome: 'failed', failedStep: 'vectorize', error: vecResult.error } })
                  } else {
                    succeededCount++
                    emitEvent({ type: 'record', record: { upstreamId: pos.id, name: posName, outcome: 'vectorized', mainSkill: pos.mainSkill } })
                  }
                }
              } else {
                failedCount++
                syncRepository.markFailed('synced_open_positions', syncRepository.findPositionByUpstreamId(pos.id)?.id ?? 0, 'incomplete', 'No job description')
                emitEvent({ type: 'record', record: { upstreamId: pos.id, name: posName, outcome: 'failed', failedStep: 'no_resume', error: 'No job description' } })
              }
            } else {
              succeededCount++
              emitEvent({ type: 'record', record: { upstreamId: pos.id, name: posName, outcome: 'vectorized', mainSkill: pos.mainSkill } })
            }
          } catch (err) {
            failedCount++
            const error = err instanceof Error ? err.message : 'Unknown error'
            log.error('Position pipeline record failed', err instanceof Error ? err : new Error(error), { upstreamId: pos.id })
            syncRepository.upsertSyncFailed('synced_open_positions', {
              upstream_id: pos.id,
              full_name: pos.account || 'Unknown',
              status: 'sync_failed',
              status_reason: error,
            })
            emitEvent({ type: 'record', record: { upstreamId: pos.id, name: pos.account || 'Unknown', outcome: 'failed', failedStep: 'sync', error } })
          }

          emitEvent({ type: 'progress', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'processing', posName) })
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
      const finalStatus = signal.aborted ? 'paused' as const : 'completed' as const
      if (signal.aborted) {
        pausedOffset = pageOffset
      }
      log.info('Position pipeline finished', { totalRecords, processedRecords, succeededCount, failedCount, skippedCount, status: finalStatus })
      emitEvent({ type: 'complete', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, skippedCount, finalStatus) })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        pausedOffset = pageOffset
        emitEvent({ type: 'complete', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'paused') })
        return
      }
      log.error('Position pipeline failed', err instanceof Error ? err : new Error(String(err)))
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Pipeline failed' })
    } finally {
      activeController = null
    }
  },

  async vectorizeSynced(
    params: PositionPipelineVectorizeSyncedParams,
    emitEvent: (event: PipelineEvent) => void,
  ): Promise<void> {
    activeController = new AbortController()
    const { signal } = activeController
    const { token } = params
    const model = getModel(params.model)

    log.info('Position vectorize synced started')

    const allPositions = syncRepository.getAllOpenPositions(100000, 0)
    const toVectorize = allPositions.filter(p => {
      if (p.status !== 'synced') return false
      if (!p.job_description?.trim()) return false
      const existing = embeddingRepository.findBySource('positions', p.id)
      return !existing || !existing.embedding
    })

    const totalRecords = toVectorize.length
    let processedRecords = 0
    let succeededCount = 0
    let failedCount = 0

    emitEvent({ type: 'progress', progress: makeProgress(totalRecords, 0, 0, 0, 0, 'processing') })

    try {
      for (const pos of toVectorize) {
        if (signal.aborted) break
        processedRecords++
        const posName = `${pos.account} — ${pos.job_title || pos.main_skill}`

        try {
          const enrichedText = extractPositionText({
            account: pos.account,
            job_title: pos.job_title,
            main_skill: pos.main_skill,
            job_description: pos.job_description,
          })

          const vecResult = await vectorizePosition(pos.id, pos.upstream_id, enrichedText, model)
          if ('error' in vecResult) {
            failedCount++
            emitEvent({ type: 'record', record: { upstreamId: pos.upstream_id, name: posName, outcome: 'failed', failedStep: 'vectorize', error: vecResult.error } })
          } else {
            succeededCount++
            emitEvent({ type: 'record', record: { upstreamId: pos.upstream_id, name: posName, outcome: 'vectorized', mainSkill: pos.main_skill } })
          }
        } catch (err) {
          failedCount++
          emitEvent({ type: 'record', record: { upstreamId: pos.upstream_id, name: posName, outcome: 'failed', failedStep: 'vectorize', error: err instanceof Error ? err.message : 'Vectorization failed' } })
        }

        emitEvent({ type: 'progress', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, 0, 'processing', posName) })
      }

      const finalStatus = signal.aborted ? 'paused' as const : 'completed' as const
      log.info('Position vectorize synced finished', { totalRecords, succeededCount, failedCount, status: finalStatus })
      emitEvent({ type: 'complete', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, 0, finalStatus) })
    } catch (err) {
      log.error('Position vectorize synced failed', err instanceof Error ? err : new Error(String(err)))
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Vectorize synced failed' })
    } finally {
      activeController = null
    }
  },

  async retryAllFailed(
    params: { source: string; token: string; model?: string },
    emitEvent: (event: PipelineEvent) => void,
  ): Promise<void> {
    activeController = new AbortController()
    const { signal } = activeController
    const { token } = params
    const model = getModel(params.model)

    log.info('Position retry all failed started')

    const failedRecords = syncRepository.getFailedRecords('synced_open_positions')
    const totalRecords = failedRecords.length
    let processedRecords = 0
    let succeededCount = 0
    let failedCount = 0
    let skippedCount = 0

    emitEvent({ type: 'progress', progress: makeProgress(totalRecords, 0, 0, 0, 0, 'processing') })

    try {
      for (const record of failedRecords) {
        if (signal.aborted) break
        processedRecords++

        try {
          const result = await retrySinglePosition(token, model, record)
          if (result.outcome === 'vectorized') succeededCount++
          else if (result.outcome === 'failed') failedCount++
          else skippedCount++
          emitEvent({ type: 'record', record: result })
        } catch (err) {
          failedCount++
          emitEvent({ type: 'record', record: { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'sync', error: err instanceof Error ? err.message : 'Retry failed' } })
        }

        emitEvent({ type: 'progress', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, skippedCount, 'processing', record.full_name) })
      }

      const finalStatus = signal.aborted ? 'paused' as const : 'completed' as const
      log.info('Position retry all failed finished', { totalRecords, succeededCount, failedCount })
      emitEvent({ type: 'complete', progress: makeProgress(totalRecords, processedRecords, succeededCount, failedCount, skippedCount, finalStatus) })
    } catch (err) {
      log.error('Position retry all failed error', err instanceof Error ? err : new Error(String(err)))
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Retry failed' })
    } finally {
      activeController = null
    }
  },

  async retrySingle(params: { source: string; token: string; model?: string; upstreamId: number }): Promise<PipelineRecordEvent> {
    const { token, upstreamId } = params
    const model = getModel(params.model)

    const records = syncRepository.getFailedRecords('synced_open_positions')
    const record = records.find(r => r.upstream_id === upstreamId)

    if (!record) {
      return { upstreamId, name: 'Unknown', outcome: 'failed', failedStep: 'sync', error: 'Record not found in failed list' }
    }

    return retrySinglePosition(token, model, record)
  },
}

async function vectorizePosition(
  dbId: number,
  upstreamId: number,
  enrichedText: string,
  model: string,
): Promise<{ dimensions: number } | { error: string }> {
  try {
    const vector = await voyageEmbeddingService.generateEmbedding(enrichedText, model)

    embeddingRepository.upsert({
      sourceType: 'positions',
      sourceId: dbId,
      upstreamId,
      embedding: vector,
      resumeText: enrichedText,
      isBench: false,
    })

    syncRepository.updateStatus('synced_open_positions', dbId, 'vectorized')
    return { dimensions: vector.length }
  } catch (err) {
    log.error('Position vectorization failed', err instanceof Error ? err : new Error(String(err)), { upstreamId })
    syncRepository.markFailed('synced_open_positions', dbId, 'vectorize_failed', err instanceof Error ? err.message : 'Vectorization failed')
    return { error: err instanceof Error ? err.message : 'Vectorization failed' }
  }
}

async function retrySinglePosition(
  token: string,
  model: string,
  record: { id: number; upstream_id: number; full_name: string; status: string },
): Promise<PipelineRecordEvent> {
  if (record.status === 'sync_failed') {
    try {
      const [detail, candidates, discussions] = await Promise.all([
        upstreamApiService.getOpenPositionDetail(token, record.upstream_id),
        upstreamApiService.getPresentedCandidates(token, record.upstream_id),
        upstreamApiService.getDiscussionComments(token, record.upstream_id),
      ])

      if (!detail) {
        return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'sync', error: 'Position detail not found' }
      }

      const latestDiscussionDate = discussions.length > 0
        ? discussions.reduce((max, d) => (d.date > max ? d.date : max), '')
        : null

      const existing = syncRepository.findPositionByUpstreamId(record.upstream_id)
      const entity = {
        upstream_id: record.upstream_id,
        account: existing?.account ?? record.full_name,
        coe: existing?.coe ?? '',
        practice: existing?.practice ?? '',
        stakeholder: existing?.stakeholder ?? '',
        main_skill: existing?.main_skill ?? '',
        countries: existing?.countries ?? '',
        seniorities: existing?.seniorities ?? '',
        available_range: existing?.available_range ?? '',
        account_overview: detail.comments ?? '',
        job_description: detail.jobDescription ?? '',
        job_title: detail.jobTitle ?? '',
        position_status: existing?.position_status ?? 'Active',
        aging: existing?.aging ?? 0,
        created: existing?.created ?? null,
        ready_date: existing?.ready_date ?? null,
        last_modification: existing?.last_modification ?? null,
        sourcing: existing?.sourcing ?? '',
        replacement: existing?.replacement ?? 0,
        vertical_industry: existing?.vertical_industry ?? '',
        in_office: detail.inOffice ? 1 as const : 0 as const,
        csu: detail.csu ?? '',
        cs: detail.cs ?? '',
        closed_date: detail.dateClosed ?? null,
        closed_reason: existing?.closed_reason ?? null,
        is_ready: detail.isReady ? 1 as const : 0 as const,
        is_promotion: detail.isPromotion ? 1 as const : 0 as const,
        maximum_rate: detail.maximumRate ?? null,
        minimum_rate: detail.minimumRate ?? null,
        additional_skills: JSON.stringify(detail.additionalSkills ?? []),
        created_with_assignments_tool: detail.createdWithAssignmentsTool == null ? null : detail.createdWithAssignmentsTool ? 1 : 0,
        candidates_presented: candidates.length,
        last_discussion_date: latestDiscussionDate,
        status: 'synced' as const,
        status_reason: null,
        synced_at: new Date().toISOString(),
      }

      syncRepository.upsertOpenPosition(entity)

      for (const cand of candidates) {
        matchRepository.upsertOpenPositionCandidate({
          open_position_id: record.upstream_id,
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

      const hasJd = !!(detail.jobDescription?.trim())
      if (!hasJd) {
        syncRepository.markFailed('synced_open_positions', record.id, 'incomplete', 'No job description')
        return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'no_resume', error: 'No job description' }
      }

      const row = syncRepository.findPositionByUpstreamId(record.upstream_id)
      if (!row) {
        return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'sync', error: 'Failed to persist position' }
      }

      const enrichedText = extractPositionText({
        account: row.account,
        job_title: row.job_title,
        main_skill: row.main_skill,
        job_description: row.job_description,
      })

      const vecResult = await vectorizePosition(row.id, record.upstream_id, enrichedText, model)
      if ('error' in vecResult) {
        return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'vectorize', error: vecResult.error }
      }

      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'vectorized' }
    } catch (err) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'sync', error: err instanceof Error ? err.message : 'Retry sync failed' }
    }
  }

  if (record.status === 'vectorize_failed' || record.status === 'incomplete') {
    const row = syncRepository.findPositionByUpstreamId(record.upstream_id)
    if (!row) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'sync', error: 'Position not found in DB' }
    }

    if (!row.job_description?.trim()) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'no_resume', error: 'No job description' }
    }

    const enrichedText = extractPositionText({
      account: row.account,
      job_title: row.job_title,
      main_skill: row.main_skill,
      job_description: row.job_description,
    })

    const vecResult = await vectorizePosition(row.id, record.upstream_id, enrichedText, model)
    if ('error' in vecResult) {
      return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'vectorize', error: vecResult.error }
    }

    return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'vectorized' }
  }

  return { upstreamId: record.upstream_id, name: record.full_name, outcome: 'failed', failedStep: 'sync', error: `Unknown status: ${record.status}` }
}
