import { useState } from 'react';
import { SyncSourceType, SyncProgress, SyncRecord, PipelineStatus, ProcessingProgress } from '../../types';
import SyncRecordTable from './SyncRecordTable';
import ConfirmModal from './ConfirmModal';

interface SyncDashboardProps {
  source: SyncSourceType;
  progress: SyncProgress;
  records: SyncRecord[];
  onStartSync?: () => void;
  onStartSyncLimited?: () => void;
  onPauseSync?: () => void;
  onResumeSync?: () => void;
  onRetryIncomplete?: () => void;
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
  onClearData?: () => void;
  isLoadingRecords?: boolean;
  isClearing?: boolean;
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
  icon: JSX.Element;
  borderColor: string;
  bgColor: string;
  iconBg: string;
  glowRing: string;
  glowShadow: string;
  getValue: (p: SyncProgress, records: SyncRecord[]) => number;
}

const ISSUE_CARDS: StatusCardDef[] = [
  {
    key: 'incomplete',
    label: 'Incomplete',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    borderColor: 'border-amber-200/60 dark:border-amber-500/20',
    bgColor: 'bg-amber-100 dark:bg-amber-500/20',
    iconBg: 'text-amber-600 dark:text-amber-400',
    glowRing: 'ring-2 ring-amber-400 dark:ring-amber-500',
    glowShadow: 'shadow-lg shadow-amber-500/20',
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'incomplete').length,
  },
  {
    key: 'not-processed',
    label: 'Not Processed',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />,
    borderColor: 'border-red-200/60 dark:border-red-500/20',
    bgColor: 'bg-red-100 dark:bg-red-500/20',
    iconBg: 'text-red-600 dark:text-red-400',
    glowRing: 'ring-2 ring-red-400 dark:ring-red-500',
    glowShadow: 'shadow-lg shadow-red-500/20',
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'not-processed').length,
  },
  {
    key: 'excluded',
    label: 'Excluded',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />,
    borderColor: 'border-orange-200/60 dark:border-orange-500/20',
    bgColor: 'bg-orange-100 dark:bg-orange-500/20',
    iconBg: 'text-orange-600 dark:text-orange-400',
    glowRing: 'ring-2 ring-orange-400 dark:ring-orange-500',
    glowShadow: 'shadow-lg shadow-orange-500/20',
    getValue: (p) => p.skippedCount ?? 0,
  },
];

const PIPELINE_CARDS: StatusCardDef[] = [
  {
    key: 'synced',
    label: 'Synced',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    borderColor: 'border-emerald-200/60 dark:border-emerald-500/20',
    bgColor: 'bg-emerald-100 dark:bg-emerald-500/20',
    iconBg: 'text-emerald-600 dark:text-emerald-400',
    glowRing: 'ring-2 ring-emerald-400 dark:ring-emerald-500',
    glowShadow: 'shadow-lg shadow-emerald-500/20',
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'synced').length,
  },
  {
    key: 'extracted',
    label: 'Extracted',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    borderColor: 'border-blue-200/60 dark:border-blue-500/20',
    bgColor: 'bg-blue-100 dark:bg-blue-500/20',
    iconBg: 'text-blue-600 dark:text-blue-400',
    glowRing: 'ring-2 ring-blue-400 dark:ring-blue-500',
    glowShadow: 'shadow-lg shadow-blue-500/20',
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'extracted').length,
  },
  {
    key: 'vectorized',
    label: 'Vectorized',
    icon: (
      <>
        <circle cx="5" cy="12" r="2" strokeWidth={2} />
        <circle cx="19" cy="6" r="2" strokeWidth={2} />
        <circle cx="19" cy="18" r="2" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l10-4M7 13l10 4" />
      </>
    ),
    borderColor: 'border-violet-200/60 dark:border-violet-500/20',
    bgColor: 'bg-violet-100 dark:bg-violet-500/20',
    iconBg: 'text-violet-600 dark:text-violet-400',
    glowRing: 'ring-2 ring-violet-400 dark:ring-violet-500',
    glowShadow: 'shadow-lg shadow-violet-500/20',
    getValue: (_p, records) => records.filter(r => r.pipelineStatus === 'vectorized').length,
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
  const isError = status === 'error';
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
        <p className="text-xs text-muted truncate">
          Processing "{progress.currentRecord}"
        </p>
      )}
    </div>
  );
}

export default function SyncDashboard({
  source,
  progress,
  records,
  onStartSync,
  onStartSyncLimited,
  onPauseSync,
  onResumeSync,
  onRetryIncomplete,
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
  onClearData,
  isLoadingRecords,
  isClearing,
}: SyncDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<StatusCardKey>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const sourceLabel = source.charAt(0).toUpperCase() + source.slice(1);
  const isActiveOrPaused = progress.status === 'syncing' || progress.status === 'paused';
  const progressPercent =
    progress.totalRecords > 0
      ? Math.round((progress.fetchedRecords / progress.totalRecords) * 100)
      : 0;
  const fetchedBase = progress.fetchedRecords > 0 ? progress.fetchedRecords : 1;

  const canClear =
    (progress.status === 'idle' || progress.status === 'completed' || progress.status === 'paused') && records.length > 0 && !isClearing;

  const isSyncInProgress = progress.status === 'syncing';

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

  const renderCardGrid = (cards: StatusCardDef[], isRecordDerived: (key: StatusCardKey) => boolean) => (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => {
        const isSelected = statusFilter === card.key;
        const value = card.getValue(progress, records);
        const isDerived = isRecordDerived(card.key);
        return (
          <button
            key={card.key}
            onClick={() => handleCardClick(card.key)}
            className={`glass-card p-5 border text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
              isSelected
                ? `${card.borderColor} ${card.glowRing} ${card.glowShadow}`
                : `${card.borderColor} hover:shadow-md`
            }`}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center flex-shrink-0`}>
                <svg className={`w-5 h-5 ${card.iconBg}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {card.icon}
                </svg>
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

      {renderCardGrid(ISSUE_CARDS, () => true)}
      {renderCardGrid(PIPELINE_CARDS, () => true)}

      <div className="flex items-center justify-between gap-2">
        <div>
          {isClearing ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 dark:text-red-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
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
          {statusFilter === 'incomplete' && onRetryIncomplete && (progress.incompleteCount > 0 || progress.notProcessedCount > 0) && (
            <button
              onClick={onRetryIncomplete}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors duration-200 font-semibold text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Incomplete ({progress.incompleteCount + progress.notProcessedCount})
            </button>
          )}

          {(statusFilter === 'synced' || statusFilter === 'all') && (
            <>
              {progress.status === 'idle' && (
                <>
                  {onStartSyncLimited && (
                    <button
                      onClick={onStartSyncLimited}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-dark-hover border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors duration-200 font-semibold text-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Sync 10
                    </button>
                  )}
                  <button
                    onClick={onStartSync}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-semibold text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Start Sync
                  </button>
                </>
              )}
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
                  Resume Sync
                </button>
              )}
              {progress.status === 'completed' && (
                <>
                  {onStartSyncLimited && (
                    <button
                      onClick={onStartSyncLimited}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-dark-hover border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors duration-200 font-semibold text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Re-sync 10
                    </button>
                  )}
                  <button
                    onClick={onStartSync}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl transition-all duration-200 font-semibold text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-sync All
                  </button>
                </>
              )}
            </>
          )}

          {(statusFilter === 'synced' || statusFilter === 'extracted') && (
            <ProcessActionButtons
              progress={extractionProgress}
              hasEligible={records.some((r) => r.pipelineStatus === 'synced' && r.hasResume)}
              onStart={onStartExtraction}
              onPause={onPauseExtraction}
              onResume={onResumeExtraction}
              bgClass="bg-blue-500"
              hoverBgClass="hover:bg-blue-600"
              gradientClass="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              label="Extract Resumes"
              reLabel="Re-extract"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              disabled={isSyncInProgress}
            />
          )}

          {statusFilter === 'vectorized' && (
            <ProcessActionButtons
              progress={vectorizationProgress}
              hasEligible={records.some((r) => r.pipelineStatus === 'extracted' && !r.failed)}
              onStart={onStartVectorization}
              onPause={onPauseVectorization}
              onResume={onResumeVectorization}
              bgClass="bg-violet-500"
              hoverBgClass="hover:bg-violet-600"
              gradientClass="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              label="Vectorize"
              reLabel="Re-vectorize"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2" strokeWidth={2} />
                  <circle cx="19" cy="6" r="2" strokeWidth={2} />
                  <circle cx="19" cy="18" r="2" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l10-4M7 13l10 4" />
                </svg>
              }
              disabled={isSyncInProgress}
            />
          )}
        </div>
      </div>

      {isExtracting && extractionProgress && (
        <ProgressBar
          label="Extracting resumes"
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
          label="Vectorizing resumes"
          progress={vectorizationProgress}
          percent={vectorizationPercent}
          dotColor="bg-violet-500"
          barGradient="bg-gradient-to-r from-violet-500 to-purple-500"
          textColor="text-violet-500"
          onPause={onPauseVectorization}
          onResume={onResumeVectorization}
        />
      )}

      {isLoadingRecords ? (
        <div className="glass-card flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-sm text-muted">
            <svg className="w-5 h-5 animate-spin text-accent-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
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

      {showClearConfirm && (
        <ConfirmModal
          title={`Clear ${sourceLabel} Data`}
          message={`This will permanently delete all synced ${sourceLabel.toLowerCase()} records and their embeddings. This action cannot be undone.`}
          confirmLabel="Clear Data"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleConfirmClear}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}
