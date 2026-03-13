import { SyncSourceType, ProcessingProgress, ProcessingRecord } from '../../types';
import ProcessingRecordTable from './ProcessingRecordTable';
import VectorizingAnimation from './VectorizingAnimation';

interface ProcessingDashboardProps {
  source: SyncSourceType;
  progress: ProcessingProgress;
  records: ProcessingRecord[];
  onStartProcessing: () => void;
  onPauseProcessing: () => void;
  onResumeProcessing: () => void;
}

function pct(count: number, base: number): string {
  if (base === 0) return '0%';
  return `${Math.round((count / base) * 100)}%`;
}

export default function ProcessingDashboard({
  source,
  progress,
  records,
  onStartProcessing,
  onPauseProcessing,
  onResumeProcessing,
}: ProcessingDashboardProps) {
  const sourceLabel = source.charAt(0).toUpperCase() + source.slice(1);
  const isActiveOrPaused = progress.status === 'processing' || progress.status === 'paused';
  const progressPercent =
    progress.totalRecords > 0
      ? Math.round((progress.processedRecords / progress.totalRecords) * 100)
      : 0;
  const processedBase = progress.processedRecords > 0 ? progress.processedRecords : 1;

  return (
    <div className="space-y-4">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary">{sourceLabel} — Resume Processing</h2>
            <p className="text-sm text-muted mt-0.5">
              Download → Extract → Vectorize (Voyage AI, 1536-dim)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 bg-violet-100/70 dark:bg-violet-500/20 rounded-full text-xs font-semibold text-violet-700 dark:text-violet-400">
              {progress.totalRecords.toLocaleString()} eligible
            </span>
          </div>
        </div>
      </div>

      {isActiveOrPaused && (
        <div className="glass-panel-subtle rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-secondary">
              {progress.processedRecords.toLocaleString()} / {progress.totalRecords.toLocaleString()} records
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-semibold text-violet-600 dark:text-violet-400">
                {progressPercent}%
              </span>
              {progress.status === 'processing' ? (
                <button
                  onClick={onPauseProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  Pause
                </button>
              ) : (
                <button
                  onClick={onResumeProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/20 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-500/30 transition-colors"
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
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {progress.status === 'processing' && (
        <VectorizingAnimation
          currentRecord={progress.currentRecord}
          processedCount={progress.processedRecords}
          totalCount={progress.totalRecords}
        />
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 border border-emerald-200/60 dark:border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Vectorized</span>
          </div>
          <div className="text-2xl font-bold text-primary">{progress.successCount.toLocaleString()}</div>
          <div className="text-xs text-muted mt-0.5">{pct(progress.successCount, processedBase)} of processed</div>
        </div>

        <div className="glass-card p-4 border border-amber-200/60 dark:border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Skipped</span>
          </div>
          <div className="text-2xl font-bold text-primary">{progress.skippedCount.toLocaleString()}</div>
          <div className="text-xs text-muted mt-0.5">{pct(progress.skippedCount, processedBase)} of processed</div>
        </div>

        <div className="glass-card p-4 border border-red-200/60 dark:border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Failed</span>
          </div>
          <div className="text-2xl font-bold text-primary">{progress.failedCount.toLocaleString()}</div>
          <div className="text-xs text-muted mt-0.5">{pct(progress.failedCount, processedBase)} of processed</div>
        </div>
      </div>

      <div className="flex justify-end">
        {progress.status === 'idle' && (
          <button
            onClick={onStartProcessing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 font-semibold text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Start Processing
          </button>
        )}
        {progress.status === 'processing' && (
          <button
            onClick={onPauseProcessing}
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
            onClick={onResumeProcessing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 font-semibold text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Resume Processing
          </button>
        )}
        {progress.status === 'completed' && (
          <button
            onClick={onStartProcessing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 font-semibold text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-process All
          </button>
        )}
      </div>

      <ProcessingRecordTable records={records} />
    </div>
  );
}
