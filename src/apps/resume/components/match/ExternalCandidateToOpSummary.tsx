import { BenchOpenPosition, ExternalResumeFile } from '../../types';

interface ExternalCandidateToOpSummaryProps {
  resumes: ExternalResumeFile[];
  position: BenchOpenPosition;
  onNext: () => void;
}

export default function ExternalCandidateToOpSummary({ resumes, position, onNext }: ExternalCandidateToOpSummaryProps) {
  const pairCount = resumes.length;

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Analysis Summary</h2>
        <p className="text-sm text-muted mt-1">Review before starting deep analysis</p>
      </div>

      <div className="glass-card p-6 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white mx-auto mb-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h6m-2 8H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V18a2 2 0 01-2 2h-4z" />
              </svg>
            </div>
            <div className="text-sm font-bold text-primary">{pairCount} Resume{pairCount !== 1 ? 's' : ''}</div>
            <div className="text-xs text-muted">Uploaded Candidate Files</div>
            <div className="text-xs text-muted">Ready for analysis</div>
          </div>

          <div className="text-center flex flex-col items-center justify-center">
            <div className="text-2xl text-muted mb-1">×</div>
            <div className="text-3xl font-bold font-mono text-accent-500">{pairCount}</div>
            <div className="text-xs text-muted">Total Pair{pairCount !== 1 ? 's' : ''}</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white mx-auto mb-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-2xl font-bold font-mono text-primary">1</div>
            <div className="text-xs text-muted">Open Position</div>
          </div>
        </div>

        <div className="border-t border-gray-200/20 dark:border-dark-border/20 pt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Account</span>
            <span className="font-medium text-primary">{position.account || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Job Title</span>
            <span className="font-mono font-semibold text-primary">{position.jobTitle || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Main Skill</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {position.mainSkill || 'N/A'}
            </span>
          </div>
          <div className="glass-panel-subtle rounded-xl p-3">
            <div className="text-xs font-semibold text-secondary mb-2">Uploaded Resume Files</div>
            <div className="space-y-1.5">
              {resumes.map(resume => (
                <div key={resume.id} className="text-xs text-primary truncate">
                  {resume.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h4 className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Pipeline Stages</h4>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">1. Vector Similarity</span>
                <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">2. Sonnet Deep Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-cyan-500/20 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          Start Deep Analysis
        </button>
      </div>
    </div>
  );
}
