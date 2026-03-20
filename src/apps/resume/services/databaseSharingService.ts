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

export const databaseSharingService = {
  getConfig: (): Promise<DatabaseSharingConfig> => fetch('/api/database/config').then(r => r.json()),
  saveConfig: (config: { sharedPath: string; exporterName: string }): Promise<{ success: boolean }> =>
    fetch('/api/database/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) }).then(r => r.json()),
  exportSnapshot: (): Promise<ExportResult> =>
    fetch('/api/database/export', { method: 'POST' }).then(r => r.json()),
  importSnapshot: (filename: string): Promise<ImportResult> =>
    fetch('/api/database/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename }) }).then(r => r.json()),
  listSnapshots: (): Promise<{ snapshots: SnapshotInfo[] }> =>
    fetch('/api/database/snapshots').then(r => r.json()),
  getStatus: (): Promise<DatabaseStatus> =>
    fetch('/api/database/status').then(r => r.json()),
};
