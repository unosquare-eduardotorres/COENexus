import { SyncSourceType, ProcessingProgress, ProcessingRecord } from '../types';
import { vectorizationConfigService } from './vectorizationConfigService';

function ipcProcessingStream(
  source: SyncSourceType,
  startFn: () => void,
  pauseFn: () => void,
  onProgress: (progress: ProcessingProgress) => void,
  onRecordProcessed: (record: ProcessingRecord) => void,
  signal: AbortSignal,
): Promise<ProcessingProgress> {
  return new Promise((resolve, reject) => {
    let lastProgress: ProcessingProgress = {
      source,
      status: 'processing',
      totalRecords: 0,
      processedRecords: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    const sourcePrefix = source === 'open-positions' ? 'pos-' : `${source}-`;
    const cleanup = window.api.processing.onProgress((data: any) => {
      if (data.type === 'progress' || data.type === 'complete') {
        if (data.progress?.source && data.progress.source !== source) return;
      }
      if (data.type === 'record') {
        if (data.record?.id && !data.record.id.startsWith(sourcePrefix)) return;
        onRecordProcessed(data.record as ProcessingRecord);
      } else if (data.type === 'progress') {
        lastProgress = data.progress as ProcessingProgress;
        onProgress(lastProgress);
      } else if (data.type === 'complete') {
        const finalProgress = data.progress as ProcessingProgress;
        cleanup();
        resolve(finalProgress);
      } else if (data.type === 'error') {
        cleanup();
        resolve({ ...lastProgress, status: 'error' });
      }
    });

    signal.addEventListener('abort', () => {
      pauseFn();
      cleanup();
      resolve({ ...lastProgress, status: 'paused' });
    });

    startFn();
  });
}

export const resumeProcessingService = {
  async getProcessingStatus(): Promise<unknown> {
    return window.api.processing.getStatus();
  },

  startExtraction(
    source: SyncSourceType,
    token: string,
    onProgress: (progress: ProcessingProgress) => void,
    onRecordProcessed: (record: ProcessingRecord) => void,
    signal: AbortSignal,
  ): Promise<ProcessingProgress> {
    return ipcProcessingStream(
      source,
      () => window.api.processing.startExtraction({ source, token }),
      () => window.api.processing.pauseExtraction(),
      onProgress,
      onRecordProcessed,
      signal,
    );
  },

  startVectorization(
    source: SyncSourceType,
    onProgress: (progress: ProcessingProgress) => void,
    onRecordProcessed: (record: ProcessingRecord) => void,
    signal: AbortSignal,
  ): Promise<ProcessingProgress> {
    const config = vectorizationConfigService.getConfig();
    return ipcProcessingStream(
      source,
      () => window.api.processing.startVectorization({ source, model: config.model }),
      () => window.api.processing.pauseVectorization(),
      onProgress,
      onRecordProcessed,
      signal,
    );
  },

  retryFailed(
    source: SyncSourceType,
    token: string,
    onProgress: (progress: ProcessingProgress) => void,
    onRecordProcessed: (record: ProcessingRecord) => void,
    signal: AbortSignal,
  ): Promise<ProcessingProgress> {
    return ipcProcessingStream(
      source,
      () => window.api.processing.retryFailed({ source, token }),
      () => window.api.processing.pauseExtraction(),
      onProgress,
      onRecordProcessed,
      signal,
    );
  },

  retryFailedVectorization(
    source: SyncSourceType,
    onProgress: (progress: ProcessingProgress) => void,
    onRecordProcessed: (record: ProcessingRecord) => void,
    signal: AbortSignal,
  ): Promise<ProcessingProgress> {
    const config = vectorizationConfigService.getConfig();
    return ipcProcessingStream(
      source,
      () => window.api.processing.retryFailedVectorization({ source, model: config.model }),
      () => window.api.processing.pauseVectorization(),
      onProgress,
      onRecordProcessed,
      signal,
    );
  },

  processAll(
    source: SyncSourceType,
    token: string,
    onProgress: (progress: ProcessingProgress) => void,
    onRecordProcessed: (record: ProcessingRecord) => void,
    signal: AbortSignal,
  ): Promise<ProcessingProgress> {
    const config = vectorizationConfigService.getConfig();
    return ipcProcessingStream(
      source,
      () => window.api.processing.processAll({ source, token, model: config.model }),
      () => window.api.processing.pauseExtraction(),
      onProgress,
      onRecordProcessed,
      signal,
    );
  },

  async vectorizeSingle(source: string, upstreamId: number): Promise<{ success: boolean; error?: string }> {
    const config = vectorizationConfigService.getConfig();
    return window.api.processing.vectorizeSingle({ source, upstreamId, model: config.model }) as Promise<{ success: boolean; error?: string }>;
  },

};
