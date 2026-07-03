import type {
  PipelineProgressEvent,
  PipelineRecordEvent,
  PipelineProgressDto,
  PipelineFailedRecord,
  PersistedPipelineState,
} from '../../../../shared/ipc-types'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('positionPipelineService')

export type { PipelineProgressEvent, PipelineRecordEvent, PipelineProgressDto, PipelineFailedRecord, PersistedPipelineState }

export const positionPipelineService = {
  async startPipeline(
    activeOnly: boolean,
    token: string,
    options?: { model?: string; limit?: number; skip?: number; year?: number },
  ): Promise<{ started: boolean }> {
    log.info('Position pipeline start requested', { activeOnly })
    return window.api.positionPipeline.start({
      token,
      activeOnly,
      model: options?.model,
      limit: options?.limit,
      skip: options?.skip,
      year: options?.year,
    })
  },

  async pause(): Promise<{ paused: boolean }> {
    log.info('Position pipeline pause requested')
    return window.api.positionPipeline.pause()
  },

  async vectorizeSynced(token: string, model?: string): Promise<{ started: boolean }> {
    log.info('Position pipeline vectorize synced requested')
    return window.api.positionPipeline.vectorizeSynced({ token, model })
  },

  async retryAllFailed(token: string, model?: string): Promise<{ started: boolean }> {
    log.info('Position pipeline retry all failed requested')
    return window.api.positionPipeline.retryAllFailed({ source: 'open-positions', token, model })
  },

  async retrySingle(token: string, upstreamId: number, model?: string): Promise<PipelineRecordEvent> {
    log.info('Position pipeline retry single requested', { upstreamId })
    return window.api.positionPipeline.retrySingle({ source: 'open-positions', token, model, upstreamId })
  },

  async getFailedRecords(): Promise<PipelineFailedRecord[]> {
    return window.api.positionPipeline.getFailed()
  },

  async getState(): Promise<PersistedPipelineState | null> {
    return window.api.positionPipeline.getState()
  },

  async clearState(): Promise<{ cleared: boolean }> {
    return window.api.positionPipeline.clearState()
  },

  onProgress(callback: (event: PipelineProgressEvent) => void): () => void {
    return window.api.positionPipeline.onProgress(callback)
  },
}
