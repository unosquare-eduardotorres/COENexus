import { Zap, X } from 'lucide-react'

interface RunConfirmModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  scopeLabel: string
  scopeDetails?: string
}

export default function RunConfirmModal({ open, onConfirm, onCancel, scopeLabel, scopeDetails }: RunConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative glass-card w-full max-w-md mx-4 p-6 shadow-glass-lg animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 rounded-lg text-muted hover:text-primary hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/15 mb-4">
            <Zap size={22} className="text-blue-400" />
          </div>

          <h3 className="text-lg font-bold text-primary">Run Scout-9 Pipeline</h3>

          <p className="mt-2 text-sm text-secondary">
            This will execute the full pipeline with the following scope:
          </p>

          <div className="mt-4 w-full glass-panel-subtle rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">📋</span>
              <span className="text-sm font-semibold text-primary">{scopeLabel}</span>
            </div>
            {scopeDetails && (
              <p className="text-xs text-muted mt-1">{scopeDetails}</p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-6 w-full">
            <button
              onClick={onCancel}
              className="glass-button flex-1 px-4 py-2.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Zap size={14} />
              Run Pipeline
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
