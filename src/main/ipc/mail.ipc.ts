import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { MailSmtpConfig } from '../../shared/ipc-types'
import { validateSender } from './validate'
import { registerIpcHandler } from './registerIpcHandler'
import { mailConfigService } from '../services/mailConfigService'

export function registerMailHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.MAIL_GET_CONFIG,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return mailConfigService.getMaskedConfig()
    })

  registerIpcHandler(IPC_CHANNELS.MAIL_SAVE_CONFIG,
    async (event: IpcMainInvokeEvent, params: MailSmtpConfig) => {
      validateSender(event)
      mailConfigService.saveConfig(params)
      return { saved: true }
    })

  registerIpcHandler(IPC_CHANNELS.MAIL_CLEAR_CONFIG,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      mailConfigService.clearConfig()
      return { cleared: true }
    })

  registerIpcHandler(IPC_CHANNELS.MAIL_TEST_CONNECTION,
    async (event: IpcMainInvokeEvent, params: MailSmtpConfig) => {
      validateSender(event)
      return mailConfigService.testConnection(params)
    })
}
