interface BenchBurnSearchDepthProps {
  employeeCount: number;
  positionCount: number;
  onNext: () => void;
}

export default function BenchBurnSearchDepth({ employeeCount, positionCount, onNext }: BenchBurnSearchDepthProps) {
  const totalPairs = employeeCount * positionCount;

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Analysis Summary</h2>
        <p className="text-sm text-muted mt-1">Review the cross-match configuration before starting</p>
      </div>

      <div className="glass-card p-6 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white mx-auto mb-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-2xl font-bold font-mono text-primary">{employeeCount}</div>
            <div className="text-xs text-muted">Bench Employee{employeeCount !== 1 ? 's' : ''}</div>
          </div>

          <div className="text-center flex flex-col items-center justify-center">
            <div className="text-2xl text-muted mb-1">×</div>
            <div className="text-3xl font-bold font-mono text-accent-500">{totalPairs}</div>
            <div className="text-xs text-muted">Total Pairs</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white mx-auto mb-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-2xl font-bold font-mono text-primary">{positionCount}</div>
            <div className="text-xs text-muted">Open Position{positionCount !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="border-t border-gray-200/20 dark:border-dark-border/20 pt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Top results per employee</span>
            <span className="font-mono font-semibold text-primary">5 positions</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Top results per position</span>
            <span className="font-mono font-semibold text-primary">3 employees</span>
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

        <div className="mt-6 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h4 className="text-xs font-semibold text-orange-600 dark:text-orange-400">Pipeline Stages</h4>
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
          className="px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg shadow-orange-500/20 flex items-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 23c-3.866 0-7-3.134-7-7 0-3.5 2.5-6 4-8 .378-.505 1.06-.378 1.28.12C11 9.5 12 10.5 12 10.5s2.5-3.5 3-6c.135-.676.878-.876 1.3-.38C18.5 6.5 19 9 19 11c0 1-.5 2.5-1 3.5-.318.636.19 1.396.9 1.15.332-.115.62-.31.85-.55.23.87.25 1.87.25 1.9 0 3.866-3.134 7-7 7z" />
          </svg>
          Start Bench Burn Analysis
        </button>
      </div>
    </div>
  );
}
