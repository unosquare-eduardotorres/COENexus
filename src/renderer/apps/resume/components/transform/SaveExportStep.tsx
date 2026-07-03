import { useNavigate } from 'react-router-dom'
import { useTransformContext } from '../../contexts/TransformContext';

export default function SaveExportStep() {
  const {
    transform: { processingMetrics, transformedResumes },
    review: { editedResumes },
    export: { handleExportDocx, handleExportPdf, handlePresentToPosition },
    ats: { handleSyncToATS, canUploadToATS, uploadingToATS, uploadedToATS, canPresent },
    intent: { sourceType },
    jobDescription: { selectedPosition },
    session: { savingSession, savedSessionId, setShowSaveSessionModal },
    modals: { setShowPreviewModal },
    misc: { handleReset },
    history: { navigate },
  } = useTransformContext();
  const presentNavigate = useNavigate();

  const handlePresentCandidate = () => {
    const resume = transformedResumes[0]
    if (!resume) return
    const paramKey = sourceType === 'employees' ? 'employees' : 'candidates'
    const contextId = selectedPosition?.upstreamId
    let url = `/resume/present?${paramKey}=${resume.contextId ?? resume.id}`
    if (contextId) url += `&positionId=${contextId}`
    presentNavigate(url)
  }

  return (
    <div className="mb-6">
      {processingMetrics.length > 0 &&
        (() => {
          const aggregated = processingMetrics.reduce(
            (acc, m) => ({
              promptTokens: acc.promptTokens + (m.totalTokens?.promptTokens ?? 0),
              completionTokens: acc.completionTokens + (m.totalTokens?.completionTokens ?? 0),
              totalTokens: acc.totalTokens + (m.totalTokens?.totalTokens ?? 0),
              totalTimeMs: acc.totalTimeMs + m.processingTimeMs,
            }),
            { promptTokens: 0, completionTokens: 0, totalTokens: 0, totalTimeMs: 0 }
          );
          const anyAi = processingMetrics.some((m) => m.wasAiExtraction);
          return (
            <div className="glass-card p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Processing Metrics</p>
                  <p className="text-xs text-muted">
                    {anyAi ? processingMetrics[0].modelUsed : 'Regex Fallback'} · {(aggregated.totalTimeMs / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/50 dark:bg-dark-hover/30 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-primary">{aggregated.promptTokens.toLocaleString()}</p>
                  <p className="text-xs text-muted">Prompt Tokens</p>
                </div>
                <div className="bg-white/50 dark:bg-dark-hover/30 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-primary">{aggregated.completionTokens.toLocaleString()}</p>
                  <p className="text-xs text-muted">Completion Tokens</p>
                </div>
                <div className="bg-white/50 dark:bg-dark-hover/30 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-primary">{aggregated.totalTokens.toLocaleString()}</p>
                  <p className="text-xs text-muted">Total Tokens</p>
                </div>
              </div>
              {!anyAi && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  AI extraction was unavailable — no tokens were consumed
                </p>
              )}
            </div>
          );
        })()}

      <div className="grid grid-cols-2 gap-4 mb-6">
        {transformedResumes.map((baseResume) => {
          const resume = editedResumes.get(baseResume.id) || baseResume;
          return (
            <div key={resume.id} className="glass-card p-5 col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-violet-600 flex items-center justify-center text-white text-sm font-semibold">
                  {resume.candidateName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate" title={resume.candidateName}>
                    {resume.candidateName}
                  </p>
                  <p className="text-xs text-muted truncate" title={resume.originalFileName}>
                    {resume.originalFileName}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                  Ready
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="glass-card-hover p-4 text-left rounded-xl transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center mb-2.5">
                    <svg className="w-4 h-4 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-primary mb-0.5">Preview</p>
                  <p className="text-xs text-muted">View the formatted resume before exporting</p>
                </button>

                <button
                  onClick={() => handleExportDocx(resume)}
                  className="glass-card-hover p-4 text-left rounded-xl transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center mb-2.5">
                    <svg className="w-4 h-4 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-primary mb-0.5">Download DOCX</p>
                  <p className="text-xs text-muted">Editable Word document</p>
                </button>

                <button
                  onClick={() => handleExportPdf(resume)}
                  className="glass-card-hover p-4 text-left rounded-xl transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mb-2.5">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-primary mb-0.5">Export PDF</p>
                  <p className="text-xs text-muted">Print-ready PDF format</p>
                </button>

                <button
                  onClick={() => handleSyncToATS(resume)}
                  disabled={!canUploadToATS || uploadingToATS.has(resume.id) || uploadedToATS.has(resume.id)}
                  className={`p-4 text-left rounded-xl transition-all ${
                    canUploadToATS && !uploadingToATS.has(resume.id) && !uploadedToATS.has(resume.id)
                      ? 'glass-card-hover'
                      : 'glass-card opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center mb-2.5">
                    {uploadingToATS.has(resume.id) ? (
                      <svg className="w-4 h-4 text-accent-600 dark:text-accent-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : uploadedToATS.has(resume.id) ? (
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-primary mb-0.5">
                    {uploadingToATS.has(resume.id)
                      ? 'Uploading...'
                      : uploadedToATS.has(resume.id)
                      ? 'Uploaded ✓'
                      : sourceType === 'ats-candidates'
                      ? 'Upload to ATS'
                      : sourceType === 'employees'
                      ? 'Upload to Profile'
                      : 'Save to Cloud'}
                  </p>
                  <p className="text-xs text-muted">
                    {!canUploadToATS
                      ? 'Select a candidate or employee to enable upload'
                      : uploadedToATS.has(resume.id)
                      ? 'Resume successfully uploaded to the ATS'
                      : sourceType === 'ats-candidates'
                      ? 'Sync the enhanced resume back to the ATS'
                      : sourceType === 'employees'
                      ? 'Update the employee profile with the enhanced resume'
                      : 'Save a copy to cloud storage'}
                  </p>
                </button>

                <button
                  onClick={() => handlePresentToPosition(resume)}
                  disabled={!canPresent}
                  className={`p-4 text-left rounded-xl transition-all ${canPresent ? 'glass-card-hover' : 'glass-card opacity-50 cursor-not-allowed'}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center mb-2.5">
                    <svg className="w-4 h-4 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-primary mb-0.5">Present to Position</p>
                  <p className="text-xs text-muted">
                    {!selectedPosition
                      ? 'No position selected'
                      : canPresent
                      ? 'Present this candidate to the selected position'
                      : 'Candidate already presented'}
                  </p>
                </button>

                <button
                  onClick={handlePresentCandidate}
                  className="glass-card-hover p-4 text-left rounded-xl transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2.5">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-primary mb-0.5">Build Presentation</p>
                  <p className="text-xs text-muted">Create an email presentation for this candidate</p>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">Save Session</p>
            <p className="text-xs text-muted">Save your progress to resume later from Session History</p>
          </div>
          <button
            onClick={() => setShowSaveSessionModal(true)}
            disabled={savingSession}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-accent-600 dark:text-accent-400 border border-accent-500 rounded-xl hover:bg-accent-500/10 transition-colors disabled:opacity-50"
          >
            {savingSession ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : savedSessionId ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Update Session
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Session
              </>
            )}
          </button>
        </div>
        {savedSessionId && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Session saved — you can find it in Session History
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200/30 dark:border-dark-border/30">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Start Over
        </button>
        <button
          onClick={() => navigate('/resume')}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Complete
        </button>
      </div>
    </div>
  );
}
