import { memo } from 'react';
import { SyncSourceType, SyncProgress, SyncRecord, ProcessingProgress } from '../types';
import { DocumentIcon, SettingsIcon, SpinnerIcon } from '../../../shared/components/icons';

interface ProcessActionButtonsProps {
  progress?: ProcessingProgress;
  hasEligible: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  bgClass: string;
  hoverBgClass: string;
  gradientClass: string;
  label: string;
  icon: JSX.Element;
  disabled?: boolean;
}

export function ProcessActionButtons({
  progress, hasEligible, onStart, onPause, onResume,
  bgClass, hoverBgClass, gradientClass, label, icon, disabled,
}: ProcessActionButtonsProps) {
  const status = progress?.status ?? 'idle';
  const isRunning = status === 'processing';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isAuthFailed = status === 'auth_failed';
  const isError = status === 'error' || isAuthFailed;
  const isIdle = status === 'idle';

  if (isRunning && onPause) {
    return (
      <button onClick={onPause} className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors duration-200 font-semibold text-sm">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
        Pause
      </button>
    );
  }
  if (isPaused && onResume) {
    return (
      <button onClick={onResume} className={`inline-flex items-center gap-2 px-5 py-2.5 ${bgClass} text-white rounded-xl ${hoverBgClass} transition-colors duration-200 font-semibold text-sm`}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        Resume
      </button>
    );
  }
  if (isError && onStart) {
    return (
      <div className="flex items-center gap-3">
        {isAuthFailed && <span className="text-xs font-medium text-red-500 dark:text-red-400">Token expired or invalid</span>}
        <button onClick={onStart} disabled={disabled} className={`inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 font-semibold text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Retry
        </button>
      </div>
    );
  }
  if (isCompleted && onStart) {
    return (
      <button onClick={onStart} disabled={disabled} className={`inline-flex items-center gap-2 px-5 py-2.5 ${gradientClass} text-white rounded-xl transition-all duration-200 font-semibold text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        {label}
      </button>
    );
  }
  if (isIdle && hasEligible && onStart) {
    return (
      <button onClick={onStart} disabled={disabled} className={`inline-flex items-center gap-2 px-5 py-2.5 ${bgClass} text-white rounded-xl ${hoverBgClass} transition-colors duration-200 font-semibold text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        {icon}
        {label}
      </button>
    );
  }
  return null;
}

interface SyncActionsProps {
  source: SyncSourceType;
  progress: SyncProgress;
  records: SyncRecord[];
  statusFilter: string;
  isSyncInProgress: boolean;
  candidateNeedsYear: boolean;
  isClearing?: boolean;
  canClear: boolean;
  onStartSync?: () => void;
  onPauseSync?: () => void;
  onResumeSync?: () => void;
  onStartExtraction?: () => void;
  onPauseExtraction?: () => void;
  onResumeExtraction?: () => void;
  extractionProgress?: ProcessingProgress;
  onStartVectorization?: () => void;
  onPauseVectorization?: () => void;
  onResumeVectorization?: () => void;
  vectorizationProgress?: ProcessingProgress;
  onClearData?: () => void;
}

const SyncActions = memo(function SyncActions({
  source, progress, records, statusFilter, isSyncInProgress, candidateNeedsYear,
  isClearing, canClear,
  onStartSync, onPauseSync, onResumeSync,
  onStartExtraction, onPauseExtraction, onResumeExtraction, extractionProgress,
  onStartVectorization, onPauseVectorization, onResumeVectorization, vectorizationProgress,
  onClearData,
}: SyncActionsProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        {isClearing ? (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 dark:text-red-400">
            <SpinnerIcon size="sm" className="text-red-500 dark:text-red-400" />
            Clearing...
          </div>
        ) : canClear && onClearData ? (
          <button onClick={onClearData} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Data
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {(statusFilter === 'synced' || statusFilter === 'all' || statusFilter === 'extract_failed') && (
          <>
            {progress.status === 'syncing' && (
              <button onClick={onPauseSync} className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors duration-200 font-semibold text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                Pause
              </button>
            )}
            {progress.status === 'paused' && (
              <button onClick={onResumeSync} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-semibold text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                Resume
              </button>
            )}
            {(progress.status === 'idle' || progress.status === 'completed') && (
              <>
                {onStartSync && (
                  <button onClick={onStartSync} disabled={candidateNeedsYear} className={`inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-semibold text-sm ${candidateNeedsYear ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    Sync
                  </button>
                )}
              </>
            )}
          </>
        )}

        {(statusFilter === 'synced' || statusFilter === 'extracted' || statusFilter === 'extract_failed') && (
          <ProcessActionButtons
            progress={extractionProgress}
            hasEligible={source === 'open-positions'
              ? records.some((r) => (r.pipelineStatus === 'synced' || r.pipelineStatus === 'extract_failed') && r.hasJobDescription)
              : records.some((r) => (r.pipelineStatus === 'synced' || r.pipelineStatus === 'extract_failed') && r.hasResume)}
            onStart={onStartExtraction} onPause={onPauseExtraction} onResume={onResumeExtraction}
            bgClass="bg-blue-500" hoverBgClass="hover:bg-blue-600" gradientClass="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            label={source === 'open-positions' ? 'Extract JDs' : 'Extract Resumes'}
            icon={<DocumentIcon size="sm" />} disabled={isSyncInProgress}
          />
        )}

        {(statusFilter === 'vectorized' || statusFilter === 'extracted' || statusFilter === 'vectorize_failed') && (
          <ProcessActionButtons
            progress={vectorizationProgress}
            hasEligible={records.some((r) => r.pipelineStatus === 'extracted' || r.pipelineStatus === 'vectorize_failed')}
            onStart={onStartVectorization} onPause={onPauseVectorization} onResume={onResumeVectorization}
            bgClass="bg-violet-500" hoverBgClass="hover:bg-violet-600" gradientClass="bg-gradient-to-r from-violet-500 to-violet-500 hover:from-violet-600 hover:to-violet-600"
            label={source === 'open-positions' ? 'Vectorize JDs' : 'Vectorize'}
            icon={<SettingsIcon size="sm" />} disabled={isSyncInProgress}
          />
        )}
      </div>
    </div>
  );
});

export default SyncActions;
