import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { MatchSearchRequest, MatchConfirmHaikuParams, MatchResumeTextParams } from '../../../shared/ipc-types'
import type { BenchBurnRequest, ExternalCandidateMatchRequest } from '../../../renderer/apps/resume/types'
import { validateSender } from '../validate'
import { getMainWindow } from '../../index'
import { matchEngineService } from '../../services/matchEngineService'
import { benchBurnService } from '../../services/benchBurnService'
import { matchSearchCoordinator } from '../../services/matchSearchCoordinator'
import { syncRepository } from '../../db/repositories/syncRepository'
import type { SyncedEmployeeRow, SyncedCandidateRow, SyncedOpenPositionRow } from '../../db/repositories/syncRepository'
import { embeddingRepository } from '../../db/repositories/embeddingRepository'
import { matchRepository } from '../../db/repositories/matchRepository'
import { claudeService } from '../../services/claudeService'
import type { MatchRankPositionsParams, MatchRankPositionsForTextParams, MatchToPositionsParams } from '../../../shared/ipc-types'
import { validatePayload, matchSearchSchema, matchConfirmHaikuSchema, matchResumeTextSchema, benchBurnSchema, externalCandidateSchema, matchRankPositionsSchema, matchRankPositionsForTextSchema, matchToPositionsSchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'
import { createLogger } from '../../services/logger'

const log = createLogger('MatchIPC')

function mapEmployeeToBenchDto(row: SyncedEmployeeRow, vectorizedIds?: Set<number>) {
  return {
    upstreamId: row.upstream_id,
    name: row.full_name,
    email: row.email,
    seniority: row.seniority,
    mainSkill: row.main_skill,
    country: row.country,
    grossMonthlySalary: row.gross_monthly_salary,
    salaryCurrency: row.salary_currency,
    lastAccount: row.last_account,
    isVectorized: vectorizedIds ? vectorizedIds.has(row.id) : row.status === 'vectorized',
    isBench: row.is_bench === 1,
    hasResume: row.has_resume === 1,
  }
}

function mapCandidateToListDto(row: SyncedCandidateRow, vectorizedIds?: Set<number>) {
  return {
    upstreamId: row.upstream_id,
    name: row.full_name,
    email: row.email ?? '',
    seniority: row.seniority ?? '',
    mainSkill: row.main_skill ?? '',
    country: row.country ?? '',
    currentSalary: row.current_salary,
    salaryCurrency: row.salary_currency ?? '',
    coeCertified: row.coe_certified === 1,
    candidateStatus: row.candidate_status ?? '',
    hasResume: row.has_resume === 1,
    isVectorized: vectorizedIds ? vectorizedIds.has(row.id) : row.status === 'vectorized',
  }
}

function mapPositionToBenchDto(row: SyncedOpenPositionRow, vectorizedIds?: Set<number>) {
  return {
    upstreamId: row.upstream_id,
    id: row.id,
    account: row.account,
    coe: row.coe,
    practice: row.practice,
    stakeholder: row.stakeholder,
    mainSkill: row.main_skill,
    jobTitle: row.job_title,
    jobDescription: row.job_description,
    verticalIndustry: row.vertical_industry,
    seniorities: row.seniorities,
    positionStatus: row.position_status,
    aging: row.aging,
    availableRange: row.available_range,
    countries: row.countries,
    isVectorized: vectorizedIds ? vectorizedIds.has(row.id) : row.status === 'vectorized',
  }
}

function mapEmployeeRows(rows: SyncedEmployeeRow[]) {
  const vectorizedIds = embeddingRepository.getVectorizedSourceIds('employees', rows.map(r => r.id))
  return rows.map(r => mapEmployeeToBenchDto(r, vectorizedIds))
}

function mapCandidateRows(rows: SyncedCandidateRow[]) {
  const vectorizedIds = embeddingRepository.getVectorizedSourceIds('candidates', rows.map(r => r.id))
  return rows.map(r => mapCandidateToListDto(r, vectorizedIds))
}

function mapPositionRows(rows: SyncedOpenPositionRow[]) {
  const vectorizedIds = embeddingRepository.getVectorizedSourceIds('positions', rows.map(r => r.id))
  return rows.map(r => mapPositionToBenchDto(r, vectorizedIds))
}

export function registerMatchHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.MATCH_POOL_COUNTS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return matchEngineService.getPoolCounts()
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_FILTER_OPTIONS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return matchEngineService.getFilterOptions()
    })

  async function handleMatchSearch(event: IpcMainInvokeEvent, request: MatchSearchRequest, channelName: string) {
    validateSender(event)
    const validated = validatePayload(matchSearchSchema, request, channelName)
    log.info('Match search requested', { dataSource: validated.dataSource, topN: validated.topN, searchMode: validated.searchMode })
    const win = getMainWindow()
    const sessionId = await matchEngineService.searchAsync(validated, (evt) => {
      win?.webContents.send(IPC_CHANNELS.MATCH_SEARCH_EVENT, evt)
    })
    win?.webContents.send(IPC_CHANNELS.MATCH_SEARCH_EVENT, { type: 'complete' })
    return { sessionId }
  }

  registerIpcHandler(IPC_CHANNELS.MATCH_SEARCH,
    (event: IpcMainInvokeEvent, request: MatchSearchRequest) => handleMatchSearch(event, request, IPC_CHANNELS.MATCH_SEARCH))

  registerIpcHandler(IPC_CHANNELS.MATCH_CANCEL_SEARCH,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      matchSearchCoordinator.tryResolveAll('cancel')
      return { cancelled: true }
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_CONFIRM_HAIKU,
    async (event: IpcMainInvokeEvent, params: MatchConfirmHaikuParams) => {
      validateSender(event)
      const validated = validatePayload(matchConfirmHaikuSchema, params, IPC_CHANNELS.MATCH_CONFIRM_HAIKU)
      const resolved = matchSearchCoordinator.tryResolve(validated.searchId, validated.action)
      return { confirmed: resolved }
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_SEARCH_SESSION,
    (event: IpcMainInvokeEvent, params: MatchSearchRequest) => handleMatchSearch(event, params, IPC_CHANNELS.MATCH_SEARCH_SESSION))

  registerIpcHandler(IPC_CHANNELS.MATCH_LIST_SESSIONS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return matchEngineService.listSessions()
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_GET_SESSION,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      return matchEngineService.getSession(id)
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_PROXY_STATUS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      const available = await claudeService.checkAvailability()
      return { available }
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_BENCH_EMPLOYEES,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return mapEmployeeRows(syncRepository.getBenchEmployees())
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_ALL_EMPLOYEES,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return mapEmployeeRows(syncRepository.getAllEmployees())
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_ALL_CANDIDATES,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return mapCandidateRows(syncRepository.getAllCandidates())
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_SEARCH_CANDIDATES,
    async (event: IpcMainInvokeEvent, query: string) => {
      validateSender(event)
      if (!query || query.length < 3) return []
      return mapCandidateRows(syncRepository.searchCandidates(query))
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_SEARCH_EMPLOYEES,
    async (event: IpcMainInvokeEvent, query: string) => {
      validateSender(event)
      if (!query || query.length < 3) return []
      return mapEmployeeRows(syncRepository.searchEmployees(query))
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_CANDIDATE_COUNT,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return syncRepository.getCandidateCount()
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_EMPLOYEE_COUNT,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return syncRepository.getEmployeeCount()
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_OPEN_POSITIONS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return mapPositionRows(syncRepository.getAvailableOpenPositions())
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_BENCH_BURN_SESSION,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      return matchRepository.getSessionParsed(id)
    })

  async function handleBenchBurn(event: IpcMainInvokeEvent, params: BenchBurnRequest, channelName: string) {
    validateSender(event)
    const validated = validatePayload(benchBurnSchema, params, channelName)
    log.info('Bench burn requested', { employeeCount: validated.employeeUpstreamIds.length, positionCount: validated.positionUpstreamIds.length })
    const win = getMainWindow()
    const sessionId = await benchBurnService.executeAsync(validated, (evt) => {
      win?.webContents.send(IPC_CHANNELS.MATCH_BENCH_BURN_EVENT, evt)
    })
    win?.webContents.send(IPC_CHANNELS.MATCH_BENCH_BURN_EVENT, { type: 'complete' })
    return { sessionId }
  }

  registerIpcHandler(IPC_CHANNELS.MATCH_BENCH_BURN,
    (event: IpcMainInvokeEvent, params: BenchBurnRequest) => handleBenchBurn(event, params, IPC_CHANNELS.MATCH_BENCH_BURN))

  registerIpcHandler(IPC_CHANNELS.MATCH_BENCH_BURN_RETRY,
    (event: IpcMainInvokeEvent, params: BenchBurnRequest) => handleBenchBurn(event, params, IPC_CHANNELS.MATCH_BENCH_BURN_RETRY))

  registerIpcHandler(IPC_CHANNELS.MATCH_RESUME_TEXT,
    async (event: IpcMainInvokeEvent, params: MatchResumeTextParams) => {
      validateSender(event)
      const validated = validatePayload(matchResumeTextSchema, params, IPC_CHANNELS.MATCH_RESUME_TEXT)
      const text = matchEngineService.getResumeText(validated.sourceType, validated.upstreamId)
      return { text }
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_EXTERNAL_CANDIDATE,
    async (event: IpcMainInvokeEvent, params: ExternalCandidateMatchRequest) => {
      validateSender(event)
      const validated = validatePayload(externalCandidateSchema, params, IPC_CHANNELS.MATCH_EXTERNAL_CANDIDATE)
      const win = getMainWindow()
      const sessionId = await benchBurnService.executeExternalCandidateAsync(validated, (evt) => {
        win?.webContents.send(IPC_CHANNELS.MATCH_SEARCH_EVENT, evt)
      })
      win?.webContents.send(IPC_CHANNELS.MATCH_SEARCH_EVENT, { type: 'complete' })
      return { sessionId }
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_ANALYSIS_CACHE_STATS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return matchRepository.getAnalysisCacheStats()
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_CLEAR_ANALYSIS_CACHE,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      const result = matchRepository.clearAnalysisCache()
      log.info('Analysis cache cleared', { deleted: result.deleted })
      return result
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_RANK_POSITIONS,
    async (event: IpcMainInvokeEvent, params: MatchRankPositionsParams) => {
      validateSender(event)
      const validated = validatePayload(matchRankPositionsSchema, params, IPC_CHANNELS.MATCH_RANK_POSITIONS)
      return { positions: benchBurnService.rankPositionsForPerson(validated.sourceType, validated.upstreamId, validated.topN) }
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_RANK_POSITIONS_FOR_TEXT,
    async (event: IpcMainInvokeEvent, params: MatchRankPositionsForTextParams) => {
      validateSender(event)
      const validated = validatePayload(matchRankPositionsForTextSchema, params, IPC_CHANNELS.MATCH_RANK_POSITIONS_FOR_TEXT)
      return { positions: await benchBurnService.rankPositionsForText(validated.resumeText, validated.topN) }
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_TO_POSITIONS,
    async (event: IpcMainInvokeEvent, params: MatchToPositionsParams) => {
      validateSender(event)
      const validated = validatePayload(matchToPositionsSchema, params, IPC_CHANNELS.MATCH_TO_POSITIONS)
      log.info('Match-to-positions requested', { personSourceType: validated.personSourceType, positions: validated.positionUpstreamIds.length })
      const win = getMainWindow()
      const sessionId = await benchBurnService.executeCandidateToPositionsAsync(validated, (evt) => {
        win?.webContents.send(IPC_CHANNELS.MATCH_BENCH_BURN_EVENT, evt)
      })
      win?.webContents.send(IPC_CHANNELS.MATCH_BENCH_BURN_EVENT, { type: 'complete' })
      return { sessionId }
    })
}
