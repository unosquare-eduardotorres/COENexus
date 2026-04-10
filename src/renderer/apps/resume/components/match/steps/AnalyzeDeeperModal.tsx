import {
  DataSource,
  MatchCandidate,
  MatchFlowType,
  SearchMode,
  TopN,
} from '../../../types'

interface AnalyzeDeeperModalProps {
  searchMode: SearchMode
  deeperTopN: TopN
  candidates: MatchCandidate[]
  dataSource: DataSource
  matchFlow: MatchFlowType | null
  onSetDeeperTopN: (n: TopN) => void
  onStartHaikuUpgrade: () => void
  onStartOpusUpgrade: () => void
  onCancel: () => void
}

export default function AnalyzeDeeperModal({
  searchMode,
  deeperTopN,
  onSetDeeperTopN,
  onStartHaikuUpgrade,
  onStartOpusUpgrade,
  onCancel,
}: AnalyzeDeeperModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center">
            <span className="text-lg">🔬</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">Analyze Deeper</h3>
            <p className="text-xs text-muted">Upgrade your search with more AI analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Analyze Top</span>
          {([10, 20, 30] as TopN[]).map((n) => (
            <button
              key={n}
              onClick={() => onSetDeeperTopN(n)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                deeperTopN === n
                  ? 'bg-violet-500 text-white shadow-sm'
                  : 'glass-panel-subtle text-secondary hover:text-primary'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {searchMode === 'vector' && (
            <button
              onClick={onStartHaikuUpgrade}
              className="w-full text-left p-4 rounded-xl border-2 border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-amber-500/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 4h18l-7 8v6l-4 2V12L3 4z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-primary">Haiku Pre-filter</h4>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400">🎯 Balanced</span>
                  </div>
                  <p className="text-xs text-muted mt-1">AI triage with Haiku to score and filter candidates. Returns top 50.</p>
                </div>
              </div>
            </button>
          )}

          <button
            onClick={onStartOpusUpgrade}
            className="w-full text-left p-4 rounded-xl border-2 border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-violet-500/30 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-500 flex items-center justify-center text-white flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 017 7c0 2.5-1.5 4.5-3 6l-1 3H9l-1-3c-1.5-1.5-3-3.5-3-6a7 7 0 017-7z" />
                  <path d="M9 18h6M10 21h4" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-primary">Full Opus Analysis</h4>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400">🔬 Deepest</span>
                </div>
                <p className="text-xs text-muted mt-1">Complete pipeline with deep Opus analysis — fit narratives, skill gaps, leadership assessment. Top 10 candidates.</p>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2 text-sm text-muted hover:text-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
