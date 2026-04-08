import { useState, memo } from 'react';
import { SyncSourceType, SyncProgress, SyncRecord, PipelineStatus, ProcessingProgress } from '../../types';
import { ISSUE_STATUS_COLORS, PIPELINE_STATUS_COLORS } from '../../utils/statusColors';
import SyncRecordTable from './SyncRecordTable';
import ConfirmModal from './ConfirmModal';
import DangerConfirmModal from './DangerConfirmModal';
import YearSelector from './YearSelector';
import { CheckIcon, DocumentIcon, SettingsIcon, SpinnerIcon } from '../shared/icons';

interface SyncDashboardProps {
  source: SyncSourceType;
  progress: SyncProgress;
  records: SyncRecord[];
  onStartSync?: () => void;
  onResync?: () => void;
  onPauseSync?: () => void;
  onResumeSync?: () => void;
  onRetryIncomplete?: () => void;
  onRetryNotProcessed?: () => void;
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
  onRefreshRecord?: (upstreamId: number) => void;
  onVectorizeRecord?: (upstreamId: number) => void;
  refreshingId?: number;
  vectorizingId?: number;
  onRetryFailed?: () => void;
  onRetryFailedVectorization?: () => void;
  onClearData?: () => void;
  isLoadingRecords?: boolean;
  isClearing?: boolean;
  selectedYear?: number | null;
  onYearChange?: (year: number) => void;
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

function pct(count: number, base: number): string {
  if (base === 0) return '0%';
  return `${Math.round((count / base) * 100)}%`;
}

type StatusCardKey = PipelineStatus | 'all' | 'excluded';

interface StatusCardDef {
  key: StatusCardKey;
  label: string;
  icon: (className: string) => JSX.Element;
  borderColor: string;
  bgColor: string;
  iconColor: string;
  glowRing: string;
  glowShadow: string;
  getValue: (p: SyncProgress, records: SyncRecord[]) => number;
}

const ISSUE_CARDS: StatusCardDef[] = [
  {
    key: 'incomplete',
    label: 'Incomplete',
    icon: (className) => (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    ...ISSUE_STATUS_COLORS.incomplete,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'incomplete').length,
  },
  {
    key: 'not-processed',
    label: 'Not Processed',
    icon: (className) => (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    ...ISSUE_STATUS_COLORS['not-processed'],
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'not-processed').length,
  },
  {
    key: 'excluded',
    label: 'Excluded',
    icon: (className) => (
      <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    ...ISSUE_STATUS_COLORS.excluded,
    getValue: (p) => p.skippedCount ?? 0,
  },
];

const PIPELINE_CARDS: StatusCardDef[] = [
  {
    key: 'synced',
    label: 'Synced',
    icon: (className) => <CheckIcon className={className} />,
    ...PIPELINE_STATUS_COLORS.synced,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'synced' && !r.failed).length,
  },
  {
    key: 'extracted',
    label: 'Extracted',
    icon: (className) => <DocumentIcon className={className} />,
    ...PIPELINE_STATUS_COLORS.extracted,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'extracted' || (r.pipelineStatus === 'synced' && r.failed)).length,
  },
  {
    key: 'vectorized',
    label: 'Vectorized',
    icon: (className) => <SettingsIcon className={className} />,
    ...PIPELINE_STATUS_COLORS.vectorized,
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'vectorized' || (r.pipelineStatus === 'extracted' && r.failed)).length,
  },
];

function ProcessActionButtons({
  progress,
  hasEligible,
  onStart,
  onPause,
  onResume,
  bgClass,
  hoverBgClass,
  gradientClass,
  label,
  reLabel,
  icon,
  disabled,
}: {
  progress?: ProcessingProgress;
  hasEligible: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  bgClass: string;
  hoverBgClass: string;
  gradientClass: string;
  label: string;
  reLabel: string;
  icon: JSX.Element;
  disabled?: boolean;
}) {
  const status = progress?.status ?? 'idle';
  const isRunning = status === 'processing';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isAuthFailed = status === 'auth_failed';
  const isError = status === 'error' || isAuthFailed;
  const isIdle = status === 'idle';

  if (isRunning && onPause) {
    return (
      <button
        onClick={onPause}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors duration-200 font-semibold text-sm"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
        Pause
      </button>
    );
  }

  if (isPaused && onResume) {
    return (
      <button
        onClick={onResume}
        className={`inline-flex items-center gap-2 px-5 py-2.5 ${bgClass} text-white rounded-xl ${hoverBgClass} transition-colors duration-200 font-semibold text-sm`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        Resume
      </button>
    );
  }

  if (isError && onStart) {
    return (
      <div className="flex items-center gap-3">
        {isAuthFailed && (
          <span className="text-xs font-medium text-red-500 dark:text-red-400">
            Token expired or invalid
          </span>
        )}
        <button
          onClick={onStart}
          disabled={disabled}
          className={`inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 font-semibold text-sm ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </button>
      </div>
    );
  }

  if (isCompleted && onStart) {
    return (
      <button
        onClick={onStart}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-5 py-2.5 ${gradientClass} text-white rounded-xl transition-all duration-200 font-semibold text-sm ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {reLabel}
      </button>
    );
  }

  if (isIdle && hasEligible && onStart) {
    return (
      <button
        onClick={onStart}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-5 py-2.5 ${bgClass} text-white rounded-xl ${hoverBgClass} transition-colors duration-200 font-semibold text-sm ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }

  return null;
}

function ProgressBar({
  label,
  progress,
  percent,
  dotColor,
  barGradient,
  textColor,
  onPause,
  onResume,
}: {
  label: string;
  progress: ProcessingProgress;
  percent: number;
  dotColor: string;
  barGradient: string;
  textColor: string;
  onPause?: () => void;
  onResume?: () => void;
}) {
  return (
    <div className="glass-panel-subtle rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
          <span className="text-sm font-medium text-secondary">
            {label} — {progress.processedRecords} / {progress.totalRecords}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-mono font-semibold ${textColor}`}>
            {percent}%
          </span>
          {progress.status === 'processing' && onPause ? (
            <button
              onClick={onPause}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </button>
          ) : progress.status === 'paused' && onResume ? (
            <button
              onClick={onResume}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${textColor} bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Resume
            </button>
          ) : null}
        </div>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
        <div
          className={`h-full ${barGradient} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {progress.currentRecord && (
        <p className="text-xs text-muted truncate" title={progress.currentRecord}>
          Processing "{progress.currentRecord}"
        </p>
      )}
    </div>
  );
}

const SyncDashboard = memo(function SyncDashboard({
  source,
  progress,
  records,
  onStartSync,
  onResync,
  onPauseSync,
  onResumeSync,
  onRetryIncomplete,
  onRetryNotProcessed,
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
  onRefreshRecord,
  onVectorizeRecord,
  refreshingId,
  vectorizingId,
  onRetryFailed,
  onRetryFailedVectorization,
  onClearData,
  isLoadingRecords,
  isClearing,
  selectedYear,
  onYearChange,
}: SyncDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<StatusCardKey>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResyncConfirm, setShowResyncConfirm] = useState(false);

  const sourceLabel = source === 'open-positions' ? 'Open Positions' : source.charAt(0).toUpperCase() + source.slice(1);
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

  const renderCardGrid = (cards: StatusCardDef[], isRecordDerived: (key: StatusCardKey) => boolean, groupLabel: string) => (
    <div className="grid grid-cols-3 gap-4" role="tablist" aria-label={groupLabel}>
      {cards.map((card) => {
        const isSelected = statusFilter === card.key;
        const value = card.getValue(progress, records);
        const isDerived = isRecordDerived(card.key);
        return (
          <button
            key={card.key}
            id={`sync-status-tab-${card.key}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls="sync-records-panel"
            tabIndex={0}
            aria-label={`${card.label}: ${value.toLocaleString()} (${pct(value, isDerived ? records.length : fetchedBase)})`}
            onClick={() => handleCardClick(card.key)}
            className={`glass-card p-5 border text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
              isSelected
                ? `${card.borderColor} ${card.glowRing} ${card.glowShadow}`
                : `${card.borderColor} hover:shadow-md`
            }`}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center flex-shrink-0`}>
                {card.icon(card.iconColor)}
              </div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="text-3xl font-bold text-primary">{value.toLocaleString()}</div>
            <div className="text-xs text-muted mt-1">
              {pct(value, isDerived ? records.length : fetchedBase)} of {isDerived ? 'total' : 'fetched'}
            </div>
          </button>
        );
      })}
    </div>
  );

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
              {progress.totalRecords.toLocaleString()} total records
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
              {progress.fetchedRecords.toLocaleString()} / {progress.totalRecords.toLocaleString()} records
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

      {renderCardGrid(ISSUE_CARDS, () => true, 'Issue status filters')}
      {renderCardGrid(PIPELINE_CARDS, () => true, 'Pipeline status filters')}

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
          {statusFilter === 'not-processed' && onRetryNotProcessed && progress.notProcessedCount > 0 && (
            <button
              onClick={onRetryNotProcessed}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors duration-200 font-semibold text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Not Processed ({progress.notProcessedCount})
            </button>
          )}

          {statusFilter === 'incomplete' && onRetryIncomplete && progress.incompleteCount > 0 && (
            <button
              onClick={onRetryIncomplete}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors duration-200 font-semibold text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Incomplete ({progress.incompleteCount})
            </button>
          )}

          {statusFilter === 'synced' && onRetryFailed && records.some(r => r.pipelineStatus === 'synced' && r.failed) && (
            <button
              onClick={onRetryFailed}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-semibold text-sm"
              disabled={isSyncInProgress}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Failed ({records.filter(r => r.pipelineStatus === 'synced' && r.failed).length})
            </button>
          )}

          {statusFilter === 'extracted' && onRetryFailedVectorization && records.some(r => r.pipelineStatus === 'extracted' && r.failed) && (
            <button
              onClick={onRetryFailedVectorization}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors duration-200 font-semibold text-sm"
              disabled={isSyncInProgress}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Failed ({records.filter(r => r.pipelineStatus === 'extracted' && r.failed).length})
            </button>
          )}

          {(statusFilter === 'synced' || statusFilter === 'all') && (
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
              {(progress.status === 'idle' || progress.status === 'completed') && (
                <>
                  {onStartSync && (
                    <button
                      onClick={onStartSync}
                      disabled={candidateNeedsYear}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-semibold text-sm ${candidateNeedsYear ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Sync
                    </button>
                  )}
                  {onResync && records.length > 0 && (
                    <button
                      onClick={() => setShowResyncConfirm(true)}
                      disabled={candidateNeedsYear}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-dark-hover border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors duration-200 font-semibold text-sm ${candidateNeedsYear ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Re-Sync
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {(statusFilter === 'synced' || statusFilter === 'extracted') && (
            <ProcessActionButtons
              progress={extractionProgress}
              hasEligible={source === 'open-positions'
                ? records.some((r) => r.pipelineStatus === 'synced' && r.hasJobDescription)
                : records.some((r) => r.pipelineStatus === 'synced' && r.hasResume)}
              onStart={onStartExtraction}
              onPause={onPauseExtraction}
              onResume={onResumeExtraction}
              bgClass="bg-blue-500"
              hoverBgClass="hover:bg-blue-600"
              gradientClass="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              label={source === 'open-positions' ? 'Extract JDs' : 'Extract Resumes'}
              reLabel={source === 'open-positions' ? 'Re-extract JDs' : 'Re-extract'}
              icon={<DocumentIcon size="sm" />}
              disabled={isSyncInProgress}
            />
          )}

          {(statusFilter === 'vectorized' || statusFilter === 'extracted') && (
            <ProcessActionButtons
              progress={vectorizationProgress}
              hasEligible={records.some((r) => r.pipelineStatus === 'extracted')}
              onStart={onStartVectorization}
              onPause={onPauseVectorization}
              onResume={onResumeVectorization}
              bgClass="bg-violet-500"
              hoverBgClass="hover:bg-violet-600"
              gradientClass="bg-gradient-to-r from-violet-500 to-violet-500 hover:from-violet-600 hover:to-violet-600"
              label={source === 'open-positions' ? 'Vectorize JDs' : 'Vectorize'}
              reLabel={source === 'open-positions' ? 'Re-vectorize JDs' : 'Re-vectorize'}
              icon={<SettingsIcon size="sm" />}
              disabled={isSyncInProgress}
            />
          )}
        </div>
      </div>

      {isExtracting && extractionProgress && (
        <ProgressBar
          label={source === 'open-positions' ? 'Extracting JDs' : 'Extracting resumes'}
          progress={extractionProgress}
          percent={extractionPercent}
          dotColor="bg-blue-500"
          barGradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          textColor="text-blue-500"
          onPause={onPauseExtraction}
          onResume={onResumeExtraction}
        />
      )}

      {isVectorizing && vectorizationProgress && (
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

      {showResyncConfirm && (
        <ConfirmModal
          title={`Re-Sync ${sourceLabel}`}
          message={`This will re-check all ${sourceLabel.toLowerCase()} records from the source system. No existing records will be removed — only updated or inserted when changes are detected. This may take a while for large datasets.`}
          confirmLabel="Continue"
          cancelLabel="Cancel"
          variant="default"
          onConfirm={() => { setShowResyncConfirm(false); onResync?.(); }}
          onCancel={() => setShowResyncConfirm(false)}
        />
      )}
    </div>
  );
});

export default SyncDashboard;
