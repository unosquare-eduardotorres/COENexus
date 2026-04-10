interface AiWarningModalProps {
  onContinue: () => void
  onCancel: () => void
}

export default function AiWarningModal({ onContinue, onCancel }: AiWarningModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-primary">AI Services Unavailable</h3>
        </div>

        <p className="text-sm text-secondary leading-relaxed">
          The Claude AI proxy is not running. The following AI-powered features will not be available:
        </p>

        <ul className="text-sm text-muted space-y-1.5 ml-4">
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✕</span>
            <span><strong>Haiku Triage</strong> — AI relevance scoring per candidate</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✕</span>
            <span><strong>Sonnet Deep Analysis</strong> — detailed fit narratives, skill gaps, leadership assessment</span>
          </li>
        </ul>

        <div className="glass-panel-subtle rounded-lg p-3">
          <p className="text-xs text-amber-500 font-medium">
            Results will be ranked by vector similarity only — scores may be less accurate and analysis sections will be empty.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200/30 dark:border-dark-border/30 text-sm font-medium text-secondary hover:bg-gray-100/50 dark:hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            Continue Without AI
          </button>
        </div>
      </div>
    </div>
  )
}
