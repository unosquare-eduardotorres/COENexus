import { useState, useRef, useCallback, useEffect } from 'react';
import { SyncSourceType, SyncProgress, SyncRecord } from '../types';
import { dataSyncService } from '../services/dataSyncService';
import { resumeProcessingService } from '../services/processingService';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';
import { useIpcMutation, useIpcQuery, useInvalidateQueries } from '../../../shared/hooks/useIpcQuery';
import { SYNC_STATUS, PIPELINE_STATUS } from '../constants/syncStatus';
import { safeJsonParse as safeParseJSON } from '../../../shared/utils/safeJsonParse';
import { useProcessingPipeline } from './useProcessingPipeline';

const log = createRendererLogger('useSyncPipeline');

const initialProgress = (source: SyncSourceType): SyncProgress => ({
  source, status: SYNC_STATUS.IDLE, totalRecords: 0, fetchedRecords: 0,
  syncedCount: 0, incompleteCount: 0, notProcessedCount: 0,
  extractedCount: 0, vectorizedCount: 0, skippedCount: 0,
});

function restoreProgress(raw: SyncProgress | null, source: SyncSourceType): SyncProgress {
  if (!raw) return initialProgress(source);
  const safeNum = (v: unknown): number => (Number.isFinite(v as number) ? (v as number) : 0);
  return {
    ...raw,
    status: raw.status === SYNC_STATUS.SYNCING ? SYNC_STATUS.PAUSED : raw.status,
    totalRecords: safeNum(raw.totalRecords),
    fetchedRecords: safeNum(raw.fetchedRecords),
    syncedCount: safeNum(raw.syncedCount),
    incompleteCount: safeNum(raw.incompleteCount),
    notProcessedCount: safeNum(raw.notProcessedCount),
    extractedCount: safeNum(raw.extractedCount),
    vectorizedCount: safeNum(raw.vectorizedCount),
    skippedCount: safeNum(raw.skippedCount),
  };
}

function computeProgressFromRecords(records: SyncRecord[], existing: SyncProgress): SyncProgress {
  if (records.length === 0) return existing;
  const syncedCount = records.filter((r) => r.pipelineStatus === PIPELINE_STATUS.SYNCED).length;
  const extractedCount = records.filter((r) => r.pipelineStatus === PIPELINE_STATUS.EXTRACTED).length;
  const vectorizedCount = records.filter((r) => r.pipelineStatus === PIPELINE_STATUS.VECTORIZED).length;
  const incompleteCount = records.filter((r) => r.pipelineStatus === PIPELINE_STATUS.INCOMPLETE).length;
  const notProcessedCount = records.filter((r) => r.pipelineStatus === PIPELINE_STATUS.NOT_PROCESSED).length;
  const totalFromRecords = records.length;
  const hasStaleProgress = existing.fetchedRecords === 0 && totalFromRecords > 0;
  const lastSyncedAt = records.reduce<string | undefined>((latest, r) => {
    if (!r.syncedAt) return latest;
    return !latest || r.syncedAt > latest ? r.syncedAt : latest;
  }, existing.lastSyncedAt);
  return {
    ...existing,
    totalRecords: hasStaleProgress ? totalFromRecords : existing.totalRecords,
    fetchedRecords: hasStaleProgress ? totalFromRecords : existing.fetchedRecords,
    syncedCount, extractedCount, vectorizedCount, incompleteCount, notProcessedCount,
    status: existing.status === SYNC_STATUS.IDLE && totalFromRecords > 0 ? SYNC_STATUS.COMPLETED : existing.status,
    lastSyncedAt,
  };
}

function storageKey(source: SyncSourceType): string {
  return source === 'employees' ? 'employee' : source === 'candidates' ? 'candidate' : 'openposition';
}

function recordsQueryKey(source: SyncSourceType, year?: number | null): string[] {
  return source === 'candidates'
    ? ['datasync-records', source, String(year ?? 'all')]
    : ['datasync-records', source];
}

interface UseSyncPipelineOptions {
  source: SyncSourceType;
  token: string;
  enabled: boolean;
  selectedYear?: number | null;
}

export function useSyncPipeline({ source, token, enabled, selectedYear }: UseSyncPipelineOptions) {
  const [progress, setProgress] = useState<SyncProgress>(() =>
    restoreProgress(
      safeParseJSON(localStorage.getItem(`datasync-${storageKey(source)}-progress`), null),
      source,
    )
  );
  const [records, setRecords] = useState<SyncRecord[]>([]);
  const [refreshingId, setRefreshingId] = useState<number | undefined>();
  const [vectorizingId, setVectorizingId] = useState<number | undefined>();
  const [isClearing, setIsClearing] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const invalidateQueries = useInvalidateQueries();

  const invalidateRecordQueries = useCallback(() => {
    invalidateQueries(recordsQueryKey(source, selectedYear));
    invalidateQueries(['datasync-sync-status', source]);
  }, [invalidateQueries, source, selectedYear]);

  const processing = useProcessingPipeline(source, token, setRecords, invalidateRecordQueries);

  const recordsQuery = useIpcQuery(
    recordsQueryKey(source, selectedYear),
    () => dataSyncService.fetchRecords(source),
    { enabled },
  );
  const syncStatusQuery = useIpcQuery(
    ['datasync-sync-status', source],
    () => dataSyncService.fetchSyncStatus(source),
    { enabled, refetchInterval: 5000 },
  );

  useEffect(() => {
    if (!recordsQuery.data) return;
    setRecords(recordsQuery.data);
    setProgress((prev) => {
      if (prev.status === SYNC_STATUS.SYNCING) return prev;
      return computeProgressFromRecords(recordsQuery.data, prev);
    });
  }, [recordsQuery.data]);

  useEffect(() => {
    if (!recordsQuery.error) return;
    log.error('Failed to load sync records:', recordsQuery.error);
  }, [recordsQuery.error]);

  useEffect(() => {
    if (!syncStatusQuery.data) return;
    setProgress((prev) => {
      if (prev.status === SYNC_STATUS.SYNCING) return prev;
      return {
        ...prev,
        totalRecords: Math.max(prev.totalRecords ?? 0, syncStatusQuery.data.totalRecords ?? 0),
        fetchedRecords: Math.max(prev.fetchedRecords ?? 0, syncStatusQuery.data.fetchedRecords ?? 0),
      };
    });
  }, [syncStatusQuery.data]);

  useEffect(() => {
    localStorage.setItem(`datasync-${storageKey(source)}-progress`, JSON.stringify(progress));
  }, [progress, source]);

  const doStartSync = useCallback(async (isResume = false, skipCount?: number, activeOnly?: boolean) => {
    log.info('Sync started', { source, isResume, skipCount: skipCount ?? 0, selectedYear: selectedYear ?? null, activeOnly: activeOnly ?? null });
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!isResume) {
      setRecords([]);
      setProgress({
        source, status: SYNC_STATUS.SYNCING, totalRecords: 0, fetchedRecords: 0,
        syncedCount: 0, incompleteCount: 0, notProcessedCount: 0,
        extractedCount: 0, vectorizedCount: 0, skippedCount: 0,
      });
      localStorage.removeItem(`datasync-${storageKey(source)}-progress`);
    } else {
      setProgress((prev) => ({ ...prev, status: SYNC_STATUS.SYNCING }));
    }

    const yearParam = source === 'candidates' && selectedYear != null ? selectedYear : undefined;

    try {
      const finalProgress = await dataSyncService.startSync(
        source, token,
        (p) => setProgress(p),
        (record) => setRecords((prev) => {
          const exists = prev.some((r) => r.upstreamId === record.upstreamId);
          return exists
            ? prev.map((r) => r.upstreamId === record.upstreamId ? record : r)
            : [...prev, record];
        }),
        controller.signal, undefined,
        isResume ? skipCount : undefined,
        yearParam,
        activeOnly,
      );

      setProgress({ ...finalProgress, lastSyncedAt: new Date().toISOString() });
      log.info('Sync completed', {
        source, activeOnly: activeOnly ?? null,
        fetchedRecords: finalProgress.fetchedRecords,
        syncedCount: finalProgress.syncedCount,
      });
      await invalidateRecordQueries();
    } catch (err) {
      log.error('Sync failed', err instanceof Error ? err : new Error(String(err)));
      setProgress((prev) => ({ ...prev, status: SYNC_STATUS.ERROR }));
      throw err;
    }
  }, [source, token, invalidateRecordQueries, selectedYear]);

  const handlePauseSync = useCallback(() => {
    log.warn('Sync pause requested', { source });
    abortControllerRef.current?.abort();
  }, [source]);

  const doClearData = useCallback(async () => {
    log.warn('Data clear started', { source });
    setIsClearing(true);
    try {
      await dataSyncService.clearRecords(source);
      setRecords([]);
      setProgress(initialProgress(source));
      log.info('Data clear completed', { source });
    } finally {
      setIsClearing(false);
    }
  }, [source]);

  const doRefreshRecord = useCallback(async (upstreamId: number) => {
    log.info('Single record sync started', { source, upstreamId });
    setRefreshingId(upstreamId);
    try {
      const updated = await dataSyncService.syncSingleRecord(source, token, upstreamId);
      setRecords((prev) => prev.map((r) => r.upstreamId === upstreamId ? { ...r, ...updated } : r));
      log.info('Single record sync completed', { source, upstreamId });
    } finally {
      setRefreshingId(undefined);
    }
  }, [source, token]);

  const doVectorizeRecord = useCallback(async (upstreamId: number) => {
    log.info('Single record vectorization started', { source, upstreamId });
    setVectorizingId(upstreamId);
    try {
      const result = await resumeProcessingService.vectorizeSingle(source, upstreamId);
      if (result.success) {
        setRecords((prev) =>
          prev.map((r) => r.upstreamId === upstreamId ? { ...r, pipelineStatus: 'vectorized' as const } : r)
        );
        log.info('Single record vectorization completed', { source, upstreamId });
      }
    } finally {
      setVectorizingId(undefined);
    }
  }, [source]);

  const startSyncMutation = useIpcMutation<void, { isResume?: boolean; skipCount?: number }>(
    async ({ isResume = false, skipCount } = {}) => { await doStartSync(isResume, skipCount); }
  );
  const startSyncAllMutation = useIpcMutation<void, { isResume?: boolean; skipCount?: number }>(
    async ({ isResume = false, skipCount } = {}) => { await doStartSync(isResume, skipCount, false); }
  );
  const clearDataMutation = useIpcMutation<void>(async () => { await doClearData(); });
  const refreshRecordMutation = useIpcMutation<void, number>(async (upstreamId) => { await doRefreshRecord(upstreamId); });
  const vectorizeRecordMutation = useIpcMutation<void, number>(async (upstreamId) => { await doVectorizeRecord(upstreamId); });

  return {
    progress,
    records,
    extractionProgress: processing.extractionProgress,
    vectorizationProgress: processing.vectorizationProgress,
    extractingUpstreamId: processing.extractingUpstreamId,
    vectorizingUpstreamId: processing.vectorizingUpstreamId,
    refreshingId,
    vectorizingId,
    isClearing,
    isProcessingAll: processing.isProcessingAll,
    isLoadingRecords: recordsQuery.isLoading || recordsQuery.isFetching,
    handleStartSync: useCallback(() => { startSyncMutation.mutate({}); }, [startSyncMutation]),
    handleStartSyncAll: useCallback(() => { startSyncAllMutation.mutate({}); }, [startSyncAllMutation]),
    handlePauseSync,
    handleResumeSync: useCallback(() => {
      startSyncMutation.mutate({ isResume: true, skipCount: progress.fetchedRecords });
    }, [startSyncMutation, progress.fetchedRecords]),
    handleStartExtraction: processing.handleStartExtraction,
    handlePauseExtraction: processing.handlePauseExtraction,
    handleStartVectorization: processing.handleStartVectorization,
    handlePauseVectorization: processing.handlePauseVectorization,
    handleProcessAll: processing.handleProcessAll,
    handleClearData: useCallback(() => { clearDataMutation.mutate(); }, [clearDataMutation]),
    handleRefreshRecord: useCallback((upstreamId: number) => { refreshRecordMutation.mutate(upstreamId); }, [refreshRecordMutation]),
    handleVectorizeRecord: useCallback((upstreamId: number) => { vectorizeRecordMutation.mutate(upstreamId); }, [vectorizeRecordMutation]),
  };
}
