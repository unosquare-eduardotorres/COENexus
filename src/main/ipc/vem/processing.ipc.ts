import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { ProcessingVectorizeSingleParams, ProcessingStartExtractionParams, ProcessingStartVectorizationParams, ProcessingResetStatusParams, AddVoyageKeyParams, RemoveVoyageKeyParams } from '../../../shared/ipc-types'
import { validateSender } from '../validate'
import { getMainWindow } from '../../index'
import { processingOrchestrator } from '../../services/processingOrchestrator'
import { getConfig } from '../../config'
import { validatePayload, processingVectorizeSingleSchema, processingStartExtractionSchema, processingStartVectorizationSchema, addVoyageKeySchema, removeVoyageKeySchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'
import { keychainService } from '../../services/keychainService'
import { createLogger } from '../../services/logger'

const log = createLogger('ProcessingIPC')

async function handleStartExtraction(event: IpcMainInvokeEvent, params: ProcessingStartExtractionParams) {
  validateSender(event)
  log.info('Extraction start requested', { source: params.source })
  const win = getMainWindow()
  processingOrchestrator.extractAsync(params.source, params.token, (evt) => {
    win?.webContents.send(IPC_CHANNELS.PROCESSING_PROGRESS_EVENT, evt)
  })
  return { started: true }
}

async function handleStartVectorization(event: IpcMainInvokeEvent, params: ProcessingStartVectorizationParams) {
  validateSender(event)
  const { voyage } = getConfig()
  log.info('Vectorization start requested', { source: params.source, model: params.model ?? voyage.defaultModel })
  const win = getMainWindow()
  processingOrchestrator.vectorizeAsync(params.source, params.model ?? voyage.defaultModel, (evt) => {
    win?.webContents.send(IPC_CHANNELS.PROCESSING_PROGRESS_EVENT, evt)
  })
  return { started: true }
}

export function registerProcessingHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.PROCESSING_VOYAGE_KEY_STATUS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      const keychainKeys = keychainService.getMaskedKeys()
      if (keychainKeys.length > 0) {
        return { configured: true, keyCount: keychainKeys.length, maskedKeys: keychainKeys, source: 'keychain' as const }
      }
      const { voyage } = getConfig()
      if (voyage.apiKeys.length > 0) {
        const maskedKeys = voyage.apiKeys.map((k: string, i: number) => ({
          index: i,
          masked: k.length > 8 ? `${k.slice(0, 3)}...${k.slice(-4)}` : '********',
        }))
        return { configured: true, keyCount: voyage.apiKeys.length, maskedKeys, source: 'config' as const }
      }
      return { configured: false, keyCount: 0, maskedKeys: [], source: '' as const }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_GET_STATUS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return processingOrchestrator.getStatus()
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_VECTORIZE_SINGLE,
    async (event: IpcMainInvokeEvent, params: ProcessingVectorizeSingleParams) => {
      validateSender(event)
      const p = validatePayload(processingVectorizeSingleSchema, params, IPC_CHANNELS.PROCESSING_VECTORIZE_SINGLE)
      const { voyage } = getConfig()
      log.info('Single vectorization requested', { source: p.source, upstreamId: p.upstreamId })
      return processingOrchestrator.vectorizeSingle(p.source, p.upstreamId, p.model ?? voyage.defaultModel)
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_START_EXTRACTION, handleStartExtraction)

  registerIpcHandler(IPC_CHANNELS.PROCESSING_PAUSE_EXTRACTION,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      processingOrchestrator.requestPause()
      return { paused: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_START_VECTORIZATION, handleStartVectorization)

  registerIpcHandler(IPC_CHANNELS.PROCESSING_PAUSE_VECTORIZATION,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      processingOrchestrator.requestPause()
      return { paused: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_RETRY_FAILED, handleStartExtraction)

  registerIpcHandler(IPC_CHANNELS.PROCESSING_RETRY_FAILED_VECTORIZATION, handleStartVectorization)

  registerIpcHandler(IPC_CHANNELS.PROCESSING_RESET_STATUS,
    async (event: IpcMainInvokeEvent, params: ProcessingResetStatusParams) => {
      validateSender(event)
      return { reset: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_ADD_VOYAGE_KEY,
    async (event: IpcMainInvokeEvent, params: AddVoyageKeyParams) => {
      validateSender(event)
      const p = validatePayload(addVoyageKeySchema, params, IPC_CHANNELS.PROCESSING_ADD_VOYAGE_KEY)
      keychainService.addVoyageKey(p.apiKey)
      log.info('Voyage API key added')
      return { saved: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_REMOVE_VOYAGE_KEY,
    async (event: IpcMainInvokeEvent, params: RemoveVoyageKeyParams) => {
      validateSender(event)
      const p = validatePayload(removeVoyageKeySchema, params, IPC_CHANNELS.PROCESSING_REMOVE_VOYAGE_KEY)
      keychainService.removeVoyageKey(p.index)
      log.info('Voyage API key removed', { index: p.index })
      return { deleted: true }
    })
}
