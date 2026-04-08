import ResumeEditor from '../ResumeEditor';
import PdfPreviewPanel from '../PdfPreviewPanel';
import ValidationPanel from '../ValidationPanel';
import OriginalDocxViewer from './OriginalDocxViewer';
import { useTransformContext } from '../../contexts/TransformContext';
import { validationService } from '../../services/validationService';
export default function ReviewStep() {
  const {
    wizard: { handleBack: onBack, handleNext: onNext },
    refinement: { enhancerMode, enhancerModeLabel, handleEnhanceClick: onEnhanceClick },
    transform: { isTransforming, transformProgress, transformedResumes, error, handleTransform: onRetryTransform },
    review: {
      activeResumeId,
      setActiveResumeId,
      activeResume,
      reviewViewMode,
      setReviewViewMode,
      handleUpdateResume,
      handleRequestAISuggestion,
      handleSelectSuggestion,
      completeness,
      resumeWarnings,
    },
    validation: {
      validationResults,
      validationHighlight,
      validationCollapsed,
      setValidationCollapsed,
      validationFilter,
      setValidationFilter,
    },
    suggestions: { aiSuggestions },
    session: { sessionSaved, savedSessionName },
    modals: { setShowWarningsModal, setShowEnhancerModal },
    misc: { originalResume },
  } = useTransformContext();
  const isEnhancing = isTransforming;
  const onShowWarningsModal = () => setShowWarningsModal(true);
  const onShowEnhancerModal = () => setShowEnhancerModal(true);

  return (
    <div className="mb-6">
      {sessionSaved && (
        <div className="glass-card p-3 mb-4 flex items-center gap-3 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Session Saved</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">&quot;{savedSessionName}&quot; saved successfully</p>
          </div>
        </div>
      )}
      {isTransforming && transformProgress ? (
        <div className="glass-card p-6 text-center py-8">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <svg className="w-16 h-16 animate-spin text-accent-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold text-accent-600 dark:text-accent-400">
                {transformProgress.current}/{transformProgress.total}
              </span>
            </div>
          </div>
          <h3 className="text-base font-semibold text-primary mb-1">Processing...</h3>
          <p className="text-sm text-muted mb-4">{transformProgress.currentFile}</p>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-500 transition-all duration-500"
              style={{
                width: `${(transformProgress.current / transformProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-primary mb-1">Enhancement Failed</h3>
          <p className="text-sm text-muted mb-4">{error}</p>
          <button
            onClick={onRetryTransform}
            className="px-4 py-2 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : transformedResumes.length > 0 ? (
        <div>
          <div className="flex gap-4" style={{ minHeight: '70vh' }}>
            {transformedResumes.length > 1 && (
              <div className="w-52 flex-shrink-0 space-y-2">
                {transformedResumes.map((resume) => (
                  <button
                    key={resume.id}
                    onClick={() => setActiveResumeId(resume.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      activeResumeId === resume.id || (!activeResumeId && resume === transformedResumes[0])
                        ? 'glass-card border-2 border-accent-500'
                        : 'glass-card-hover border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold text-xs">
                        {resume.candidateName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-primary truncate" title={resume.candidateName}>{resume.candidateName}</p>
                        <p className="text-xs text-muted truncate" title={resume.originalFileName}>{resume.originalFileName}</p>
                      </div>
                    </div>
                    <span className="mt-2 inline-block px-2 py-0.5 bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">Ready</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="glass-card p-2 mb-4 flex items-center justify-between">
                <div className="flex items-center bg-white/50 dark:bg-dark-surface/50 rounded-lg p-0.5">
                  {([
                    { key: 'editor' as const, label: 'Editor', icon: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    )},
                    { key: 'resume' as const, label: 'Resume', icon: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )},
                    { key: 'split' as const, label: 'Split', icon: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                      </svg>
                    )},
                    { key: 'original' as const, label: 'Original', icon: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    )},
                    { key: 'checks' as const, label: 'Checks', icon: (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    )},
                  ]).map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => setReviewViewMode(mode.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        reviewViewMode === mode.key
                          ? 'bg-accent-500 text-white'
                          : 'text-secondary hover:bg-white/80 dark:hover:bg-dark-hover'
                      }`}
                    >
                      {mode.icon}
                      {mode.label}
                      {mode.key === 'checks' && validationResults.length > 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          validationResults.every(r => r.status === 'valid')
                            ? 'bg-emerald-500'
                            : validationResults.some(r => r.status === 'error')
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                        }`} />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {resumeWarnings.length > 0 && (
                    <button
                      onClick={onShowWarningsModal}
                      className="p-2 text-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 rounded-lg transition-colors relative"
                      title="There is missing required information in this resume"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {resumeWarnings.length}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={onShowEnhancerModal}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-lg hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {enhancerModeLabel(enhancerMode)}
                  </button>
                  <button
                    onClick={onEnhanceClick}
                    disabled={isEnhancing}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-accent-500 rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50"
                  >
                    {isEnhancing ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    )}
                    {isEnhancing ? 'Enhancing...' : 'Enhance Resume'}
                  </button>
                </div>
              </div>

              {validationResults.length > 0 && (
                <div className={`glass-card mb-4 overflow-hidden transition-all duration-300 ${
                  validationHighlight ? 'ring-2 ring-amber-500/70 shadow-lg shadow-amber-500/10' : ''
                }`}>
                  <button
                    onClick={() => setValidationCollapsed(!validationCollapsed)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/30 dark:hover:bg-dark-hover/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className={`w-4 h-4 text-muted transition-transform ${validationCollapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-semibold text-primary">Validation & Completeness</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {validationResults.filter(r => r.status !== 'valid' && r.category === 'warning').length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full">
                          {validationResults.filter(r => r.status !== 'valid' && r.category === 'warning').length} warnings
                        </span>
                      )}
                      {validationResults.filter(r => r.status !== 'valid' && r.category === 'improvement').length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-full">
                          {validationResults.filter(r => r.status !== 'valid' && r.category === 'improvement').length} improvements
                        </span>
                      )}
                    </div>
                  </button>
                  {!validationCollapsed && (
                    <ValidationPanel
                      results={validationResults}
                      completeness={completeness}
                      activeFilter={validationFilter}
                      onFilterChange={setValidationFilter}
                    />
                  )}
                </div>
              )}

              <div className="flex gap-4">
                {(reviewViewMode === 'editor' || reviewViewMode === 'split') && activeResume && (
                  <div className={reviewViewMode === 'split' ? 'w-1/2 min-w-0' : 'w-full'}>
                    <ResumeEditor
                      resume={activeResume}
                      onUpdate={handleUpdateResume}
                      onRequestAISuggestion={handleRequestAISuggestion}
                      aiSuggestions={aiSuggestions}
                      onSelectSuggestion={handleSelectSuggestion}
                      originalResume={originalResume}
                    />
                  </div>
                )}

                {(reviewViewMode === 'resume' || reviewViewMode === 'split') && activeResume && (
                  <div className={reviewViewMode === 'split' ? 'w-1/2 flex-shrink-0' : 'w-full'}>
                    <PdfPreviewPanel resume={activeResume} />
                  </div>
                )}

                {reviewViewMode === 'original' && activeResume && (
                  <div className="w-full">
                    <div className="glass-card overflow-hidden">
                      <div className="flex items-center gap-2.5 p-3 bg-white/50 dark:bg-dark-hover/30 border-b border-gray-200/30 dark:border-dark-border/30">
                        <div className="w-8 h-8 rounded-lg bg-amber-100/80 dark:bg-amber-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-primary">Original Resume</h3>
                          <p className="text-xs text-muted">{activeResume.originalFileName}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        {activeResume.originalFileUrl && activeResume.originalFileType === 'pdf' ? (
                          <iframe src={activeResume.originalFileUrl} className="w-full rounded-xl border border-gray-200/30 dark:border-dark-border/30" style={{ height: '80vh' }} title="Original Resume" />
                        ) : activeResume.originalFileUrl && activeResume.originalFileType === 'docx' ? (
                          <OriginalDocxViewer fileUrl={activeResume.originalFileUrl} />
                        ) : (
                          <div className="bg-gray-50/50 dark:bg-dark-bg/50 rounded-xl border border-gray-200/30 dark:border-dark-border/30 p-4">
                            <pre className="text-secondary whitespace-pre-wrap font-mono text-xs leading-relaxed">
                              {activeResume.originalContent}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {reviewViewMode === 'checks' && activeResume && (() => {
                  const { hardRules, tips } = validationService.getRuleCatalog(activeResume);
                  const sections = [...new Set(hardRules.map(r => r.section))];
                  const applicableRules = hardRules.filter(r => r.status !== 'not-applicable');
                  const passedCount = applicableRules.filter(r => r.status === 'pass').length;
                  const totalCount = applicableRules.length;
                  const allPassed = passedCount === totalCount;

                  return (
                    <div className="w-full space-y-4">
                      <div className="glass-card overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-dark-hover/30 border-b border-gray-200/30 dark:border-dark-border/30">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              allPassed
                                ? 'bg-emerald-100/80 dark:bg-emerald-500/20'
                                : 'bg-red-100/80 dark:bg-red-500/20'
                            }`}>
                              <svg className={`w-4 h-4 ${
                                allPassed
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-primary">Validation Rules</h3>
                              <p className="text-xs text-muted">{passedCount} of {totalCount} passed</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            allPassed
                              ? 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100/80 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                          }`}>
                            {allPassed ? 'ALL PASSED' : 'NEEDS REVIEW'}
                          </span>
                        </div>
                        <div>
                          {sections.map((section) => {
                            const sectionRules = hardRules.filter(r => r.section === section);
                            return (
                              <div key={section}>
                                <div className="px-4 py-2 bg-gray-50/60 dark:bg-dark-surface/40 border-b border-gray-200/30 dark:border-dark-border/30">
                                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">{section}</span>
                                </div>
                                <div className="divide-y divide-gray-200/20 dark:divide-dark-border/20">
                                  {sectionRules.map((rule) => (
                                    <div key={rule.rule} className="px-4 py-3 hover:bg-white/30 dark:hover:bg-dark-hover/20 transition-colors">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          {rule.status === 'pass' ? (
                                            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          ) : rule.status === 'not-applicable' ? (
                                            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                          ) : rule.severity === 'warning' ? (
                                            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                          ) : (
                                            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          )}
                                          <span className="text-sm font-medium text-primary">{rule.description}</span>
                                        </div>
                                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                                          rule.status === 'pass'
                                            ? 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                            : rule.status === 'not-applicable'
                                              ? 'bg-gray-100/80 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300'
                                              : rule.severity === 'warning'
                                                ? 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                : 'bg-red-100/80 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                        }`}>
                                          {rule.status === 'pass' ? 'Pass' : rule.status === 'not-applicable' ? 'N/A' : rule.severity === 'warning' ? 'Warning' : 'Fail'}
                                        </span>
                                      </div>
                                      {rule.status === 'fail' && rule.message && (
                                        <p className="text-xs text-muted mt-1 ml-7">{rule.message}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {tips.length > 0 && (
                        <div className="glass-card overflow-hidden">
                          <div className="flex items-center justify-between p-4 bg-indigo-50/40 dark:bg-indigo-500/10 border-b border-indigo-200/30 dark:border-indigo-500/20">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-100/80 dark:bg-indigo-500/20">
                                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                              </div>
                              <h3 className="text-sm font-semibold text-primary">Tips & Improvements</h3>
                            </div>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                              {tips.length} {tips.length === 1 ? 'tip' : 'tips'}
                            </span>
                          </div>
                          <div className="divide-y divide-indigo-200/20 dark:divide-indigo-500/10">
                            {tips.map((tip, i) => (
                              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors">
                                <div className="flex items-center gap-3">
                                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-sm text-primary">{tip.message}</span>
                                </div>
                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                                  Tip
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Back
            </button>
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
