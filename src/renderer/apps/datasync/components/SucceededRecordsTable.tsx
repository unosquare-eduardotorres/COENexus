import { memo } from 'react'
import type { PipelineRecordEvent } from '../hooks/useUnifiedPipeline'

interface SucceededRecordsTableProps {
  records: PipelineRecordEvent[]
  variant?: 'vectorized' | 'skipped'
  source?: 'employees' | 'candidates' | 'positions'
}

export default memo(function SucceededRecordsTable({ records, variant = 'vectorized', source }: SucceededRecordsTableProps) {
  if (records.length === 0) {
    return (
      <div className="glass-panel-subtle rounded-xl p-8 text-center">
        <p className="text-sm text-muted">
          {variant === 'skipped' ? 'No skipped records' : 'No vectorized records yet'}
        </p>
      </div>
    )
  }

  const isPositions = source === 'positions'

  return (
    <div className="glass-panel-subtle rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
            {isPositions ? (
              <>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Account</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Main Skill</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Aging</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted w-28">Status</th>
              </>
            ) : (
              <>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Seniority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Main Skill</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Job Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Functional Unit</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted w-28">Status</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200/20 dark:divide-dark-border/20">
          {records.map(record => (
            <tr key={record.upstreamId} className="hover:bg-gray-50/50 dark:hover:bg-dark-hover/30 transition-colors">
              {isPositions ? (
                <>
                  <td className="px-4 py-3 text-primary font-medium truncate max-w-[200px]" title={record.account || record.name}>
                    {record.account || record.name}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {record.mainSkill || '—'}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {record.aging != null ? `${record.aging}d` : '—'}
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 text-primary font-medium truncate max-w-[200px]" title={record.name}>
                    {record.name}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {record.seniority || '—'}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {record.mainSkill || '—'}
                  </td>
                  <td className="px-4 py-3 text-secondary truncate max-w-[160px]" title={record.jobTitle ?? ''}>
                    {record.jobTitle || '—'}
                  </td>
                  <td className="px-4 py-3 text-secondary truncate max-w-[140px]" title={record.functionalUnit ?? ''}>
                    {record.functionalUnit || '—'}
                  </td>
                </>
              )}
              <td className="px-4 py-3">
                {variant === 'skipped' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400">
                    Already Vectorized
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    Vectorized
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
