import { useTransformContext } from '../../contexts/TransformContext';

export default function JobDescriptionStep() {
  const {
    jobDescription: { jobDescriptionSource, setJobDescriptionSource, customJobDescription, setCustomJobDescription },
    intent: { sourceType },
    selection: { selectedCandidate, selectedFiles },
    wizard: { handleBack, handleNext },
  } = useTransformContext();

  return (
    <div className="glass-card p-6 mb-6">
      <h2 className="text-base font-semibold text-primary mb-1">Job Description Source</h2>
      <p className="text-sm text-muted mb-5">Provide a job description to tailor the resume toward a specific role.</p>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <button
          onClick={() => setJobDescriptionSource('custom')}
          className={`relative glass-card-hover p-5 text-left transition-all rounded-xl ${
            jobDescriptionSource === 'custom'
              ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
              : 'border border-transparent'
          }`}
        >
          {jobDescriptionSource === 'custom' && (
            <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-primary mb-1">Custom Job Description</h3>
          <p className="text-xs text-muted leading-relaxed">Paste any job description to tailor the resume specifically to it.</p>
        </button>

        <div className="relative">
          <div className="glass-card p-5 text-left rounded-xl border-2 border-transparent opacity-50 cursor-not-allowed select-none">
            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-primary mb-1">From Open Positions</h3>
            <p className="text-xs text-muted leading-relaxed">Select from active open positions in your ATS pipeline.</p>
          </div>
          <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-semibold bg-gray-200 dark:bg-dark-border text-gray-600 dark:text-gray-300 rounded-full">
            Coming Soon
          </span>
        </div>
      </div>

      {jobDescriptionSource === 'custom' && (
        <div className="mb-5">
          <textarea
            className="glass-input w-full text-sm resize-none"
            rows={8}
            value={customJobDescription}
            onChange={(e) => setCustomJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
          />
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Enhance{' '}
          {sourceType === 'ats-candidates' && selectedCandidate
            ? `${selectedCandidate.name}'s Resume`
            : `${selectedFiles.length} Resume${selectedFiles.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
