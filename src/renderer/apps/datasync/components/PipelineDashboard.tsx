import { memo } from 'react'
import type { PipelineRecordEvent, PipelineProgressDto } from '../hooks/useUnifiedPipeline'
import type { SyncRecord } from '../types'
import FailedRecordsTable from './FailedRecordsTable'
import SucceededRecordsTable from './SucceededRecordsTable'
import AllSyncedRecordsTable from './AllSyncedRecordsTable'
import YearSelector from './YearSelector'

interface PipelineDashboardProps {
  source: 'employees' | 'candidates'
  progress: PipelineProgressDto
  succeededRecords: PipelineRecordEvent[]
  failedRecords: PipelineRecordEvent[]
  skippedRecords: PipelineRecordEvent[]
  retryingId?: number
  activeTab: 'all-records' | 'succeeded' | 'failed' | 'skipped'
  onTabChange: (tab: 'all-records' | 'succeeded' | 'failed' | 'skipped') => void
  isRunning: boolean
  isPaused: boolean
  progressPercent: number
  onStartSync: (mode?: 'full' | 'sync-only') => void
  onPause: () => void
  onResume: () => void
  onStartOver: () => void
  onRetryAllFailed: () => void
  onRetrySingle: (upstreamId: number) => void
  isSyncDisabled?: boolean
  isVoyageKeyConfigured?: boolean
  selectedYear?: number | null
  onYearChange?: (year: number) => void
  allRecords?: SyncRecord[]
  isLoadingAllRecords?: boolean
  dbFailedCount?: number
}

export default memo(function PipelineDashboard({
  source,
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
  onStartSync,
  onPause,
  onResume,
  onStartOver,
  onRetryAllFailed,
  onRetrySingle,
  isSyncDisabled,
  isVoyageKeyConfigured,
  selectedYear,
  onYearChange,
  allRecords,
  isLoadingAllRecords,
  dbFailedCount,
}: PipelineDashboardProps) {
  const sourceLabel = source === 'employees' ? 'Employees' : 'Candidates'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary">{sourceLabel} Pipeline</h2>
          <p className="text-sm text-muted mt-0.5">Sync, extract, and vectorize in one step</p>
        </div>
        {source === 'candidates' && onYearChange && (
          <YearSelector selectedYear={selectedYear ?? null} onYearChange={onYearChange} />
        )}
      </div>

      {/* Action buttons */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {!isRunning && !isPaused && (
            <>
              <button
                onClick={() => onStartSync('full')}
                disabled={isSyncDisabled || !isVoyageKeyConfigured}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 dark:bg-accent-600 dark:hover:bg-accent-500 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Full Pipeline
              </button>
              <button
                onClick={() => onStartSync('sync-only')}
                disabled={isSyncDisabled}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Only
              </button>
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

          {isSyncDisabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Token not configured — sync disabled</p>
          )}
          {!isVoyageKeyConfigured && !isSyncDisabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Voyage API key not configured — vectorization will fail</p>
          )}
        </div>
        {!isRunning && !isPaused && (
          <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-dark-border/60 flex gap-6 text-xs text-muted">
            <p><span className="font-medium text-secondary">Full Pipeline</span> — Syncs data from upstream, extracts resume text, and generates vector embeddings for matching.</p>
            <p><span className="font-medium text-secondary">Sync Only</span> — Updates employee metadata (bench status, skills, seniority) without re-processing resumes. Faster.</p>
          </div>
        )}
      </div>

      {/* Restored session banner */}
      {isPaused && progress.processedRecords > 0 && !isRunning && (
        <div className="glass-panel-subtle rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-secondary">
            Pipeline paused at record {progress.processedRecords.toLocaleString()} of {progress.totalRecords.toLocaleString()}
            {progress.pauseReason === 'token-expiring' && ' (token expired)'}
            {progress.pauseReason === 'error' && ' (error)'}
          </span>
        </div>
      )}

      {/* Previous run failed records banner */}
      {!isRunning && !isPaused && progress.processedRecords === 0 && (dbFailedCount ?? 0) > 0 && (
        <div className="glass-panel-subtle rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-secondary">
            <span className="font-semibold text-red-600 dark:text-red-400">{dbFailedCount}</span> failed record{dbFailedCount !== 1 ? 's' : ''} from previous pipeline run
          </span>
          <span className="text-xs text-muted">Switch to the Failed tab to retry</span>
        </div>
      )}

      {/* Progress summary */}
      {(isRunning || isPaused || progress.processedRecords > 0) && (
        <div className="glass-panel rounded-xl p-5 space-y-4">
          {/* Counters */}
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
          </div>

          {/* Progress bar */}
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
      <div className="flex gap-1 p-1 glass-panel-subtle rounded-xl w-fit">
        <button
          onClick={() => onTabChange('all-records')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'all-records'
              ? 'bg-white dark:bg-dark-card text-primary shadow-sm'
              : 'text-muted hover:text-secondary'
          }`}
        >
          All Records{allRecords ? ` (${allRecords.length.toLocaleString()})` : ''}
        </button>
        {(succeededRecords.length > 0 || failedRecords.length > 0 || skippedRecords.length > 0) && (
          <>
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
          </>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'all-records' && (
        <AllSyncedRecordsTable records={allRecords ?? []} isLoading={isLoadingAllRecords ?? false} />
      )}
      {activeTab === 'succeeded' && (
        <SucceededRecordsTable records={succeededRecords} />
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
        <SucceededRecordsTable records={skippedRecords} variant="skipped" />
      )}
    </div>
  )
})
