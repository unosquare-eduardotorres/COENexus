import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { BraniacJob } from '../../../../../shared/ipc-types'

interface BraniacJobHistoryProps {
  jobs: BraniacJob[]
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'running':
      return <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
    case 'canceled':
      return <XCircle className="h-4 w-4 text-gray-400" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    running: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    canceled: 'bg-gray-100 text-gray-600 dark:bg-dark-muted/30 dark:text-gray-400',
    queued: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  }
  return colors[status] ?? colors.queued
}

function parseMetadata(json: string): Record<string, unknown> | null {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BraniacJobHistory({ jobs }: BraniacJobHistoryProps) {
  if (jobs.length === 0) {
    return (
      <div className="glass-panel p-5 rounded-2xl">
        <h2 className="text-base font-semibold text-primary mb-3">Job History</h2>
        <p className="text-sm text-muted">No Braniac jobs have been run yet.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-5 rounded-2xl">
      <h2 className="text-base font-semibold text-primary mb-3">Job History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-dark-border">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">Status</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">Account</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">Patterns</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">Profiles</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">Started</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">Completed</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const meta = parseMetadata(job.metadata_json)
              const account = (meta?.account as string) ?? job.scope_value ?? '—'
              const patternsCreated = (meta?.patternsCreated as number) ?? 0
              const profilesUpserted = (meta?.profilesUpserted as number) ?? 0

              return (
                <tr
                  key={job.id}
                  className="border-b border-gray-100 dark:border-dark-border/50 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-dark-hover/30 transition-colors"
                >
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      {statusIcon(job.status)}
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-primary font-medium">{account}</td>
                  <td className="py-2.5 px-2 text-secondary">{patternsCreated}</td>
                  <td className="py-2.5 px-2 text-secondary">{profilesUpserted}</td>
                  <td className="py-2.5 px-2 text-muted">{formatDate(job.started_at)}</td>
                  <td className="py-2.5 px-2 text-muted">{formatDate(job.completed_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
