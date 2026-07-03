import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('DatabaseUpdateBanner');

interface DatabaseSharingConfig {
  sharedPath: string;
  isConfigured: boolean;
  exporterName: string;
}

interface SnapshotInfo {
  filename: string;
  exportedAt: string;
  exportedBy: string;
  sizeBytes: number;
  recordCounts: Record<string, number>;
  isNew: boolean;
}

interface SnapshotsResponse {
  snapshots: SnapshotInfo[];
}

interface ImportResponse {
  success: boolean;
}

const getSnapshotKey = (snapshot: SnapshotInfo) => `${snapshot.filename}:${snapshot.exportedAt}`;

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatRecordSummary = (recordCounts: Record<string, number>) => {
  const tableCount = Object.keys(recordCounts).length;
  const totalRecords = Object.values(recordCounts).reduce((sum, count) => sum + count, 0);
  if (tableCount === 0) return '0 records';
  if (tableCount === 1) return `${totalRecords.toLocaleString()} record${totalRecords === 1 ? '' : 's'}`;
  return `${totalRecords.toLocaleString()} records across ${tableCount} tables`;
};

export default function DatabaseUpdateBanner() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [latestNewSnapshot, setLatestNewSnapshot] = useState<SnapshotInfo | null>(null);
  const [dismissedSnapshotKey, setDismissedSnapshotKey] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadBannerState = useCallback(async () => {
    try {
      const config = (await window.api.database.getConfig()) as DatabaseSharingConfig;
      if (!config.isConfigured) {
        setIsConfigured(false);
        setLatestNewSnapshot(null);
        return;
      }

      setIsConfigured(true);

      const data = (await window.api.database.listSnapshots()) as SnapshotsResponse;
      const newestSnapshot = data.snapshots
        .filter((snapshot) => snapshot.isNew)
        .sort((a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime())[0] ?? null;

      setLatestNewSnapshot(newestSnapshot);
    } catch (err) {
      log.warn('Database config check failed:', err);
      setIsConfigured(false);
      setLatestNewSnapshot(null);
    }
  }, []);

  useEffect(() => {
    void loadBannerState();
    const intervalId = window.setInterval(() => {
      void loadBannerState();
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [loadBannerState]);

  const recordSummary = useMemo(
    () => (latestNewSnapshot ? formatRecordSummary(latestNewSnapshot.recordCounts) : ''),
    [latestNewSnapshot]
  );

  if (!isConfigured || !latestNewSnapshot) return null;

  const snapshotKey = getSnapshotKey(latestNewSnapshot);
  if (dismissedSnapshotKey === snapshotKey) return null;

  const handleDismiss = () => {
    setDismissedSnapshotKey(snapshotKey);
  };

  const handleImport = async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const result = (await window.api.database.import({ filename: latestNewSnapshot.filename })) as ImportResponse;
      if (result.success) {
        setDismissedSnapshotKey(snapshotKey);
      }
      await loadBannerState();
    } catch (err) {
      log.warn('Database import check failed:', err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="px-4 md:px-6 pt-4">
      <div className="glass-card p-4 border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-100/80 dark:bg-accent-500/20 flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.389 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">
                New database snapshot available from {latestNewSnapshot.exportedBy} ({formatDate(latestNewSnapshot.exportedAt)} - {recordSummary})
              </p>
              <p className="text-xs text-secondary mt-1">
                File: {latestNewSnapshot.filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting}
              className="px-3 py-1.5 text-xs font-medium text-white bg-accent-500 rounded-xl hover:bg-accent-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
