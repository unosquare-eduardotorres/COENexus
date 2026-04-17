import { memo } from 'react';
import { useDatabaseSharing } from '../../hooks/useDatabaseSharing';

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

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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

const DatabaseSharingPanel = memo(function DatabaseSharingPanel() {
  const {
    state: {
      config,
      status,
      snapshots,
      hasNewSnapshots,
      recordCounts,
      sharedPath,
      exporterName,
      isLoadingInitial,
      isSavingConfig,
      isExporting,
      isImportingLatest,
      importingFilename,
      saveSuccess,
      errorMessage,
      exportResult,
      importResult,
      syncUpdateAvailable,
      syncManifest,
    },
    actions: {
      setSharedPath,
      setExporterName,
      handleSaveConfig,
      handleExportSnapshot,
      handleImportSnapshot,
      handleImportLatest,
      handleCheckForUpdates,
      refreshSnapshots,
    },
  } = useDatabaseSharing();

  return (
    <div className="space-y-5">
      {errorMessage && (
        <div className="glass-card p-4 bg-red-50/60 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20">
          <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      {syncUpdateAvailable && syncManifest && (
        <div className="glass-card p-5 bg-accent-50/60 dark:bg-accent-500/10 border border-accent-200/60 dark:border-accent-500/20">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 dark:bg-accent-400/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-accent-700 dark:text-accent-300">Database Update Available</p>
                <p className="text-sm text-accent-600 dark:text-accent-400 mt-1">
                  New snapshot from <span className="font-semibold">{syncManifest.exportedBy}</span> — {formatTimeAgo(syncManifest.exportedAt)}
                </p>
                <p className="text-xs text-accent-500 dark:text-accent-400/70 mt-1">
                  {formatBytes(syncManifest.sizeBytes)} • {summarizeRecordCounts(syncManifest.recordCounts)} • Schema v{syncManifest.schemaVersion}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleImportLatest}
              disabled={isImportingLatest}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
            >
              {isImportingLatest ? (
                <>
                  <LoadingSpinner className="w-4 h-4 animate-spin text-white" />
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Update Now
                </>
              )}
            </button>
          </div>
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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-primary">Sync Status</h3>
            <p className="text-sm text-muted mt-1">Background watcher monitors the shared folder for new snapshots.</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Watching
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/50 dark:bg-dark-hover/50 rounded-xl p-3">
            <p className="text-xs text-muted">Local DB Hash</p>
            <p className="text-xs font-mono text-primary mt-1 truncate" title={status?.localDbHash || 'Unknown'}>
              {status?.localDbHash ? status.localDbHash.slice(0, 16) + '…' : '—'}
            </p>
          </div>
          <div className="bg-white/50 dark:bg-dark-hover/50 rounded-xl p-3">
            <p className="text-xs text-muted">Remote Snapshot</p>
            <p className="text-xs text-primary mt-1 truncate">
              {syncManifest ? syncManifest.latestSnapshot : '—'}
            </p>
          </div>
          <div className="bg-white/50 dark:bg-dark-hover/50 rounded-xl p-3">
            <p className="text-xs text-muted">Status</p>
            <p className="text-xs mt-1">
              {syncUpdateAvailable ? (
                <span className="font-semibold text-accent-600 dark:text-accent-400">Update available</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Up to date</span>
              )}
            </p>
          </div>
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
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export Snapshot
            </>
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
              {importResult.vecEntriesRebuilt > 0 && (
                <> • {importResult.vecEntriesRebuilt} vector index entries rebuilt</>
              )}
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckForUpdates}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check for Updates
            </button>
            <button
              type="button"
              onClick={refreshSnapshots}
              className="px-3 py-1.5 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
            >
              Refresh List
            </button>
          </div>
        </div>

        {hasNewSnapshots && !syncUpdateAvailable && (
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-50/60 dark:bg-accent-500/10 text-accent-700 dark:text-accent-400 border border-accent-200/60 dark:border-accent-500/20">
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
});

export default DatabaseSharingPanel;
