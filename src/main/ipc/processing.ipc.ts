import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { ProcessingVectorizeSingleParams, ProcessingStartExtractionParams, ProcessingStartVectorizationParams, ProcessingResetStatusParams } from '../../shared/ipc-types'
import { validateSender } from './validate'
import { getMainWindow } from '../index'
import { processingOrchestrator } from '../services/processingOrchestrator'
import { getConfig } from '../config'
import { validatePayload, processingVectorizeSingleSchema, processingStartExtractionSchema, processingStartVectorizationSchema } from './schemas'
import { registerIpcHandler } from './registerIpcHandler'

export function registerProcessingHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.PROCESSING_VOYAGE_KEY_STATUS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      const { voyage } = getConfig()
      return { configured: voyage.apiKeys.length > 0, keyCount: voyage.apiKeys.length }
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
      return processingOrchestrator.vectorizeSingle(p.source, p.upstreamId, p.model ?? voyage.defaultModel)
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_START_EXTRACTION,
    async (event: IpcMainInvokeEvent, params: ProcessingStartExtractionParams) => {
      validateSender(event)
      const win = getMainWindow()
      processingOrchestrator.extractAsync(params.source, params.token, (evt) => {
        win?.webContents.send(IPC_CHANNELS.PROCESSING_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_PAUSE_EXTRACTION,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      processingOrchestrator.requestPause()
      return { paused: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_START_VECTORIZATION,
    async (event: IpcMainInvokeEvent, params: ProcessingStartVectorizationParams) => {
      validateSender(event)
      const win = getMainWindow()
      const { voyage } = getConfig()
      processingOrchestrator.vectorizeAsync(params.source, params.model ?? voyage.defaultModel, (evt) => {
        win?.webContents.send(IPC_CHANNELS.PROCESSING_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_PAUSE_VECTORIZATION,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      processingOrchestrator.requestPause()
      return { paused: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_RETRY_FAILED,
    async (event: IpcMainInvokeEvent, params: ProcessingStartExtractionParams) => {
      validateSender(event)
      const win = getMainWindow()
      processingOrchestrator.extractAsync(params.source, params.token, (evt) => {
        win?.webContents.send(IPC_CHANNELS.PROCESSING_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_RETRY_FAILED_VECTORIZATION,
    async (event: IpcMainInvokeEvent, params: ProcessingStartVectorizationParams) => {
      validateSender(event)
      const win = getMainWindow()
      const { voyage } = getConfig()
      processingOrchestrator.vectorizeAsync(params.source, params.model ?? voyage.defaultModel, (evt) => {
        win?.webContents.send(IPC_CHANNELS.PROCESSING_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.PROCESSING_RESET_STATUS,
    async (event: IpcMainInvokeEvent, params: ProcessingResetStatusParams) => {
      validateSender(event)
      return { reset: true }
    })
}
