import { SyncSourceType, SyncProgress, SyncRecord } from '../types';
import type { TokenSource } from '../../../../shared/ipc-types';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('dataSyncService');

export const dataSyncService = {
  async validateToken(token: string, source: TokenSource = 'unocore'): Promise<{ valid: boolean; error?: string }> {
    try {
      log.info('Sync token validation requested', { source });
      const result = await window.api.sync.validateToken(token, source) as {
        valid?: boolean;
        message?: string;
        error?: string;
        __ipcError?: boolean;
      };
      if (result.__ipcError) {
        return { valid: false, error: result.message || 'Connection failed' };
      }
      return {
        valid: !!result.valid,
        error: result.valid ? undefined : (result.error || result.message || 'Token validation failed'),
      };
    } catch (err) {
      log.error('Sync token validation failed', err);
      return { valid: false, error: err instanceof Error ? err.message : 'Validation failed' };
    }
  },

  async fetchSyncStatus(source: SyncSourceType): Promise<{ totalRecords: number; fetchedRecords: number }> {
    const result = await window.api.sync.getStatus(source);
    const r = result as { total: number; synced: number; failed: number; processing: number };
    return { totalRecords: r.total, fetchedRecords: r.total };
  },

  async fetchRecords(source: SyncSourceType): Promise<SyncRecord[]> {
    const raw = await window.api.sync.getRecords(source);
    if (!Array.isArray(raw)) return [];
    return (raw as any[]).map((r: any) => ({ ...r, pipelineStatus: r.status }));
  },

  async clearRecords(source: 'employees' | 'candidates' | 'open-positions' | 'all'): Promise<void> {
    log.warn('Sync records clear requested', { source });
    if (source === 'all') {
      await window.api.sync.clear('employees');
      await window.api.sync.clear('candidates');
      await window.api.sync.clear('positions');
    } else {
      const mapped = source === 'open-positions' ? 'positions' : source;
      await window.api.sync.clear(mapped);
    }
  },

  async syncSingleRecord(
    source: SyncSourceType,
    token: string,
    upstreamId: number
  ): Promise<SyncRecord> {
    log.info('Sync single record requested', { source, upstreamId });
    const raw = await window.api.sync.syncSingle({ source, token, upstreamId }) as SyncRecord & { status: string };
    return { ...raw, pipelineStatus: raw.status };
  },

  retryNotProcessed(
    source: SyncSourceType,
    token: string,
    onRecordRetried: (record: SyncRecord) => void,
    onProgress: (progress: { total: number; retried: number }) => void,
    signal: AbortSignal,
  ): Promise<{ total: number; retried: number }> {
    return new Promise((resolve, reject) => {
      let lastResult = { total: 0, retried: 0 };

      const cleanup = window.api.sync.onProgress((data: any) => {
        if (data.type === 'record' && data.record?.source && data.record.source !== source) return;
        if (data.type === 'progress' && data.progress?.source && data.progress.source !== source) return;
        if (data.type === 'complete' && data.progress?.source && data.progress.source !== source) return;
        if (data.type === 'record') {
          const record: SyncRecord = { ...data.record, pipelineStatus: data.record.status };
          onRecordRetried(record);
          lastResult.retried++;
        } else if (data.type === 'progress') {
          lastResult = { total: data.progress.totalRecords, retried: data.progress.syncedCount + data.progress.updatedCount };
          onProgress(lastResult);
        } else if (data.type === 'complete') {
          cleanup();
          resolve(lastResult);
        } else if (data.type === 'error') {
          cleanup();
          reject(new Error(data.message));
        }
      });

      signal.addEventListener('abort', () => {
        log.warn('Sync retry-not-processed aborted', { source });
        window.api.sync.pause();
        cleanup();
        resolve(lastResult);
      });

      log.info('Sync retry-not-processed started', { source });
      window.api.sync.retryNotProcessed({ source, token });
    });
  },

  retryFailed(
    source: SyncSourceType,
    token: string,
    onRecordRetried: (record: SyncRecord) => void,
    onProgress: (progress: { total: number; retried: number }) => void,
    signal: AbortSignal,
  ): Promise<{ total: number; retried: number }> {
    return new Promise((resolve, reject) => {
      let lastResult = { total: 0, retried: 0 };

      const cleanup = window.api.sync.onProgress((data: any) => {
        if (data.type === 'record' && data.record?.source && data.record.source !== source) return;
        if (data.type === 'progress' && data.progress?.source && data.progress.source !== source) return;
        if (data.type === 'complete' && data.progress?.source && data.progress.source !== source) return;
        if (data.type === 'record') {
          const record: SyncRecord = { ...data.record, pipelineStatus: data.record.status };
          onRecordRetried(record);
          lastResult.retried++;
        } else if (data.type === 'progress') {
          lastResult = { total: data.progress.totalRecords, retried: data.progress.syncedCount + data.progress.updatedCount };
          onProgress(lastResult);
        } else if (data.type === 'complete') {
          cleanup();
          resolve(lastResult);
        } else if (data.type === 'error') {
          cleanup();
          reject(new Error(data.message));
        }
      });

      signal.addEventListener('abort', () => {
        log.warn('Sync retry-failed aborted', { source });
        window.api.sync.pause();
        cleanup();
        resolve(lastResult);
      });

      log.info('Sync retry-failed started', { source });
      window.api.sync.retryFailed({ source, token });
    });
  },

  async uploadNote(
    token: string,
    personId: number,
    noteType: string,
    file: Blob,
    fileName: string
  ): Promise<{ personaNoteId: number; success: boolean }> {
    log.info('Sync note upload requested', { personId, noteType, fileName });
    const buffer = await file.arrayBuffer();
    const result = await window.api.sync.uploadNote({ token, personId, noteType, fileName, fileContent: buffer });
    return result as { personaNoteId: number; success: boolean };
  },

  startSync(
    source: SyncSourceType,
    token: string,
    onProgress: (progress: SyncProgress) => void,
    onRecordSynced: (record: SyncRecord) => void,
    signal: AbortSignal,
    limit?: number,
    skip?: number,
    year?: number,
    activeOnly?: boolean
  ): Promise<SyncProgress> {
    return new Promise((resolve, reject) => {
      let lastProgress: SyncProgress = {
        source,
        status: 'syncing',
        totalRecords: 0,
        fetchedRecords: 0,
        syncedCount: 0,
        incompleteCount: 0,
        notProcessedCount: 0,
        extractedCount: 0,
        vectorizedCount: 0,
        skippedCount: 0,
      };

      const cleanup = window.api.sync.onProgress((data: any) => {
        if (data.type === 'record' && data.record?.source && data.record.source !== source) return;
        if (data.type === 'progress' && data.progress?.source && data.progress.source !== source) return;
        if (data.type === 'complete' && data.progress?.source && data.progress.source !== source) return;
        if (data.type === 'record') {
          const record: SyncRecord = { ...data.record, pipelineStatus: data.record.status };
          onRecordSynced(record);
        } else if (data.type === 'progress') {
          lastProgress = { ...lastProgress, ...data.progress, source };
          onProgress(lastProgress);
        } else if (data.type === 'complete') {
          const finalProgress: SyncProgress = { ...lastProgress, ...data.progress, source, status: data.progress.status || 'completed' };
          cleanup();
          resolve(finalProgress);
        } else if (data.type === 'error') {
          cleanup();
          reject(new Error(data.message));
        }
      });

      signal.addEventListener('abort', () => {
        log.warn('Sync stream aborted', { source });
        window.api.sync.pause();
        cleanup();
        resolve({ ...lastProgress, status: 'paused' });
      });

      log.info('Sync stream start requested', { source, limit: limit ?? null, skip: skip ?? null, year: year ?? null, activeOnly: activeOnly ?? null });
      window.api.sync.start({ source, token, limit, skip, year, activeOnly });
    });
  },
};
