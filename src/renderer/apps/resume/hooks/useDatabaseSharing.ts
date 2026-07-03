import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIpcQuery } from '../../../shared/hooks/useIpcQuery';
import {
  databaseSharingService,
  DatabaseSharingConfig,
  SnapshotInfo,
  DatabaseStatus,
  ExportResult,
  ImportResult,
  SyncManifest,
} from '../services/databaseSharingService';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';
import { useToast } from '../../../shared/components/ToastContext';

const log = createRendererLogger('useDatabaseSharing');

function assertIpcSuccess<T>(result: T): asserts result is T {
  if (result && typeof result === 'object' && '__ipcError' in result) {
    throw new Error((result as Record<string, unknown>).message as string || 'IPC call failed');
  }
}

export function useDatabaseSharing() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<DatabaseSharingConfig | null>(null);
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [sharedPath, setSharedPath] = useState('');
  const [exporterName, setExporterName] = useState('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportingLatest, setIsImportingLatest] = useState(false);
  const [importingFilename, setImportingFilename] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [syncUpdateAvailable, setSyncUpdateAvailable] = useState(false);
  const [syncManifest, setSyncManifest] = useState<SyncManifest | null>(null);

  const {
    data: configData,
    error: configError,
    isLoading: isLoadingConfig,
    refetch: refetchConfig,
  } = useIpcQuery(['database-sharing', 'config'], () => databaseSharingService.getConfig());

  const {
    data: statusData,
    error: statusError,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useIpcQuery(['database-sharing', 'status'], () => databaseSharingService.getStatus());

  const {
    data: snapshotsData,
    error: snapshotsError,
    isLoading: isLoadingSnapshots,
    refetch: refetchSnapshots,
  } = useIpcQuery(
    ['database-sharing', 'snapshots'],
    () => databaseSharingService.listSnapshots(),
    { refetchInterval: 30000 },
  );

  const orderedSnapshots = useMemo(
    () =>
      [...(snapshotsData?.snapshots ?? [])].sort(
        (a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime(),
      ),
    [snapshotsData],
  );

  useEffect(() => {
    if (!configData) return;
    if ((configData as any).__ipcError) return;
    setConfig(configData);
    setSharedPath(configData.sharedPath || '');
    setExporterName(configData.exporterName || '');
  }, [configData]);

  useEffect(() => {
    if (!statusData) return;
    if ((statusData as any).__ipcError) return;
    setStatus(statusData);
  }, [statusData]);

  useEffect(() => {
    setSnapshots(orderedSnapshots);
  }, [orderedSnapshots]);

  useEffect(() => {
    if (configError || statusError || snapshotsError) {
      const err = configError ?? statusError ?? snapshotsError;
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load database sharing data');
    }
  }, [configError, snapshotsError, statusError]);

  useEffect(() => {
    if (!isLoadingConfig && !isLoadingStatus && !isLoadingSnapshots) {
      setIsLoadingInitial(false);
    }
  }, [isLoadingConfig, isLoadingSnapshots, isLoadingStatus]);

  useEffect(() => {
    const cleanup = databaseSharingService.onSyncUpdate((manifest: SyncManifest) => {
      setSyncUpdateAvailable(true);
      setSyncManifest(manifest);
      showToast(
        `New database available from ${manifest.exportedBy}`,
        'info',
      );
      void refetchSnapshots();
    });
    return cleanup;
  }, [refetchSnapshots, showToast]);

  const handleSaveConfig = useCallback(async () => {
    setIsSavingConfig(true);
    setSaveSuccess(null);
    setErrorMessage(null);
    try {
      await databaseSharingService.saveConfig({ sharedPath: sharedPath.trim(), exporterName: exporterName.trim() });
      setSaveSuccess('Configuration saved successfully');
      await refetchConfig();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSavingConfig(false);
    }
  }, [exporterName, refetchConfig, sharedPath]);

  const handleExportSnapshot = useCallback(async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    setImportResult(null);
    try {
      const result = await databaseSharingService.exportSnapshot();
      assertIpcSuccess(result);
      setExportResult(result);
      showToast(`Snapshot exported: ${result.filename}`, 'success');
      await Promise.all([refetchSnapshots(), refetchStatus()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export snapshot');
    } finally {
      setIsExporting(false);
    }
  }, [refetchSnapshots, refetchStatus, showToast]);

  const handleImportSnapshot = useCallback(
    async (filename: string) => {
      setImportingFilename(filename);
      setErrorMessage(null);
      setSaveSuccess(null);
      setExportResult(null);
      try {
        const result = await databaseSharingService.importSnapshot(filename);
        assertIpcSuccess(result);
        setImportResult(result);
        setSyncUpdateAvailable(false);
        setSyncManifest(null);
        if (result.vecEntriesRebuilt > 0) {
          showToast(`Imported with ${result.vecEntriesRebuilt} vector index entries rebuilt`, 'success');
        }
        await Promise.all([refetchStatus(), refetchSnapshots()]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to import snapshot');
      } finally {
        setImportingFilename(null);
      }
    },
    [refetchSnapshots, refetchStatus, showToast]
  );

  const handleImportLatest = useCallback(async () => {
    setIsImportingLatest(true);
    setErrorMessage(null);
    setSaveSuccess(null);
    setExportResult(null);
    try {
      const result = await databaseSharingService.importLatest();
      assertIpcSuccess(result);
      setImportResult(result);
      setSyncUpdateAvailable(false);
      setSyncManifest(null);
      showToast('Database updated to latest version', 'success');
      if (result.vecEntriesRebuilt > 0) {
        showToast(`${result.vecEntriesRebuilt} vector index entries rebuilt`, 'info');
      }
      await Promise.all([refetchStatus(), refetchSnapshots()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import latest snapshot');
    } finally {
      setIsImportingLatest(false);
    }
  }, [refetchSnapshots, refetchStatus, showToast]);

  const refreshSnapshots = useCallback(() => {
    void refetchSnapshots().catch(error => {
      log.error('[DatabaseSharingPanel] Failed to refresh snapshots:', error);
    });
  }, [refetchSnapshots]);

  const handleSelectDirectory = useCallback(async () => {
    try {
      const result = await databaseSharingService.selectDirectory();
      if (!result.cancelled && result.path) {
        setSharedPath(result.path);
      }
    } catch (error) {
      log.error('Failed to select directory:', error);
    }
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    try {
      const result = await databaseSharingService.syncCheck();
      if (result.hasUpdate && result.manifest) {
        setSyncUpdateAvailable(true);
        setSyncManifest(result.manifest);
        showToast(`Update available from ${result.manifest.exportedBy}`, 'info');
      } else {
        showToast('Database is up to date', 'success');
      }
    } catch (error) {
      log.error('Failed to check for updates:', error);
    }
  }, [showToast]);

  const hasNewSnapshots = snapshots.some(snapshot => snapshot.isNew);
  const recordCounts = status?.recordCounts ? Object.entries(status.recordCounts) : [];

  return {
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
      handleSelectDirectory,
      refreshSnapshots,
    },
  };
}
