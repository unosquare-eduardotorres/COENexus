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

export interface ImportFileResult {
  success: boolean;
  cancelled: boolean;
  filePath?: string;
  tablesRestored?: number;
  recordCounts?: Record<string, number>;
}

export const databaseSharingService = {
  getConfig: async (): Promise<DatabaseSharingConfig> => {
    const raw = await window.api.database.getConfig() as { sharing?: { sharedPath?: string; exporterName?: string } }
    const sharing = raw?.sharing ?? {}
    const sharedPath = sharing.sharedPath ?? ''
    const exporterName = sharing.exporterName ?? ''
    return { sharedPath, exporterName, isConfigured: sharedPath.length > 0 }
  },
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
};
