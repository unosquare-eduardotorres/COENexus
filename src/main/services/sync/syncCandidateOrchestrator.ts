import { upstreamApiService, type CandidateDetail } from '../upstreamApiService'
import { syncRepository, type SyncedCandidateRow } from '../../db/repositories/syncRepository'
import { createLogger } from '../logger'
import { upsertWithChangeDetection, type ChangeDetectionConfig } from './changeDetection'
import { enqueueEmbeddingIfEligible, type EmbeddingCandidate } from './embeddingEligibility'
import { findResumeNote, loadOrEmpty, loadCatalogs } from './syncUtils'
import { matchEngineService } from '../matchEngineService'
import type { SyncRecordDto, SyncEvent, SyncOptions, CandidateSyncRecord } from './syncTypes'

const log = createLogger('SyncCandidateOrchestrator')

function buildCandidateEntity(
  detail: CandidateDetail,
  notes: PersonaNote[],
  seniorities: Map<number, string>,
  mainSkills: Map<number, string>,
  countries: Map<number, string>,
  pagedFallback: CandidateDetail
): Omit<SyncedCandidateRow, 'id'> {
  const resumeNote = findResumeNote(notes)

  let fullName = detail.fullName?.trim()
  if (!fullName) fullName = `${detail.firstName ?? ''} ${detail.lastName ?? ''}`.trim()
  if (!fullName) fullName = pagedFallback.fullName

  const seniority = detail.seniority && detail.seniority > 0
    ? (seniorities.get(detail.seniority) ?? pagedFallback.seniorityText ?? 'Unknown')
    : (pagedFallback.seniorityText ?? 'Unknown')

  const mainSkill = mainSkills.size > 0 && detail.mainSkillId && detail.mainSkillId > 0
    ? (mainSkills.get(detail.mainSkillId) ?? pagedFallback.mainSkill)
    : pagedFallback.mainSkill

  const country = countries.size > 0 && detail.countryId && detail.countryId > 0
    ? (countries.get(detail.countryId) ?? pagedFallback.country)
    : pagedFallback.country

  const missingFields: string[] = []
  if (!fullName) missingFields.push('FullName')
  if (!detail.email) missingFields.push('Email')
  if (seniority === 'Unknown') missingFields.push('Seniority')
  if (!mainSkill) missingFields.push('MainSkill')
  if (!resumeNote) missingFields.push('Resume')

  const recordStatus = missingFields.length === 0 ? 'synced' : 'incomplete'
  const statusReason = missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : null

  return {
    upstream_id: detail.candidateId,
    full_name: fullName || '',
    email: detail.email ?? null,
    seniority: seniority || null,
    main_skill: mainSkill ?? null,
    country: country ?? null,
    current_salary: detail.currentSalary ?? null,
    salary_currency: detail.currentSalaryCurrency ?? detail.salaryCurrency ?? null,
    coe_certified: (detail.coeCertifiedStatusId && detail.coeCertifiedStatusId > 0) ? 1 : 0,
    candidate_status: detail.candidateStatusName ?? pagedFallback.candidateStatusName ?? null,
    last_status_update: detail.statusUpdate ?? null,
    salary_expectations: detail.offer ?? null,
    salary_expectations_currency: detail.desiredSalaryCurrency ?? null,
    has_resume: resumeNote ? 1 : 0,
    resume_note_id: resumeNote?.personaNoteId ?? null,
    resume_date_created: resumeNote?.dateCreated ?? null,
    resume_filename: resumeNote?.filename ?? null,
    status: recordStatus,
    status_reason: statusReason,
    synced_at: new Date().toISOString(),
  }
}

const candidateChangeConfig: ChangeDetectionConfig<SyncedCandidateRow> = {
  tableName: 'synced_candidates',
  source: 'candidates',
  findByUpstreamId: (upstreamId) => syncRepository.findCandidateByUpstreamId(upstreamId),
  upsert: (entity) => syncRepository.upsertCandidate(entity),
  hasInfoChanged: (existing, entity) =>
    existing.full_name !== entity.full_name ||
    existing.email !== entity.email ||
    existing.seniority !== entity.seniority ||
    existing.main_skill !== entity.main_skill ||
    existing.country !== entity.country ||
    existing.current_salary !== entity.current_salary ||
    existing.salary_currency !== entity.salary_currency ||
    existing.coe_certified !== entity.coe_certified ||
    existing.candidate_status !== entity.candidate_status ||
    existing.has_resume !== entity.has_resume,
}

function mapCandidateToDto(entity: Omit<SyncedCandidateRow, 'id'> & { id?: number }, resumeChanged: boolean, syncDetail: string): CandidateSyncRecord {
  return {
    id: `cand-${entity.upstream_id}`,
    source: 'candidates',
    status: entity.status,
    name: entity.full_name,
    email: entity.email ?? '',
    seniority: entity.seniority ?? undefined,
    mainSkill: entity.main_skill ?? undefined,
    country: entity.country ?? undefined,
    grossMonthlySalary: entity.current_salary,
    currency: entity.salary_currency,
    coeCertified: entity.coe_certified === 1,
    candidateStatus: entity.candidate_status,
    lastStatusUpdate: entity.last_status_update,
    salaryExpectations: entity.salary_expectations,
    salaryExpectationsCurrency: entity.salary_expectations_currency,
    hasResume: entity.has_resume === 1,
    isBench: false,
    reason: entity.status_reason,
    resumeChanged,
    upstreamId: entity.upstream_id,
    syncDetail,
    syncedAt: entity.synced_at,
    resumeDateCreated: entity.resume_date_created,
  }
}

function buildEmbeddingCandidate(entity: Omit<SyncedCandidateRow, 'id'>, dbId: number): EmbeddingCandidate {
  return {
    source: 'candidates',
    dbId,
    upstreamId: entity.upstream_id,
    name: entity.full_name,
    resumeNoteId: entity.resume_note_id,
    resumeFilename: entity.resume_filename,
    isBench: false,
    hasResume: entity.has_resume,
    status: entity.status,
  }
}

export const syncCandidateOrchestrator = {
  async syncSingle(token: string, upstreamId: number): Promise<SyncRecordDto> {
    const { seniorities, mainSkills, countries } = await loadCatalogs(token)

    const detail = await upstreamApiService.getCandidateDetail(token, upstreamId)
    const notes = await loadOrEmpty('Notes', () => upstreamApiService.getCandidateNotes(token, upstreamId))

    const basicFallback: CandidateDetail = { candidateId: upstreamId, fullName: '' }
    const entity = buildCandidateEntity(detail, notes, seniorities, mainSkills, countries, basicFallback)
    const { dbId, resumeChanged, syncDetail } = upsertWithChangeDetection(entity, candidateChangeConfig)
    enqueueEmbeddingIfEligible(buildEmbeddingCandidate(entity, dbId), token)
    matchEngineService.invalidateFilterCache()

    return mapCandidateToDto(entity, resumeChanged, syncDetail)
  },

  async sync(token: string, options: SyncOptions, emitEvent: (event: SyncEvent) => void, signal: AbortSignal): Promise<void> {
    log.info('Candidate sync started', { limit: options.limit, skip: options.skip, year: options.year })

    const { seniorities, mainSkills, countries } = await loadCatalogs(token)

    const batchSize = 20
    let pageOffset = options.skip ?? 0
    let totalRecords = 0
    let syncedCount = 0, incompleteCount = 0, notProcessedCount = 0
    let updatedCount = 0, unchangedCount = 0
    let fetchedRecords = options.skip ?? 0
    const maxToProcess = options.limit ?? Infinity
    let processedInRun = 0

    while (processedInRun < maxToProcess) {
      if (signal.aborted) break

      const take = Math.min(batchSize, maxToProcess - processedInRun)
      const { items: batch, totalRecords: total } = await upstreamApiService.getCandidatesPaged(token, pageOffset, take, options.year)
      totalRecords = total
      if (batch.length === 0) break

      const fetchResults = await Promise.allSettled(batch.map(async (basicCand) => {
        const [detail, notes] = await Promise.all([
          upstreamApiService.getCandidateDetail(token, basicCand.candidateId),
          loadOrEmpty('Notes', () => upstreamApiService.getCandidateNotes(token, basicCand.candidateId)),
        ])
        return { basicCand, detail, notes }
      }))

      for (const result of fetchResults) {
        fetchedRecords++
        processedInRun++

        if (result.status === 'rejected') {
          log.error('Candidate detail fetch failed', result.reason instanceof Error ? result.reason : new Error(result.reason?.message ?? 'Fetch failed'), { pageOffset })
          notProcessedCount++
          emitEvent({ type: 'progress', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount, notProcessedCount, updatedCount, unchangedCount, skippedCount: 0, status: 'syncing' } })
          continue
        }

        const { basicCand, detail, notes } = result.value

        try {
          const entity = buildCandidateEntity(detail, notes, seniorities, mainSkills, countries, basicCand)
          const { dbId, resumeChanged, syncDetail } = upsertWithChangeDetection(entity, candidateChangeConfig)
          enqueueEmbeddingIfEligible(buildEmbeddingCandidate(entity, dbId), token)

          if (entity.status === 'incomplete') incompleteCount++
          else if (entity.status === 'not-processed') notProcessedCount++
          else {
            if (syncDetail === 'new') syncedCount++
            else if (syncDetail === 'updated') updatedCount++
            else unchangedCount++
          }

          emitEvent({ type: 'record', record: mapCandidateToDto(entity, resumeChanged, syncDetail) })
        } catch (err) {
          log.error(`Candidate upsert failed: ${basicCand.fullName} (${basicCand.candidateId})`, err instanceof Error ? err : new Error(String(err)), { upstreamId: basicCand.candidateId })
          notProcessedCount++
          emitEvent({ type: 'record', record: { id: `cand-${basicCand.candidateId}`, source: 'candidates', status: 'sync_failed', name: basicCand.fullName || 'Unknown', email: basicCand.email ?? '', hasResume: false, isBench: false, resumeChanged: false, upstreamId: basicCand.candidateId, syncDetail: 'fetch_failed', syncedAt: new Date().toISOString(), reason: err instanceof Error ? err.message : 'Unknown error' } })
        }

        emitEvent({ type: 'progress', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount, notProcessedCount, updatedCount, unchangedCount, skippedCount: 0, currentRecord: basicCand.fullName, status: 'syncing' } })

        if (processedInRun >= maxToProcess) break
      }

      pageOffset += batch.length
      if (pageOffset >= totalRecords) break
    }

    matchEngineService.invalidateFilterCache()
    log.info('Candidate sync finished', { totalRecords, fetchedRecords, syncedCount, updatedCount, unchangedCount, incompleteCount, notProcessedCount, status: signal.aborted ? 'paused' : 'completed' })
    emitEvent({ type: 'complete', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount, notProcessedCount, updatedCount, unchangedCount, skippedCount: 0, status: signal.aborted ? 'paused' : 'completed' } })
  },
}
