import { memo, useState } from 'react'
import type { PipelineRecordEvent } from '../hooks/useUnifiedPipeline'
import ErrorDetailModal from './ErrorDetailModal'

interface FailedRecordsTableProps {
  records: PipelineRecordEvent[]
  onRetrySingle: (upstreamId: number) => void
  retryingId?: number
}

const STEP_BADGES: Record<string, { label: string; className: string }> = {
  sync: { label: 'Sync', className: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  extract: { label: 'Extract', className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
  vectorize: { label: 'Vectorize', className: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
  no_resume: { label: 'No Resume', className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400' },
}

function FailedStepBadge({ step }: { step?: string }) {
  const badge = step ? STEP_BADGES[step] : undefined
  if (!badge) return <span className="text-xs text-muted">Unknown</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${badge.className}`}>
      {badge.label}
    </span>
  )
}

export default memo(function FailedRecordsTable({ records, onRetrySingle, retryingId }: FailedRecordsTableProps) {
  const [sortByStep, setSortByStep] = useState(false)
  const [errorDetail, setErrorDetail] = useState<{ name: string; error: string } | null>(null)

  const sorted = sortByStep
    ? [...records].sort((a, b) => (a.failedStep ?? '').localeCompare(b.failedStep ?? ''))
    : records

  if (records.length === 0) {
    return (
      <div className="glass-panel-subtle rounded-xl p-8 text-center">
        <p className="text-sm text-muted">No failed records</p>
      </div>
    )
  }

  return (
    <>
      <div className="glass-panel-subtle rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Name</th>
              <th
                className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-secondary transition-colors"
                onClick={() => setSortByStep(prev => !prev)}
              >
                Failed Step {sortByStep ? '↑' : '↕'}
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Error</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted w-20">Retry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/20 dark:divide-dark-border/20">
            {sorted.map(record => (
              <tr key={record.upstreamId} className="hover:bg-gray-50/50 dark:hover:bg-dark-hover/30 transition-colors">
                <td className="px-4 py-3 text-primary font-medium truncate max-w-[200px]" title={record.name}>
                  {record.name}
                </td>
                <td className="px-4 py-3">
                  <FailedStepBadge step={record.failedStep} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setErrorDetail({ name: record.name, error: record.error ?? 'Unknown error' })}
                    className="text-xs text-muted hover:text-secondary truncate max-w-[250px] block text-left transition-colors"
                    title={record.error}
                  >
                    {record.error ? (record.error.length > 60 ? `${record.error.slice(0, 60)}…` : record.error) : 'Unknown error'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onRetrySingle(record.upstreamId)}
                    disabled={retryingId === record.upstreamId}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-accent-500 hover:bg-accent-500/10 dark:text-accent-400 dark:hover:bg-accent-400/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Retry this record"
                  >
                    {retryingId === record.upstreamId ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                      </svg>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errorDetail && (
        <ErrorDetailModal
          name={errorDetail.name}
          error={errorDetail.error}
          onClose={() => setErrorDetail(null)}
        />
      )}
    </>
  )
})
