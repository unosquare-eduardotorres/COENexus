import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { ModelConfig } from '../../../shared/model-config-types'
import { validateSender } from '../validate'
import { registerIpcHandler } from '../registerIpcHandler'
import { getConfig, saveConfig } from '../../config'
import { localLlmService } from '../../services/localLlmService'
import { createLogger } from '../../services/logger'

const log = createLogger('ModelConfigIPC')

export function registerModelConfigHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.MODEL_CONFIG_GET,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return getConfig().modelConfig
    })

  registerIpcHandler(IPC_CHANNELS.MODEL_CONFIG_SAVE,
    async (event: IpcMainInvokeEvent, modelConfig: ModelConfig) => {
      validateSender(event)
      const config = getConfig()
      saveConfig({ ...config, modelConfig })
      log.info('Model config saved', { presetMode: modelConfig.presetMode })
      return { saved: true }
    })

  registerIpcHandler(IPC_CHANNELS.MODEL_CONFIG_LOCAL_HEALTH,
    async (event: IpcMainInvokeEvent, params: { url: string }) => {
      validateSender(event)
      return localLlmService.checkHealth(params.url)
    })

  registerIpcHandler(IPC_CHANNELS.MODEL_CONFIG_LOCAL_MODELS,
    async (event: IpcMainInvokeEvent, params: { url: string }) => {
      validateSender(event)
      const { models } = await localLlmService.checkHealth(params.url)
      return { models }
    })
}
