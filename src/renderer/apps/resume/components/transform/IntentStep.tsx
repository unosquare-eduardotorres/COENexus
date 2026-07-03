import { useTransformContext } from '../../contexts/TransformContext';

export default function IntentStep() {
  const {
    history: { showHistoryPage, sessionCount, historySessions, setShowHistoryPage, navigate },
    wizard: { handleNext },
  } = useTransformContext();

  if (showHistoryPage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHistoryPage(false)}
            className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-primary">Session History</h2>
            <p className="text-sm text-secondary mt-0.5">
              <span className="font-mono font-semibold text-primary">{sessionCount}</span> session{sessionCount !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>
        {historySessions.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-muted">No enhancement sessions yet</p>
            <p className="text-xs text-muted/60 mt-1">Sessions will appear here after your first enhancement</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {historySessions.map((session) => (
              <button
                key={session.id}
                onClick={() => navigate(`/resume/enhance?session=${session.id}`)}
                className="w-full text-left glass-panel rounded-xl p-5 hover:bg-white/5 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-primary truncate group-hover:text-accent-500 transition-colors" title={session.name}>
                      {session.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${
                          session.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : session.status === 'processing'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">What would you like to do?</h2>
        <p className="text-sm text-muted mt-1">Choose how to get started with resume enhancement</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={handleNext}
          className="text-left p-6 rounded-2xl border-2 border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-emerald-500/30 transition-all duration-200 group h-full"
        >
          <div className="flex flex-col items-center text-center gap-4 h-full">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white flex-shrink-0">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="text-base font-semibold text-primary">Enhance Resume</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                Upload or select a resume and enhance it with AI-powered formatting and content improvements.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-auto pt-3">
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  AI-Powered
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Single Resume
                </span>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowHistoryPage(true)}
          className="text-left p-6 rounded-2xl border-2 border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-amber-500/30 transition-all duration-200 group h-full"
        >
          <div className="flex flex-col items-center text-center gap-4 h-full">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="text-base font-semibold text-primary">Session History</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                Resume previous enhancement sessions or review past results.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-auto pt-3">
                {sessionCount > 0 ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    No sessions yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
