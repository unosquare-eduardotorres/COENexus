import { memo } from 'react'
import type { PipelineRecordEvent, PipelineProgressDto } from '../hooks/useUnifiedPipeline'
import FailedRecordsTable from './FailedRecordsTable'
import SucceededRecordsTable from './SucceededRecordsTable'
import YearSelector from './YearSelector'

interface PipelineDashboardProps {
  source: 'employees' | 'candidates'
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
  onStartSync: () => void
  onPause: () => void
  onResume: () => void
  onRetryAllFailed: () => void
  onRetrySingle: (upstreamId: number) => void
  isSyncDisabled?: boolean
  isVoyageKeyConfigured?: boolean
  selectedYear?: number | null
  onYearChange?: (year: number) => void
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
  onRetryAllFailed,
  onRetrySingle,
  isSyncDisabled,
  isVoyageKeyConfigured,
  selectedYear,
  onYearChange,
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
            <button
              onClick={onStartSync}
              disabled={isSyncDisabled || !isVoyageKeyConfigured}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 dark:bg-accent-600 dark:hover:bg-accent-500 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Sync {sourceLabel}
            </button>
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
            <button
              onClick={onResume}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-accent-700 dark:text-accent-400 bg-accent-100 dark:bg-accent-500/20 rounded-xl hover:bg-accent-200 dark:hover:bg-accent-500/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Resume
            </button>
          )}

          {failedRecords.length > 0 && !isRunning && (
            <button
              onClick={onRetryAllFailed}
              disabled={isSyncDisabled || !isVoyageKeyConfigured}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/20 rounded-xl hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Retry Failed ({failedRecords.length})
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
        <SucceededRecordsTable records={succeededRecords} />
      )}
      {activeTab === 'failed' && (
        <FailedRecordsTable
          records={failedRecords}
          onRetrySingle={onRetrySingle}
          retryingId={retryingId}
        />
      )}
      {activeTab === 'skipped' && (
        <SucceededRecordsTable records={skippedRecords} variant="skipped" />
      )}
    </div>
  )
})
