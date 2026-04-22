import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { PositionPipelineStartParams, PositionPipelineVectorizeSyncedParams, PipelineRetryParams, PipelineRetrySingleParams } from '../../../shared/ipc-types'
import { validateSender } from '../validate'
import { getMainWindow } from '../../index'
import { positionPipelineOrchestrator } from '../../services/positionPipelineOrchestrator'
import { syncRepository } from '../../db/repositories/syncRepository'
import { validatePayload, positionPipelineStartSchema, positionPipelineVectorizeSyncedSchema, pipelineRetrySchema, pipelineRetrySingleSchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'
import { createLogger } from '../../services/logger'

const log = createLogger('PositionPipelineIPC')

export function registerPositionPipelineHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.POSITION_PIPELINE_START,
    async (event: IpcMainInvokeEvent, params: PositionPipelineStartParams) => {
      validateSender(event)
      const p = validatePayload(positionPipelineStartSchema, params, IPC_CHANNELS.POSITION_PIPELINE_START)
      log.info('Position pipeline start requested', { activeOnly: p.activeOnly })
      const win = getMainWindow()
      positionPipelineOrchestrator.run(p, (evt) => {
        win?.webContents.send(IPC_CHANNELS.POSITION_PIPELINE_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.POSITION_PIPELINE_PAUSE,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      positionPipelineOrchestrator.requestPause()
      return { paused: true }
    })

  registerIpcHandler(IPC_CHANNELS.POSITION_PIPELINE_VECTORIZE_SYNCED,
    async (event: IpcMainInvokeEvent, params: PositionPipelineVectorizeSyncedParams) => {
      validateSender(event)
      const p = validatePayload(positionPipelineVectorizeSyncedSchema, params, IPC_CHANNELS.POSITION_PIPELINE_VECTORIZE_SYNCED)
      log.info('Position pipeline vectorize synced requested')
      const win = getMainWindow()
      positionPipelineOrchestrator.vectorizeSynced(p, (evt) => {
        win?.webContents.send(IPC_CHANNELS.POSITION_PIPELINE_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.POSITION_PIPELINE_RETRY_ALL_FAILED,
    async (event: IpcMainInvokeEvent, params: PipelineRetryParams) => {
      validateSender(event)
      const p = validatePayload(pipelineRetrySchema, params, IPC_CHANNELS.POSITION_PIPELINE_RETRY_ALL_FAILED)
      log.info('Position pipeline retry all failed requested')
      const win = getMainWindow()
      positionPipelineOrchestrator.retryAllFailed(p, (evt) => {
        win?.webContents.send(IPC_CHANNELS.POSITION_PIPELINE_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.POSITION_PIPELINE_RETRY_SINGLE,
    async (event: IpcMainInvokeEvent, params: PipelineRetrySingleParams) => {
      validateSender(event)
      const p = validatePayload(pipelineRetrySingleSchema, params, IPC_CHANNELS.POSITION_PIPELINE_RETRY_SINGLE)
      log.info('Position pipeline retry single requested', { upstreamId: p.upstreamId })
      return positionPipelineOrchestrator.retrySingle(p)
    })

  registerIpcHandler(IPC_CHANNELS.POSITION_PIPELINE_GET_FAILED,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return syncRepository.getFailedRecords('synced_open_positions')
    })
}
