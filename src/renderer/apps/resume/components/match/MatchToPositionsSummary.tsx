import { MatchToPositionsPerson } from '../../types'

interface MatchToPositionsSummaryProps {
  person: MatchToPositionsPerson
  positionCount: number
  customPositionCount: number
  onNext: () => void
}

function PersonSourceBadge({ sourceType }: { sourceType: string }) {
  const config = {
    candidate: { label: 'Candidate', classes: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    employee: { label: 'Employee', classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    external: { label: 'External Upload', classes: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  }[sourceType] ?? { label: sourceType, classes: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' }

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.classes}`}>
      {config.label}
    </span>
  )
}

export default function MatchToPositionsSummary({
  person,
  positionCount,
  customPositionCount,
  onNext,
}: MatchToPositionsSummaryProps) {
  const totalPositions = positionCount + customPositionCount

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Analysis Summary</h2>
        <p className="text-sm text-muted mt-1">Review before starting deep analysis</p>
      </div>

      <div className="glass-card p-6 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white mx-auto mb-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-sm font-bold text-primary">{person.name}</div>
            <div className="text-xs text-muted">{person.seniority || 'N/A'} · {person.mainSkill || 'N/A'}</div>
            <div className="text-xs text-muted">{person.country || 'N/A'}</div>
            <div className="mt-1">
              <PersonSourceBadge sourceType={person.sourceType} />
            </div>
          </div>

          <div className="text-center flex flex-col items-center justify-center">
            <div className="text-2xl text-muted mb-1">×</div>
            <div className="text-3xl font-bold font-mono text-accent-500">{totalPositions}</div>
            <div className="text-xs text-muted">Total Pair{totalPositions !== 1 ? 's' : ''}</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white mx-auto mb-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-2xl font-bold font-mono text-primary">{positionCount}</div>
            <div className="text-xs text-muted">Synced Position{positionCount !== 1 ? 's' : ''}</div>
            {customPositionCount > 0 && (
              <div className="text-xs text-indigo-500 mt-0.5">+ {customPositionCount} custom</div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200/20 dark:border-dark-border/20 pt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Person</span>
            <span className="font-medium text-primary">{person.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Source</span>
            <PersonSourceBadge sourceType={person.sourceType} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Total positions</span>
            <span className="font-mono font-semibold text-primary">{totalPositions} position{totalPositions !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Search mode</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Full Analysis (Vector + Opus)
            </span>
          </div>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Pipeline Stages</h4>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">1. Vector Similarity</span>
                <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">2. Opus Deep Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          Start Deep Analysis
        </button>
      </div>
    </div>
  )
}
