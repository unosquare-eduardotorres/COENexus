import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIpcQuery } from '../../../hooks/useIpcQuery';
import {
  databaseSharingService,
  DatabaseSharingConfig,
  SnapshotInfo,
  DatabaseStatus,
  ExportResult,
  ImportResult,
} from '../services/databaseSharingService';
import { createRendererLogger } from '../utils/rendererLogger';

const log = createRendererLogger('useDatabaseSharing');

export function useDatabaseSharing() {
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
    setConfig(configData);
    setSharedPath(configData.sharedPath || '');
    setExporterName(configData.exporterName || '');
  }, [configData]);

  useEffect(() => {
    if (!statusData) return;
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
      setExportResult(result);
      await Promise.all([refetchSnapshots(), refetchStatus()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export snapshot');
    } finally {
      setIsExporting(false);
    }
  }, [refetchSnapshots, refetchStatus]);

  const handleImportSnapshot = useCallback(
    async (filename: string) => {
      setImportingFilename(filename);
      setErrorMessage(null);
      setSaveSuccess(null);
      setExportResult(null);
      try {
        const result = await databaseSharingService.importSnapshot(filename);
        setImportResult(result);
        await Promise.all([refetchStatus(), refetchSnapshots()]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to import snapshot');
      } finally {
        setImportingFilename(null);
      }
    },
    [refetchSnapshots, refetchStatus]
  );

  const refreshSnapshots = useCallback(() => {
    void refetchSnapshots().catch(error => {
      log.error('[DatabaseSharingPanel] Failed to refresh snapshots:', error);
    });
  }, [refetchSnapshots]);

  const hasNewSnapshots = snapshots.some(snapshot => snapshot.isNew);
  const recordCounts = status ? Object.entries(status.recordCounts) : [];

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
      importingFilename,
      saveSuccess,
      errorMessage,
      exportResult,
      importResult,
    },
    actions: {
      setSharedPath,
      setExporterName,
      handleSaveConfig,
      handleExportSnapshot,
      handleImportSnapshot,
      refreshSnapshots,
    },
  };
}
