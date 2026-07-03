import { useState, useEffect, memo } from 'react';
import { SyncSourceType, SyncProgress, SyncRecord, ProcessingProgress } from '../types';
import SyncRecordTable from './SyncRecordTable';
import DangerConfirmModal from './DangerConfirmModal';
import YearSelector from './YearSelector';
import { DocumentIcon, SettingsIcon, SpinnerIcon } from '../../../shared/components/icons';
import ProcessActionButtons from './ProcessActionButtons';
import ProgressBar from './ProgressBar';
import SyncStatusCards, { ISSUE_CARDS, PIPELINE_CARDS, type StatusCardKey } from './SyncStatusCards';

interface SyncDashboardProps {
  source: SyncSourceType;
  progress: SyncProgress;
  records: SyncRecord[];
  onStartSync?: () => void;
  onStartSyncAll?: () => void;
  onPauseSync?: () => void;
  onResumeSync?: () => void;
  onStartExtraction?: () => void;
  onPauseExtraction?: () => void;
  onResumeExtraction?: () => void;
  extractionProgress?: ProcessingProgress;
  extractingUpstreamId?: number;
  onStartVectorization?: () => void;
  onPauseVectorization?: () => void;
  onResumeVectorization?: () => void;
  vectorizationProgress?: ProcessingProgress;
  vectorizingUpstreamId?: number;
  onProcessAll?: () => void;
  isProcessingAll?: boolean;
  onRefreshRecord?: (upstreamId: number) => void;
  onVectorizeRecord?: (upstreamId: number) => void;
  refreshingId?: number;
  vectorizingId?: number;
  onClearData?: () => void;
  isLoadingRecords?: boolean;
  isClearing?: boolean;
  selectedYear?: number | null;
  onYearChange?: (year: number) => void;
  isSyncDisabled?: boolean;
  isVoyageKeyConfigured?: boolean;
}

function formatLastSynced(isoString?: string): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SyncDashboard = memo(function SyncDashboard({
  source,
  progress,
  records,
  onStartSync,
  onStartSyncAll,
  onPauseSync,
  onResumeSync,
  onStartExtraction,
  onPauseExtraction,
  onResumeExtraction,
  extractionProgress,
  extractingUpstreamId,
  onStartVectorization,
  onPauseVectorization,
  onResumeVectorization,
  vectorizationProgress,
  vectorizingUpstreamId,
  onProcessAll,
  isProcessingAll,
  onRefreshRecord,
  onVectorizeRecord,
  refreshingId,
  vectorizingId,
  onClearData,
  isLoadingRecords,
  isClearing,
  selectedYear,
  onYearChange,
  isSyncDisabled,
  isVoyageKeyConfigured,
}: SyncDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<StatusCardKey>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExtractionResult, setShowExtractionResult] = useState(false);
  const [showVectorizationResult, setShowVectorizationResult] = useState(false);

  useEffect(() => {
    if (extractionProgress?.status === 'completed') {
      setShowExtractionResult(true);
      const timer = setTimeout(() => setShowExtractionResult(false), 3000);
      return () => clearTimeout(timer);
    }
    if (extractionProgress?.status === 'processing') {
      setShowExtractionResult(false);
    }
  }, [extractionProgress?.status]);

  useEffect(() => {
    if (vectorizationProgress?.status === 'completed') {
      setShowVectorizationResult(true);
      const timer = setTimeout(() => setShowVectorizationResult(false), 3000);
      return () => clearTimeout(timer);
    }
    if (vectorizationProgress?.status === 'processing') {
      setShowVectorizationResult(false);
    }
  }, [vectorizationProgress?.status]);

  const sourceLabel = source === 'open-positions' ? 'Open Positions' : source === 'project-reallocations' ? 'Project Reallocations' : source.charAt(0).toUpperCase() + source.slice(1);
  const isActiveOrPaused = progress.status === 'syncing' || progress.status === 'paused';
  const progressPercent =
    progress.totalRecords > 0
      ? Math.round((progress.fetchedRecords / progress.totalRecords) * 100)
      : 0;
  const fetchedBase = progress.fetchedRecords > 0 ? progress.fetchedRecords : 1;

  const canClear =
    (progress.status === 'idle' || progress.status === 'completed' || progress.status === 'paused') && records.length > 0 && !isClearing;

  const isSyncInProgress = progress.status === 'syncing';
  const candidateNeedsYear = source === 'candidates' && selectedYear == null;

  const isExtracting = extractionProgress?.status === 'processing' || extractionProgress?.status === 'paused';
  const extractionPercent =
    extractionProgress && extractionProgress.totalRecords > 0
      ? Math.round((extractionProgress.processedRecords / extractionProgress.totalRecords) * 100)
      : 0;

  const isVectorizing = vectorizationProgress?.status === 'processing' || vectorizationProgress?.status === 'paused';
  const vectorizationPercent =
    vectorizationProgress && vectorizationProgress.totalRecords > 0
      ? Math.round((vectorizationProgress.processedRecords / vectorizationProgress.totalRecords) * 100)
      : 0;
  const selectedFilterLabel = statusFilter === 'all' ? 'all statuses' : statusFilter.replace(/-/g, ' ');
  const selectedStatusTabId = statusFilter === 'all' ? undefined : `sync-status-tab-${statusFilter}`;
  const syncLiveMessages: Array<string | null> = [
    isLoadingRecords ? `Loading ${sourceLabel} records.` : null,
    isClearing ? `Clearing ${sourceLabel} records.` : null,
    isActiveOrPaused ? `Sync ${progress.status}. ${progressPercent}% complete.` : null,
    isExtracting ? `Extraction ${extractionProgress?.status ?? 'in progress'}. ${extractionPercent}% complete.` : null,
    isVectorizing ? `Vectorization ${vectorizationProgress?.status ?? 'in progress'}. ${vectorizationPercent}% complete.` : null,
    !isLoadingRecords && !isClearing && !isActiveOrPaused && !isExtracting && !isVectorizing
      ? `Showing ${records.length.toLocaleString()} records. Filter ${selectedFilterLabel}.`
      : null,
  ];
  const syncLiveMessage = syncLiveMessages
    .filter((message): message is string => Boolean(message))
    .join(' ');

  const handleCardClick = (key: StatusCardKey) => {
    setStatusFilter((prev) => (prev === key ? 'all' : key));
  };

  const handleClearData = () => {
    if (!onClearData) return;
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    setShowClearConfirm(false);
    onClearData?.();
  };

  return (
    <div className="space-y-4">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {syncLiveMessage}
      </div>
      <div className="glass-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary">{sourceLabel}</h2>
            <p className="text-sm text-muted mt-0.5">
              Last synced: {formatLastSynced(progress.lastSyncedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 bg-gray-100/70 dark:bg-dark-hover/70 rounded-full text-xs font-semibold text-secondary">
              {(progress.totalRecords ?? 0).toLocaleString()} total records
            </span>
          </div>
        </div>
      </div>

      {source === 'candidates' && onYearChange && (
        <YearSelector
          selectedYear={selectedYear ?? null}
          onYearChange={onYearChange}
          disabled={progress.status === 'syncing'}
        />
      )}

      {isActiveOrPaused && (
        <div className="glass-panel-subtle rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary">
              {(progress.fetchedRecords ?? 0).toLocaleString()} / {(progress.totalRecords ?? 0).toLocaleString()} records
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-semibold text-accent-500">
                {progressPercent}%
              </span>
              {progress.status === 'syncing' ? (
                <button
                  onClick={onPauseSync}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  Pause
                </button>
              ) : (
                <button
                  onClick={onResumeSync}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-700 dark:text-accent-400 bg-accent-100 dark:bg-accent-500/20 rounded-lg hover:bg-accent-200 dark:hover:bg-accent-500/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Resume
                </button>
              )}
            </div>
          </div>

          <div className="h-2.5 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <SyncStatusCards
        cards={ISSUE_CARDS}
        progress={progress}
        records={records}
        statusFilter={statusFilter}
        fetchedBase={fetchedBase}
        isRecordDerived={() => true}
        groupLabel="Issue status filters"
        onCardClick={handleCardClick}
      />
      <SyncStatusCards
        cards={PIPELINE_CARDS}
        progress={progress}
        records={records}
        statusFilter={statusFilter}
        fetchedBase={fetchedBase}
        isRecordDerived={() => true}
        groupLabel="Pipeline status filters"
        onCardClick={handleCardClick}
      />

      <div className="flex items-center justify-between gap-2">
        <div>
          {isClearing ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 dark:text-red-400">
              <SpinnerIcon size="sm" className="text-red-500 dark:text-red-400" />
              Clearing...
            </div>
          ) : canClear && onClearData ? (
            <button
              onClick={handleClearData}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Data
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {(statusFilter === 'synced' || statusFilter === 'all' || statusFilter === 'extract_failed' || statusFilter === 'not-processed' || statusFilter === 'sync_failed') && (
            <>
              {progress.status === 'syncing' && (
                <button
                  onClick={onPauseSync}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors duration-200 font-semibold text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  Pause
                </button>
              )}
              {progress.status === 'paused' && (
                <button
                  onClick={onResumeSync}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-semibold text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Resume
                </button>
              )}
              {(progress.status === 'idle' || progress.status === 'completed') && onStartSync && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={isSyncDisabled ? undefined : onStartSync}
                    disabled={isSyncDisabled || candidateNeedsYear}
                    title={isSyncDisabled ? 'SharePoint connection required — connect via the status bar' : 'Sync active positions only'}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-semibold text-sm ${(isSyncDisabled || candidateNeedsYear) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {source === 'open-positions' ? 'Sync Active' : 'Sync'}
                  </button>
                  {source === 'open-positions' && onStartSyncAll && (
                    <button
                      onClick={isSyncDisabled ? undefined : onStartSyncAll}
                      disabled={isSyncDisabled}
                      title={isSyncDisabled ? 'SharePoint connection required — connect via the status bar' : 'Sync all positions including historical (~7000+)'}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors duration-200 font-semibold text-sm ${isSyncDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sync All Positions
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {source !== 'project-reallocations' && (
            <ProcessActionButtons
              progress={extractionProgress}
              hasEligible={records.some((r) =>
                (r.pipelineStatus === 'synced' || r.pipelineStatus === 'extracted'
                  || r.pipelineStatus === 'extract_failed' || r.pipelineStatus === 'vectorize_failed')
                && (source === 'open-positions' ? r.hasJobDescription : r.hasResume)
              )}
              onStart={onProcessAll}
              onPause={onPauseExtraction}
              bgClass="bg-emerald-500"
              hoverBgClass="hover:bg-emerald-600"
              gradientClass="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              label={source === 'open-positions' ? 'Extract & Vectorize' : 'Process All'}
              icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              }
              disabled={isSyncInProgress || isSyncDisabled || isVoyageKeyConfigured === false}
              title={isVoyageKeyConfigured === false ? 'Voyage API key required — configure in Vectorization settings' : undefined}
            />
          )}

          {source !== 'project-reallocations' && !isProcessingAll
            && (statusFilter === 'synced' || statusFilter === 'extracted' || statusFilter === 'extract_failed') && (
            <ProcessActionButtons
              progress={extractionProgress}
              hasEligible={source === 'open-positions'
                ? records.some((r) => (r.pipelineStatus === 'synced' || r.pipelineStatus === 'extract_failed') && r.hasJobDescription)
                : records.some((r) => (r.pipelineStatus === 'synced' || r.pipelineStatus === 'extract_failed') && r.hasResume)}
              onStart={onStartExtraction}
              onPause={onPauseExtraction}
              onResume={onResumeExtraction}
              bgClass="bg-blue-500"
              hoverBgClass="hover:bg-blue-600"
              gradientClass="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              label={source === 'open-positions' ? 'Extract JDs' : 'Extract Resumes'}
              icon={<DocumentIcon size="sm" />}
              disabled={isSyncInProgress || isSyncDisabled}
            />
          )}

          {source !== 'project-reallocations' && !isProcessingAll
            && (statusFilter === 'vectorized' || statusFilter === 'extracted' || statusFilter === 'vectorize_failed') && (
            <ProcessActionButtons
              progress={vectorizationProgress}
              hasEligible={records.some((r) => r.pipelineStatus === 'extracted' || r.pipelineStatus === 'vectorize_failed')}
              onStart={onStartVectorization}
              onPause={onPauseVectorization}
              onResume={onResumeVectorization}
              bgClass="bg-violet-500"
              hoverBgClass="hover:bg-violet-600"
              gradientClass="bg-gradient-to-r from-violet-500 to-violet-500 hover:from-violet-600 hover:to-violet-600"
              label={source === 'open-positions' ? 'Vectorize JDs' : 'Vectorize'}
              icon={<SettingsIcon size="sm" />}
              disabled={isSyncInProgress}
            />
          )}
        </div>
      </div>

      {(isExtracting || showExtractionResult) && extractionProgress && (
        extractionProgress.status === 'completed' ? (
          <div className="glass-panel-subtle rounded-xl p-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-secondary">
                {extractionProgress.totalRecords === 0
                  ? 'No records to extract — all resumes already processed'
                  : `Extraction complete — ${extractionProgress.successCount} extracted, ${extractionProgress.failedCount} failed`}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden mt-2">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: '100%' }} />
            </div>
          </div>
        ) : (
          <ProgressBar
            label={
              isProcessingAll && extractionProgress.currentPhase === 'vectorizing'
                ? (source === 'open-positions' ? 'Vectorizing JDs' : 'Vectorizing resumes')
                : (source === 'open-positions' ? 'Extracting JDs' : 'Extracting resumes')
            }
            progress={extractionProgress}
            percent={extractionPercent}
            dotColor={isProcessingAll && extractionProgress.currentPhase === 'vectorizing' ? 'bg-violet-500' : 'bg-blue-500'}
            barGradient={isProcessingAll && extractionProgress.currentPhase === 'vectorizing' ? 'bg-gradient-to-r from-violet-500 to-violet-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}
            textColor={isProcessingAll && extractionProgress.currentPhase === 'vectorizing' ? 'text-violet-500' : 'text-blue-500'}
            onPause={onPauseExtraction}
            onResume={onResumeExtraction}
          />
        )
      )}

      {!isProcessingAll && (isVectorizing || showVectorizationResult) && vectorizationProgress && (
        vectorizationProgress.status === 'completed' ? (
          <div className="glass-panel-subtle rounded-xl p-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-secondary">
                {vectorizationProgress.totalRecords === 0
                  ? 'No records to vectorize — all extracted resumes already vectorized'
                  : `Vectorization complete — ${vectorizationProgress.successCount} vectorized, ${vectorizationProgress.failedCount} failed`}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden mt-2">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: '100%' }} />
            </div>
          </div>
        ) : (
          <ProgressBar
            label={source === 'open-positions' ? 'Vectorizing JDs' : 'Vectorizing resumes'}
            progress={vectorizationProgress}
            percent={vectorizationPercent}
            dotColor="bg-violet-500"
            barGradient="bg-gradient-to-r from-violet-500 to-violet-500"
            textColor="text-violet-500"
            onPause={onPauseVectorization}
            onResume={onResumeVectorization}
          />
        )
      )}

      <div
        id="sync-records-panel"
        role="tabpanel"
        aria-label={`${sourceLabel} records`}
        aria-labelledby={selectedStatusTabId}
      >
        {isLoadingRecords ? (
          <div className="glass-card flex items-center justify-center py-12" role="status" aria-live="polite" aria-atomic="true">
            <div className="flex items-center gap-3 text-sm text-muted">
              <SpinnerIcon className="text-accent-500" />
              Loading records...
            </div>
          </div>
        ) : (
          <SyncRecordTable
            records={records}
            source={source}
            statusFilter={statusFilter}
            onRefreshRecord={onRefreshRecord}
            refreshingId={refreshingId}
            onVectorizeRecord={onVectorizeRecord}
            vectorizingId={vectorizingId}
            extractingUpstreamId={extractingUpstreamId}
            vectorizingUpstreamId={vectorizingUpstreamId}
          />
        )}
      </div>

      {showClearConfirm && (
        <DangerConfirmModal
          title={`Clear ${sourceLabel} Data`}
          message={`This will permanently delete all synced ${sourceLabel.toLowerCase()} records and their embeddings. This action cannot be undone.`}
          confirmLabel="Clear Data"
          onConfirm={handleConfirmClear}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

    </div>
  );
});

export default SyncDashboard;
