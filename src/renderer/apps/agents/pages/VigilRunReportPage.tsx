import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { vigilService } from '../services/vigilService'
import type { VigilRun, VigilSource } from '../../../../shared/ipc-types'

interface SourceResult {
  source: VigilSource
  success: boolean
  attempts: number
  errors: string[]
  progress?: {
    totalRecords: number
    fetchedRecords: number
    syncedCount: number
    updatedCount: number
    unchangedCount: number
    incompleteCount: number
    notProcessedCount: number
    skippedCount: number
    status: string
  }
}

interface FailedRecord {
  source: string
  name: string
  upstreamId: number
  reason: string
  timestamp: string
}

interface RunResults {
  sources: SourceResult[]
  failedRecords?: FailedRecord[]
  options?: Record<string, unknown>
  trigger_type?: string
  error?: string
}

function statusIcon(status: string): string {
  if (status === 'completed') return '✅'
  if (status === 'failed') return '❌'
  if (status === 'canceled') return '⚠️'
  if (status === 'running' || status === 'queued') return '🔄'
  return '⏳'
}

function statusTone(status: string): string {
  if (status === 'completed') return 'text-emerald-400'
  if (status === 'failed') return 'text-red-400'
  if (status === 'canceled') return 'text-amber-400'
  return 'text-blue-400'
}

function sourceLabel(source: VigilSource): string {
  if (source === 'employees') return 'Employees'
  if (source === 'candidates') return 'Candidates'
  if (source === 'open-positions') return 'Open Positions'
  return 'PRR'
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'In progress...'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m ${secs}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function parseResults(resultsJson: string | null): RunResults | null {
  if (!resultsJson) return null
  try {
    return JSON.parse(resultsJson) as RunResults
  } catch {
    return null
  }
}

function parseSources(sourcesJson: string): string[] {
  try {
    const arr = JSON.parse(sourcesJson)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export default function VigilRunReportPage() {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const [run, setRun] = useState<VigilRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRun = useCallback(async () => {
    if (!runId) return
    setLoading(true)
    setError(null)
    try {
      const response = await vigilService.getRun(runId)
      if (!response.success) throw new Error(response.error ?? 'Failed to load run')
      setRun(response.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load run report')
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    void loadRun()
  }, [loadRun])

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-muted">Loading run report...</div>
  }

  if (error || !run) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-violet-400 hover:underline"
        >
          ← Back to Runs
        </button>
        <div className="glass-card p-6 text-sm text-red-400">{error ?? 'Run not found'}</div>
      </div>
    )
  }

  const results = parseResults(run.results_json)
  const sources = results?.sources ?? []
  const failedRecords = results?.failedRecords ?? []
  const sourcesRequested = parseSources(run.sources_json)

  const totalSynced = sources.reduce((sum, s) => sum + (s.progress?.syncedCount ?? 0), 0)
  const totalUpdated = sources.reduce((sum, s) => sum + (s.progress?.updatedCount ?? 0), 0)
  const totalUnchanged = sources.reduce((sum, s) => sum + (s.progress?.unchangedCount ?? 0), 0)

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-violet-400 hover:underline"
      >
        ← Back to Runs
      </button>

      <section className="glass-card p-5">
        <h2 className="text-base font-semibold text-primary mb-3">Run Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted">Status</p>
            <p className={`text-sm font-semibold ${statusTone(run.status)}`}>
              {statusIcon(run.status)} {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Trigger</p>
            <p className="text-sm text-primary capitalize">{run.trigger_type}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Started</p>
            <p className="text-sm text-primary">{formatDate(run.started_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Duration</p>
            <p className="text-sm text-primary">{formatDuration(run.started_at, run.completed_at)}</p>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs text-muted">Sources</p>
          <p className="text-sm text-primary">{sourcesRequested.join(', ')}</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <div className="glass-panel-subtle rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{totalSynced.toLocaleString()}</p>
            <p className="text-[10px] text-muted">Total Synced</p>
          </div>
          <div className="glass-panel-subtle rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-blue-400">{totalUpdated.toLocaleString()}</p>
            <p className="text-[10px] text-muted">Updated</p>
          </div>
          <div className="glass-panel-subtle rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-400">{totalUnchanged.toLocaleString()}</p>
            <p className="text-[10px] text-muted">Unchanged</p>
          </div>
        </div>
      </section>

      {sources.length > 0 && (
        <section className="glass-card p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">Per-Source Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sources.map(src => (
              <div key={src.source} className="glass-panel-subtle rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-primary">📊 {sourceLabel(src.source)}</h4>
                  <span className={`text-[10px] font-semibold ${src.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {src.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                {src.progress ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Synced</span>
                      <span className="text-primary font-medium">{src.progress.syncedCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Updated</span>
                      <span className="text-primary font-medium">{src.progress.updatedCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Unchanged</span>
                      <span className="text-primary font-medium">{src.progress.unchangedCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Skipped</span>
                      <span className="text-primary font-medium">{src.progress.skippedCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Total</span>
                      <span className="text-primary font-medium">{src.progress.totalRecords.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Attempts</span>
                      <span className="text-primary font-medium">{src.attempts}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted">No progress data available</p>
                )}
                {src.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {src.errors.map((err, i) => (
                      <p key={i} className="text-[10px] text-red-400">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {failedRecords.length > 0 && (
        <section className="glass-card p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">
            Failed Records ({failedRecords.length.toLocaleString()})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b minimal-divider">
                  <th className="text-left py-2 pr-3 text-muted font-medium">Source</th>
                  <th className="text-left py-2 pr-3 text-muted font-medium">Name</th>
                  <th className="text-left py-2 pr-3 text-muted font-medium">ID</th>
                  <th className="text-left py-2 text-muted font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {failedRecords.map((record, index) => (
                  <tr key={index} className="border-b border-slate-500/10">
                    <td className="py-2 pr-3 text-secondary">{record.source}</td>
                    <td className="py-2 pr-3 text-primary">{record.name}</td>
                    <td className="py-2 pr-3 text-muted">{record.upstreamId}</td>
                    <td className="py-2 text-red-400">{record.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {results?.error && (
        <section className="glass-card p-5 border border-red-500/20">
          <h3 className="text-sm font-semibold text-red-400 mb-2">Run Error</h3>
          <p className="text-xs text-red-300">{results.error}</p>
        </section>
      )}
    </div>
  )
}
