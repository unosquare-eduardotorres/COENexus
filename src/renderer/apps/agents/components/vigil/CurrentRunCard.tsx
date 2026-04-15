import type { VigilRun, VigilSource } from '../../../../../shared/ipc-types'

export interface SourceProgressRow {
  source: VigilSource
  label: string
  progress: number
  count: number
  duration: string
  status: 'running' | 'completed' | 'failed' | 'idle'
}

interface CurrentRunCardProps {
  isSyncing: boolean
  activeRun: VigilRun | null
  progressRows: SourceProgressRow[]
}

function statusTone(status: SourceProgressRow['status']): string {
  if (status === 'completed') return 'text-emerald-400'
  if (status === 'failed') return 'text-red-400'
  if (status === 'running') return 'text-blue-400'
  return 'text-muted'
}

function statusLabel(status: SourceProgressRow['status']): string {
  if (status === 'completed') return 'Completed'
  if (status === 'failed') return 'Failed'
  if (status === 'running') return 'Running'
  return 'Idle'
}

function progressTone(status: SourceProgressRow['status']): string {
  if (status === 'completed') return 'bg-emerald-400'
  if (status === 'failed') return 'bg-red-400'
  if (status === 'running') return 'bg-blue-400'
  return 'bg-slate-400/70'
}

export default function CurrentRunCard({ isSyncing, activeRun, progressRows }: CurrentRunCardProps) {
  if (!isSyncing || !activeRun) {
    return (
      <section className="glass-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">Current Run</h3>
          <span className="text-xs text-muted">Idle</span>
        </div>

        <div className="mt-3 glass-panel-subtle rounded-xl p-3">
          <p className="text-xs text-secondary">No active synchronization in progress.</p>
          <p className="text-xs text-muted mt-1">
            Last known status: {activeRun?.status ?? 'idle'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="glass-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">Current Run</h3>
        <span className="text-xs text-blue-400">Syncing</span>
      </div>

      <div className="mt-3 space-y-3">
        {progressRows.map(row => (
          <div key={row.source} className="glass-panel-subtle rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-primary">{row.label}</p>
              <p className={`text-[11px] ${statusTone(row.status)}`}>{statusLabel(row.status)}</p>
            </div>

            <div className="mt-2 h-2 w-full rounded-full bg-slate-500/20 overflow-hidden">
              <div
                className={`h-full ${progressTone(row.status)} transition-all duration-300`}
                style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
              <span>{row.count.toLocaleString()} records</span>
              <span>{row.duration}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
