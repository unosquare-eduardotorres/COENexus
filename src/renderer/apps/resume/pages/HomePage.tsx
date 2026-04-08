import { useState } from 'react';
import { Link } from 'react-router-dom';
import VemLogo from '../../../components/VemLogo';

const primaryActions = [
  {
    title: 'Resume',
    description: 'Upload or select resumes and enhance them with AI-powered professional polish, impact-focused rewriting, and ATS optimization.',
    href: '/resume/enhance',
    cta: 'Get Started',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    iconBg: 'from-accent-500/15 to-accent-600/10 dark:from-accent-500/20 dark:to-accent-600/15',
    iconText: 'text-accent-600 dark:text-accent-400',
    borderColor: 'border-accent-500 dark:border-accent-400',
    gradientOverlay: 'from-accent-500/5 dark:from-accent-500/10',
    hoverText: 'group-hover:text-accent-600 dark:group-hover:text-accent-400',
    ctaText: 'text-accent-600 dark:text-accent-400',
  },
  {
    title: 'Match Engine',
    description: 'Match candidates to open positions with AI-powered scoring, skill gap analysis, and intelligent ranking across your talent pool.',
    href: '/resume/match',
    cta: 'Get Started',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="18" cy="18" r="3" strokeWidth={1.5} />
        <circle cx="6" cy="6" r="3" strokeWidth={1.5} />
        <circle cx="6" cy="18" r="3" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 9v6m9.35 1.35L8.65 8.65" />
      </svg>
    ),
    iconBg: 'from-violet-500/15 to-violet-600/10 dark:from-violet-500/20 dark:to-violet-600/15',
    iconText: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-500 dark:border-violet-400',
    gradientOverlay: 'from-violet-500/5 dark:from-violet-500/10',
    hoverText: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
    ctaText: 'text-violet-600 dark:text-violet-400',
  },
];

const secondaryActions = [
  {
    title: 'Batch Processing',
    description: 'Process multiple resumes at once — enhance, extract, or validate in bulk',
    href: '/resume/batch',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    iconText: 'text-amber-600 dark:text-amber-400',
    hoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
  },
  {
    title: 'Data Sync',
    description: 'Import and sync employee & candidate records from external sources',
    href: '/resume/data-sync',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
        />
      </svg>
    ),
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    hoverText: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
  },
  {
    title: 'Settings',
    description: 'Configure templates, validation rules, and AI settings',
    href: '/resume/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
    iconBg: 'bg-gray-500/10 dark:bg-gray-400/15',
    iconText: 'text-gray-500 dark:text-gray-400',
    hoverText: 'group-hover:text-gray-600 dark:group-hover:text-gray-300',
  },
];

const resumeSteps = [
  { number: '1', title: 'Processing Mode', description: 'Choose single resume processing for full control over each enhancement' },
  { number: '2', title: 'Select Resume', description: 'Upload resume files or pick candidates directly from your ATS' },
  { number: '3', title: 'Enhancement Mode', description: 'Choose Professional Polish, Impact-Focused, ATS-Optimized, or Job Tailoring' },
  { number: '3b', title: 'Job Description', description: 'Provide a job description or pick an open position', isConditional: true },
  { number: '4', title: 'Review & Refine', description: 'Preview the enhanced resume, compare original vs enhanced, and run AI enhancements' },
  { number: '5', title: 'Save / Export', description: 'Download as DOCX, sync to ATS, or present to a position' },
];

const matchSteps = [
  { number: '1', title: 'Choose Intent', description: 'Select your matching goal — fill a position, reduce bench, or explore talent' },
  { number: '2', title: 'Data Source', description: 'Pick your talent pool — bench, all employees, external candidates, or all sources' },
  { number: '3', title: 'Job Description', description: 'Paste a job description or select an open position to match against' },
  { number: '4', title: 'Filters & Depth', description: 'Apply filters and choose search depth — Haiku (fast) or Opus (thorough)' },
  { number: '5', title: 'AI Search', description: 'AI analyzes candidates and scores them against your requirements' },
  { number: '6', title: 'Review Results', description: 'Explore ranked matches, compare candidates, and deep-dive into profiles' },
];

const statsPills = [
  {
    label: 'AI-Powered Enhancement',
    colorClass: 'text-accent-500 dark:text-accent-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    label: 'Smart Matching',
    colorClass: 'text-violet-500 dark:text-violet-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    label: 'Batch Processing',
    colorClass: 'text-amber-500 dark:text-amber-400',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6" />
      </svg>
    ),
  },
];

function VemHeroGraphic() {
  return <VemLogo size={88} className="text-accent-500 dark:text-accent-400 mx-auto block" />;
}

export default function HomePage() {
  const [activeWorkflow, setActiveWorkflow] = useState<'resume' | 'match'>('resume');
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const activeSteps = activeWorkflow === 'resume' ? resumeSteps : matchSteps;
  const isMatch = activeWorkflow === 'match';

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8 md:py-12">

        <section className="relative overflow-hidden rounded-3xl mb-10 py-10 md:py-14">
          <div
            className="absolute top-[-10%] left-[15%] w-80 h-80 md:w-96 md:h-96 bg-accent-400/20 dark:bg-accent-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '5s' }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-[-5%] right-[10%] w-64 h-64 md:w-80 md:h-80 bg-violet-400/15 dark:bg-violet-500/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '7s' }}
            aria-hidden="true"
          />
          <div
            className="absolute top-[30%] right-[40%] w-48 h-48 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '6s' }}
            aria-hidden="true"
          />

          <svg className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.03]" aria-hidden="true">
            <defs>
              <pattern id="hero-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-dot-grid)" />
          </svg>

          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel-subtle border border-accent-500/20 dark:border-accent-400/20 backdrop-blur-sm text-xs font-medium text-muted mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
              Vectorize · Extract · Match
            </div>

            <div className="mb-6">
              <VemHeroGraphic />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary tracking-tight mb-4">
              <span className="text-accent-500 dark:text-accent-400">V</span>
              <span className="text-primary/60 dark:text-primary/40">.</span>
              <span className="text-accent-500 dark:text-accent-400">E</span>
              <span className="text-primary/60 dark:text-primary/40">.</span>
              <span className="text-accent-500 dark:text-accent-400">M</span>
              <span className="text-primary/60 dark:text-primary/40">.</span>
            </h1>

            <p className="text-lg md:text-xl text-secondary font-medium mb-2">
              Vectorize. Extract. Match.
            </p>
            <p className="text-sm md:text-base text-muted mb-8">
              Resumes, reimagined. Matches, made.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {statsPills.map((pill) => (
                <div
                  key={pill.label}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-subtle text-xs font-medium text-muted"
                >
                  <span className={pill.colorClass}>{pill.icon}</span>
                  {pill.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {primaryActions.map((action) => (
              <Link
                key={action.title}
                to={action.href}
                className={`glass-card-hover p-6 block group relative overflow-hidden border-l-4 ${action.borderColor}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradientOverlay} to-transparent pointer-events-none`} aria-hidden="true" />
                <div className="relative">
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.iconBg} flex items-center justify-center ${action.iconText}`}>
                      {action.icon}
                    </div>
                    <h3 className={`text-base font-semibold text-primary ${action.hoverText} transition-colors`}>
                      {action.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted leading-relaxed mb-4">{action.description}</p>
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${action.ctaText} group-hover:gap-2.5 transition-all`}>
                    {action.cta}
                    <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {secondaryActions.map((action) => (
              <Link
                key={action.title}
                to={action.href}
                className="glass-card-hover p-5 block group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center ${action.iconText}`}>
                    {action.icon}
                  </div>
                  <h3 className={`text-sm font-semibold text-primary ${action.hoverText} transition-colors`}>
                    {action.title}
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed mb-3">{action.description}</p>
                <div className={`flex items-center gap-1.5 text-xs font-medium text-muted ${action.hoverText} transition-colors`}>
                  Launch
                  <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <button
            onClick={() => setHowItWorksOpen(!howItWorksOpen)}
            className="w-full flex items-center gap-4 mb-6 cursor-pointer group"
          >
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
            <span className="text-sm font-semibold text-primary whitespace-nowrap flex items-center gap-2">
              How It Works
              <svg className={`w-4 h-4 text-muted transition-transform duration-200 ${howItWorksOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
          </button>

          <div className={`overflow-hidden transition-all duration-300 ${howItWorksOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center gap-1 p-1 rounded-2xl glass-panel-subtle border border-gray-200/60 dark:border-dark-border backdrop-blur-sm">
              <button
                onClick={() => setActiveWorkflow('resume')}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeWorkflow === 'resume'
                    ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border border-accent-500/30 shadow-sm'
                    : 'text-muted hover:text-secondary hover:bg-gray-100/60 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                Resume Enhancement
              </button>
              <button
                onClick={() => setActiveWorkflow('match')}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeWorkflow === 'match'
                    ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 shadow-sm'
                    : 'text-muted hover:text-secondary hover:bg-gray-100/60 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                Match Engine
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {activeSteps.map((step, index) => (
              <div
                key={`${activeWorkflow}-${step.number}`}
                className={`relative flex md:flex-col items-start md:items-center gap-4 ${step.isConditional ? 'opacity-75' : ''}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                  step.isConditional
                    ? 'border-2 border-dashed border-gray-300 dark:border-dark-border text-gray-400 dark:text-gray-500 bg-white/50 dark:bg-dark-surface/50'
                    : isMatch
                      ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/20'
                }`}>
                  {step.number}
                </div>

                <div className="md:text-center flex-1 md:flex-initial">
                  <h3 className="text-sm font-semibold text-primary mb-1">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{step.description}</p>
                  {step.isConditional && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-dark-border rounded-md">if Job Tailoring selected</span>
                  )}
                </div>

                {index < activeSteps.length - 1 && (
                  <div className="md:hidden w-px h-6 bg-gray-200 dark:bg-dark-border ml-6 -my-1 absolute -bottom-7 left-0" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
          </div>
        </section>

        <section className="relative mb-8">
          <div className="absolute inset-0 bg-accent-500/5 dark:bg-accent-500/10 rounded-3xl blur-xl" aria-hidden="true" />
          <div className="relative glass-card p-8 md:p-10 text-center">
            <h2 className="text-lg md:text-xl font-semibold text-primary mb-2">
              Ready to enhance your next resume?
            </h2>
            <p className="text-sm text-muted mb-6 max-w-md mx-auto">
              Start transforming resumes with AI-powered enhancement or find the perfect candidate match for your open positions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/resume/enhance"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 text-white rounded-xl hover:bg-accent-600 transition-colors font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                Enhance a Resume
              </Link>
              <Link
                to="/resume/match"
                className="inline-flex items-center gap-2 px-6 py-3 glass-card rounded-xl text-secondary font-medium text-sm hover:text-violet-600 dark:hover:text-violet-400 transition-colors border border-gray-200 dark:border-dark-border hover:border-violet-500/30 dark:hover:border-violet-400/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="18" cy="18" r="3" strokeWidth={1.5} />
                  <circle cx="6" cy="6" r="3" strokeWidth={1.5} />
                  <circle cx="6" cy="18" r="3" strokeWidth={1.5} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 9v6m9.35 1.35L8.65 8.65" />
                </svg>
                Try Match Engine
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
