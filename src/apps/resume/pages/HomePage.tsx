import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const quickActions = [
  {
    title: 'Resume',
    description: 'Upload or select resumes and enhance them with AI',
    href: '/resume/enhance',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    title: 'Match Engine',
    description: 'Match candidates to positions with AI-powered scoring',
    href: '/resume/match',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="18" cy="18" r="3" strokeWidth={1.5} />
        <circle cx="6" cy="6" r="3" strokeWidth={1.5} />
        <circle cx="6" cy="18" r="3" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 9v6m9.35 1.35L8.65 8.65" />
      </svg>
    ),
  },
  {
    title: 'Batch Processing',
    description: 'Process multiple resumes at once — enhance, extract, or validate in bulk',
    href: '/resume/batch',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    title: 'Data Sync',
    description: 'Import and sync employee & candidate records from external sources',
    href: '/resume/data-sync',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
        />
      </svg>
    ),
  },
  {
    title: 'Settings',
    description: 'Configure templates, validation rules, and AI settings',
    href: '/resume/settings',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

const steps = [
  { number: '1', title: 'Processing Mode', description: 'Choose single resume processing for full control over each enhancement' },
  { number: '2', title: 'Select Resume', description: 'Upload resume files or pick candidates directly from your ATS' },
  { number: '3', title: 'Enhancement Mode', description: 'Choose Professional Polish, Impact-Focused, ATS-Optimized, or Job Description Tailoring' },
  { number: '3b', title: 'Job Description', description: 'Provide a job description or pick an open position', isConditional: true },
  { number: '4', title: 'Review & Refine', description: 'Preview the enhanced resume, compare original vs enhanced, and run AI enhancements' },
  { number: '5', title: 'Save / Export', description: 'Download as DOCX, sync to ATS, or present to a position' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [showContinueModal, setShowContinueModal] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('resume-enhance-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentStepKey && parsed.currentStepKey !== 'processing') {
          setShowContinueModal(true);
        }
      } catch { /* ignore parse errors */ }
    }
  }, []);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-subtle text-xs font-medium text-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
            V.E.M.
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
            Welcome to V.E.M.
          </h1>
          <p className="text-base text-secondary mt-3 max-w-xl mx-auto leading-relaxed">
            Vectorize. Extract. Match.
            <br />
            <span className="text-muted">Resumes, reimagined. Matches, made.</span>
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.href}
              className="glass-card-hover p-5 block group w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)]"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-11 h-11 rounded-xl bg-accent-500/10 dark:bg-accent-500/15 flex items-center justify-center text-accent-600 dark:text-accent-400">
                  {action.icon}
                </div>
                <h3 className="text-sm font-semibold text-primary group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                  {action.title}
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">{action.description}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                Launch
                <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-primary mb-8 text-center uppercase tracking-wider">
            How it works
          </h2>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-0 relative">
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px">
              <div className="w-full h-full border-t-2 border-dashed border-gray-200 dark:border-dark-border" />
            </div>

            {steps.map((step, index) => (
              <div key={step.number} className={`relative text-center px-3 ${(step as any).isConditional ? 'opacity-60' : ''}`}>
                <div className="flex md:flex-col items-center md:items-center gap-4 md:gap-0">
                  <div className={`relative z-10 w-16 h-16 md:mb-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    (step as any).isConditional
                      ? 'bg-white dark:bg-dark-surface border-2 border-dashed border-gray-300 dark:border-dark-border'
                      : 'bg-white dark:bg-dark-surface border-2 border-accent-200 dark:border-accent-500/30'
                  }`}>
                    <span className={`text-lg font-bold ${
                      (step as any).isConditional
                        ? 'text-gray-400 dark:text-gray-500 text-base'
                        : 'text-accent-600 dark:text-accent-400'
                    }`}>
                      {step.number}
                    </span>
                  </div>

                  <div className="text-left md:text-center flex-1 md:flex-initial">
                    <h3 className="text-sm font-semibold text-primary mb-1">{step.title}</h3>
                    <p className="text-xs text-muted leading-relaxed">{step.description}</p>
                    {(step as any).isConditional && (
                      <p className="text-[10px] text-gray-400 italic mt-1">(if Job Tailoring selected)</p>
                    )}
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div className="md:hidden w-px h-6 bg-gray-200 dark:bg-dark-border ml-8 my-2" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/resume/enhance"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              Get Started
            </Link>
          </div>
        </div>
      </div>

      {showContinueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-primary mb-2">Resume Enhancement In Progress</h3>
            <p className="text-sm text-muted mb-5">You had a resume enhancement in progress. Would you like to continue where you left off?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  sessionStorage.removeItem('resume-enhance-state');
                  setShowContinueModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Start Fresh
              </button>
              <button
                onClick={() => {
                  setShowContinueModal(false);
                  navigate('/resume/enhance');
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-500 rounded-xl hover:bg-accent-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
