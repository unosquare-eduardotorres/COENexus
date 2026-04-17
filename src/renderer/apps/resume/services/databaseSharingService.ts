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
  localDbHash: string | null;
}

export interface ExportResult {
  filename: string;
  sizeBytes: number;
  recordCounts: Record<string, number>;
  exportedAt: string;
  hash: string;
}

export interface ImportResult {
  success: boolean;
  tablesRestored: number;
  recordCounts: Record<string, number>;
  vecEntriesRebuilt: number;
}

export interface ImportFileResult {
  success: boolean;
  cancelled: boolean;
  filePath?: string;
  tablesRestored?: number;
  recordCounts?: Record<string, number>;
}

export interface SyncManifest {
  latestSnapshot: string;
  latestHash: string;
  exportedAt: string;
  exportedBy: string;
  schemaVersion: number;
  recordCounts: Record<string, number>;
  sizeBytes: number;
  previousSnapshots: Array<{
    filename: string;
    hash: string;
    exportedAt: string;
    exportedBy: string;
  }>;
}

export interface SyncCheckResult {
  hasUpdate: boolean;
  manifest: SyncManifest | null;
  localHash: string | null;
}

export interface SyncWatcherStatus {
  isWatching: boolean;
  sharedPath: string | null;
  lastKnownManifestHash: string | null;
  lastCheckedAt: string | null;
  hasUpdate: boolean;
  remoteManifest: SyncManifest | null;
}

export const databaseSharingService = {
  getConfig: (): Promise<DatabaseSharingConfig> =>
    window.api.database.getConfig() as Promise<DatabaseSharingConfig>,
  saveConfig: (config: { sharedPath: string; exporterName: string }): Promise<{ success: boolean }> =>
    window.api.database.saveConfig({ sharing: config }) as Promise<{ success: boolean }>,
  exportSnapshot: (): Promise<ExportResult> =>
    window.api.database.export() as Promise<ExportResult>,
  importSnapshot: (filename: string): Promise<ImportResult> =>
    window.api.database.import({ filename }) as Promise<ImportResult>,
  listSnapshots: (): Promise<{ snapshots: SnapshotInfo[] }> =>
    window.api.database.listSnapshots().then((snapshots: unknown) => ({ snapshots: snapshots as SnapshotInfo[] })),
  getStatus: (): Promise<DatabaseStatus> =>
    window.api.database.getStatus() as Promise<DatabaseStatus>,
  importFile: (): Promise<ImportFileResult> =>
    window.api.database.importFile() as Promise<ImportFileResult>,
  syncCheck: (): Promise<SyncCheckResult> =>
    window.api.database.syncCheck() as Promise<SyncCheckResult>,
  syncStatus: (): Promise<SyncWatcherStatus> =>
    window.api.database.syncStatus() as Promise<SyncWatcherStatus>,
  importLatest: (): Promise<ImportResult> =>
    window.api.database.importLatest() as Promise<ImportResult>,
  onSyncUpdate: (callback: (manifest: SyncManifest) => void): (() => void) =>
    window.api.database.onSyncUpdate(callback as (manifest: unknown) => void),
};
