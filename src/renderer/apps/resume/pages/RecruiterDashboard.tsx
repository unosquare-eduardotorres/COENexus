import { useEffect } from 'react';
import { StructuredResume } from '../types';
import ResumeEditor from '../components/ResumeEditor';
import OriginalResumeDrawer from '../components/OriginalResumeDrawer';
import ValidationPanel from '../components/ValidationPanel';
import PdfPreviewPanel from '../components/PdfPreviewPanel';
import { DocumentIcon, SearchIcon, SpinnerIcon } from '../../../shared/components/icons';
import { useRecruiterDashboard } from '../hooks/useRecruiterDashboard';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('RecruiterDashboard');

interface RejectResumeModalProps {
  candidateName: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function RejectResumeModal({
  candidateName,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: RejectResumeModalProps) {
  const canConfirm = reason.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" role="presentation">
      <div
        className="glass-card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-resume-title"
      >
        <h3 id="reject-resume-title" className="text-base font-semibold text-primary">
          Reject Resume
        </h3>
        <p className="text-sm text-muted mt-1.5">
          Provide a reason for rejecting {candidateName}&apos;s resume.
        </p>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={4}
          className="glass-input w-full mt-4 resize-none text-sm"
          placeholder="Add rejection reason"
        />
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reject Resume
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecruiterDashboard() {
  const {
    resumes: { resumes, filteredResumes, selectedResumeId, setSelectedResumeId, selectedResume, editedResumes },
    filter: { filterStatus, setFilterStatus, searchQuery, setSearchQuery },
    review: { handleUpdateResume, handleRequestAISuggestion, handleSelectSuggestion, aiSuggestions, isGeneratingSuggestions },
    validation: { validationResults, validationFilter, setValidationFilter, handleValidate, isValidating, completeness },
    actions: { handleExportPdf, handleApprove, handleReject },
    ui: { isDrawerOpen, setIsDrawerOpen, showPreview, setShowPreview },
    reject: { showRejectModal, setShowRejectModal, rejectReason, setRejectReason, handleConfirmReject },
  } = useRecruiterDashboard();

  useEffect(() => {
    log.info('Recruiter dashboard viewed');
  }, []);

  const isGenerating = isGeneratingSuggestions;
  const recruiterLiveMessage = isGenerating
    ? 'Generating AI suggestions for the selected resume.'
    : isValidating
    ? 'Validating selected resume.'
    : validationResults.length > 0
    ? `Validation complete. ${validationResults.length} checks available.`
    : '';

  const getStatusBadge = (status: StructuredResume['status']) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100/80 dark:bg-dark-muted/30 text-gray-700 dark:text-gray-300',
      transforming: 'bg-accent-100/80 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400',
      transformed: 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
      reviewing: 'bg-violet-100/80 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400',
      approved: 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      rejected: 'bg-red-100/80 dark:bg-red-500/20 text-red-700 dark:text-red-400',
      exported: 'bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
    };
    return (
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
          styles[status] || styles.pending
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {recruiterLiveMessage}
      </div>
      <header className="glass-nav sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-primary">Resume Review</h1>
              <p className="text-xs text-muted">
                Review and approve transformed resumes
              </p>
            </div>
            {selectedResume && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`glass-button flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                    showPreview ? 'text-accent-600 dark:text-accent-400' : 'text-secondary'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="glass-button flex items-center gap-2 px-3 py-1.5 text-sm text-secondary disabled:opacity-50"
                >
                  {isValidating ? (
                    <SpinnerIcon size="sm" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Validate
                </button>
                <button
                  onClick={handleReject}
                  className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30 rounded-xl hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-1.5 text-sm bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          <aside className="w-72 flex-shrink-0">
            <div className="glass-card overflow-hidden sticky top-32">
              <div className="p-4 border-b border-gray-200/30 dark:border-dark-border/30">
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    aria-label="Search resumes by candidate name or file name"
                    className="glass-input w-full pl-9 pr-3 py-2 text-sm"
                  />
                  <SearchIcon size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="glass-select w-full px-3 py-2 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="transformed">Transformed</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
                {filteredResumes.map((resume) => (
                  <button
                    key={resume.id}
                    type="button"
                    onClick={() => {
                      log.info('Recruiter resume selected', { resumeId: resume.id });
                      setSelectedResumeId(resume.id);
                      setValidationResults([]);
                      setAiSuggestions([]);
                    }}
                    className={`appearance-none bg-transparent border-none p-3 text-left w-full border-b border-gray-100/30 dark:border-dark-border/20 transition-all ${
                      selectedResumeId === resume.id
                        ? 'bg-accent-50/50 dark:bg-accent-500/10 border-l-2 border-l-accent-500'
                        : 'hover:bg-white/50 dark:hover:bg-dark-hover/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold text-xs flex-shrink-0">
                        {resume.candidateName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-primary truncate" title={resume.candidateName}>
                          {resume.candidateName}
                        </h4>
                        <p className="text-xs text-muted truncate" title={resume.originalFileName}>
                          {resume.originalFileName}
                        </p>
                        <div className="mt-1">{getStatusBadge(resume.status)}</div>
                      </div>
                    </div>
                  </button>
                ))}

                {filteredResumes.length === 0 && (
                  <div className="p-8 text-center">
                    <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-muted">No resumes loaded</p>
                    <p className="text-xs text-muted mt-1">Use the Transform page to process resumes.</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {selectedResume ? (
              <div className="flex gap-6">
                <div className="flex-1 min-w-0 transition-all duration-300">
                  <div className="flex gap-6">
                    <div className="flex-1 min-w-0">
                      {isGeneratingSuggestions && (
                        <div
                          className="mb-4 p-3 bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-800/30 rounded-xl flex items-center gap-3"
                          role="status"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          <SpinnerIcon size="sm" className="text-violet-500" />
                          <span className="text-sm text-violet-600 dark:text-violet-400 font-medium">
                            Generating AI suggestions...
                          </span>
                        </div>
                      )}
                      <ResumeEditor
                        resume={selectedResume}
                        onUpdate={handleUpdateResume}
                        onRequestAISuggestion={handleRequestAISuggestion}
                        aiSuggestions={aiSuggestions}
                        onSelectSuggestion={handleSelectSuggestion}
                      />
                    </div>

                    {!showPreview && (
                      <aside className="w-72 flex-shrink-0">
                        <div className="sticky top-32">
                          <ValidationPanel
                            results={validationResults}
                            completeness={completeness}
                            activeFilter={validationFilter}
                            onFilterChange={setValidationFilter}
                          />
                          <div className="mt-4">
                            <button
                              onClick={() => setIsDrawerOpen(true)}
                              className="glass-card-hover w-full flex items-center justify-center gap-2 p-3 text-sm text-secondary"
                            >
                              <DocumentIcon size="sm" />
                              View Original
                            </button>
                          </div>
                        </div>
                      </aside>
                    )}
                  </div>
                </div>

                {showPreview && (
                  <div className="w-[520px] flex-shrink-0 transition-all duration-300">
                    <div className="sticky top-32 space-y-4">
                      <div className="h-[calc(100vh-280px)]">
                        <PdfPreviewPanel
                          resume={selectedResume}
                          onExport={handleExportPdf}
                        />
                      </div>
                      <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-xs font-medium text-primary">{completeness.percentage}%</span>
                            </div>
                            <div className="h-3 w-px bg-gray-200 dark:bg-dark-border" />
                            <div className="flex items-center gap-2 text-xs text-muted">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                {validationResults.filter(r => r.status === 'error').length}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {validationResults.filter(r => r.status === 'warning').length}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {validationResults.filter(r => r.status === 'valid').length}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="text-xs text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 font-medium"
                          >
                            View Original
                          </button>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              completeness.percentage >= 90 ? 'bg-emerald-500' :
                              completeness.percentage >= 70 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${completeness.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card flex items-center justify-center h-80">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-sm font-medium text-secondary mb-1">
                    No Resumes Loaded
                  </h3>
                  <p className="text-xs text-muted">
                    Use the Transform page to process resumes.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedResume && (
        <OriginalResumeDrawer
          isOpen={isDrawerOpen}
          onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
          originalContent={selectedResume.originalContent}
          originalFileName={selectedResume.originalFileName}
          originalFileType={selectedResume.originalFileType}
        />
      )}
      {showRejectModal && selectedResume && (
        <RejectResumeModal
          candidateName={selectedResume.candidateName}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onCancel={() => {
            setShowRejectModal(false);
            setRejectReason('');
          }}
          onConfirm={handleConfirmReject}
        />
      )}
    </div>
  );
}
