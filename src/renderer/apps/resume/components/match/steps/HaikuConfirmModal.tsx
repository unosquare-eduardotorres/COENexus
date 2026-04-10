import { HaikuConfirmPayload } from '../../../types'

interface HaikuConfirmModalProps {
  haikuConfirm: HaikuConfirmPayload
  onDecision: (action: 'proceed' | 'include-all') => void
}

export default function HaikuConfirmModal({ haikuConfirm, onDecision }: HaikuConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-primary">Fewer Matches Than Requested</h3>
        </div>

        <p className="text-sm text-secondary leading-relaxed">
          You requested <span className="font-semibold text-primary">Top {haikuConfirm.requestedTopN}</span>, but only{' '}
          <span className="font-semibold text-primary">{haikuConfirm.passedCount}</span> candidates scored above the quality threshold (40%).
        </p>

        {haikuConfirm.bestRejected.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Next Best Candidates</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {haikuConfirm.bestRejected.map((candidate, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg glass-panel-subtle">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{candidate.name}</span>
                    {candidate.seniority && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500">{candidate.seniority}</span>
                    )}
                    {candidate.mainSkill && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">{candidate.mainSkill}</span>
                    )}
                  </div>
                  <span className="text-sm font-mono font-semibold text-amber-500">{candidate.haikuScore}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-panel-subtle rounded-lg p-3">
          <p className="text-xs text-amber-500 font-medium">
            Including low-scoring candidates may result in less relevant matches. They will still receive full Sonnet analysis.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onDecision('proceed')}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200/30 dark:border-dark-border/30 text-sm font-medium text-secondary hover:bg-gray-100/50 dark:hover:bg-dark-hover transition-colors"
          >
            Proceed with {haikuConfirm.passedCount}
          </button>
          <button
            onClick={() => onDecision('include-all')}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            Include Low Scores
          </button>
        </div>
      </div>
    </div>
  )
}
