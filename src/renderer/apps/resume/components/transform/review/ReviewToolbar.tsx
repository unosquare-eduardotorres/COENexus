import { ReactNode } from 'react'

type ReviewViewMode = 'editor' | 'resume' | 'split' | 'original' | 'checks'

interface ViewModeOption {
  key: ReviewViewMode
  label: string
  icon: ReactNode
}

interface ReviewToolbarProps {
  reviewViewMode: ReviewViewMode
  onSetViewMode: (mode: ReviewViewMode) => void
  validationResults: { status: string; category?: string }[]
  resumeWarningsCount: number
  enhancerModeLabel: string
  isEnhancing: boolean
  onShowWarningsModal: () => void
  onShowEnhancerModal: () => void
  onEnhanceClick: () => void
  onBack: () => void
  onNext: () => void
}

const VIEW_MODES: ViewModeOption[] = [
  { key: 'editor', label: 'Editor', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
  { key: 'resume', label: 'Resume', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { key: 'split', label: 'Split', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg> },
  { key: 'original', label: 'Original', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
  { key: 'checks', label: 'Checks', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
]

export default function ReviewToolbar({
  reviewViewMode,
  onSetViewMode,
  validationResults,
  resumeWarningsCount,
  enhancerModeLabel,
  isEnhancing,
  onShowWarningsModal,
  onShowEnhancerModal,
  onEnhanceClick,
  onBack,
  onNext,
}: ReviewToolbarProps) {
  const issueCount = validationResults.filter(r => r.status !== 'valid').length

  return (
    <div className="glass-card p-2 mb-3 flex items-center justify-between gap-2">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-lg hover:bg-white/80 dark:hover:bg-dark-hover transition-colors flex-shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Back
      </button>

      <div className="flex items-center bg-white/50 dark:bg-dark-surface/50 rounded-lg p-0.5">
        {VIEW_MODES.map((mode) => (
          <button
            key={mode.key}
            onClick={() => onSetViewMode(mode.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              reviewViewMode === mode.key
                ? 'bg-accent-500 text-white'
                : 'text-secondary hover:bg-white/80 dark:hover:bg-dark-hover'
            }`}
          >
            {mode.icon}
            {mode.label}
            {mode.key === 'checks' && validationResults.length > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                issueCount === 0
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                {issueCount === 0 ? '✓' : issueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {resumeWarningsCount > 0 && (
          <button
            onClick={onShowWarningsModal}
            className="p-2 text-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 rounded-lg transition-colors relative"
            title="There is missing required information in this resume"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {resumeWarningsCount}
            </span>
          </button>
        )}
        <button
          onClick={onShowEnhancerModal}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-lg hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {enhancerModeLabel}
        </button>
        <button
          onClick={onEnhanceClick}
          disabled={isEnhancing}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-violet-500 rounded-lg hover:bg-violet-600 transition-colors disabled:opacity-50"
        >
          {isEnhancing ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <svg className="w-3 h-3 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </>
          )}
          {isEnhancing ? 'Re-Enhancing…' : 'Re-Enhance'}
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-accent-500 text-white text-xs font-medium rounded-lg hover:bg-accent-600 transition-colors flex-shrink-0"
        >
          Next
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
