import { SyncSourceType, ProcessingProgress, ProcessingRecord } from '../types';
import { vectorizationConfigService } from './vectorizationConfigService';

const API_BASE = '/api/processing';

function sseProcessingStream(
  url: string,
  source: SyncSourceType,
  onProgress: (progress: ProcessingProgress) => void,
  onRecordProcessed: (record: ProcessingRecord) => void,
  signal: AbortSignal,
  pauseEndpoint: string,
  extraParams?: Record<string, string>
): Promise<ProcessingProgress> {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url, window.location.origin);
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => fullUrl.searchParams.set(k, v));
    }

    const eventSource = new EventSource(fullUrl.toString());

    let lastProgress: ProcessingProgress = {
      source,
      status: 'processing',
      totalRecords: 0,
      processedRecords: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    eventSource.addEventListener('record', (event) => {
      const record: ProcessingRecord = JSON.parse(event.data);
      onRecordProcessed(record);
    });

    eventSource.addEventListener('progress', (event) => {
      lastProgress = JSON.parse(event.data);
      onProgress(lastProgress);
    });

    eventSource.addEventListener('complete', (event) => {
      const finalProgress: ProcessingProgress = JSON.parse(event.data);
      eventSource.close();
      resolve(finalProgress);
    });

    eventSource.addEventListener('error', () => {
      eventSource.close();
      resolve({ ...lastProgress, status: 'error' });
    });

    signal.addEventListener('abort', () => {
      eventSource.close();
      fetch(pauseEndpoint, { method: 'POST' }).catch(() => {});
      resolve({ ...lastProgress, status: 'paused' });
    });
  });
}

export const resumeProcessingService = {
  async fetchProcessingStatus(source: SyncSourceType): Promise<{
    totalEligible: number;
    alreadyProcessed: number;
  }> {
    const res = await fetch(`${API_BASE}/status/${source}`);
    if (!res.ok) throw new Error(`Failed to fetch processing status: ${res.status}`);
    return res.json();
  },

  startExtraction(
    source: SyncSourceType,
    token: string,
    onProgress: (progress: ProcessingProgress) => void,
    onRecordProcessed: (record: ProcessingRecord) => void,
    signal: AbortSignal
  ): Promise<ProcessingProgress> {
    return sseProcessingStream(
      `${API_BASE}/extract-stream/${source}?token=${encodeURIComponent(token)}`,
      source,
      onProgress,
      onRecordProcessed,
      signal,
      `${API_BASE}/extract-pause`
    );
  },

  startVectorization(
    source: SyncSourceType,
    onProgress: (progress: ProcessingProgress) => void,
    onRecordProcessed: (record: ProcessingRecord) => void,
    signal: AbortSignal
  ): Promise<ProcessingProgress> {
    const vecConfig = vectorizationConfigService.getConfig();
    return sseProcessingStream(
      `${API_BASE}/vectorize-stream/${source}`,
      source,
      onProgress,
      onRecordProcessed,
      signal,
      `${API_BASE}/vectorize-pause`,
      { model: vecConfig.model }
    );
  },

  async vectorizeSingle(
    source: SyncSourceType,
    upstreamId: number
  ): Promise<ProcessingRecord> {
    const vecConfig = vectorizationConfigService.getConfig();
    const res = await fetch(
      `${API_BASE}/vectorize-single?source=${source}&upstreamId=${upstreamId}&model=${encodeURIComponent(vecConfig.model)}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error(`Vectorization failed: ${res.status}`);
    return res.json();
  },
};
