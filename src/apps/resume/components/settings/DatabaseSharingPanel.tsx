import { useState, useEffect, useCallback } from 'react';
import {
  databaseSharingService,
  DatabaseSharingConfig,
  SnapshotInfo,
  DatabaseStatus,
  ExportResult,
  ImportResult,
} from '../../services/databaseSharingService';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTableName(name: string): string {
  const cleaned = name.replace(/^synced/i, '').replace(/_/g, ' ').trim();
  const spaced = cleaned.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function summarizeRecordCounts(recordCounts: Record<string, number>): string {
  const entries = Object.entries(recordCounts);
  if (!entries.length) return '0 records';
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  return `${total.toLocaleString()} records`;
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-4 h-4 animate-spin'} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function DatabaseSharingPanel() {
  const [config, setConfig] = useState<DatabaseSharingConfig | null>(null);
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [sharedPath, setSharedPath] = useState('');
  const [exporterName, setExporterName] = useState('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importingFilename, setImportingFilename] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const loadConfig = useCallback(async () => {
    const nextConfig = await databaseSharingService.getConfig();
    setConfig(nextConfig);
    setSharedPath(nextConfig.sharedPath || '');
    setExporterName(nextConfig.exporterName || '');
  }, []);

  const loadStatus = useCallback(async () => {
    const nextStatus = await databaseSharingService.getStatus();
    setStatus(nextStatus);
  }, []);

  const loadSnapshots = useCallback(async () => {
    const result = await databaseSharingService.listSnapshots();
    const ordered = [...result.snapshots].sort(
      (a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
    );
    setSnapshots(ordered);
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoadingInitial(true);
    setErrorMessage(null);
    try {
      await Promise.all([loadConfig(), loadStatus(), loadSnapshots()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load database sharing data');
    } finally {
      setIsLoadingInitial(false);
    }
  }, [loadConfig, loadSnapshots, loadStatus]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadSnapshots();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadSnapshots]);

  const handleSaveConfig = useCallback(async () => {
    setIsSavingConfig(true);
    setSaveSuccess(null);
    setErrorMessage(null);
    try {
      await databaseSharingService.saveConfig({ sharedPath: sharedPath.trim(), exporterName: exporterName.trim() });
      setSaveSuccess('Configuration saved successfully');
      await loadConfig();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSavingConfig(false);
    }
  }, [exporterName, loadConfig, sharedPath]);

  const handleExportSnapshot = useCallback(async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    setImportResult(null);
    try {
      const result = await databaseSharingService.exportSnapshot();
      setExportResult(result);
      await Promise.all([loadSnapshots(), loadStatus()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export snapshot');
    } finally {
      setIsExporting(false);
    }
  }, [loadSnapshots, loadStatus]);

  const handleImportSnapshot = useCallback(
    async (filename: string) => {
      setImportingFilename(filename);
      setErrorMessage(null);
      setSaveSuccess(null);
      setExportResult(null);
      try {
        const result = await databaseSharingService.importSnapshot(filename);
        setImportResult(result);
        await Promise.all([loadStatus(), loadSnapshots()]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to import snapshot');
      } finally {
        setImportingFilename(null);
      }
    },
    [loadSnapshots, loadStatus]
  );

  const hasNewSnapshots = snapshots.some(snapshot => snapshot.isNew);
  const recordCounts = status ? Object.entries(status.recordCounts) : [];

  return (
    <div className="space-y-5">
      {errorMessage && (
        <div className="glass-card p-4 bg-red-50/60 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20">
          <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      <section className="glass-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-primary">Configuration</h3>
            <p className="text-sm text-muted mt-1">Set the shared folder path and exporter name for database snapshots.</p>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${config?.isConfigured ? 'bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20' : 'bg-red-50/60 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-500/20'}`}>
            <span className={`w-2 h-2 rounded-full ${config?.isConfigured ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {config?.isConfigured ? 'Configured' : 'Not configured'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Shared Folder Path</label>
            <input
              type="text"
              value={sharedPath}
              onChange={event => setSharedPath(event.target.value)}
              placeholder="/shared/database/snapshots"
              className="glass-input w-full px-3 py-2 text-sm text-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Exporter Name</label>
            <input
              type="text"
              value={exporterName}
              onChange={event => setExporterName(event.target.value)}
              placeholder="Team Member Name"
              className="glass-input w-full px-3 py-2 text-sm text-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSavingConfig || !sharedPath.trim() || !exporterName.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingConfig ? (
              <>
                <LoadingSpinner />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
          {saveSuccess && (
            <span className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded-lg px-3 py-1.5">
              {saveSuccess}
            </span>
          )}
        </div>
      </section>

      <section className="glass-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-primary">Local Database Status</h3>
          <p className="text-sm text-muted mt-1">Current record distribution and most recent import metadata.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recordCounts.length ? (
            recordCounts.map(([tableName, count]) => (
              <div key={tableName} className="bg-accent-50/40 dark:bg-accent-500/10 border border-accent-100/60 dark:border-accent-500/20 rounded-xl p-3">
                <p className="text-xs text-secondary">{formatTableName(tableName)}</p>
                <p className="text-xl font-semibold text-primary mt-1">{count.toLocaleString()}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-sm text-muted bg-white/50 dark:bg-dark-hover/50 rounded-xl p-4">
              No local records available yet.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-white/50 dark:bg-dark-hover/50 rounded-xl p-3">
            <p className="text-secondary">Last Imported</p>
            <p className="text-primary font-medium mt-1">{status?.lastImportedAt ? formatDate(status.lastImportedAt) : 'Never'}</p>
          </div>
          <div className="bg-white/50 dark:bg-dark-hover/50 rounded-xl p-3">
            <p className="text-secondary">Imported File</p>
            <p className="text-primary font-medium mt-1 break-all">{status?.lastImportedFile || '—'}</p>
          </div>
        </div>
      </section>

      <section className="glass-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-primary">Export</h3>
          <p className="text-sm text-muted mt-1">Create a snapshot from the current local database and store it in the shared folder.</p>
        </div>

        <button
          type="button"
          onClick={handleExportSnapshot}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <LoadingSpinner />
              Exporting...
            </>
          ) : (
            'Export Snapshot'
          )}
        </button>

        {exportResult && (
          <div className="bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Snapshot exported successfully</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
              {exportResult.filename} • {formatBytes(exportResult.sizeBytes)} • {summarizeRecordCounts(exportResult.recordCounts)}
            </p>
          </div>
        )}

        {importResult && (
          <div className="bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Snapshot imported successfully
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
              Restored {importResult.tablesRestored} table(s) • {summarizeRecordCounts(importResult.recordCounts)}
            </p>
          </div>
        )}
      </section>

      <section className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-primary">Available Snapshots</h3>
            <p className="text-sm text-muted mt-1">Snapshots discovered in the shared folder. This list refreshes every 30 seconds.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSnapshots()}
            className="px-3 py-1.5 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
          >
            Refresh
          </button>
        </div>

        {hasNewSnapshots && (
          <div className="bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">New snapshots detected</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                {snapshots.filter(snapshot => snapshot.isNew).length} new snapshot(s) available for import.
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
              Auto-detected
            </span>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200/50 dark:border-dark-border/50">
          <table className="min-w-full text-sm">
            <thead className="bg-white/60 dark:bg-dark-hover/40">
              <tr>
                <th className="text-left px-4 py-2.5 text-secondary font-semibold">Date</th>
                <th className="text-left px-4 py-2.5 text-secondary font-semibold">Exported By</th>
                <th className="text-left px-4 py-2.5 text-secondary font-semibold">Size</th>
                <th className="text-left px-4 py-2.5 text-secondary font-semibold">Records</th>
                <th className="text-right px-4 py-2.5 text-secondary font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map(snapshot => (
                <tr key={snapshot.filename} className="border-t border-gray-200/40 dark:border-dark-border/40">
                  <td className="px-4 py-3 text-primary">
                    <div className="flex items-center gap-2">
                      <span>{formatDate(snapshot.exportedAt)}</span>
                      {snapshot.isNew && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50/60 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5 break-all">{snapshot.filename}</p>
                  </td>
                  <td className="px-4 py-3 text-primary">{snapshot.exportedBy || 'Unknown'}</td>
                  <td className="px-4 py-3 text-primary">{formatBytes(snapshot.sizeBytes)}</td>
                  <td className="px-4 py-3 text-primary">
                    <p className="font-medium">{summarizeRecordCounts(snapshot.recordCounts)}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {Object.entries(snapshot.recordCounts)
                        .map(([table, count]) => `${formatTableName(table)}: ${count.toLocaleString()}`)
                        .join(' • ')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void handleImportSnapshot(snapshot.filename)}
                      disabled={importingFilename === snapshot.filename}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-dark-hover/50 text-secondary rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {importingFilename === snapshot.filename ? (
                        <>
                          <LoadingSpinner />
                          Importing...
                        </>
                      ) : (
                        'Import'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoadingInitial && snapshots.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No snapshots found in the shared folder.
                  </td>
                </tr>
              )}
              {isLoadingInitial && (
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <div className="flex items-center justify-center gap-2 text-muted">
                      <LoadingSpinner />
                      Loading snapshots...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
