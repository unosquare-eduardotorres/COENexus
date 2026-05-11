import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

interface ConfirmDeleteModalProps {
  title: string
  description: string
  impactSummary?: string[]
  includeJobsToggle?: boolean
  confirmLabel: string
  busy?: boolean
  onConfirm: (opts: { include_jobs?: boolean }) => Promise<void> | void
  onClose: () => void
}

export default function ConfirmDeleteModal({
  title,
  description,
  impactSummary,
  includeJobsToggle = false,
  confirmLabel,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  const [includeJobs, setIncludeJobs] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div
        className="glass-panel max-w-md w-full rounded-2xl p-5 space-y-4 border border-red-300/50 dark:border-red-500/30 bg-white/95 dark:bg-dark-surface/95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-primary">{title}</h3>
            <p className="text-xs text-secondary mt-1">{description}</p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-muted hover:text-primary disabled:opacity-50 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {impactSummary && impactSummary.length > 0 && (
          <div className="glass-panel-subtle rounded-lg p-3 space-y-1">
            <p className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
              This will delete
            </p>
            <ul className="text-xs text-primary space-y-0.5">
              {impactSummary.map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-500/70" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {includeJobsToggle && (
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeJobs}
              onChange={e => setIncludeJobs(e.target.checked)}
              disabled={busy}
              className="mt-0.5 accent-red-600"
            />
            <span className="text-xs text-secondary">
              Also delete related job history (default off to preserve audit trail).
            </span>
          </label>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:bg-gray-100 dark:hover:bg-dark-hover/50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void onConfirm({ include_jobs: includeJobsToggle ? includeJobs : undefined })
            }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
