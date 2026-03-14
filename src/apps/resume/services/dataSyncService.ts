import { SyncSourceType, SyncProgress, SyncRecord } from '../types';

const API_BASE = '/api/sync';

export const dataSyncService = {
  async validateToken(token: string): Promise<{ valid: boolean; error?: string }> {
    const res = await fetch(`${API_BASE}/validate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      return { valid: false, error: `Server error: ${res.status}` };
    }
    return res.json();
  },

  async fetchSyncStatus(source: SyncSourceType, year?: number): Promise<{ totalRecords: number; fetchedRecords: number }> {
    let url = `${API_BASE}/status/${source}`;
    if (year && source === 'candidates') url += `?year=${year}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch sync status: ${res.status}`);
    return res.json();
  },

  async fetchRecords(source: SyncSourceType, year?: number): Promise<SyncRecord[]> {
    let url = `${API_BASE}/records/${source}`;
    if (year && source === 'candidates') url += `?year=${year}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch records: ${res.status}`);
    const raw: unknown[] = await res.json();
    return raw.map((r: any) => ({ ...r, pipelineStatus: r.status, failed: r.failed ?? false }));
  },

  async clearRecords(source: 'employees' | 'candidates' | 'all', year?: number): Promise<void> {
    let url = `${API_BASE}/clear/${source}`;
    if (year && source === 'candidates') url += `?year=${year}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to clear records: ${res.status}`);
  },

  async syncSingleRecord(
    source: SyncSourceType,
    token: string,
    upstreamId: number
  ): Promise<SyncRecord> {
    const res = await fetch(
      `${API_BASE}/sync-one/${source}/${upstreamId}?token=${encodeURIComponent(token)}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
    const raw = await res.json();
    return { ...raw, pipelineStatus: raw.status, failed: raw.failed ?? false };
  },

  retryFailed(
    source: SyncSourceType,
    token: string,
    onRecordRetried: (record: SyncRecord) => void,
    onProgress: (progress: { total: number; retried: number }) => void,
    signal: AbortSignal,
    year?: number
  ): Promise<{ total: number; retried: number }> {
    return new Promise((resolve, reject) => {
      let url = `${API_BASE}/retry-failed/${source}?token=${encodeURIComponent(token)}`;
      if (year && source === 'candidates') url += `&year=${year}`;
      const eventSource = new EventSource(url);

      let lastResult = { total: 0, retried: 0 };

      eventSource.addEventListener('record', (event) => {
        const raw = JSON.parse(event.data);
        const record: SyncRecord = { ...raw, pipelineStatus: raw.status, failed: raw.failed ?? false };
        onRecordRetried(record);
      });

      eventSource.addEventListener('progress', (event) => {
        lastResult = JSON.parse(event.data);
        onProgress(lastResult);
      });

      eventSource.addEventListener('complete', (event) => {
        eventSource.close();
        resolve(JSON.parse(event.data));
      });

      eventSource.addEventListener('error', () => {
        eventSource.close();
        reject(new Error('Retry SSE connection error'));
      });

      signal.addEventListener('abort', () => {
        eventSource.close();
        resolve(lastResult);
      });
    });
  },

  startSync(
    source: SyncSourceType,
    token: string,
    onProgress: (progress: SyncProgress) => void,
    onRecordSynced: (record: SyncRecord) => void,
    signal: AbortSignal,
    limit?: number,
    skip?: number,
    year?: number
  ): Promise<SyncProgress> {
    return new Promise((resolve, reject) => {
      let url = `${API_BASE}/stream/${source}?token=${encodeURIComponent(token)}`;
      if (limit) url += `&limit=${limit}`;
      if (skip) url += `&skip=${skip}`;
      if (year && source === 'candidates') url += `&year=${year}`;
      const eventSource = new EventSource(url);

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

      eventSource.addEventListener('record', (event) => {
        const raw = JSON.parse(event.data);
        const record: SyncRecord = { ...raw, pipelineStatus: raw.status, failed: raw.failed ?? false };
        onRecordSynced(record);
      });

      eventSource.addEventListener('progress', (event) => {
        lastProgress = JSON.parse(event.data);
        onProgress(lastProgress);
      });

      eventSource.addEventListener('complete', (event) => {
        const finalProgress: SyncProgress = JSON.parse(event.data);
        eventSource.close();
        resolve(finalProgress);
      });

      eventSource.addEventListener('error', (event) => {
        eventSource.close();
        if (event instanceof MessageEvent && event.data) {
          try {
            const parsed = JSON.parse(event.data);
            reject(new Error(parsed.error || 'SSE connection error'));
            return;
          } catch {}
        }
        reject(new Error('SSE connection error'));
      });

      signal.addEventListener('abort', () => {
        eventSource.close();
        fetch(`${API_BASE}/pause`, { method: 'POST' }).catch(() => {});
        resolve({ ...lastProgress, status: 'paused' });
      });
    });
  },
};
