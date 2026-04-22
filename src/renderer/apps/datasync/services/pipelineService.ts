import type {
  PipelineProgressEvent,
  PipelineRecordEvent,
  PipelineProgressDto,
  PipelineFailedRecord,
} from '../../../../shared/ipc-types'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('pipelineService')

export type { PipelineProgressEvent, PipelineRecordEvent, PipelineProgressDto, PipelineFailedRecord }

export const pipelineService = {
  async startPipeline(
    source: 'employees' | 'candidates',
    token: string,
    options?: { model?: string; limit?: number; skip?: number; year?: number },
  ): Promise<{ started: boolean }> {
    log.info('Pipeline start requested', { source })
    return window.api.pipeline.start({
      source,
      token,
      model: options?.model,
      limit: options?.limit,
      skip: options?.skip,
      year: options?.year,
    })
  },

  async pause(): Promise<{ paused: boolean }> {
    log.info('Pipeline pause requested')
    return window.api.pipeline.pause()
  },

  async retryAllFailed(
    source: 'employees' | 'candidates',
    token: string,
    model?: string,
  ): Promise<{ started: boolean }> {
    log.info('Pipeline retry all failed requested', { source })
    return window.api.pipeline.retryAllFailed({ source, token, model })
  },

  async retrySingle(
    source: 'employees' | 'candidates',
    token: string,
    upstreamId: number,
    model?: string,
  ): Promise<PipelineRecordEvent> {
    log.info('Pipeline retry single requested', { source, upstreamId })
    return window.api.pipeline.retrySingle({ source, token, model, upstreamId })
  },

  async getFailedRecords(source: 'employees' | 'candidates'): Promise<PipelineFailedRecord[]> {
    return window.api.pipeline.getFailed(source)
  },

  onProgress(callback: (event: PipelineProgressEvent) => void): () => void {
    return window.api.pipeline.onProgress(callback)
  },
}
