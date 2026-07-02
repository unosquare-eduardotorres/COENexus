import { upstreamApiService, type EmployeeDetail, type EmployeeContract, type EmployeeRate, type PersonaNote, type TeamCompositionEntry } from '../upstreamApiService'
import { syncRepository, type SyncedEmployeeRow } from '../../db/repositories/syncRepository'
import { createLogger } from '../logger'
import { upsertWithChangeDetection, type ChangeDetectionConfig } from './changeDetection'

import { findResumeNote, loadOrEmpty, loadCatalogs, isBenchFromComposition } from './syncUtils'
import { matchEngineService } from '../matchEngineService'
import { salaryNormalizationService } from '../salaryNormalizationService'
import { resolveCatalogValue, validateRecordFields, str } from './entityFieldMappers'
import { emitSyncProgress, emitSyncComplete, createSyncCounters } from './syncProgressHelper'
import type { SyncRecordDto, SyncEvent, SyncOptions, EmployeeSyncRecord } from './syncTypes'

const log = createLogger('SyncEmployeeOrchestrator')

const EXCLUDED_JOB_TITLES = new Set([
  'centers of excellence', 'chief of staff', 'cloud center of excellence lead',
  'client success', 'country manager', 'delivery manager',
  'director, outcomes engagements', 'direcor, outcomes engagements',
  'director of people management', 'director, taas and caas engagements',
  'director, technical delivery', 'executive committee', 'external',
  'finance and legal', 'human resources', 'it and infrastructure',
  'operations and maintenance', 'people success',
])

function buildEmployeeEntity(
  detail: EmployeeDetail,
  contracts: EmployeeContract[],
  rates: EmployeeRate[],
  notes: PersonaNote[],
  compositions: TeamCompositionEntry[],
  seniorities: Map<number, string>,
  mainSkills: Map<number, string>,
  countries: Map<number, string>,
  basicEmployee: EmployeeDetail,
  benchUpstreamIds?: Set<number>,
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
  const mainSkill = resolveCatalogValue(mainSkills, detail.mainSkillId, basicEmployee.mainSkillName, '')
  const country = resolveCatalogValue(countries, detail.countryId, basicEmployee.officeName, '')

  const compositionBench = isBenchFromComposition(compositions)
  const isInBenchApi = benchUpstreamIds?.has(detail.userId) ?? false
  const isBench = compositionBench.isBench || isInBenchApi
  const benchTeam = compositionBench.benchTeam
    ?? (isInBenchApi ? 'Bench (upstream API)' : null)

  const { status: recordStatus, statusReason } = validateRecordFields([
    { field: 'FullName', present: !!detail.fullName },
    { field: 'Email', present: !!detail.email },
    { field: 'Seniority', present: seniority !== 'Unknown' },
    { field: 'MainSkill', present: !!mainSkill },
    { field: 'Resume', present: !!resumeNote },
  ])

  const grossMonthlySalary = contract?.salary ?? null
  const salaryCurrency = contract?.currencyCode ?? null
  const rateValue = rate?.rate ?? null

  let normalizedMonthlyUsd: number | null = null
  let inferredCurrency: string | null = null
  let currencyConfidence: string | null = null

  if (grossMonthlySalary) {
    const norm = salaryNormalizationService.normalizeSalary({
      amount: grossMonthlySalary,
      currency: salaryCurrency,
      country: country || null,
      seniority,
    })
    normalizedMonthlyUsd = norm.normalizedMonthlyUsd
    inferredCurrency = norm.inferredCurrency
    currencyConfidence = norm.currencyConfidence
  } else if (rateValue) {
    const norm = salaryNormalizationService.normalizeSalary({
      amount: rateValue,
      currency: 'USD',
      country: country || null,
      period: 'hourly',
    })
    normalizedMonthlyUsd = norm.normalizedMonthlyUsd
    inferredCurrency = 'USD'
    currencyConfidence = 'low'
  }

  return {
    upstream_id: detail.userId,
    full_name: str(detail.fullName),
    email: str(detail.email),
    seniority,
    main_skill: str(mainSkill),
    country: str(country),
    gross_monthly_salary: grossMonthlySalary,
    salary_currency: salaryCurrency,
    last_account: isBench ? null : (detail.accountName || null),
    last_account_start_date: rate?.startDate ?? null,
    rate: rateValue,
    has_resume: resumeNote ? 1 : 0,
    resume_note_id: resumeNote?.personaNoteId ?? null,
    resume_date_created: resumeNote?.dateCreated ?? null,
    resume_filename: resumeNote?.filename ?? null,
    is_bench: isBench ? 1 : 0,
    bench_team: benchTeam,
    job_title: str(detail.jobTitle, str(basicEmployee.jobTitle)),
    functional_unit: str(detail.functionalUnit, str(basicEmployee.functionalUnit)),
    office_location: str(basicEmployee.officeName, str(detail.officeName)),
    business_unit: str(detail.businessUnit, str(basicEmployee.businessUnit)),
    normalized_monthly_usd: normalizedMonthlyUsd,
    inferred_currency: inferredCurrency,
    currency_confidence: currencyConfidence,
    status: recordStatus,
    status_reason: statusReason,
    synced_at: new Date().toISOString(),
  }
}

const employeeChangeConfig: ChangeDetectionConfig<SyncedEmployeeRow> = {
  tableName: 'synced_employees',
  source: 'employees',
  findByUpstreamId: (upstreamId) => syncRepository.findEmployeeByUpstreamId(upstreamId),
  upsert: (entity) => syncRepository.upsertEmployee(entity),
  hasInfoChanged: (existing, entity) =>
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
    existing.bench_team !== entity.bench_team ||
    existing.has_resume !== entity.has_resume ||
    existing.job_title !== entity.job_title ||
    existing.functional_unit !== entity.functional_unit ||
    existing.office_location !== entity.office_location ||
    existing.business_unit !== entity.business_unit,
}

function mapEmployeeToDto(entity: Omit<SyncedEmployeeRow, 'id'> & { id?: number }, resumeChanged: boolean, syncDetail: string): EmployeeSyncRecord {
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
    isBench: entity.is_bench === 1,
    reason: entity.status_reason,
    resumeChanged,
    upstreamId: entity.upstream_id,
    syncDetail,
    syncedAt: entity.synced_at,
    resumeDateCreated: entity.resume_date_created,
    jobTitle: entity.job_title,
    functionalUnit: entity.functional_unit,
    officeLocation: entity.office_location,
    businessUnit: entity.business_unit,
  }
}


export const syncEmployeeOrchestrator = {
  async syncSingle(token: string, upstreamId: number, signal?: AbortSignal, benchUpstreamIds?: Set<number>): Promise<SyncRecordDto> {
    const { seniorities, mainSkills, countries } = await loadCatalogs(token, signal)

    const [detail, contracts, rates, notes, compositions] = await Promise.all([
      upstreamApiService.getEmployeeDetail(token, upstreamId, signal),
      loadOrEmpty('Contracts', () => upstreamApiService.getEmployeeContracts(token, upstreamId, signal)),
      loadOrEmpty('Rates', () => upstreamApiService.getEmployeeRates(token, upstreamId, signal)),
      loadOrEmpty('Notes', () => upstreamApiService.getEmployeeNotes(token, upstreamId, signal)),
      loadOrEmpty('Compositions', () => upstreamApiService.getEmployeeTeamComposition(token, upstreamId, signal)),
    ])

    if (compositions.length === 0) {
      log.warn(`Empty compositions for employee ${upstreamId} (${detail.fullName})`)
    } else {
      const { isBench } = isBenchFromComposition(compositions)
      const activeTeams = compositions.filter(c => !c.endDate).map(c => c.team)
      log.debug(`Compositions for ${upstreamId}: ${compositions.length} entries, active teams: [${activeTeams.join(', ')}], isBench=${isBench}`)
    }

    const basicFallback: EmployeeDetail = { userId: upstreamId, fullName: '', email: '', seniority: 0, mainSkillId: 0, countryId: 0, accountName: '', jobTitle: '', mainSkillName: '', officeName: '', functionalUnit: '', businessUnit: '' }
    const entity = buildEmployeeEntity(detail, contracts, rates, notes, compositions, seniorities, mainSkills, countries, basicFallback, benchUpstreamIds)
    const { dbId, resumeChanged, syncDetail } = upsertWithChangeDetection(entity, employeeChangeConfig)
    matchEngineService.invalidateFilterCache()

    return mapEmployeeToDto(entity, resumeChanged, syncDetail)
  },

  async sync(token: string, options: SyncOptions, emitEvent: (event: SyncEvent) => void, signal: AbortSignal, benchUpstreamIds?: Set<number>): Promise<void> {
    log.info('Employee sync started', { limit: options.limit, skip: options.skip })

    const { seniorities, mainSkills, countries } = await loadCatalogs(token)

    let pageOffset = 0
    const pageSize = options.limit ? Math.min(100, options.limit) : 100
    const counters = createSyncCounters(options.skip ?? 0)
    let excludedCount = 0
    let processedInRun = 0
    const maxToProcess = options.limit ?? Infinity

    const batchSize = 5

    while (processedInRun < maxToProcess) {
      if (signal.aborted) break

      const { items, totalRecords: total } = await upstreamApiService.getEmployeesPaged(token, pageOffset, pageSize)
      counters.totalRecords = total
      if (items.length === 0) break

      let batch = items

      const excludedInBatch = batch.filter(e => EXCLUDED_JOB_TITLES.has(e.jobTitle.toLowerCase())).length
      excludedCount += excludedInBatch
      batch = batch.filter(e => !EXCLUDED_JOB_TITLES.has(e.jobTitle.toLowerCase()))

      if (options.skip && options.skip > counters.fetchedRecords) {
        const toSkip = options.skip - counters.fetchedRecords
        batch = batch.slice(toSkip)
      }

      for (let batchStart = 0; batchStart < batch.length; batchStart += batchSize) {
        if (signal.aborted) break

        const chunk = batch.slice(batchStart, batchStart + batchSize)

        const fetchResults = await Promise.allSettled(chunk.map(async (basicEmp) => {
          const [detail, contracts, rates, notes, compositions] = await Promise.all([
            upstreamApiService.getEmployeeDetail(token, basicEmp.userId),
            loadOrEmpty('Contracts', () => upstreamApiService.getEmployeeContracts(token, basicEmp.userId)),
            loadOrEmpty('Rates', () => upstreamApiService.getEmployeeRates(token, basicEmp.userId)),
            loadOrEmpty('Notes', () => upstreamApiService.getEmployeeNotes(token, basicEmp.userId)),
            loadOrEmpty('Compositions', () => upstreamApiService.getEmployeeTeamComposition(token, basicEmp.userId)),
          ])
          return { basicEmp, detail, contracts, rates, notes, compositions }
        }))

        for (let i = 0; i < fetchResults.length; i++) {
          const result = fetchResults[i]
          const basicEmp = chunk[i]
          counters.fetchedRecords++
          processedInRun++

          if (result.status === 'rejected') {
            const reason = result.reason?.message ?? 'Fetch failed'
            log.error(`Employee detail fetch failed: ${basicEmp.fullName} (${basicEmp.userId})`, result.reason instanceof Error ? result.reason : new Error(reason), { upstreamId: basicEmp.userId })
            syncRepository.upsertSyncFailed('synced_employees', {
              upstream_id: basicEmp.userId,
              full_name: basicEmp.fullName || 'Unknown',
              status: 'sync_failed',
              status_reason: reason,
            })
            counters.notProcessedCount++
            emitEvent({ type: 'record', record: { id: `emp-${basicEmp.userId}`, source: 'employees', status: 'sync_failed', name: basicEmp.fullName || 'Unknown', email: basicEmp.email || '', hasResume: false, isBench: false, resumeChanged: false, upstreamId: basicEmp.userId, syncDetail: 'fetch_failed', syncedAt: new Date().toISOString(), reason, seniority: '', mainSkill: '', country: '' } })
            continue
          }

          const { detail, contracts, rates, notes, compositions } = result.value

          try {
            const entity = buildEmployeeEntity(detail, contracts, rates, notes, compositions, seniorities, mainSkills, countries, basicEmp, benchUpstreamIds)
            const { dbId, resumeChanged, syncDetail } = upsertWithChangeDetection(entity, employeeChangeConfig)
            if (entity.status === 'incomplete') counters.incompleteCount++
            else if (entity.status === 'not-processed') counters.notProcessedCount++
            else {
              if (syncDetail === 'new') counters.syncedCount++
              else if (syncDetail === 'updated') counters.updatedCount++
              else counters.unchangedCount++
            }

            emitEvent({ type: 'record', record: mapEmployeeToDto(entity, resumeChanged, syncDetail) })
          } catch (err) {
            log.error(`Employee upsert failed: ${basicEmp.fullName} (${basicEmp.userId})`, err instanceof Error ? err : new Error(String(err)), { upstreamId: basicEmp.userId })
            counters.notProcessedCount++
            emitEvent({ type: 'record', record: { id: `emp-${basicEmp.userId}`, source: 'employees', status: 'sync_failed', name: basicEmp.fullName || 'Unknown', email: basicEmp.email || '', hasResume: false, isBench: false, resumeChanged: false, upstreamId: basicEmp.userId, syncDetail: 'upsert_failed', syncedAt: new Date().toISOString(), reason: err instanceof Error ? err.message : 'Unknown error', seniority: '', mainSkill: '', country: '' } })
          }

          counters.skippedCount = excludedCount
          emitSyncProgress(emitEvent, 'employees', counters, basicEmp.fullName)

          if (processedInRun >= maxToProcess) break
        }
      }

      pageOffset += items.length
      if (pageOffset >= counters.totalRecords) break
    }

    matchEngineService.invalidateFilterCache()
    counters.skippedCount = excludedCount
    log.info('Employee sync finished', { ...counters, excludedCount, status: signal.aborted ? 'paused' : 'completed' })
    emitSyncComplete(emitEvent, 'employees', counters, signal.aborted)
  },
}
