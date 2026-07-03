import { memo } from 'react'
import type { PipelineRecordEvent, PipelineProgressDto } from '../hooks/usePositionPipeline'
import FailedRecordsTable from './FailedRecordsTable'
import SucceededRecordsTable from './SucceededRecordsTable'

interface PositionPipelineDashboardProps {
  progress: PipelineProgressDto
  succeededRecords: PipelineRecordEvent[]
  failedRecords: PipelineRecordEvent[]
  skippedRecords: PipelineRecordEvent[]
  retryingId?: number
  activeTab: 'succeeded' | 'failed' | 'skipped'
  onTabChange: (tab: 'succeeded' | 'failed' | 'skipped') => void
  isRunning: boolean
  isPaused: boolean
  progressPercent: number
  isVectorizingSynced: boolean
  onSyncActive: () => void
  onSyncAll: () => void
  onVectorizeSynced: () => void
  onPause: () => void
  onResume: () => void
  onStartOver: () => void
  onRetryAllFailed: () => void
  onRetrySingle: (upstreamId: number) => void
  isSyncDisabled?: boolean
  isVoyageKeyConfigured?: boolean
  syncMode?: 'active' | 'full'
  syncYear?: number | null
  onSyncYearChange: (year: number | null) => void
  dbFailedCount?: number
}

export default memo(function PositionPipelineDashboard({
  progress,
  succeededRecords,
  failedRecords,
  skippedRecords,
  retryingId,
  activeTab,
  onTabChange,
  isRunning,
  isPaused,
  progressPercent,
  isVectorizingSynced,
  onSyncActive,
  onSyncAll,
  onVectorizeSynced,
  onPause,
  onResume,
  onStartOver,
  onRetryAllFailed,
  onRetrySingle,
  isSyncDisabled,
  isVoyageKeyConfigured,
  syncMode,
  syncYear,
  onSyncYearChange,
  dbFailedCount,
}: PositionPipelineDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-primary">Open Positions Pipeline</h2>
        <p className="text-sm text-muted mt-0.5">Sync, extract, and vectorize open positions</p>
      </div>

      {/* Action buttons */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {!isRunning && !isPaused && (
            <>
              <button
                onClick={onSyncActive}
                disabled={isSyncDisabled || !isVoyageKeyConfigured}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 dark:bg-accent-600 dark:hover:bg-accent-500 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Sync Active
              </button>

              <button
                onClick={onSyncAll}
                disabled={isSyncDisabled}
                className="glass-button inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                Sync All
              </button>

              <div className="flex items-center gap-1.5">
                {[2025, 2026].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => onSyncYearChange(y)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      syncYear === y
                        ? 'ring-2 ring-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                        : 'bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border text-secondary hover:border-accent-400/40'
                    }`}
                  >
                    {y}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onSyncYearChange(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    syncYear == null
                      ? 'ring-2 ring-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                      : 'bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border text-secondary hover:border-accent-400/40'
                  }`}
                >
                  ALL
                </button>
              </div>

            </>
          )}

          {isRunning && (
            <button
              onClick={onPause}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 rounded-xl hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </button>
          )}

          {isPaused && (
            <>
              <button
                onClick={onResume}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-accent-700 dark:text-accent-400 bg-accent-100 dark:bg-accent-500/20 rounded-xl hover:bg-accent-200 dark:hover:bg-accent-500/30 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </button>
              <button
                onClick={onStartOver}
                className="glass-button inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Start Over
              </button>
            </>
          )}

          {!isRunning && !isPaused && !isVectorizingSynced && progress.status === 'completed' && succeededRecords.length > 0 && (
            <button
              onClick={onVectorizeSynced}
              disabled={!isVoyageKeyConfigured}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              Vectorize Synced Positions
            </button>
          )}

          {isSyncDisabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Token not configured — sync disabled</p>
          )}
          {!isVoyageKeyConfigured && !isSyncDisabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Voyage API key not configured — vectorization will fail</p>
          )}
        </div>
      </div>

      {/* Previous run failed records banner */}
      {!isRunning && !isPaused && progress.processedRecords === 0 && (dbFailedCount ?? 0) > 0 && (
        <div className="glass-panel-subtle rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-secondary">
            <span className="font-semibold text-red-600 dark:text-red-400">{dbFailedCount}</span> failed record{dbFailedCount !== 1 ? 's' : ''} from previous pipeline run
          </span>
          <span className="text-xs text-muted">Switch to the Failed tab to retry</span>
        </div>
      )}

      {/* Restored session banner */}
      {isPaused && progress.processedRecords > 0 && !isRunning && (
        <div className="glass-panel-subtle rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-secondary">
            {syncMode === 'full' ? 'Full Sync' : 'Active Sync'} paused at record {progress.processedRecords.toLocaleString()} of {progress.totalRecords.toLocaleString()}
            {progress.pauseReason === 'token-expiring' && ' (token expired)'}
            {progress.pauseReason === 'error' && ' (error)'}
          </span>
        </div>
      )}

      {/* Progress summary */}
      {(isRunning || isPaused || progress.processedRecords > 0) && (
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-secondary">
              Processing: <span className="font-semibold text-primary">{progress.processedRecords}</span> / {progress.totalRecords}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{progress.succeededCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-semibold text-red-600 dark:text-red-400">{progress.failedCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="font-semibold text-muted">{progress.skippedCount}</span>
            </span>
            {(isRunning || isPaused) && syncMode && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                syncMode === 'full'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
                  : 'bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-400'
              }`}>
                {syncMode === 'full' ? 'Full Sync' : 'Active Sync'}
              </span>
            )}
            {isPaused && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                Paused
              </span>
            )}
            {isPaused && progress.pauseReason === 'token-expiring' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                ⏳ Token expiring — paste a new token to auto-resume
              </span>
            )}
            {isPaused && progress.pauseReason === 'error' && progress.errorMessage && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 max-w-md truncate" title={progress.errorMessage}>
                ⚠️ {progress.errorMessage}
              </span>
            )}
            {isVectorizingSynced && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
                Vectorizing
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="h-2.5 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted truncate">
                {progress.currentRecord ? `Processing "${progress.currentRecord}"` : '\u00A0'}
              </p>
              <span className="text-xs font-mono font-semibold text-accent-600 dark:text-accent-400">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab toggle */}
      {(succeededRecords.length > 0 || failedRecords.length > 0 || skippedRecords.length > 0) && (
        <div className="flex gap-1 p-1 glass-panel-subtle rounded-xl w-fit">
          <button
            onClick={() => onTabChange('succeeded')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'succeeded'
                ? 'bg-white dark:bg-dark-card text-primary shadow-sm'
                : 'text-muted hover:text-secondary'
            }`}
          >
            Succeeded ({succeededRecords.length})
          </button>
          <button
            onClick={() => onTabChange('failed')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'failed'
                ? 'bg-white dark:bg-dark-card text-primary shadow-sm'
                : 'text-muted hover:text-secondary'
            }`}
          >
            Failed ({failedRecords.length})
          </button>
          <button
            onClick={() => onTabChange('skipped')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'skipped'
                ? 'bg-white dark:bg-dark-card text-primary shadow-sm'
                : 'text-muted hover:text-secondary'
            }`}
          >
            Skipped ({skippedRecords.length})
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'succeeded' && (
        <SucceededRecordsTable records={succeededRecords} source="positions" />
      )}
      {activeTab === 'failed' && (
        <div className="space-y-3">
          {failedRecords.length > 0 && !isRunning && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                {failedRecords.length} record{failedRecords.length !== 1 ? 's' : ''} failed
              </p>
              <button
                onClick={onRetryAllFailed}
                disabled={isSyncDisabled || !isVoyageKeyConfigured}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/20 rounded-xl hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                ↻ Retry All Failed ({failedRecords.length})
              </button>
            </div>
          )}
          <FailedRecordsTable
            records={failedRecords}
            onRetrySingle={onRetrySingle}
            retryingId={retryingId}
          />
        </div>
      )}
      {activeTab === 'skipped' && (
        <SucceededRecordsTable records={skippedRecords} variant="skipped" source="positions" />
      )}
    </div>
  )
})
