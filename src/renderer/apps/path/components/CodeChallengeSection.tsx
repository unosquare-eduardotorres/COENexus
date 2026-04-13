import type { CodeReview } from '../types';

interface CodeChallengeSectionProps {
  codeReviews: CodeReview[];
}

export default function CodeChallengeSection({ codeReviews }: CodeChallengeSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-bold text-violet-600 dark:text-violet-300">02</span>
        <h2 className="text-lg font-bold text-primary">Take-Home Code Challenge</h2>
      </div>
      {codeReviews.map((cr) => (
        <div key={cr.id} className="grid gap-4 sm:grid-cols-2">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Submission Assets</h3>
            <div className="mt-3 space-y-2">
              <a href={cr.prUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg glass-card-hover p-2.5 text-sm text-primary hover:text-violet-600">
                <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 16 16" fill="none"><path d="M4 12l4-4 4 4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                Pull Request #{cr.prNumber}
                <svg className="ml-auto h-3 w-3 text-muted" viewBox="0 0 12 12" fill="none"><path d="M4 8l4-4M4 4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              {cr.stagingUrl && (
                <a href={cr.stagingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg glass-card-hover p-2.5 text-sm text-primary hover:text-violet-600">
                  <svg className="h-4 w-4 text-amber-500" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2l2 4 4.5.7-3.3 3.2.8 4.6L8 12.4 3.9 14.5l.8-4.6L1.5 6.7 6 6l2-4z" /></svg>
                  Staging Preview
                  <svg className="ml-auto h-3 w-3 text-muted" viewBox="0 0 12 12" fill="none"><path d="M4 8l4-4M4 4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              )}
            </div>
            {cr.evaluatorQuote && (
              <div className="mt-4 rounded-lg bg-emerald-500/10 p-3">
                <p className="text-xs italic text-secondary leading-relaxed">&quot;{cr.evaluatorQuote}&quot;</p>
              </div>
            )}
          </div>
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Scoring Rubric</h3>
            <div className="mt-3 space-y-3">
              {cr.rubrics?.map((r) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">{r.dimension}</span>
                    <span className="font-medium text-primary">{r.score}/{r.maxScore}</span>
                  </div>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: r.maxScore }, (_, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-sm ${i < r.score ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-white/10'}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="glass-button mt-4 w-full rounded-lg py-2 text-xs font-medium text-secondary hover:text-primary">
              Edit Detailed Scores
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
