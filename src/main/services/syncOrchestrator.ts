import { upstreamApiService, type EmployeeDetail, type CandidateDetail, type EmployeeContract, type EmployeeRate, type PersonaNote, type OpenPositionListItem, type OpenPositionDetail, type PresentedCandidateItem } from './upstreamApiService'
import { catalogService } from './catalogService'
import { syncRepository, type SyncedEmployeeRow, type SyncedCandidateRow, type SyncedOpenPositionRow } from '../db/repositories/syncRepository'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { matchRepository } from '../db/repositories/matchRepository'
import { embeddingJobQueue } from './embeddingJobQueue'
import { getConfig } from '../config'
import { createLogger } from './logger'

const log = createLogger('SyncOrchestrator')

export interface SyncRecordDto {
  id: string
  source: string
  status: string
  name: string
  email: string
  seniority?: string
  mainSkill?: string
  country?: string
  grossMonthlySalary?: number | null
  expectedRate?: number | null
  currency?: string | null
  lastAccount?: string | null
  lastAccountStartDate?: string | null
  hasResume: boolean
  resumeNoteId?: number | null
  resumeFilename?: string | null
  isBench: boolean
  reason?: string | null
  resumeChanged: boolean
  upstreamId: number
  failed: boolean
  syncDetail?: string
  syncedAt: string
  resumeDateCreated?: string | null
  coeCertified?: boolean
  lastStatusUpdate?: string | null
  salaryExpectations?: number | null
  salaryExpectationsCurrency?: string | null
  jobTitle?: string
  candidateStatus?: string | null
  account?: string | null
  coe?: string | null
  practice?: string | null
  stakeholder?: string | null
  countries?: string | null
  seniorities?: string | null
  availableRange?: string | null
  positionStatus?: string | null
  aging?: number | null
  hasJobDescription?: boolean
  candidatesCount?: number
}

export interface SyncProgressDto {
  totalRecords: number
  fetchedRecords: number
  syncedCount: number
  incompleteCount: number
  notProcessedCount: number
  updatedCount: number
  unchangedCount: number
  skippedCount: number
  currentRecord?: string
  status: string
}

export type SyncEvent =
  | { type: 'record'; record: SyncRecordDto }
  | { type: 'progress'; progress: SyncProgressDto }
  | { type: 'complete'; progress: SyncProgressDto }
  | { type: 'error'; message: string }

interface SyncOptions {
  limit?: number
  skip?: number
  year?: number
}

const SUPPORTED_RESUME_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png'])

const EXCLUDED_JOB_TITLES = new Set([
  'centers of excellence', 'chief of staff', 'cloud center of excellence lead',
  'client success', 'country manager', 'delivery manager',
  'director, outcomes engagements', 'direcor, outcomes engagements',
  'director of people management', 'director, taas and caas engagements',
  'director, technical delivery', 'executive committee', 'external',
  'finance and legal', 'human resources', 'it and infrastructure',
  'operations and maintenance', 'people success',
])

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

function findResumeNote(notes: PersonaNote[]): PersonaNote | null {
  return notes
    .filter(n => n.noteTypeName === 'Resume' && n.filename && SUPPORTED_RESUME_EXTENSIONS.has(getExtension(n.filename)))
    .sort((a, b) => (b.dateCreated || '').localeCompare(a.dateCreated || ''))
    [0] ?? null
}

async function loadCatalogOrEmpty(name: string, getter: () => Promise<Map<number, string>>): Promise<Map<number, string>> {
  try {
    return await getter()
  } catch {
    log.warn(`Failed to load ${name} catalog — using fallback`)
    return new Map()
  }
}

async function loadOrEmpty<T>(name: string, getter: () => Promise<T[]>): Promise<T[]> {
  try {
    return await getter()
  } catch {
    log.warn(`Failed to load ${name} — continuing with empty list`)
    return []
  }
}

function buildEmployeeEntity(
  detail: EmployeeDetail,
  contracts: EmployeeContract[],
  rates: EmployeeRate[],
  notes: PersonaNote[],
  seniorities: Map<number, string>,
  mainSkills: Map<number, string>,
  countries: Map<number, string>,
  basicEmployee: EmployeeDetail
): Omit<SyncedEmployeeRow, 'id'> {
  const contract = contracts[0]
  const rate = rates
    .sort((a, b) => {
      const da = Date.parse(a.startDate) || 0
      const db = Date.parse(b.startDate) || 0
      return db - da
    })[0]
  const resumeNote = findResumeNote(notes)

  const seniority = seniorities.get(detail.seniority) ?? 'Unknown'
  const mainSkill = mainSkills.size > 0
    ? (mainSkills.get(detail.mainSkillId) ?? basicEmployee.mainSkillName)
    : basicEmployee.mainSkillName
  const country = countries.size > 0
    ? (countries.get(detail.countryId) ?? basicEmployee.officeName)
    : basicEmployee.officeName

  const isBench = rate
    ? rate.projectName.toLowerCase().includes('bench')
    : (!detail.accountName || detail.accountName.toLowerCase() === 'bench')

  const missingFields: string[] = []
  if (!detail.fullName) missingFields.push('FullName')
  if (!detail.email) missingFields.push('Email')
  if (seniority === 'Unknown') missingFields.push('Seniority')
  if (!mainSkill) missingFields.push('MainSkill')
  if (!resumeNote) missingFields.push('Resume')

  const recordStatus = missingFields.length === 0 ? 'synced' : 'incomplete'
  const statusReason = missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : null

  return {
    upstream_id: detail.userId,
    full_name: detail.fullName || '',
    email: detail.email || '',
    seniority,
    main_skill: mainSkill || '',
    country: country || '',
    gross_monthly_salary: contract?.salary ?? null,
    salary_currency: contract?.currencyCode ?? null,
    last_account: isBench ? null : (detail.accountName || null),
    last_account_start_date: rate?.startDate ?? null,
    rate: rate?.rate ?? null,
    has_resume: resumeNote ? 1 : 0,
    resume_note_id: resumeNote?.personaNoteId ?? null,
    resume_date_created: resumeNote?.dateCreated ?? null,
    resume_filename: resumeNote?.filename ?? null,
    is_bench: isBench ? 1 : 0,
    job_title: detail.jobTitle || basicEmployee.jobTitle || '',
    status: recordStatus,
    status_reason: statusReason,
    failed: 0,
    synced_at: new Date().toISOString(),
  }
}

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
    failed: 0,
    synced_at: new Date().toISOString(),
  }
}

function upsertEmployeeWithChangeDetection(entity: Omit<SyncedEmployeeRow, 'id'>): { dbId: number; resumeChanged: boolean; syncDetail: string } {
  const existing = syncRepository.findEmployeeByUpstreamId(entity.upstream_id)

  if (existing) {
    const infoChanged =
      existing.full_name !== entity.full_name ||
      existing.email !== entity.email ||
      existing.seniority !== entity.seniority ||
      existing.main_skill !== entity.main_skill ||
      existing.country !== entity.country ||
      existing.gross_monthly_salary !== entity.gross_monthly_salary ||
      existing.salary_currency !== entity.salary_currency ||
      existing.last_account !== entity.last_account ||
      existing.rate !== entity.rate ||
      existing.is_bench !== entity.is_bench ||
      existing.has_resume !== entity.has_resume ||
      existing.job_title !== entity.job_title

    const resumeChanged = entity.has_resume === 1 &&
      !!entity.resume_date_created &&
      (!existing.resume_date_created || entity.resume_date_created > existing.resume_date_created)

    if (!infoChanged && !resumeChanged) {
      const needsStatusFix = existing.status !== 'extracted' && existing.status !== 'vectorized' &&
        (existing.status !== entity.status || existing.failed === 1)
      if (needsStatusFix) {
        syncRepository.updateStatus('synced_employees', existing.id, entity.status, entity.status_reason ?? undefined)
      }
      return { dbId: existing.id, resumeChanged: false, syncDetail: 'unchanged' }
    }

    if (resumeChanged) {
      embeddingRepository.deleteBySource('employees', existing.id)
    }

    syncRepository.upsertEmployee(entity)
    return { dbId: existing.id, resumeChanged, syncDetail: 'updated' }
  }

  const dbId = syncRepository.upsertEmployee(entity)
  return { dbId, resumeChanged: false, syncDetail: 'new' }
}

function upsertCandidateWithChangeDetection(entity: Omit<SyncedCandidateRow, 'id'>): { dbId: number; resumeChanged: boolean; syncDetail: string } {
  const existing = syncRepository.findCandidateByUpstreamId(entity.upstream_id)

  if (existing) {
    const infoChanged =
      existing.full_name !== entity.full_name ||
      existing.email !== entity.email ||
      existing.seniority !== entity.seniority ||
      existing.main_skill !== entity.main_skill ||
      existing.country !== entity.country ||
      existing.current_salary !== entity.current_salary ||
      existing.salary_currency !== entity.salary_currency ||
      existing.coe_certified !== entity.coe_certified ||
      existing.candidate_status !== entity.candidate_status ||
      existing.has_resume !== entity.has_resume

    const resumeChanged = entity.has_resume === 1 &&
      !!entity.resume_date_created &&
      (!existing.resume_date_created || entity.resume_date_created > existing.resume_date_created)

    if (!infoChanged && !resumeChanged) {
      const needsStatusFix = existing.status !== 'extracted' && existing.status !== 'vectorized' &&
        (existing.status !== entity.status || existing.failed === 1)
      if (needsStatusFix) {
        syncRepository.updateStatus('synced_candidates', existing.id, entity.status, entity.status_reason ?? undefined)
      }
      return { dbId: existing.id, resumeChanged: false, syncDetail: 'unchanged' }
    }

    if (resumeChanged) {
      embeddingRepository.deleteBySource('candidates', existing.id)
    }

    syncRepository.upsertCandidate(entity)
    return { dbId: existing.id, resumeChanged, syncDetail: 'updated' }
  }

  const dbId = syncRepository.upsertCandidate(entity)
  return { dbId, resumeChanged: false, syncDetail: 'new' }
}

function enqueueEmbeddingIfEligible(
  source: string, dbId: number, upstreamId: number, name: string,
  resumeNoteId: number | null, resumeFilename: string | null,
  isBench: boolean, token: string, hasResume: number, status: string, model = 'voyage-4-large'
): void {
  if (hasResume !== 1 || status !== 'synced') return
  embeddingJobQueue.enqueue({
    source, dbId, upstreamId, name,
    resumeNoteId, resumeFilename,
    isBench, token, model,
  })
}

function mapEmployeeToDto(entity: Omit<SyncedEmployeeRow, 'id'> & { id?: number }, resumeChanged: boolean, syncDetail: string): SyncRecordDto {
  return {
    id: `emp-${entity.upstream_id}`,
    source: 'employees',
    status: entity.status,
    name: entity.full_name,
    email: entity.email,
    seniority: entity.seniority,
    mainSkill: entity.main_skill,
    country: entity.country,
    grossMonthlySalary: entity.gross_monthly_salary,
    currency: entity.salary_currency,
    expectedRate: entity.rate,
    lastAccount: entity.last_account,
    lastAccountStartDate: entity.last_account_start_date,
    hasResume: entity.has_resume === 1,
    resumeNoteId: entity.resume_note_id,
    resumeFilename: entity.resume_filename,
    isBench: entity.is_bench === 1,
    reason: entity.status_reason,
    resumeChanged,
    upstreamId: entity.upstream_id,
    failed: entity.failed === 1,
    syncDetail,
    syncedAt: entity.synced_at,
    resumeDateCreated: entity.resume_date_created,
    jobTitle: entity.job_title,
  }
}

function mapCandidateToDto(entity: Omit<SyncedCandidateRow, 'id'> & { id?: number }, resumeChanged: boolean, syncDetail: string): SyncRecordDto {
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
    resumeNoteId: entity.resume_note_id,
    resumeFilename: entity.resume_filename,
    isBench: false,
    reason: entity.status_reason,
    resumeChanged,
    upstreamId: entity.upstream_id,
    failed: entity.failed === 1,
    syncDetail,
    syncedAt: entity.synced_at,
    resumeDateCreated: entity.resume_date_created,
  }
}

let pauseRequested = false

export const syncOrchestrator = {
  requestPause(): void {
    pauseRequested = true
  },

  async syncAsync(
    source: string,
    token: string,
    options: SyncOptions,
    emitEvent: (event: SyncEvent) => void
  ): Promise<void> {
    pauseRequested = false
    try {
      if (source === 'employees') {
        await syncEmployees(token, options, emitEvent)
      } else if (source === 'candidates') {
        await syncCandidates(token, options, emitEvent)
      } else if (source === 'open-positions') {
        await syncOpenPositions(token, options, emitEvent)
      }
    } catch (err) {
      log.error(`Sync failed for source=${source}`, err instanceof Error ? err : new Error(String(err)))
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Unknown sync error' })
    }
  },

  async syncSingle(source: string, token: string, upstreamId: number): Promise<SyncRecordDto> {
    if (source === 'employees') return syncSingleEmployee(token, upstreamId)
    if (source === 'candidates') return syncSingleCandidate(token, upstreamId)
    throw new Error(`Unsupported source for single sync: ${source}`)
  },
}

async function syncSingleEmployee(token: string, upstreamId: number): Promise<SyncRecordDto> {
  const seniorities = await catalogService.getSeniorities(token)
  const mainSkills = await loadCatalogOrEmpty('MainSkill', () => catalogService.getMainSkills(token))
  const countries = await loadCatalogOrEmpty('Country', () => catalogService.getCountries(token))

  const detail = await upstreamApiService.getEmployeeDetail(token, upstreamId)
  const contracts = await loadOrEmpty('Contracts', () => upstreamApiService.getEmployeeContracts(token, upstreamId))
  const rates = await loadOrEmpty('Rates', () => upstreamApiService.getEmployeeRates(token, upstreamId))
  const notes = await loadOrEmpty('Notes', () => upstreamApiService.getEmployeeNotes(token, upstreamId))

  const basicFallback: EmployeeDetail = { userId: upstreamId, fullName: '', email: '', seniority: 0, mainSkillId: 0, countryId: 0, accountName: '', jobTitle: '', mainSkillName: '', officeName: '' }
  const entity = buildEmployeeEntity(detail, contracts, rates, notes, seniorities, mainSkills, countries, basicFallback)
  const { dbId, resumeChanged, syncDetail } = upsertEmployeeWithChangeDetection(entity)
  enqueueEmbeddingIfEligible('employees', dbId, entity.upstream_id, entity.full_name, entity.resume_note_id, entity.resume_filename, entity.is_bench === 1, token, entity.has_resume, entity.status)

  return mapEmployeeToDto(entity, resumeChanged, syncDetail)
}

async function syncSingleCandidate(token: string, upstreamId: number): Promise<SyncRecordDto> {
  const seniorities = await catalogService.getSeniorities(token)
  const mainSkills = await loadCatalogOrEmpty('MainSkill', () => catalogService.getMainSkills(token))
  const countries = await loadCatalogOrEmpty('Country', () => catalogService.getCountries(token))

  const detail = await upstreamApiService.getCandidateDetail(token, upstreamId)
  const notes = await loadOrEmpty('Notes', () => upstreamApiService.getCandidateNotes(token, upstreamId))

  const basicFallback: CandidateDetail = { candidateId: upstreamId, fullName: '' }
  const entity = buildCandidateEntity(detail, notes, seniorities, mainSkills, countries, basicFallback)
  const { dbId, resumeChanged, syncDetail } = upsertCandidateWithChangeDetection(entity)
  enqueueEmbeddingIfEligible('candidates', dbId, entity.upstream_id, entity.full_name, entity.resume_note_id, entity.resume_filename, false, token, entity.has_resume, entity.status)

  return mapCandidateToDto(entity, resumeChanged, syncDetail)
}

async function syncEmployees(token: string, options: SyncOptions, emitEvent: (event: SyncEvent) => void): Promise<void> {
  log.info('Employee sync started', { limit: options.limit, skip: options.skip })

  const seniorities = await catalogService.getSeniorities(token)
  const mainSkills = await loadCatalogOrEmpty('MainSkill', () => catalogService.getMainSkills(token))
  const countries = await loadCatalogOrEmpty('Country', () => catalogService.getCountries(token))

  let allEmployees: EmployeeDetail[] = []
  let pageOffset = 0
  let totalRecords = 0
  const pageSize = options.limit ? Math.min(100, options.limit) : 100

  while (true) {
    const { items, totalRecords: total } = await upstreamApiService.getEmployeesPaged(token, pageOffset, pageSize)
    totalRecords = total
    allEmployees.push(...items)
    pageOffset += items.length
    if (pageOffset >= totalRecords || items.length === 0) break
    if (options.limit && allEmployees.length >= options.limit) break
  }

  if (options.limit && allEmployees.length > options.limit) {
    allEmployees = allEmployees.slice(0, options.limit)
  }

  log.info('Employee list fetched', { totalFromApi: totalRecords, fetched: allEmployees.length })

  const excludedCount = allEmployees.filter(e => EXCLUDED_JOB_TITLES.has(e.jobTitle.toLowerCase())).length
  allEmployees = allEmployees.filter(e => !EXCLUDED_JOB_TITLES.has(e.jobTitle.toLowerCase()))

  if (options.skip && options.skip > 0) {
    allEmployees = allEmployees.slice(options.skip)
  }

  const totalAfterFilter = allEmployees.length + (options.skip ?? 0)
  totalRecords = options.limit ? Math.min(totalRecords, totalAfterFilter) : totalAfterFilter

  let syncedCount = 0, incompleteCount = 0, notProcessedCount = 0
  let updatedCount = 0, unchangedCount = 0
  let fetchedRecords = options.skip ?? 0

  const batchSize = 5

  for (let batchStart = 0; batchStart < allEmployees.length; batchStart += batchSize) {
    if (pauseRequested) break

    const batch = allEmployees.slice(batchStart, batchStart + batchSize)

    const fetchResults = await Promise.allSettled(batch.map(async (basicEmp) => {
      const [detail, contracts, rates, notes] = await Promise.all([
        upstreamApiService.getEmployeeDetail(token, basicEmp.userId),
        loadOrEmpty('Contracts', () => upstreamApiService.getEmployeeContracts(token, basicEmp.userId)),
        loadOrEmpty('Rates', () => upstreamApiService.getEmployeeRates(token, basicEmp.userId)),
        loadOrEmpty('Notes', () => upstreamApiService.getEmployeeNotes(token, basicEmp.userId)),
      ])
      return { basicEmp, detail, contracts, rates, notes }
    }))

    for (const result of fetchResults) {
      fetchedRecords++

      if (result.status === 'rejected') {
        const reason = result.reason?.message ?? 'Fetch failed'
        log.error('Employee detail fetch failed', result.reason instanceof Error ? result.reason : new Error(reason), { batchIndex: batchStart })
        notProcessedCount++
        emitEvent({ type: 'record', record: { id: `emp-0`, source: 'employees', status: 'not-processed', name: 'Unknown', email: '', hasResume: false, isBench: false, resumeChanged: false, upstreamId: 0, failed: false, syncDetail: 'error', syncedAt: new Date().toISOString(), reason } })
        continue
      }

      const { basicEmp, detail, contracts, rates, notes } = result.value

      try {
        const entity = buildEmployeeEntity(detail, contracts, rates, notes, seniorities, mainSkills, countries, basicEmp)
        const { dbId, resumeChanged, syncDetail } = upsertEmployeeWithChangeDetection(entity)
        enqueueEmbeddingIfEligible('employees', dbId, entity.upstream_id, entity.full_name, entity.resume_note_id, entity.resume_filename, entity.is_bench === 1, token, entity.has_resume, entity.status)

        if (entity.status === 'incomplete') incompleteCount++
        else if (entity.status === 'not-processed') notProcessedCount++
        else {
          if (syncDetail === 'new') syncedCount++
          else if (syncDetail === 'updated') updatedCount++
          else unchangedCount++
        }

        emitEvent({ type: 'record', record: mapEmployeeToDto(entity, resumeChanged, syncDetail) })
      } catch (err) {
        log.error(`Employee upsert failed: ${basicEmp.fullName} (${basicEmp.userId})`, err instanceof Error ? err : new Error(String(err)), { upstreamId: basicEmp.userId })
        notProcessedCount++
        emitEvent({ type: 'record', record: { id: `emp-${basicEmp.userId}`, source: 'employees', status: 'not-processed', name: basicEmp.fullName || 'Unknown', email: basicEmp.email || '', hasResume: false, isBench: false, resumeChanged: false, upstreamId: basicEmp.userId, failed: false, syncDetail: 'error', syncedAt: new Date().toISOString(), reason: err instanceof Error ? err.message : 'Unknown error' } })
      }

      emitEvent({ type: 'progress', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount, notProcessedCount, updatedCount, unchangedCount, skippedCount: excludedCount, currentRecord: basicEmp.fullName, status: 'syncing' } })
    }
  }

  log.info('Employee sync finished', { totalRecords, fetchedRecords, syncedCount, updatedCount, unchangedCount, incompleteCount, notProcessedCount, excludedCount, status: pauseRequested ? 'paused' : 'completed' })
  emitEvent({ type: 'complete', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount, notProcessedCount, updatedCount, unchangedCount, skippedCount: excludedCount, status: pauseRequested ? 'paused' : 'completed' } })
}

async function syncCandidates(token: string, options: SyncOptions, emitEvent: (event: SyncEvent) => void): Promise<void> {
  log.info('Candidate sync started', { limit: options.limit, skip: options.skip, year: options.year })

  const seniorities = await catalogService.getSeniorities(token)
  const mainSkills = await loadCatalogOrEmpty('MainSkill', () => catalogService.getMainSkills(token))
  const countries = await loadCatalogOrEmpty('Country', () => catalogService.getCountries(token))

  const batchSize = 20
  let pageOffset = options.skip ?? 0
  let totalRecords = 0
  let syncedCount = 0, incompleteCount = 0, notProcessedCount = 0
  let updatedCount = 0, unchangedCount = 0
  let fetchedRecords = options.skip ?? 0
  const maxToProcess = options.limit ?? Infinity
  let processedInRun = 0

  while (processedInRun < maxToProcess) {
    if (pauseRequested) break

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
        const { dbId, resumeChanged, syncDetail } = upsertCandidateWithChangeDetection(entity)
        enqueueEmbeddingIfEligible('candidates', dbId, entity.upstream_id, entity.full_name, entity.resume_note_id, entity.resume_filename, false, token, entity.has_resume, entity.status)

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
        emitEvent({ type: 'record', record: { id: `cand-${basicCand.candidateId}`, source: 'candidates', status: 'not-processed', name: basicCand.fullName || 'Unknown', email: basicCand.email ?? '', hasResume: false, isBench: false, resumeChanged: false, upstreamId: basicCand.candidateId, failed: false, syncDetail: 'error', syncedAt: new Date().toISOString(), reason: err instanceof Error ? err.message : 'Unknown error' } })
      }

      emitEvent({ type: 'progress', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount, notProcessedCount, updatedCount, unchangedCount, skippedCount: 0, currentRecord: basicCand.fullName, status: 'syncing' } })

      if (processedInRun >= maxToProcess) break
    }

    pageOffset += batch.length
    if (pageOffset >= totalRecords) break
  }

  log.info('Candidate sync finished', { totalRecords, fetchedRecords, syncedCount, updatedCount, unchangedCount, incompleteCount, notProcessedCount, status: pauseRequested ? 'paused' : 'completed' })
  emitEvent({ type: 'complete', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount, notProcessedCount, updatedCount, unchangedCount, skippedCount: 0, status: pauseRequested ? 'paused' : 'completed' } })
}

async function syncOpenPositions(token: string, options: SyncOptions, emitEvent: (event: SyncEvent) => void): Promise<void> {
  log.info('Open positions sync started', { limit: options.limit, skip: options.skip })

  let allPositions: OpenPositionListItem[] = []
  let pageOffset = 0
  let totalRecords = 0
  const pageSize = options.limit ? Math.min(100, options.limit) : 100

  while (true) {
    const { items, totalRecords: total } = await upstreamApiService.getOpenPositionsPaged(token, pageOffset, pageSize)
    totalRecords = total
    allPositions.push(...items)
    pageOffset += items.length
    if (pageOffset >= totalRecords || items.length === 0) break
    if (options.limit && allPositions.length >= options.limit) break
  }

  if (options.limit && allPositions.length > options.limit) {
    allPositions = allPositions.slice(0, options.limit)
  }

  if (options.skip && options.skip > 0) {
    allPositions = allPositions.slice(options.skip)
  }

  totalRecords = allPositions.length
  let syncedCount = 0, fetchedRecords = 0

  for (const pos of allPositions) {
    if (pauseRequested) break
    fetchedRecords++

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
        failed: 0,
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
      emitEvent({
        type: 'record',
        record: {
          id: `pos-${pos.id}`, source: 'open-positions', status: 'synced',
          name: `${pos.account} - ${detail?.jobTitle ?? pos.mainSkill}`,
          email: '', hasResume: false, isBench: false, resumeChanged: false,
          upstreamId: pos.id, failed: false, syncDetail: 'new',
          syncedAt: new Date().toISOString(),
          account: pos.account, coe: pos.coe, practice: pos.practice,
          stakeholder: pos.stakeholder, mainSkill: pos.mainSkill,
          countries: pos.countries, seniorities: pos.seniorities,
          availableRange: pos.availableRange, positionStatus: pos.status,
          aging: pos.aging, hasJobDescription: hasJd, candidatesCount: candidates.length,
        },
      })
    } catch (err) {
      log.error(`Open position sync failed: ${pos.account} (${pos.id})`, err instanceof Error ? err : new Error(String(err)), { upstreamId: pos.id })
      emitEvent({ type: 'record', record: { id: `pos-${pos.id}`, source: 'open-positions', status: 'not-processed', name: pos.account || 'Unknown', email: '', hasResume: false, isBench: false, resumeChanged: false, upstreamId: pos.id, failed: false, syncDetail: 'error', syncedAt: new Date().toISOString(), reason: err instanceof Error ? err.message : 'Unknown error' } })
    }

    emitEvent({ type: 'progress', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount: 0, notProcessedCount: 0, updatedCount: 0, unchangedCount: 0, skippedCount: 0, currentRecord: pos.account, status: 'syncing' } })
  }

  log.info('Open positions sync finished', { totalRecords, fetchedRecords, syncedCount, status: pauseRequested ? 'paused' : 'completed' })
  emitEvent({ type: 'complete', progress: { totalRecords, fetchedRecords, syncedCount, incompleteCount: 0, notProcessedCount: 0, updatedCount: 0, unchangedCount: 0, skippedCount: 0, status: pauseRequested ? 'paused' : 'completed' } })
}
