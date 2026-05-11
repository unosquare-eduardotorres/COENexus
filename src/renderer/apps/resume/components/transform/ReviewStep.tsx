import { useState } from 'react';
import ResumeEditor from '../ResumeEditor';
import PdfPreviewPanel from '../PdfPreviewPanel';
import OriginalDocxViewer from './OriginalDocxViewer';
import ReviewToolbar from './review/ReviewToolbar';
import ChecksView from './review/ChecksView';
import { useTransformContext } from '../../contexts/TransformContext';
import { RefinementMode } from '../../types';

const ENHANCER_MODES: { value: RefinementMode; label: string; description: string }[] = [
  { value: 'professional-polish', label: 'Professional Polish', description: 'Refine language, fix grammar, and improve readability while preserving technical accuracy.' },
  { value: 'impact-focused', label: 'Impact-Focused', description: 'Rewrite accomplishments with measurable impact, strong action verbs, and quantified results.' },
  { value: 'ats-optimized', label: 'ATS-Optimized', description: 'Optimize formatting and keywords for Applicant Tracking Systems compatibility.' },
];

export default function ReviewStep() {
  const {
    wizard: { handleBack: onBack, handleNext: onNext },
    refinement: { enhancerMode, setEnhancerMode, enhancerModeLabel, handleEnhanceClick: onEnhanceClick, handleEnhanceResume, confirmReEnhance },
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
    },
    suggestions: { aiSuggestions },
    session: { sessionSaved, savedSessionName },
    modals: {
      showWarningsModal, setShowWarningsModal,
      showEnhancerModal, setShowEnhancerModal,
      showEnhanceWarningModal, setShowEnhanceWarningModal,
      showReEnhanceConfirm, setShowReEnhanceConfirm,
    },
    misc: { originalResume },
  } = useTransformContext();
  const isEnhancing = isTransforming;

  const [pendingEnhancerMode, setPendingEnhancerMode] = useState<RefinementMode>(enhancerMode);
  const [pdfError, setPdfError] = useState(false);

  const onShowWarningsModal = () => setShowWarningsModal(true);
  const onShowEnhancerModal = () => {
    setPendingEnhancerMode(enhancerMode);
    setShowEnhancerModal(true);
  };

  return (
    <>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
        {sessionSaved && (
          <div className="glass-card p-3 mb-3 flex items-center gap-3 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 flex-shrink-0">
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
          <div className="glass-card p-6 text-center py-8 flex-1">
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
          <div className="glass-card p-6 text-center py-8 flex-1">
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
          <div className="flex gap-4 flex-1 min-h-0">
            {transformedResumes.length > 1 && (
              <div className="w-52 flex-shrink-0 space-y-2 overflow-y-auto">
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

            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <div className="flex-shrink-0">
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
                  onBack={onBack}
                  onNext={onNext}
                />
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto pr-1">
                  {(reviewViewMode === 'editor' || reviewViewMode === 'split') && activeResume && reviewViewMode !== 'split' && (
                    <ResumeEditor
                      resume={activeResume}
                      onUpdate={handleUpdateResume}
                      onRequestAISuggestion={handleRequestAISuggestion}
                      aiSuggestions={aiSuggestions}
                      onSelectSuggestion={handleSelectSuggestion}
                      originalResume={originalResume}
                    />
                  )}

                  {reviewViewMode === 'split' && activeResume && (
                    <div className="flex gap-4 h-full">
                      <div className="w-1/2 min-w-0 overflow-y-auto">
                        <ResumeEditor
                          resume={activeResume}
                          onUpdate={handleUpdateResume}
                          onRequestAISuggestion={handleRequestAISuggestion}
                          aiSuggestions={aiSuggestions}
                          onSelectSuggestion={handleSelectSuggestion}
                          originalResume={originalResume}
                        />
                      </div>
                      <div className="w-1/2 flex-shrink-0 overflow-y-auto">
                        <PdfPreviewPanel resume={activeResume} />
                      </div>
                    </div>
                  )}

                  {reviewViewMode === 'resume' && activeResume && (
                    <PdfPreviewPanel resume={activeResume} />
                  )}

                  {reviewViewMode === 'original' && activeResume && (
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
                        {activeResume.originalFileUrl && activeResume.originalFileType === 'pdf' && !pdfError ? (
                          <iframe
                            src={activeResume.originalFileUrl}
                            className="w-full rounded-xl border border-gray-200/30 dark:border-dark-border/30"
                            style={{ height: '70vh' }}
                            title="Original Resume"
                            onError={() => setPdfError(true)}
                          />
                        ) : activeResume.originalFileUrl && activeResume.originalFileType === 'docx' ? (
                          <OriginalDocxViewer fileUrl={activeResume.originalFileUrl} buffer={activeResume.originalFileBuffer} />
                        ) : (
                          <div className="bg-gray-50/50 dark:bg-dark-bg/50 rounded-xl border border-gray-200/30 dark:border-dark-border/30 p-4">
                            <pre className="text-secondary whitespace-pre-wrap font-mono text-xs leading-relaxed">
                              {activeResume.originalContent}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {reviewViewMode === 'checks' && activeResume && (
                    <ChecksView resume={activeResume} completeness={completeness} validationResults={validationResults} />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showReEnhanceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Re-Enhance Resume?</h3>
            </div>
            <p className="text-sm text-secondary mb-6">
              This will re-process the resume with AI. Your manual edits will be preserved where possible. Continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReEnhanceConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReEnhance}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-500 rounded-xl hover:bg-violet-600 transition-colors"
              >
                Re-Enhance
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnhanceWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Missing Information</h3>
            </div>
            <p className="text-sm text-secondary mb-3">The resume has missing information that may affect enhancement quality:</p>
            <ul className="space-y-1.5 mb-6">
              {resumeWarnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {warning}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEnhanceWarningModal(false)}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowEnhanceWarningModal(false); void handleEnhanceResume(); }}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors"
              >
                Enhance Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnhancerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Enhancement Mode</h3>
            </div>
            <div className="space-y-3 mb-6">
              {ENHANCER_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${
                    pendingEnhancerMode === mode.value
                      ? 'border-accent-500 bg-accent-50/50 dark:bg-accent-500/10'
                      : 'border-transparent bg-white/50 dark:bg-dark-hover/30 hover:bg-white/80 dark:hover:bg-dark-hover/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="enhancerMode"
                    value={mode.value}
                    checked={pendingEnhancerMode === mode.value}
                    onChange={() => setPendingEnhancerMode(mode.value)}
                    className="mt-0.5 accent-accent-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-primary">{mode.label}</p>
                    <p className="text-xs text-muted mt-0.5">{mode.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEnhancerModal(false)}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setEnhancerMode(pendingEnhancerMode); setShowEnhancerModal(false); }}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-500 rounded-xl hover:bg-accent-600 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {showWarningsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Resume Warnings</h3>
            </div>
            {resumeWarnings.length > 0 ? (
              <ul className="space-y-2 mb-6">
                {resumeWarnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2.5 p-2.5 bg-amber-50/60 dark:bg-amber-500/10 rounded-lg">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-amber-700 dark:text-amber-300">{warning}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-6">No warnings — all required information is present.</p>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowWarningsModal(false)}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
