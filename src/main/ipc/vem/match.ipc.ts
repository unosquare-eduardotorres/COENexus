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
import { matchRepository } from '../../db/repositories/matchRepository'
import { claudeProxyService } from '../../services/claudeProxyService'
import { validatePayload, matchSearchSchema, matchConfirmHaikuSchema, matchResumeTextSchema, benchBurnSchema, externalCandidateSchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'
import { createLogger } from '../../services/logger'

const log = createLogger('MatchIPC')

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
      const available = await claudeProxyService.checkAvailability()
      return { available }
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_BENCH_EMPLOYEES,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return syncRepository.getBenchEmployees()
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_ALL_EMPLOYEES,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return syncRepository.getAllEmployees()
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_ALL_CANDIDATES,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return syncRepository.getAllCandidates()
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_SEARCH_CANDIDATES,
    async (event: IpcMainInvokeEvent, query: string) => {
      validateSender(event)
      if (!query || query.length < 3) return []
      return syncRepository.searchCandidates(query)
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_SEARCH_EMPLOYEES,
    async (event: IpcMainInvokeEvent, query: string) => {
      validateSender(event)
      if (!query || query.length < 3) return []
      return syncRepository.searchEmployees(query)
    })

  registerIpcHandler(IPC_CHANNELS.MATCH_OPEN_POSITIONS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return syncRepository.getAllOpenPositions()
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
}
