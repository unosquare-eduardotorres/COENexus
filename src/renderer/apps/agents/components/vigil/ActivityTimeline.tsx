import { useMemo, useState } from 'react'
import type { VigilActivityLog } from '../../../../../shared/ipc-types'

interface ActivityTimelineProps {
  entries: VigilActivityLog[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => Promise<void> | void
}

function severityTone(severity: VigilActivityLog['severity']): string {
  if (severity === 'error') return 'text-red-400 bg-red-500/10'
  if (severity === 'warning') return 'text-amber-400 bg-amber-500/10'
  return 'text-blue-400 bg-blue-500/10'
}

function severityIcon(severity: VigilActivityLog['severity']) {
  if (severity === 'error') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    )
  }

  if (severity === 'warning') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
    )
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export default function ActivityTimeline({ entries, hasMore, loadingMore, onLoadMore }: ActivityTimelineProps) {
  const [expandedRuns, setExpandedRuns] = useState<Record<string, boolean>>({})

  const grouped = useMemo(() => {
    const map = new Map<string, VigilActivityLog[]>()
    for (const entry of entries) {
      const key = entry.run_id ?? 'system'
      const list = map.get(key) ?? []
      list.push(entry)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [entries])

  function toggleGroup(runId: string) {
    setExpandedRuns(prev => ({ ...prev, [runId]: !prev[runId] }))
  }

  return (
    <section className="glass-card p-4 h-[420px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-primary">Activity Timeline</h3>
        <span className="text-xs text-muted">Newest first</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {grouped.length === 0 && (
          <div className="glass-panel-subtle rounded-xl p-3 text-xs text-muted">No activity yet.</div>
        )}

        {grouped.map(([runId, runEntries]) => {
          const expanded = expandedRuns[runId] ?? true
          return (
            <div key={runId} className="glass-panel-subtle rounded-xl p-3">
              <button
                onClick={() => toggleGroup(runId)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-xs font-semibold text-primary">
                    {runId === 'system' ? 'System' : `Run ${runId.slice(0, 8)}`}
                  </p>
                  <p className="text-[11px] text-muted">{runEntries.length} event{runEntries.length === 1 ? '' : 's'}</p>
                </div>
                <span className="text-xs text-secondary">{expanded ? 'Hide' : 'Show'}</span>
              </button>

              {expanded && (
                <div className="mt-3 space-y-2 border-t minimal-divider pt-3">
                  {runEntries.map(entry => (
                    <div key={entry.id} className="glass-panel rounded-lg p-2.5">
                      <div className="flex items-start gap-2">
                        <span className={`inline-flex items-center justify-center h-5 w-5 rounded ${severityTone(entry.severity)}`}>
                          {severityIcon(entry.severity)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted">
                              {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-secondary px-1.5 py-0.5 rounded bg-slate-500/15">{entry.source}</span>
                          </div>
                          <p className="text-xs text-primary mt-1 break-words">{entry.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="pt-3 mt-3 border-t minimal-divider">
        <button
          onClick={onLoadMore}
          disabled={!hasMore || loadingMore}
          className="glass-button h-9 px-3 text-xs font-semibold text-primary disabled:opacity-50"
        >
          {loadingMore ? 'Loading...' : hasMore ? 'Load more' : 'No more entries'}
        </button>
      </div>
    </section>
  )
}
