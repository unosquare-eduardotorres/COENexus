export interface DatabaseSharingConfig {
  sharedPath: string;
  isConfigured: boolean;
  exporterName: string;
}

export interface SnapshotInfo {
  filename: string;
  exportedAt: string;
  exportedBy: string;
  sizeBytes: number;
  recordCounts: Record<string, number>;
  isNew: boolean;
}

export interface DatabaseStatus {
  recordCounts: Record<string, number>;
  lastImportedAt: string | null;
  lastImportedFile: string | null;
}

export interface ExportResult {
  filename: string;
  sizeBytes: number;
  recordCounts: Record<string, number>;
  exportedAt: string;
}

export interface ImportResult {
  success: boolean;
  tablesRestored: number;
  recordCounts: Record<string, number>;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    let message = `Request failed (${response.status})`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error) message = parsed.error;
    } catch { /* use default message */ }
    throw new Error(message);
  }
  return response.json();
}

export const databaseSharingService = {
  getConfig: (): Promise<DatabaseSharingConfig> =>
    fetch('/api/database/config').then(r => handleResponse<DatabaseSharingConfig>(r)),
  saveConfig: (config: { sharedPath: string; exporterName: string }): Promise<{ success: boolean }> =>
    fetch('/api/database/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).then(r => handleResponse<{ success: boolean }>(r)),
  exportSnapshot: (): Promise<ExportResult> =>
    fetch('/api/database/export', { method: 'POST' }).then(r => handleResponse<ExportResult>(r)),
  importSnapshot: (filename: string): Promise<ImportResult> =>
    fetch('/api/database/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    }).then(r => handleResponse<ImportResult>(r)),
  listSnapshots: (): Promise<{ snapshots: SnapshotInfo[] }> =>
    fetch('/api/database/snapshots').then(r => handleResponse<{ snapshots: SnapshotInfo[] }>(r)),
  getStatus: (): Promise<DatabaseStatus> =>
    fetch('/api/database/status').then(r => handleResponse<DatabaseStatus>(r)),
};
