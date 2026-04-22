import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVigilContext } from '../../pages/VigilPage'
import { vigilService } from '../../services/vigilService'
import type { VigilRun, VigilRunStatus } from '../../../../../shared/ipc-types'

function statusIcon(status: VigilRunStatus): string {
  if (status === 'completed') return '✅'
  if (status === 'failed') return '❌'
  if (status === 'canceled') return '⚠️'
  if (status === 'running' || status === 'queued') return '🔄'
  return '⏳'
}

function statusTone(status: VigilRunStatus): string {
  if (status === 'completed') return 'text-emerald-400'
  if (status === 'failed') return 'text-red-400'
  if (status === 'canceled') return 'text-amber-400'
  if (status === 'running' || status === 'queued') return 'text-blue-400'
  return 'text-muted'
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'Running...'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m ${secs}s`
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface RunResultsSummary {
  totalSynced: number
  totalFailed: number
  sourceCount: number
}

function parseResultsSummary(resultsJson: string | null): RunResultsSummary | null {
  if (!resultsJson) return null
  try {
    const parsed = JSON.parse(resultsJson)
    const sources = Array.isArray(parsed.sources) ? parsed.sources : []
    let totalSynced = 0
    let totalFailed = 0
    for (const s of sources) {
      const progress = s.progress
      if (progress) {
        totalSynced += (progress.syncedCount ?? 0)
      }
      if (!s.success) totalFailed++
    }
    const failedRecords = Array.isArray(parsed.failedRecords) ? parsed.failedRecords.length : 0
    return { totalSynced, totalFailed: failedRecords || totalFailed, sourceCount: sources.length }
  } catch {
    return null
  }
}

function parseSources(sourcesJson: string): string {
  try {
    const arr = JSON.parse(sourcesJson)
    if (Array.isArray(arr)) return arr.join(', ')
  } catch { /* empty */ }
  return sourcesJson
}

export default function RunsTab() {
  const { runs: initialRuns, loading: parentLoading } = useVigilContext()
  const navigate = useNavigate()

  const [allRuns, setAllRuns] = useState<VigilRun[]>(initialRuns)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setAllRuns(initialRuns)
  }, [initialRuns])

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const response = await vigilService.listRuns({ limit: 30, offset: allRuns.length })
      if (response.success && response.data) {
        setAllRuns(prev => [...prev, ...response.data as VigilRun[]])
        setHasMore((response.data as VigilRun[]).length >= 30)
      }
    } finally {
      setLoadingMore(false)
    }
  }, [allRuns.length, loadingMore, hasMore])

  if (parentLoading) {
    return <div className="glass-panel p-6 text-sm text-muted">Loading runs...</div>
  }

  return (
    <div className="space-y-4">
      <section className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-primary">Run History</h3>
          <span className="text-xs text-muted">{allRuns.length} run{allRuns.length !== 1 ? 's' : ''}</span>
        </div>

        {allRuns.length === 0 && (
          <div className="glass-panel-subtle rounded-xl p-4 text-xs text-muted text-center">
            No runs recorded yet. Wake Vigil to create the first run.
          </div>
        )}

        <div className="space-y-2">
          {allRuns.map(run => {
            const summary = parseResultsSummary(run.results_json)
            return (
              <button
                key={run.id}
                onClick={() => navigate(`runs/${run.id}`)}
                className="w-full glass-panel-subtle rounded-xl p-3 hover:bg-slate-500/10 transition-colors text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{statusIcon(run.status)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${statusTone(run.status)}`}>
                          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                        </span>
                        <span className="text-[10px] text-muted px-1.5 py-0.5 rounded bg-slate-500/15">
                          {run.trigger_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-secondary mt-0.5 truncate">
                        {parseSources(run.sources_json)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted">{formatRelativeTime(run.started_at)}</p>
                    <p className="text-[10px] text-secondary">{formatDuration(run.started_at, run.completed_at)}</p>
                    {summary && (
                      <p className="text-[10px] text-muted mt-0.5">
                        {summary.totalSynced.toLocaleString()} synced
                        {summary.totalFailed > 0 && (
                          <span className="text-red-400"> · {summary.totalFailed} failed</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {hasMore && allRuns.length > 0 && (
          <div className="mt-3 pt-3 border-t minimal-divider">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="glass-button h-9 px-3 text-xs font-semibold text-primary disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more runs'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
