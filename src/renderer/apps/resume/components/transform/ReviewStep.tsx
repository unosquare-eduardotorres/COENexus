import ResumeEditor from '../ResumeEditor';
import PdfPreviewPanel from '../PdfPreviewPanel';
import ValidationPanel from '../ValidationPanel';
import OriginalDocxViewer from './OriginalDocxViewer';
import ReviewToolbar from './review/ReviewToolbar';
import ChecksView from './review/ChecksView';
import { useTransformContext } from '../../contexts/TransformContext';
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
              <ReviewToolbar
                reviewViewMode={reviewViewMode}
                onSetViewMode={setReviewViewMode}
                validationResults={validationResults}
                resumeWarningsCount={resumeWarnings.length}
                enhancerModeLabel={enhancerModeLabel(enhancerMode)}
                isEnhancing={isEnhancing}
                onShowWarningsModal={onShowWarningsModal}
                onShowEnhancerModal={onShowEnhancerModal}
                onEnhanceClick={onEnhanceClick}
              />

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

                {reviewViewMode === 'checks' && activeResume && (
                  <ChecksView resume={activeResume} />
                )}
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
