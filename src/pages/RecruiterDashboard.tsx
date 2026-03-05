import { useState, useCallback, useMemo } from 'react';
import { StructuredResume, AISuggestion, ValidationResult } from '../types';
import { sampleResumes } from '../data/mockResumes';
import ResumeEditor from '../components/ResumeEditor';
import OriginalResumeDrawer from '../components/OriginalResumeDrawer';
import ValidationPanel from '../components/ValidationPanel';
import PdfPreviewPanel from '../components/PdfPreviewPanel';
import { validationService } from '../services/validationService';
import { aiService } from '../services/aiService';
import { pdfExportService } from '../services/pdfExportService';

export default function RecruiterDashboard() {
  const [resumes] = useState<StructuredResume[]>(sampleResumes);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(resumes[0]?.id || null);
  const [editedResumes, setEditedResumes] = useState<Map<string, StructuredResume>>(new Map());
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  const selectedResume = useMemo(() => {
    if (!selectedResumeId) return null;
    return editedResumes.get(selectedResumeId) || resumes.find((r) => r.id === selectedResumeId);
  }, [selectedResumeId, resumes, editedResumes]);

  const filteredResumes = useMemo(() => {
    return resumes.filter((resume) => {
      const matchesStatus = filterStatus === 'all' || resume.status === filterStatus;
      const matchesSearch =
        !searchQuery ||
        resume.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resume.originalFileName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [resumes, filterStatus, searchQuery]);

  const completeness = useMemo(() => {
    if (!selectedResume) {
      return { percentage: 0, filledFields: 0, totalFields: 0, missingFields: [] };
    }
    return validationService.getCompleteness(selectedResume);
  }, [selectedResume]);

  const handleUpdateResume = useCallback(
    (updatedResume: StructuredResume) => {
      setEditedResumes((prev) => {
        const newMap = new Map(prev);
        newMap.set(updatedResume.id, updatedResume);
        return newMap;
      });
    },
    []
  );

  const handleRequestAISuggestion = useCallback(
    async (sectionType: string, sectionId?: string, text?: string) => {
      if (!text) return;
      setIsGeneratingSuggestions(true);
      try {
        const suggestions = await aiService.generateSuggestions(text, sectionType);
        const newSuggestion: AISuggestion = {
          id: `sug-${Date.now()}`,
          sectionType,
          sectionId,
          originalText: text,
          suggestions,
        };
        setAiSuggestions((prev) => [
          ...prev.filter(
            (s) => !(s.sectionType === sectionType && s.sectionId === sectionId)
          ),
          newSuggestion,
        ]);
      } finally {
        setIsGeneratingSuggestions(false);
      }
    },
    []
  );

  const handleSelectSuggestion = useCallback(
    (suggestionId: string, optionIndex: number) => {
      setAiSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId ? { ...s, selectedIndex: optionIndex } : s
        )
      );

      const suggestion = aiSuggestions.find((s) => s.id === suggestionId);
      if (suggestion && selectedResume) {
        const selectedOption = suggestion.suggestions[optionIndex];
        if (selectedOption) {
          const updatedResume = { ...selectedResume };

          if (suggestion.sectionType === 'summary') {
            updatedResume.summary = selectedOption.text;
          } else if (suggestion.sectionType === 'experience' && suggestion.sectionId) {
            updatedResume.experience = updatedResume.experience.map((exp) =>
              exp.id === suggestion.sectionId
                ? { ...exp, description: selectedOption.text }
                : exp
            );
          }

          handleUpdateResume(updatedResume);
        }
      }
    },
    [aiSuggestions, selectedResume, handleUpdateResume]
  );

  const handleValidate = useCallback(async () => {
    if (!selectedResume) return;
    setIsValidating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const results = validationService.validateResume(selectedResume);
      setValidationResults(results);
    } finally {
      setIsValidating(false);
    }
  }, [selectedResume]);

  const handleExportPdf = useCallback(async () => {
    if (!selectedResume) return;
    await pdfExportService.downloadPdf(selectedResume, `${selectedResume.candidateName}_Resume.pdf`);
  }, [selectedResume]);

  const handleApprove = useCallback(() => {
    if (!selectedResume) return;
    const updated = { ...selectedResume, status: 'approved' as const };
    handleUpdateResume(updated);
    alert('Resume approved successfully!');
  }, [selectedResume, handleUpdateResume]);

  const handleReject = useCallback(() => {
    if (!selectedResume) return;
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      const updated = { ...selectedResume, status: 'rejected' as const };
      handleUpdateResume(updated);
      alert('Resume rejected.');
    }
  }, [selectedResume, handleUpdateResume]);

  const getStatusBadge = (status: StructuredResume['status']) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100/80 dark:bg-dark-muted/30 text-gray-600 dark:text-gray-400',
      transforming: 'bg-accent-100/80 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400',
      transformed: 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
      reviewing: 'bg-purple-100/80 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
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
      <header className="glass-nav sticky top-14 z-30">
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
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
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
                    className="glass-input w-full pl-9 pr-3 py-2 text-sm"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
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
                  <div
                    key={resume.id}
                    onClick={() => {
                      setSelectedResumeId(resume.id);
                      setValidationResults([]);
                      setAiSuggestions([]);
                    }}
                    className={`p-3 border-b border-gray-100/30 dark:border-dark-border/20 cursor-pointer transition-all ${
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
                        <h4 className="text-sm font-medium text-primary truncate">
                          {resume.candidateName}
                        </h4>
                        <p className="text-xs text-muted truncate">
                          {resume.originalFileName}
                        </p>
                        <div className="mt-1">{getStatusBadge(resume.status)}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredResumes.length === 0 && (
                  <div className="p-8 text-center">
                    <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-muted">No resumes found</p>
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
                        <div className="mb-4 p-3 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/30 rounded-xl flex items-center gap-3">
                          <svg className="w-4 h-4 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
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
                          />
                          <div className="mt-4">
                            <button
                              onClick={() => setIsDrawerOpen(true)}
                              className="glass-card-hover w-full flex items-center justify-center gap-2 p-3 text-sm text-secondary"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
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
                    No Resume Selected
                  </h3>
                  <p className="text-xs text-muted">
                    Select a resume from the list to start reviewing
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
    </div>
  );
}
