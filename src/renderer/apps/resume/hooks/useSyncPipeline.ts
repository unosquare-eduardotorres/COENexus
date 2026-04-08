import { useState, useRef, useCallback, useEffect } from 'react';
import { SyncSourceType, SyncProgress, SyncRecord, ProcessingProgress, ProcessingRecord } from '../types';
import { dataSyncService } from '../services/dataSyncService';
import { resumeProcessingService } from '../services/resumeProcessingService';
import { createRendererLogger } from '../utils/rendererLogger';
import { useIpcMutation, useIpcQuery, useInvalidateQueries } from '../../../hooks/useIpcQuery';
import { SYNC_STATUS, PROCESSING_STATUS, PIPELINE_STATUS } from '../constants/syncStatus';

const log = createRendererLogger('useSyncPipeline');

const initialProgress = (source: SyncSourceType): SyncProgress => ({
  source, status: SYNC_STATUS.IDLE, totalRecords: 0, fetchedRecords: 0,
  syncedCount: 0, incompleteCount: 0, notProcessedCount: 0,
  extractedCount: 0, vectorizedCount: 0, skippedCount: 0,
});

const initialProcessingProgress = (source: SyncSourceType): ProcessingProgress => ({
  source, status: PROCESSING_STATUS.IDLE, totalRecords: 0, processedRecords: 0,
  successCount: 0, failedCount: 0, skippedCount: 0,
});

function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function restoreProgress(raw: SyncProgress | null, source: SyncSourceType): SyncProgress {
  if (!raw) return initialProgress(source);
  return { ...raw, status: raw.status === SYNC_STATUS.SYNCING ? SYNC_STATUS.PAUSED : raw.status };
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
    totalRecords: hasStaleProgress ? totalFromRecords : Math.max(existing.totalRecords, totalFromRecords),
    fetchedRecords: hasStaleProgress ? totalFromRecords : Math.max(existing.fetchedRecords, totalFromRecords),
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
  const [extractionProgress, setExtractionProgress] = useState<ProcessingProgress>(() =>
    initialProcessingProgress(source)
  );
  const [vectorizationProgress, setVectorizationProgress] = useState<ProcessingProgress>(() =>
    initialProcessingProgress(source)
  );

  const [extractingUpstreamId, setExtractingUpstreamId] = useState<number | undefined>();
  const [vectorizingUpstreamId, setVectorizingUpstreamId] = useState<number | undefined>();
  const [refreshingId, setRefreshingId] = useState<number | undefined>();
  const [vectorizingId, setVectorizingId] = useState<number | undefined>();
  const [isClearing, setIsClearing] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const extractionAbortRef = useRef<AbortController | null>(null);
  const vectorizationAbortRef = useRef<AbortController | null>(null);
  const invalidateQueries = useInvalidateQueries();

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
    setProgress((prev) => computeProgressFromRecords(recordsQuery.data, prev));
  }, [recordsQuery.data]);

  useEffect(() => {
    if (!recordsQuery.error) return;
    log.error('Failed to load sync records:', recordsQuery.error);
  }, [recordsQuery.error]);

  useEffect(() => {
    if (!syncStatusQuery.data) return;
    setProgress((prev) => ({
      ...prev,
      totalRecords: Math.max(prev.totalRecords, syncStatusQuery.data.totalRecords),
      fetchedRecords: Math.max(prev.fetchedRecords, syncStatusQuery.data.fetchedRecords),
    }));
  }, [syncStatusQuery.data]);

  useEffect(() => {
    localStorage.setItem(`datasync-${storageKey(source)}-progress`, JSON.stringify(progress));
  }, [progress, source]);

  const invalidateRecordQueries = useCallback(() => {
    invalidateQueries(recordsQueryKey(source, selectedYear));
    invalidateQueries(['datasync-sync-status', source]);
  }, [invalidateQueries, source, selectedYear]);

  const handleRecordExtracted = useCallback((processed: ProcessingRecord) => {
    if (processed.status === PROCESSING_STATUS.COMPLETED) {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'extracted' as const, failed: false, reason: undefined } : r
        )
      );
      setExtractingUpstreamId(undefined);
    } else if (processed.status === 'failed') {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, failed: true, reason: processed.error } : r
        )
      );
      setExtractingUpstreamId(undefined);
    } else {
      setExtractingUpstreamId(processed.upstreamId);
    }
  }, []);

  const handleRecordVectorized = useCallback((processed: ProcessingRecord) => {
    if (processed.status === PROCESSING_STATUS.COMPLETED) {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'vectorized' as const, failed: false, reason: undefined } : r
        )
      );
      setVectorizingUpstreamId(undefined);
    } else if (processed.status === 'failed') {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, failed: true, reason: processed.error } : r
        )
      );
      setVectorizingUpstreamId(undefined);
    } else {
      setVectorizingUpstreamId(processed.upstreamId);
    }
  }, []);

  const doStartSync = useCallback(async (isResume = false, skipCount?: number) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!isResume) {
      setRecords([]);
      setProgress({
        source, status: SYNC_STATUS.SYNCING, totalRecords: 0, fetchedRecords: 0,
        syncedCount: 0, incompleteCount: 0, notProcessedCount: 0,
        extractedCount: 0, vectorizedCount: 0, skippedCount: 0,
      });
    } else {
      setProgress((prev) => ({ ...prev, status: SYNC_STATUS.SYNCING }));
    }

    const yearParam = source === 'candidates' && selectedYear != null ? selectedYear : undefined;

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
    );

    setProgress({ ...finalProgress, lastSyncedAt: new Date().toISOString() });
    await invalidateRecordQueries();
  }, [source, token, invalidateRecordQueries, selectedYear]);

  const handlePauseSync = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const doRetryIncomplete = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProgress((prev) => ({ ...prev, status: SYNC_STATUS.SYNCING }));

    await dataSyncService.retryFailed(
      source, token,
      (record: SyncRecord) => setRecords((prev) =>
        prev.map((r) => r.upstreamId === record.upstreamId ? record : r)
      ),
      () => {},
      controller.signal,
    );

    await invalidateRecordQueries();
    setProgress((prev) => ({ ...prev, status: SYNC_STATUS.COMPLETED, lastSyncedAt: new Date().toISOString() }));
  }, [source, token, invalidateRecordQueries]);

  const doRetryNotProcessed = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProgress((prev) => ({ ...prev, status: SYNC_STATUS.SYNCING }));

    await dataSyncService.retryNotProcessed(
      source, token,
      (record: SyncRecord) => setRecords((prev) =>
        prev.map((r) => r.upstreamId === record.upstreamId ? record : r)
      ),
      () => {},
      controller.signal,
    );

    await invalidateRecordQueries();
    setProgress((prev) => ({ ...prev, status: SYNC_STATUS.COMPLETED, lastSyncedAt: new Date().toISOString() }));
  }, [source, token, invalidateRecordQueries]);

  const handleStartExtraction = useCallback(async () => {
    extractionAbortRef.current?.abort();
    const controller = new AbortController();
    extractionAbortRef.current = controller;

    setExtractionProgress({
      source, status: PROCESSING_STATUS.PROCESSING, totalRecords: 0,
      processedRecords: 0, successCount: 0, failedCount: 0, skippedCount: 0,
    });

    const finalProgress = await resumeProcessingService.startExtraction(
      source, token, (p) => setExtractionProgress(p),
      handleRecordExtracted, controller.signal,
    );

    setExtractionProgress(finalProgress);
    setExtractingUpstreamId(undefined);
  }, [source, token, handleRecordExtracted]);

  const handlePauseExtraction = useCallback(() => {
    extractionAbortRef.current?.abort();
  }, []);

  const handleStartVectorization = useCallback(async () => {
    vectorizationAbortRef.current?.abort();
    const controller = new AbortController();
    vectorizationAbortRef.current = controller;

    setVectorizationProgress({
      source, status: PROCESSING_STATUS.PROCESSING, totalRecords: 0,
      processedRecords: 0, successCount: 0, failedCount: 0, skippedCount: 0,
    });

    const finalProgress = await resumeProcessingService.startVectorization(
      source, (p) => setVectorizationProgress(p),
      handleRecordVectorized, controller.signal,
    );

    setVectorizationProgress(finalProgress);
    setVectorizingUpstreamId(undefined);
  }, [source, handleRecordVectorized]);

  const handlePauseVectorization = useCallback(() => {
    vectorizationAbortRef.current?.abort();
  }, []);

  const doRetryFailed = useCallback(async () => {
    try {
      const controller = new AbortController();
      extractionAbortRef.current = controller;
      const finalProgress = await resumeProcessingService.retryFailed(
        source, token, (p) => setExtractionProgress(p),
        handleRecordExtracted, controller.signal,
      );
      setExtractionProgress(finalProgress.status === PROCESSING_STATUS.ERROR ? initialProcessingProgress(source) : finalProgress);
      await invalidateRecordQueries();
    } catch (err) {
      log.error('Failed to retry failed records:', err);
    }
  }, [source, token, handleRecordExtracted, invalidateRecordQueries]);

  const doRetryFailedVectorization = useCallback(async () => {
    try {
      const controller = new AbortController();
      vectorizationAbortRef.current = controller;
      const finalProgress = await resumeProcessingService.retryFailedVectorization(
        source, (p) => setVectorizationProgress(p),
        handleRecordVectorized, controller.signal,
      );
      setVectorizationProgress(finalProgress.status === PROCESSING_STATUS.ERROR ? initialProcessingProgress(source) : finalProgress);
      await invalidateRecordQueries();
    } catch (err) {
      log.error('Failed to retry failed vectorization:', err);
    }
  }, [source, handleRecordVectorized, invalidateRecordQueries]);

  const doClearData = useCallback(async () => {
    setIsClearing(true);
    try {
      await dataSyncService.clearRecords(source);
      setRecords([]);
      const freshProgress = initialProgress(source);
      setProgress(freshProgress);
      setExtractionProgress(initialProcessingProgress(source));
      setVectorizationProgress(initialProcessingProgress(source));
    } finally {
      setIsClearing(false);
    }
  }, [source]);

  const doRefreshRecord = useCallback(async (upstreamId: number) => {
    setRefreshingId(upstreamId);
    try {
      const updated = await dataSyncService.syncSingleRecord(source, token, upstreamId);
      setRecords((prev) => prev.map((r) => r.upstreamId === upstreamId ? { ...r, ...updated } : r));
    } finally {
      setRefreshingId(undefined);
    }
  }, [source, token]);

  const doVectorizeRecord = useCallback(async (upstreamId: number) => {
    setVectorizingId(upstreamId);
    try {
      const result = await resumeProcessingService.vectorizeSingle(source, upstreamId);
      if (result.success) {
        setRecords((prev) =>
          prev.map((r) => r.upstreamId === upstreamId ? { ...r, pipelineStatus: 'vectorized' as const, failed: false } : r)
        );
      }
    } finally {
      setVectorizingId(undefined);
    }
  }, [source]);

  const startSyncMutation = useIpcMutation<void, { isResume?: boolean; skipCount?: number }>(
    async ({ isResume = false, skipCount } = {}) => { await doStartSync(isResume, skipCount); }
  );
  const retryIncompleteMutation = useIpcMutation<void>(async () => { await doRetryIncomplete(); });
  const retryNotProcessedMutation = useIpcMutation<void>(async () => { await doRetryNotProcessed(); });
  const retryFailedMutation = useIpcMutation<void>(async () => { await doRetryFailed(); });
  const retryFailedVectorizationMutation = useIpcMutation<void>(async () => { await doRetryFailedVectorization(); });
  const clearDataMutation = useIpcMutation<void>(async () => { await doClearData(); });
  const refreshRecordMutation = useIpcMutation<void, number>(async (upstreamId) => { await doRefreshRecord(upstreamId); });
  const vectorizeRecordMutation = useIpcMutation<void, number>(async (upstreamId) => { await doVectorizeRecord(upstreamId); });

  return {
    progress,
    records,
    extractionProgress,
    vectorizationProgress,
    extractingUpstreamId,
    vectorizingUpstreamId,
    refreshingId,
    vectorizingId,
    isClearing,
    isLoadingRecords: recordsQuery.isLoading || recordsQuery.isFetching,
    handleStartSync: useCallback(() => { startSyncMutation.mutate({}); }, [startSyncMutation]),
    handlePauseSync,
    handleResumeSync: useCallback(() => {
      startSyncMutation.mutate({ isResume: true, skipCount: progress.fetchedRecords });
    }, [startSyncMutation, progress.fetchedRecords]),
    handleResync: useCallback(() => { startSyncMutation.mutate({}); }, [startSyncMutation]),
    handleStartExtraction,
    handlePauseExtraction,
    handleStartVectorization,
    handlePauseVectorization,
    handleRetryFailed: useCallback(() => { retryFailedMutation.mutate(); }, [retryFailedMutation]),
    handleRetryFailedVectorization: useCallback(() => { retryFailedVectorizationMutation.mutate(); }, [retryFailedVectorizationMutation]),
    handleRetryIncomplete: useCallback(() => { retryIncompleteMutation.mutate(); }, [retryIncompleteMutation]),
    handleRetryNotProcessed: useCallback(() => { retryNotProcessedMutation.mutate(); }, [retryNotProcessedMutation]),
    handleClearData: useCallback(() => { clearDataMutation.mutate(); }, [clearDataMutation]),
    handleRefreshRecord: useCallback((upstreamId: number) => { refreshRecordMutation.mutate(upstreamId); }, [refreshRecordMutation]),
    handleVectorizeRecord: useCallback((upstreamId: number) => { vectorizeRecordMutation.mutate(upstreamId); }, [vectorizeRecordMutation]),
  };
}
