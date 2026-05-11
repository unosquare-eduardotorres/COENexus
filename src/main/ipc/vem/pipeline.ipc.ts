import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { PipelineStartParams, PipelineRetryParams, PipelineRetrySingleParams } from '../../../shared/ipc-types'
import { validateSender } from '../validate'
import { getMainWindow } from '../../index'
import { unifiedPipelineOrchestrator, loadPipelineState, clearPipelineState } from '../../services/unifiedPipelineOrchestrator'
import { syncRepository } from '../../db/repositories/syncRepository'
import { validatePayload, pipelineStartSchema, pipelineRetrySchema, pipelineRetrySingleSchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'
import { createLogger } from '../../services/logger'

const log = createLogger('PipelineIPC')

export function registerPipelineHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.PIPELINE_START,
    async (event: IpcMainInvokeEvent, params: PipelineStartParams) => {
      validateSender(event)
      const p = validatePayload(pipelineStartSchema, params, IPC_CHANNELS.PIPELINE_START)
      log.info('Pipeline start requested', { source: p.source })
      const win = getMainWindow()
      unifiedPipelineOrchestrator.run(p, (evt) => {
        win?.webContents.send(IPC_CHANNELS.PIPELINE_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.PIPELINE_PAUSE,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      unifiedPipelineOrchestrator.requestPause()
      return { paused: true }
    })

  registerIpcHandler(IPC_CHANNELS.PIPELINE_RETRY_ALL_FAILED,
    async (event: IpcMainInvokeEvent, params: PipelineRetryParams) => {
      validateSender(event)
      const p = validatePayload(pipelineRetrySchema, params, IPC_CHANNELS.PIPELINE_RETRY_ALL_FAILED)
      log.info('Pipeline retry all failed requested', { source: p.source })
      const win = getMainWindow()
      unifiedPipelineOrchestrator.retryAllFailed(p, (evt) => {
        win?.webContents.send(IPC_CHANNELS.PIPELINE_PROGRESS_EVENT, evt)
      })
      return { started: true }
    })

  registerIpcHandler(IPC_CHANNELS.PIPELINE_RETRY_SINGLE,
    async (event: IpcMainInvokeEvent, params: PipelineRetrySingleParams) => {
      validateSender(event)
      const p = validatePayload(pipelineRetrySingleSchema, params, IPC_CHANNELS.PIPELINE_RETRY_SINGLE)
      log.info('Pipeline retry single requested', { source: p.source, upstreamId: p.upstreamId })
      return unifiedPipelineOrchestrator.retrySingle(p)
    })

  registerIpcHandler(IPC_CHANNELS.PIPELINE_GET_FAILED,
    async (event: IpcMainInvokeEvent, source: 'employees' | 'candidates') => {
      validateSender(event)
      const table = source === 'employees' ? 'synced_employees' as const : 'synced_candidates' as const
      return syncRepository.getFailedRecords(table)
    })

  registerIpcHandler(IPC_CHANNELS.PIPELINE_GET_STATE,
    async (event: IpcMainInvokeEvent, source: string) => {
      validateSender(event)
      return loadPipelineState(source)
    })

  registerIpcHandler(IPC_CHANNELS.PIPELINE_CLEAR_STATE,
    async (event: IpcMainInvokeEvent, source: string) => {
      validateSender(event)
      clearPipelineState(source)
      return { cleared: true }
    })
}
