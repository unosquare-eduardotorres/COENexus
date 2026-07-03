import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { NomicoreCalculateParams } from '../../shared/ipc-types'
import { validateSender } from './validate'
import { registerIpcHandler } from './registerIpcHandler'
import { nomicoreService } from '../services/nomicoreService'
import { createLogger } from '../services/logger'

const log = createLogger('NomicoreIPC')

export function registerNomicoreHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.NOMICORE_LOGIN,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      log.info('Opening Nomicore for manual login')
      return nomicoreService.launchForLogin()
    })

  registerIpcHandler(IPC_CHANNELS.NOMICORE_CHECK_SESSION,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return nomicoreService.checkSession()
    })

  registerIpcHandler(IPC_CHANNELS.NOMICORE_CALCULATE,
    async (event: IpcMainInvokeEvent, params: NomicoreCalculateParams) => {
      validateSender(event)
      log.info('Calculating salary via Nomicore', {
        country: params.country,
        contractType: params.contractType,
        grossMonthly: params.grossMonthly,
      })
      return nomicoreService.calculate(params)
    })
}
