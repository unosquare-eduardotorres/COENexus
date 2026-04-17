import { useState, useRef, useCallback, useEffect } from 'react';
import { SyncSourceType, SyncProgress, SyncRecord, ProcessingProgress, ProcessingRecord } from '../types';
import { dataSyncService } from '../services/dataSyncService';
import { resumeProcessingService } from '../services/processingService';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';
import { useIpcMutation, useIpcQuery, useInvalidateQueries } from '../../../shared/hooks/useIpcQuery';
import { SYNC_STATUS, PROCESSING_STATUS, PIPELINE_STATUS } from '../constants/syncStatus';
import { safeJsonParse as safeParseJSON } from '../../../shared/utils/safeJsonParse';

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

  const invalidateRecordQueries = useCallback(() => {
    invalidateQueries(recordsQueryKey(source, selectedYear));
    invalidateQueries(['datasync-sync-status', source]);
  }, [invalidateQueries, source, selectedYear]);

  const handleRecordExtracted = useCallback((processed: ProcessingRecord) => {
    if (processed.status === PROCESSING_STATUS.COMPLETED) {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'extracted' as const, reason: undefined } : r
        )
      );
      setExtractingUpstreamId(undefined);
    } else if (processed.status === 'failed') {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'extract_failed' as const, reason: processed.error } : r
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
          r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'vectorized' as const, reason: undefined } : r
        )
      );
      setVectorizingUpstreamId(undefined);
    } else if (processed.status === 'failed') {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'vectorize_failed' as const, reason: processed.error } : r
        )
      );
      setVectorizingUpstreamId(undefined);
    } else {
      setVectorizingUpstreamId(processed.upstreamId);
    }
  }, []);

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
        source,
        activeOnly: activeOnly ?? null,
        fetchedRecords: finalProgress.fetchedRecords,
        syncedCount: finalProgress.syncedCount,
        incompleteCount: finalProgress.incompleteCount,
        notProcessedCount: finalProgress.notProcessedCount,
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
  }, []);

  const handleStartExtraction = useCallback(async () => {
    log.info('Extraction started', { source });
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
    log.info('Extraction completed', {
      source,
      successCount: finalProgress.successCount,
      failedCount: finalProgress.failedCount,
      skippedCount: finalProgress.skippedCount,
    });

    if (finalProgress.successCount > 0) {
      await invalidateRecordQueries();
    }
  }, [source, token, handleRecordExtracted, invalidateRecordQueries]);

  const handlePauseExtraction = useCallback(() => {
    log.warn('Extraction pause requested', { source });
    extractionAbortRef.current?.abort();
  }, []);

  const handleStartVectorization = useCallback(async () => {
    log.info('Vectorization started', { source });
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
    log.info('Vectorization completed', {
      source,
      successCount: finalProgress.successCount,
      failedCount: finalProgress.failedCount,
      skippedCount: finalProgress.skippedCount,
    });

    if (finalProgress.successCount > 0) {
      await invalidateRecordQueries();
    }
  }, [source, handleRecordVectorized, invalidateRecordQueries]);

  const handlePauseVectorization = useCallback(() => {
    log.warn('Vectorization pause requested', { source });
    vectorizationAbortRef.current?.abort();
  }, []);

  const handleProcessAll = useCallback(async () => {
    log.info('Process-all started', { source });
    extractionAbortRef.current?.abort();
    vectorizationAbortRef.current?.abort();
    const controller = new AbortController();
    extractionAbortRef.current = controller;

    setExtractionProgress({
      source, status: PROCESSING_STATUS.PROCESSING, totalRecords: 0,
      processedRecords: 0, successCount: 0, failedCount: 0, skippedCount: 0,
    });

    const handleRecord = (processed: ProcessingRecord) => {
      if (processed.status === 'extracted') {
        handleRecordExtracted(processed);
      } else if (processed.status === 'vectorized') {
        handleRecordVectorized(processed);
      } else if (processed.status === 'failed') {
        handleRecordExtracted(processed);
      }
    };

    const finalProgress = await resumeProcessingService.processAll(
      source, token, (p) => setExtractionProgress(p),
      handleRecord, controller.signal,
    );

    setExtractionProgress(finalProgress);
    setExtractingUpstreamId(undefined);
    setVectorizingUpstreamId(undefined);
    log.info('Process-all completed', {
      source,
      successCount: finalProgress.successCount,
      failedCount: finalProgress.failedCount,
      skippedCount: finalProgress.skippedCount,
    });

    if (finalProgress.successCount > 0) {
      await invalidateRecordQueries();
    }
  }, [source, token, handleRecordExtracted, handleRecordVectorized, invalidateRecordQueries]);

  const doClearData = useCallback(async () => {
    log.warn('Data clear started', { source });
    setIsClearing(true);
    try {
      await dataSyncService.clearRecords(source);
      setRecords([]);
      const freshProgress = initialProgress(source);
      setProgress(freshProgress);
      setExtractionProgress(initialProcessingProgress(source));
      setVectorizationProgress(initialProcessingProgress(source));
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
    extractionProgress,
    vectorizationProgress,
    extractingUpstreamId,
    vectorizingUpstreamId,
    refreshingId,
    vectorizingId,
    isClearing,
    isLoadingRecords: recordsQuery.isLoading || recordsQuery.isFetching,
    handleStartSync: useCallback(() => { startSyncMutation.mutate({}); }, [startSyncMutation]),
    handleStartSyncAll: useCallback(() => { startSyncAllMutation.mutate({}); }, [startSyncAllMutation]),
    handlePauseSync,
    handleResumeSync: useCallback(() => {
      startSyncMutation.mutate({ isResume: true, skipCount: progress.fetchedRecords });
    }, [startSyncMutation, progress.fetchedRecords]),
    handleStartExtraction,
    handlePauseExtraction,
    handleStartVectorization,
    handlePauseVectorization,
    handleProcessAll,
    handleClearData: useCallback(() => { clearDataMutation.mutate(); }, [clearDataMutation]),
    handleRefreshRecord: useCallback((upstreamId: number) => { refreshRecordMutation.mutate(upstreamId); }, [refreshRecordMutation]),
    handleVectorizeRecord: useCallback((upstreamId: number) => { vectorizeRecordMutation.mutate(upstreamId); }, [vectorizeRecordMutation]),
  };
}
