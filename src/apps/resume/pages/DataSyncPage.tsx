import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SyncSourceType, SyncProgress, SyncRecord, ProcessingProgress, ProcessingRecord } from '../types';
import TokenInput from '../components/datasync/TokenInput';
import TokenTimer from '../components/datasync/TokenTimer';
import TokenExpirationWarning from '../components/datasync/TokenExpirationWarning';
import SyncDashboard from '../components/datasync/SyncDashboard';
import { dataSyncService } from '../services/dataSyncService';
import { resumeProcessingService } from '../services/resumeProcessingService';
import { isTokenExpired, getTokenExpiration } from '../utils/tokenUtils';

const initialProgress = (source: SyncSourceType): SyncProgress => ({
  source,
  status: 'idle',
  totalRecords: 0,
  fetchedRecords: 0,
  syncedCount: 0,
  incompleteCount: 0,
  notProcessedCount: 0,
  extractedCount: 0,
  vectorizedCount: 0,
  skippedCount: 0,
});

const initialProcessingProgress = (source: SyncSourceType): ProcessingProgress => ({
  source,
  status: 'idle',
  totalRecords: 0,
  processedRecords: 0,
  successCount: 0,
  failedCount: 0,
  skippedCount: 0,
});

function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function restoreProgress(raw: SyncProgress | null, source: SyncSourceType): SyncProgress {
  if (!raw) return initialProgress(source);
  return {
    ...raw,
    status: raw.status === 'syncing' ? 'paused' : raw.status,
  };
}

function computeProgressFromRecords(records: SyncRecord[], existing: SyncProgress): SyncProgress {
  if (records.length === 0) return existing;

  const syncedCount = records.filter((r) => r.pipelineStatus === 'synced').length;
  const extractedCount = records.filter((r) => r.pipelineStatus === 'extracted').length;
  const vectorizedCount = records.filter((r) => r.pipelineStatus === 'vectorized').length;
  const incompleteCount = records.filter((r) => r.pipelineStatus === 'incomplete').length;
  const notProcessedCount = records.filter((r) => r.pipelineStatus === 'not-processed').length;

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
    syncedCount,
    extractedCount,
    vectorizedCount,
    incompleteCount,
    notProcessedCount,
    status: existing.status === 'idle' && totalFromRecords > 0 ? 'completed' : existing.status,
    lastSyncedAt,
  };
}

export default function DataSyncPage() {
  const [token, setToken] = useState(() =>
    localStorage.getItem('datasync-token') ?? ''
  );
  const [isTokenValid, setIsTokenValid] = useState(() => {
    const storedToken = localStorage.getItem('datasync-token') ?? '';
    const wasValid = safeParseJSON(localStorage.getItem('datasync-is-token-valid'), false);
    if (wasValid && storedToken && !isTokenExpired(storedToken)) return true;
    return false;
  });
  const [hasEntered, setHasEntered] = useState(() => {
    const storedToken = localStorage.getItem('datasync-token') ?? '';
    const wasValid = safeParseJSON(localStorage.getItem('datasync-is-token-valid'), false);
    if (wasValid && storedToken && !isTokenExpired(storedToken)) return true;
    return localStorage.getItem('datasync-entered') === 'true';
  });
  const [isValidating, setIsValidating] = useState(false);
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<SyncSourceType>('candidates');
  const [showExpirationWarning, setShowExpirationWarning] = useState(false);
  const [employeeProgress, setEmployeeProgress] = useState<SyncProgress>(() =>
    restoreProgress(
      safeParseJSON(localStorage.getItem('datasync-employee-progress'), null),
      'employees'
    )
  );
  const [candidateProgress, setCandidateProgress] = useState<SyncProgress>(() =>
    restoreProgress(
      safeParseJSON(localStorage.getItem('datasync-candidate-progress'), null),
      'candidates'
    )
  );
  const [employeeRecords, setEmployeeRecords] = useState<SyncRecord[]>([]);
  const [candidateRecords, setCandidateRecords] = useState<SyncRecord[]>([]);

  const [employeeExtractionProgress, setEmployeeExtractionProgress] = useState<ProcessingProgress>(() =>
    initialProcessingProgress('employees')
  );
  const [candidateExtractionProgress, setCandidateExtractionProgress] = useState<ProcessingProgress>(() =>
    initialProcessingProgress('candidates')
  );
  const [employeeVectorizationProgress, setEmployeeVectorizationProgress] = useState<ProcessingProgress>(() =>
    initialProcessingProgress('employees')
  );
  const [candidateVectorizationProgress, setCandidateVectorizationProgress] = useState<ProcessingProgress>(() =>
    initialProcessingProgress('candidates')
  );

  const [refreshingId, setRefreshingId] = useState<number | undefined>();
  const [vectorizingId, setVectorizingId] = useState<number | undefined>();
  const [extractingUpstreamId, setExtractingUpstreamId] = useState<number | undefined>();
  const [vectorizingUpstreamId, setVectorizingUpstreamId] = useState<number | undefined>();
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(() =>
    safeParseJSON(localStorage.getItem('datasync-candidate-year'), null)
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const extractionAbortRef = useRef<AbortController | null>(null);
  const vectorizationAbortRef = useRef<AbortController | null>(null);

  const isSyncing = employeeProgress.status === 'syncing' || candidateProgress.status === 'syncing';
  const isLoadingRecords = activeTab === 'employees' ? isLoadingEmployees : isLoadingCandidates;

  const minutesRemaining = useMemo(() => {
    const expiresAt = getTokenExpiration(token);
    if (!expiresAt) return Infinity;
    return Math.max(0, (expiresAt.getTime() - Date.now()) / 60_000);
  }, [token, showExpirationWarning]);

  const loadRecordsFromDb = useCallback(async (source: SyncSourceType, reconcileStats = false, year?: number | null) => {
    const setLoading = source === 'employees' ? setIsLoadingEmployees : setIsLoadingCandidates;
    const setRecords = source === 'employees' ? setEmployeeRecords : setCandidateRecords;
    const setProgress = source === 'employees' ? setEmployeeProgress : setCandidateProgress;
    try {
      setLoading(true);
      const yearParam = source === 'candidates' && year != null ? year : undefined;
      const records = await dataSyncService.fetchRecords(source, yearParam);
      setRecords(records);

      if (reconcileStats && records.length > 0) {
        setProgress((prev) => computeProgressFromRecords(records, prev));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecordsFromDb('employees', true);
    loadRecordsFromDb('candidates', true, selectedYear);
  }, [loadRecordsFromDb]);

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    loadRecordsFromDb('candidates', true, year);
  }, [loadRecordsFromDb]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('datasync-token', token);
    } else {
      localStorage.removeItem('datasync-token');
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem('datasync-is-token-valid', JSON.stringify(isTokenValid));
  }, [isTokenValid]);

  useEffect(() => {
    if (hasEntered) {
      localStorage.setItem('datasync-entered', 'true');
    }
  }, [hasEntered]);

  useEffect(() => {
    localStorage.setItem('datasync-employee-progress', JSON.stringify(employeeProgress));
  }, [employeeProgress]);

  useEffect(() => {
    localStorage.setItem('datasync-candidate-progress', JSON.stringify(candidateProgress));
  }, [candidateProgress]);

  useEffect(() => {
    if (selectedYear != null) {
      localStorage.setItem('datasync-candidate-year', JSON.stringify(selectedYear));
    } else {
      localStorage.removeItem('datasync-candidate-year');
    }
  }, [selectedYear]);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);
    setTokenError(undefined);
    const result = await dataSyncService.validateToken(token);
    setIsValidating(false);
    if (result.valid) {
      setIsTokenValid(true);
      setHasEntered(true);
    } else {
      setTokenError(result.error);
    }
  }, [token]);

  const handleDisconnect = useCallback(() => {
    setToken('');
    setIsTokenValid(false);
    setTokenError(undefined);
    setShowExpirationWarning(false);
    localStorage.removeItem('datasync-token');
    localStorage.removeItem('datasync-is-token-valid');
    abortControllerRef.current?.abort();
  }, []);

  const handleContinueWithoutToken = useCallback(() => {
    setHasEntered(true);
  }, []);

  const handleTokenExpired = useCallback(() => {
    setShowExpirationWarning(true);
  }, []);

  const handleRefreshToken = useCallback(() => {
    handleDisconnect();
  }, [handleDisconnect]);

  const handleDismissWarning = useCallback(() => {
    setShowExpirationWarning(false);
  }, []);

  const doStartSync = useCallback(async (limit?: number, isResume = false, skipCount?: number) => {
    const source = activeTab;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const setProgress = source === 'employees' ? setEmployeeProgress : setCandidateProgress;
    const setRecords = source === 'employees' ? setEmployeeRecords : setCandidateRecords;

    if (!isResume) {
      setRecords([]);
      setProgress({
        source,
        status: 'syncing',
        totalRecords: 0,
        fetchedRecords: 0,
        syncedCount: 0,
        incompleteCount: 0,
        notProcessedCount: 0,
        extractedCount: 0,
        vectorizedCount: 0,
        skippedCount: 0,
      });
    } else {
      setProgress((prev) => ({ ...prev, status: 'syncing' }));
    }

    const yearParam = source === 'candidates' && selectedYear != null ? selectedYear : undefined;

    const finalProgress = await dataSyncService.startSync(
      source,
      token,
      (progress) => setProgress(progress),
      (record) => setRecords((prev) => {
        const exists = prev.some((r) => r.upstreamId === record.upstreamId);
        return exists
          ? prev.map((r) => r.upstreamId === record.upstreamId ? record : r)
          : [...prev, record];
      }),
      controller.signal,
      limit,
      isResume ? skipCount : undefined,
      yearParam
    );

    setProgress({ ...finalProgress, lastSyncedAt: new Date().toISOString() });

    await loadRecordsFromDb(source, false, yearParam);
  }, [activeTab, token, loadRecordsFromDb, selectedYear]);

  const handleStartSync = useCallback(() => doStartSync(), [doStartSync]);
  const handleStartSyncLimited = useCallback(() => doStartSync(10), [doStartSync]);

  const handlePauseSync = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleRetryIncomplete = useCallback(async () => {
    const source = activeTab;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const setProgress = source === 'employees' ? setEmployeeProgress : setCandidateProgress;
    const setRecords = source === 'employees' ? setEmployeeRecords : setCandidateRecords;

    setProgress((prev) => ({ ...prev, status: 'syncing' }));

    const yearParam = source === 'candidates' && selectedYear != null ? selectedYear : undefined;

    await dataSyncService.retryFailed(
      source,
      token,
      (record: SyncRecord) => setRecords((prev) =>
        prev.map((r) => r.upstreamId === record.upstreamId ? record : r)
      ),
      () => {},
      controller.signal,
      yearParam
    );

    await loadRecordsFromDb(source, true, yearParam);
    setProgress((prev) => ({ ...prev, status: 'completed', lastSyncedAt: new Date().toISOString() }));
  }, [activeTab, token, loadRecordsFromDb, selectedYear]);

  const handleResumeSync = useCallback(() => {
    const currentProgress = activeTab === 'employees' ? employeeProgress : candidateProgress;
    doStartSync(undefined, true, currentProgress.fetchedRecords);
  }, [doStartSync, activeTab, employeeProgress, candidateProgress]);

  const handleRecordExtracted = useCallback((processed: ProcessingRecord) => {
    const setRecords = activeTab === 'employees' ? setEmployeeRecords : setCandidateRecords;

    if (processed.status === 'completed') {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'extracted' as const, failed: false } : r
        )
      );
      setExtractingUpstreamId(undefined);
    } else if (processed.status === 'failed') {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, failed: true } : r
        )
      );
      setExtractingUpstreamId(undefined);
    } else {
      setExtractingUpstreamId(processed.upstreamId);
    }
  }, [activeTab]);

  const handleRecordVectorized = useCallback((processed: ProcessingRecord) => {
    const setRecords = activeTab === 'employees' ? setEmployeeRecords : setCandidateRecords;

    if (processed.status === 'completed') {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'vectorized' as const, failed: false } : r
        )
      );
      setVectorizingUpstreamId(undefined);
    } else if (processed.status === 'failed') {
      setRecords((prev) =>
        prev.map((r) =>
          r.upstreamId === processed.upstreamId ? { ...r, failed: true } : r
        )
      );
      setVectorizingUpstreamId(undefined);
    } else {
      setVectorizingUpstreamId(processed.upstreamId);
    }
  }, [activeTab]);

  const handleStartExtraction = useCallback(async () => {
    const source = activeTab;
    const controller = new AbortController();
    extractionAbortRef.current = controller;

    const setProgress = source === 'employees' ? setEmployeeExtractionProgress : setCandidateExtractionProgress;

    setProgress({
      source,
      status: 'processing',
      totalRecords: 0,
      processedRecords: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });

    const finalProgress = await resumeProcessingService.startExtraction(
      source,
      token,
      (progress) => setProgress(progress),
      handleRecordExtracted,
      controller.signal
    );

    setProgress(finalProgress);
    setExtractingUpstreamId(undefined);
  }, [activeTab, token, handleRecordExtracted]);

  const handlePauseExtraction = useCallback(() => {
    extractionAbortRef.current?.abort();
  }, []);

  const handleStartVectorization = useCallback(async () => {
    const source = activeTab;
    const controller = new AbortController();
    vectorizationAbortRef.current = controller;

    const setProgress = source === 'employees' ? setEmployeeVectorizationProgress : setCandidateVectorizationProgress;

    setProgress({
      source,
      status: 'processing',
      totalRecords: 0,
      processedRecords: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });

    const finalProgress = await resumeProcessingService.startVectorization(
      source,
      (progress) => setProgress(progress),
      handleRecordVectorized,
      controller.signal
    );

    setProgress(finalProgress);
    setVectorizingUpstreamId(undefined);
  }, [activeTab, handleRecordVectorized]);

  const handlePauseVectorization = useCallback(() => {
    vectorizationAbortRef.current?.abort();
  }, []);

  const handleClearData = useCallback(async () => {
    const source = activeTab;
    setIsClearing(true);
    try {
      const yearParam = source === 'candidates' && selectedYear != null ? selectedYear : undefined;
      await dataSyncService.clearRecords(source, yearParam);

      const setRecords = source === 'employees' ? setEmployeeRecords : setCandidateRecords;
      const setProgress = source === 'employees' ? setEmployeeProgress : setCandidateProgress;
      const setExtrProg = source === 'employees' ? setEmployeeExtractionProgress : setCandidateExtractionProgress;
      const setVecProg = source === 'employees' ? setEmployeeVectorizationProgress : setCandidateVectorizationProgress;

      setRecords([]);
      const freshProgress = initialProgress(source);
      setProgress(freshProgress);
      setExtrProg(initialProcessingProgress(source));
      setVecProg(initialProcessingProgress(source));

      localStorage.setItem(
        `datasync-${source === 'employees' ? 'employee' : 'candidate'}-progress`,
        JSON.stringify(freshProgress)
      );
    } finally {
      setIsClearing(false);
    }
  }, [activeTab, selectedYear]);

  const handleRefreshRecord = useCallback(async (upstreamId: number) => {
    setRefreshingId(upstreamId);
    try {
      const updated = await dataSyncService.syncSingleRecord(activeTab, token, upstreamId);
      const setRecords = activeTab === 'employees' ? setEmployeeRecords : setCandidateRecords;
      setRecords((prev) => prev.map((r) => r.upstreamId === upstreamId ? { ...r, ...updated } : r));
    } finally {
      setRefreshingId(undefined);
    }
  }, [activeTab, token]);

  const handleVectorizeRecord = useCallback(async (upstreamId: number) => {
    setVectorizingId(upstreamId);
    try {
      const result = await resumeProcessingService.vectorizeSingle(activeTab, upstreamId);
      if (result.status === 'completed') {
        const setRecords = activeTab === 'employees' ? setEmployeeRecords : setCandidateRecords;
        setRecords((prev) =>
          prev.map((r) => r.upstreamId === upstreamId ? { ...r, pipelineStatus: 'vectorized' as const, failed: false } : r)
        );
      }
    } finally {
      setVectorizingId(undefined);
    }
  }, [activeTab, token]);

  const activeProgress = activeTab === 'employees' ? employeeProgress : candidateProgress;
  const activeRecords = activeTab === 'employees' ? employeeRecords : candidateRecords;
  const activeExtractionProgress = activeTab === 'employees' ? employeeExtractionProgress : candidateExtractionProgress;
  const activeVectorizationProgress = activeTab === 'employees' ? employeeVectorizationProgress : candidateVectorizationProgress;

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-subtle text-xs font-medium text-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
            Data Sync
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Data Sync</h1>
          <p className="text-base text-secondary mt-3 max-w-xl mx-auto">
            Import employee & candidate data from source systems
          </p>
        </div>

        {!hasEntered ? (
          <div className="max-w-lg mx-auto">
            <TokenInput
              token={token}
              onTokenChange={setToken}
              isValid={isTokenValid}
              onValidate={handleValidate}
              isValidating={isValidating}
              error={tokenError}
              onDisconnect={handleDisconnect}
              onContinueWithoutToken={handleContinueWithoutToken}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="inline-flex bg-white/50 dark:bg-dark-surface/50 rounded-xl p-1 border border-gray-200/50 dark:border-dark-border/50">
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'employees'
                      ? 'bg-white dark:bg-dark-hover shadow-sm text-primary'
                      : 'text-muted hover:text-secondary'
                  }`}
                >
                  Employees
                </button>
                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'candidates'
                      ? 'bg-white dark:bg-dark-hover shadow-sm text-primary'
                      : 'text-muted hover:text-secondary'
                  }`}
                >
                  Candidates
                </button>
              </div>

              <div className="flex items-center gap-3">
                {isTokenValid ? (
                  <>
                    <TokenTimer token={token} onExpired={handleTokenExpired} />
                    <button
                      onClick={handleDisconnect}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setHasEntered(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors shadow-sm shadow-accent-500/25 animate-pulse hover:animate-none"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.9-4.243a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                    </svg>
                    Connect Token
                  </button>
                )}
              </div>
            </div>

            <SyncDashboard
              source={activeTab}
              progress={activeProgress}
              records={activeRecords}
              onStartSync={isTokenValid ? handleStartSync : undefined}
              onStartSyncLimited={isTokenValid ? handleStartSyncLimited : undefined}
              onPauseSync={handlePauseSync}
              onResumeSync={isTokenValid ? handleResumeSync : undefined}
              onRetryIncomplete={isTokenValid ? handleRetryIncomplete : undefined}
              onStartExtraction={isTokenValid ? handleStartExtraction : undefined}
              onPauseExtraction={handlePauseExtraction}
              onResumeExtraction={isTokenValid ? handleStartExtraction : undefined}
              extractionProgress={activeExtractionProgress}
              extractingUpstreamId={extractingUpstreamId}
              onStartVectorization={handleStartVectorization}
              onPauseVectorization={handlePauseVectorization}
              onResumeVectorization={handleStartVectorization}
              vectorizationProgress={activeVectorizationProgress}
              vectorizingUpstreamId={vectorizingUpstreamId}
              onRefreshRecord={isTokenValid ? handleRefreshRecord : undefined}
              onVectorizeRecord={handleVectorizeRecord}
              refreshingId={refreshingId}
              vectorizingId={vectorizingId}
              onClearData={handleClearData}
              isLoadingRecords={isLoadingRecords}
              isClearing={isClearing}
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
            />
          </div>
        )}
      </div>

      {showExpirationWarning && (
        <TokenExpirationWarning
          minutesRemaining={minutesRemaining}
          isExpired={isTokenExpired(token)}
          onRefreshToken={handleRefreshToken}
          onDismiss={handleDismissWarning}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}
