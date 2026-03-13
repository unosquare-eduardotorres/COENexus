import { useState, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import ResumeEditor from '../components/ResumeEditor';
import PdfPreviewPanel from '../components/PdfPreviewPanel';
import ValidationPanel from '../components/ValidationPanel';
import StepperBar from '../components/shared/StepperBar';
import { aiService } from '../services/aiService';
import { validationService } from '../services/validationService';
import { fileExtractionService } from '../services/fileExtractionService';
import { templateFillService } from '../services/templateFillService';
import { pdfExportService } from '../services/pdfExportService';
import {
  StructuredResume,
  ATSCandidate,
  ATSPosition,
  PresentedCandidate,
  RefinementMode,
  ResumeSourceType,
  ProcessingMode,
  AISuggestion,
  ValidationResult,
  ResumeProcessingMetrics,
} from '../types';
import { mockATSCandidates } from '../data/mockATSCandidates';

type StepKey = 'processing' | 'select' | 'refinement' | 'job-description' | 'review' | 'save';
type ReviewViewMode = 'editor' | 'resume' | 'split' | 'original';

const STEP_ICONS: Record<StepKey, ReactNode> = {
  processing: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  select: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  refinement: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  'job-description': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.64-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  review: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  save: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
};

const SESSION_KEY = 'resume-enhance-state';

interface PersistedWizardState {
  currentStepKey: StepKey;
  completedSteps: StepKey[];
  processingMode: ProcessingMode;
  sourceType: ResumeSourceType;
  refinementMode: RefinementMode;
  jobDescriptionSource: 'positions' | 'custom';
  customJobDescription: string;
  selectedCandidateId: string | null;
  selectedPositionId: string | null;
  fileNames: string[];
}


function PositionDetailsModal({
  position,
  onClose,
}: {
  position: ATSPosition;
  onClose: () => void;
}) {
  const getStatusColor = (status: PresentedCandidate['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'reviewing':
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200/50 dark:border-dark-border/50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">{position.title}</h2>
              <p className="text-sm text-muted mt-0.5">{position.accountName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Position ID</label>
              <p className="text-sm text-primary font-mono">{position.id}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Status</label>
              <span
                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  position.status === 'interviewing'
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : position.status === 'active'
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400'
                }`}
              >
                {position.status.charAt(0).toUpperCase() + position.status.slice(1)}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Account Name</label>
              <p className="text-sm text-primary">{position.accountName}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Stakeholder</label>
              <p className="text-sm text-primary">{position.stakeholder}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Vertical</label>
              <p className="text-sm text-primary">{position.vertical}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Rate Range</label>
              <p className="text-sm text-primary">${position.minRate}/hr - ${position.maxRate}/hr</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-2">Seniorities</label>
            <div className="flex flex-wrap gap-1.5">
              {position.seniorities.map((seniority) => (
                <span
                  key={seniority}
                  className="px-2 py-1 text-xs font-medium bg-accent-100 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400 rounded-lg"
                >
                  {seniority}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-2">Required Skills</label>
            <div className="flex flex-wrap gap-1.5">
              {position.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400 rounded-lg"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-3">
              Candidates Presented ({position.candidatesPresented.length})
            </label>
            {position.candidatesPresented.length === 0 ? (
              <p className="text-sm text-muted italic">No candidates presented yet</p>
            ) : (
              <div className="space-y-2">
                {position.candidatesPresented.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold text-xs">
                        {candidate.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{candidate.name}</p>
                        <p className="text-xs text-muted">
                          Presented {new Date(candidate.presentedDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-primary">${candidate.rate}/hr</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                        {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200/50 dark:border-dark-border/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function OriginalDocxViewer({ fileUrl }: { fileUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    setIsLoading(true);
    (async () => {
      const res = await fetch(fileUrl);
      const arrayBuffer = await res.arrayBuffer();
      const docxPreview = await import('docx-preview');
      await docxPreview.renderAsync(arrayBuffer, container, undefined, {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
      });
      setIsLoading(false);
    })();
  }, [fileUrl]);

  return (
    <div>
      {isLoading && <div className="flex items-center justify-center py-12 text-muted text-xs">Loading preview…</div>}
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-gray-200/30 dark:border-dark-border/30 bg-white overflow-auto"
        style={{ maxHeight: '80vh' }}
      />
    </div>
  );
}

export default function TransformPage() {
  const navigate = useNavigate();

  const [currentStepKey, setCurrentStepKey] = useState<StepKey>('processing');
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('single');
  const [sourceType, setSourceType] = useState<ResumeSourceType>('upload');
  const [refinementMode, setRefinementMode] = useState<RefinementMode>('professional-polish');
  const [jobDescriptionSource, setJobDescriptionSource] = useState<'positions' | 'custom'>('custom');
  const [customJobDescription, setCustomJobDescription] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<ATSCandidate | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<ATSPosition | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformProgress, setTransformProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
  } | null>(null);
  const [transformedResumes, setTransformedResumes] = useState<StructuredResume[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [modalPosition, setModalPosition] = useState<ATSPosition | null>(null);

  const [editedResumes, setEditedResumes] = useState<Map<string, StructuredResume>>(new Map());
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [activeExportResume, setActiveExportResume] = useState<StructuredResume | null>(null);
  const [claudeConnected, setClaudeConnected] = useState<boolean | null>(null);
  const [showFallbackWarning, setShowFallbackWarning] = useState(false);
  const [processingMetrics, setProcessingMetrics] = useState<ResumeProcessingMetrics[]>([]);
  const [reviewViewMode, setReviewViewMode] = useState<ReviewViewMode>('editor');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [generatedDocx, setGeneratedDocx] = useState<Blob | null>(null);
  const [showEnhancerModal, setShowEnhancerModal] = useState(false);
  const [enhancerMode, setEnhancerMode] = useState<RefinementMode>('professional-polish');
  const [originalResume, setOriginalResume] = useState<StructuredResume | null>(null);
  const [showWarningsModal, setShowWarningsModal] = useState(false);
  const [showEnhanceWarningModal, setShowEnhanceWarningModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadTargetResume, setDownloadTargetResume] = useState<StructuredResume | null>(null);

  const stepLabels = useMemo(() => {
    const base: { key: StepKey; title: string }[] = [
      { key: 'processing', title: 'Processing Mode' },
      { key: 'select', title: 'Select Resume(s)' },
      { key: 'refinement', title: 'Enhancement Mode' },
    ];
    if (refinementMode === 'job-tailoring') {
      base.push({ key: 'job-description', title: 'Job Description' });
    }
    base.push(
      { key: 'review', title: 'Review' },
      { key: 'save', title: 'Save / Export' }
    );
    return base.map((s) => ({ ...s, icon: STEP_ICONS[s.key] }));
  }, [refinementMode]);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const state: PersistedWizardState = JSON.parse(saved);
      setProcessingMode(state.processingMode);
      setSourceType(state.sourceType);
      setRefinementMode(state.refinementMode);
      setJobDescriptionSource(state.jobDescriptionSource);
      setCustomJobDescription(state.customJobDescription);
      setCompletedSteps(new Set(state.completedSteps));

      if (state.selectedCandidateId) {
        const candidate = mockATSCandidates.find((c) => c.id === state.selectedCandidateId);
        if (candidate) {
          setSelectedCandidate(candidate);
          if (state.selectedPositionId) {
            const position = candidate.positions.find((p) => p.id === state.selectedPositionId);
            if (position) setSelectedPosition(position);
          }
        }
      }

      if (state.sourceType === 'upload' && state.fileNames.length > 0 && state.currentStepKey !== 'processing') {
        setCurrentStepKey('select');
      } else {
        setCurrentStepKey(state.currentStepKey);
      }
    } catch { /* ignore parse errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const state: PersistedWizardState = {
      currentStepKey,
      completedSteps: [...completedSteps],
      processingMode,
      sourceType,
      refinementMode,
      jobDescriptionSource,
      customJobDescription,
      selectedCandidateId: selectedCandidate?.id || null,
      selectedPositionId: selectedPosition?.id || null,
      fileNames: selectedFiles.map((f) => f.name),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }, [currentStepKey, completedSteps, processingMode, sourceType, refinementMode, jobDescriptionSource, customJobDescription, selectedCandidate, selectedPosition, selectedFiles]);

  useEffect(() => {
    window.location.hash = currentStepKey;
  }, [currentStepKey]);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '') as StepKey;
      const validKeys: StepKey[] = stepLabels.map((s) => s.key);
      if (validKeys.includes(hash)) {
        setCurrentStepKey(hash);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [stepLabels]);

  useEffect(() => {
    aiService.checkConnection().then(setClaudeConnected);
  }, []);

  const activeResume = useMemo((): StructuredResume | null => {
    const targetId = activeResumeId || transformedResumes[0]?.id || null;
    if (!targetId) return null;
    return editedResumes.get(targetId) || transformedResumes.find((r) => r.id === targetId) || null;
  }, [activeResumeId, editedResumes, transformedResumes]);

  const getResumeWarnings = useCallback((resume: StructuredResume): string[] => {
    const warnings: string[] = [];
    if (!resume.summary?.trim()) warnings.push('No profile summary found');
    if (!resume.experience[0]?.title?.trim()) warnings.push('No role found in work experience');
    if (resume.experience.some(e => !e.company?.trim())) warnings.push('Missing company name in work experience');
    if (resume.experience.some(e => !e.description?.trim())) warnings.push('Missing work experience description');
    if (resume.skills.flatMap(c => c.skills).length === 0) warnings.push('No technical skills found');
    if (!resume.cloudSkills?.length && !resume.templateSkills?.some(s => /azure|aws|gcp|cloud/i.test(s))) warnings.push('No AI cloud skills or tools found');
    if (resume.education.length === 0) warnings.push('No academic background found');
    return warnings;
  }, []);

  const resumeWarnings = useMemo(() =>
    activeResume ? getResumeWarnings(activeResume) : [],
    [activeResume, getResumeWarnings]
  );

  const completeness = useMemo(() => {
    if (!activeResume) return { percentage: 0, filledFields: 0, totalFields: 0, missingFields: [] };
    return validationService.getCompleteness(activeResume);
  }, [activeResume]);

  const filteredCandidates = useMemo(
    () =>
      mockATSCandidates.filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
          candidate.email?.toLowerCase().includes(candidateSearch.toLowerCase())
      ),
    [candidateSearch]
  );

  const isCandidateAlreadyPresented = useCallback(
    (position: ATSPosition) => {
      if (!selectedCandidate) return false;
      return position.candidatesPresented.some(
        (presented) => presented.name.toLowerCase() === selectedCandidate.name.toLowerCase()
      );
    },
    [selectedCandidate]
  );

  const canPresent = selectedPosition !== null && !isCandidateAlreadyPresented(selectedPosition);

  const canProceedFromStep2 =
    (sourceType === 'upload' && selectedFiles.length > 0) ||
    (sourceType === 'ats-candidates' && selectedCandidate !== null);

  const getNextStepKey = useCallback(
    (current: StepKey): StepKey | null => {
      const keys = stepLabels.map((s) => s.key);
      const idx = keys.indexOf(current);
      return idx >= 0 && idx < keys.length - 1 ? keys[idx + 1] : null;
    },
    [stepLabels]
  );

  const getPrevStepKey = useCallback(
    (current: StepKey): StepKey | null => {
      const keys = stepLabels.map((s) => s.key);
      const idx = keys.indexOf(current);
      return idx > 0 ? keys[idx - 1] : null;
    },
    [stepLabels]
  );

  const handleNext = useCallback(() => {
    const next = getNextStepKey(currentStepKey);
    if (next) {
      setCompletedSteps((prev) => new Set([...prev, currentStepKey]));
      setCurrentStepKey(next);
    }
  }, [currentStepKey, getNextStepKey]);

  const handleBack = useCallback(() => {
    const prev = getPrevStepKey(currentStepKey);
    if (prev) setCurrentStepKey(prev);
  }, [currentStepKey, getPrevStepKey]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setError(null);
    setTransformedResumes([]);
  }, []);

  const handleCandidateSelect = useCallback((candidate: ATSCandidate) => {
    setSelectedCandidate(candidate);
    setSelectedPosition(null);
    setError(null);
    setTransformedResumes([]);
  }, []);

  const executeTransform = useCallback(async () => {
    if (sourceType === 'ats-candidates' && !selectedCandidate) return;
    if (sourceType === 'upload' && selectedFiles.length === 0) return;

    setIsTransforming(true);
    setError(null);
    setTransformedResumes([]);

    const results: StructuredResume[] = [];
    const allMetrics: ResumeProcessingMetrics[] = [];

    const jobDescription =
      refinementMode === 'job-tailoring'
        ? jobDescriptionSource === 'custom'
          ? customJobDescription
          : selectedPosition?.title
        : undefined;

    if (sourceType === 'ats-candidates' && selectedCandidate) {
      setTransformProgress({
        current: 1,
        total: 1,
        currentFile: `${selectedCandidate.name}'s resume`,
      });

      try {
        const mockContent = `Resume for ${selectedCandidate.name}\nEmail: ${selectedCandidate.email}\nPhone: ${selectedCandidate.phone}`;
        const { resume, metrics } = await aiService.transformResume(
          mockContent,
          `${selectedCandidate.name.replace(/\s+/g, '_')}_resume.pdf`,
          refinementMode,
          jobDescription
        );
        allMetrics.push(metrics);

        if (selectedPosition && refinementMode === 'job-tailoring') {
          resume.summary = `${resume.summary} Targeting position: ${selectedPosition.title}`;
        }

        results.push(resume);
      } catch {
        setError('Failed to enhance resume. Please try again.');
      }
    } else {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setTransformProgress({
          current: i + 1,
          total: selectedFiles.length,
          currentFile: file.name,
        });

        try {
          const content = await fileExtractionService.extractText(file);
          const { resume, metrics } = await aiService.transformResume(content, file.name, refinementMode, jobDescription);
          resume.originalFileUrl = URL.createObjectURL(file);
          results.push(resume);
          allMetrics.push(metrics);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setError(`Failed to process ${file.name}: ${message}`);
        }
      }
    }

    setTransformedResumes(results);
    if (results.length > 0) {
      setOriginalResume(structuredClone(results[0]));
    }
    setProcessingMetrics(allMetrics);
    if (results.length > 0) {
      templateFillService.fillTemplate(results[0]).then(setGeneratedDocx).catch(() => {});
    }
    setTransformProgress(null);
    setIsTransforming(false);
  }, [sourceType, selectedCandidate, selectedPosition, selectedFiles, refinementMode, jobDescriptionSource, customJobDescription]);

  const handleTransform = useCallback(() => {
    if (claudeConnected === false) {
      setShowFallbackWarning(true);
    } else {
      executeTransform();
    }
  }, [claudeConnected, executeTransform]);

  const handleUpdateResume = useCallback((updatedResume: StructuredResume) => {
    setEditedResumes((prev) => {
      const newMap = new Map(prev);
      newMap.set(updatedResume.id, updatedResume);
      return newMap;
    });
    templateFillService.fillTemplate(updatedResume).then(setGeneratedDocx).catch(() => {});
  }, []);

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
      if (suggestion && activeResume) {
        const selectedOption = suggestion.suggestions[optionIndex];
        if (selectedOption) {
          const updatedResume = { ...activeResume };

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
    [aiSuggestions, activeResume, handleUpdateResume]
  );

  const getFileName = useCallback(
    (resume: StructuredResume, ext: string): string => {
      const name = resume.candidateName.replace(/\s+/g, '_');
      if (refinementMode === 'job-tailoring') {
        if (jobDescriptionSource === 'positions' && selectedPosition) {
          return `Resume_${name}_-_${selectedPosition.id}_-_${selectedPosition.accountName}.${ext}`;
        }
        return `Resume_${name}_-_Custom_OP.${ext}`;
      }
      return `Resume_${name}.${ext}`;
    },
    [refinementMode, jobDescriptionSource, selectedPosition]
  );

  const handleExportDocx = useCallback(async () => {
    const resumeToExport = activeExportResume || activeResume;
    if (!resumeToExport) return;
    try {
      const docxBlob = await templateFillService.fillTemplate(resumeToExport);
      const url = URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFileName(resumeToExport, 'docx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX export error:', err);
    }
  }, [activeExportResume, activeResume, getFileName]);

  const handleDownload = useCallback((resume: StructuredResume) => {
    if (generatedDocx) {
      const url = URL.createObjectURL(generatedDocx);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFileName(resume, 'docx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const content = JSON.stringify(resume, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFileName(resume, 'json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [getFileName, generatedDocx]);

  const handlePresentToPosition = useCallback(
    (resume: StructuredResume) => {
      if (selectedPosition && isCandidateAlreadyPresented(selectedPosition)) {
        alert('This candidate was already presented for this position.');
        return;
      }
      alert(
        `Resume for ${resume.candidateName} would be presented to ${selectedPosition?.title || 'the position'}. (Demo feature)`
      );
    },
    [selectedPosition, isCandidateAlreadyPresented]
  );

  const handleEnhanceResume = useCallback(async () => {
    if (!activeResume) return;
    if (!originalResume) {
      setOriginalResume(structuredClone(activeResume));
    }
    setIsEnhancing(true);
    try {
      const { resume: enhanced, usage } = await aiService.enhanceFullResume(activeResume, enhancerMode);
      handleUpdateResume(enhanced);
      templateFillService.fillTemplate(enhanced).then(setGeneratedDocx).catch(() => {});
      if (usage) {
        setProcessingMetrics(prev => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.totalTokens = {
            promptTokens: (last.totalTokens?.promptTokens ?? 0) + usage.promptTokens,
            completionTokens: (last.totalTokens?.completionTokens ?? 0) + usage.completionTokens,
            totalTokens: (last.totalTokens?.totalTokens ?? 0) + usage.totalTokens,
          };
          updated[updated.length - 1] = last;
          return updated;
        });
      }
    } catch (err) {
      console.error('Enhancement failed:', err);
      setError('AI enhancement failed. You can still edit manually.');
    } finally {
      setIsEnhancing(false);
    }
  }, [activeResume, enhancerMode, handleUpdateResume, originalResume]);

  const handleEnhanceClick = useCallback(() => {
    if (resumeWarnings.length > 0) {
      setShowEnhanceWarningModal(true);
    } else {
      handleEnhanceResume();
    }
  }, [resumeWarnings, handleEnhanceResume]);

  const handleSyncToATS = useCallback((resume: StructuredResume) => {
    alert(`Resume for ${resume.candidateName} would be synced/uploaded to the ATS. (Demo feature)`);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedFiles([]);
    setSelectedCandidate(null);
    setSelectedPosition(null);
    setTransformedResumes([]);
    setError(null);
    setCandidateSearch('');
    setModalPosition(null);
    setProcessingMode('single');
    setSourceType('upload');
    setRefinementMode('professional-polish');
    setJobDescriptionSource('custom');
    setCustomJobDescription('');
    setIsTransforming(false);
    setTransformProgress(null);
    setEditedResumes(new Map());
    setActiveResumeId(null);
    setAiSuggestions([]);
    setValidationResults([]);
    setIsGeneratingSuggestions(false);
    setReviewViewMode('editor');
    setIsEnhancing(false);
    setGeneratedDocx(null);
    setShowEnhancerModal(false);
    setEnhancerMode('professional-polish');
    setOriginalResume(null);
    setShowPreviewModal(false);
    setShowUnsavedWarning(false);
    setHasSaved(false);
    setActiveExportResume(null);
    setCurrentStepKey('processing');
    setCompletedSteps(new Set());
    setProcessingMetrics([]);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const handleNextFromStep3 = useCallback(() => {
    const nextStep: StepKey = refinementMode === 'job-tailoring' ? 'job-description' : 'review';
    setCompletedSteps((prev) => new Set([...prev, 'refinement']));
    setCurrentStepKey(nextStep);
    if (refinementMode !== 'job-tailoring') {
      handleTransform();
    }
  }, [refinementMode, handleTransform]);

  const handleStepClick = useCallback((stepKey: StepKey) => {
    setCurrentStepKey(stepKey);
  }, []);

  const refinementModeLabel = (mode: RefinementMode) => {
    switch (mode) {
      case 'professional-polish': return 'Professional Polish';
      case 'impact-focused': return 'Impact-Focused';
      case 'ats-optimized': return 'ATS-Optimized';
      case 'job-tailoring': return 'Job Description Tailoring';
    }
  };

  const enhancerModeLabel = (mode: RefinementMode): string => {
    switch (mode) {
      case 'professional-polish': return 'Professional Polish';
      case 'impact-focused': return 'Impact-Focused';
      case 'ats-optimized': return 'ATS-Optimized';
      default: return 'Professional Polish';
    }
  };

  const stepSummaries = useMemo(() => {
    const map: Partial<Record<StepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('processing')) {
      map.processing = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        label: processingMode === 'single' ? 'Single Resume' : 'Batch Processing',
      };
    }

    if (completedSteps.has('select')) {
      const selectIcon = sourceType === 'upload' ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ) : sourceType === 'employees' ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
      map.select = {
        icon: selectIcon,
        label: sourceType === 'upload' ? 'Manual Upload' : sourceType === 'employees' ? 'Employees' : 'ATS Candidates',
      };
    }

    if (completedSteps.has('refinement')) {
      const modeIcon = refinementMode === 'professional-polish' ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ) : refinementMode === 'impact-focused' ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ) : refinementMode === 'ats-optimized' ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
      map.refinement = {
        icon: modeIcon,
        label: refinementModeLabel(refinementMode) || '',
      };
    }

    if (completedSteps.has('job-description')) {
      map['job-description'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        label: jobDescriptionSource === 'custom'
          ? 'Custom JD'
          : selectedPosition
          ? `${selectedPosition.id} — ${selectedPosition.accountName}`
          : 'Open Position',
      };
    }

    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSteps, processingMode, sourceType, refinementMode, jobDescriptionSource, selectedPosition]);

  return (
    <div className="min-h-screen py-8">
      <div className={`${currentStepKey === 'review' ? 'max-w-[1400px]' : 'max-w-4xl'} mx-auto px-6`}>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-primary tracking-tight">Enhance Resumes</h1>
          <p className="text-sm text-muted mt-1 max-w-xl">
            Upload resumes or select a candidate from your ATS. AI will enhance them into your standardized format.
          </p>
        </div>

        {claudeConnected !== null && (
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl mb-5 text-xs font-medium ${
            claudeConnected
              ? 'bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20'
              : 'bg-amber-50/80 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20'
          }`}>
          <span className={`w-2 h-2 rounded-full ${
            claudeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`} />
          {claudeConnected
            ? 'Claude Max connected — AI-powered extraction active'
            : 'Claude Max not detected — fallback extraction will be used'}
          {!claudeConnected && (
            <button
              onClick={() => aiService.checkConnection().then(setClaudeConnected)}
              className="ml-auto underline hover:no-underline"
            >
              Retry
            </button>
          )}
          </div>
        )}

        <StepperBar
          stepLabels={stepLabels}
          currentStepKey={currentStepKey}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          stepSummaries={stepSummaries}
        />

        {currentStepKey === 'processing' && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-base font-semibold text-primary mb-1">Choose Processing Mode</h2>
            <p className="text-sm text-muted mb-5">Select how you want to process resumes in this session.</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setProcessingMode('single')}
                className={`relative glass-card-hover p-6 text-left transition-all rounded-xl ${
                  processingMode === 'single'
                    ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
                    : 'border border-transparent'
                }`}
              >
                {processingMode === 'single' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-primary mb-1">Single Resume</h3>
                <p className="text-xs text-muted">Enhance one resume at a time with full control</p>
              </button>

              <div className="relative">
                <div className="glass-card p-6 text-left rounded-xl border-2 border-transparent opacity-50 cursor-not-allowed select-none">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-hover flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-primary mb-1">Batch Processing</h3>
                  <p className="text-xs text-muted">Process multiple resumes simultaneously</p>
                </div>
                <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-dark-border text-gray-500 dark:text-gray-400 rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {currentStepKey === 'select' && (
          <div className="glass-card overflow-hidden mb-6">
            <div className="flex border-b border-gray-200/50 dark:border-dark-border/50">
              <button
                onClick={() => setSourceType('upload')}
                className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
                  sourceType === 'upload'
                    ? 'text-accent-600 dark:text-accent-400 bg-accent-50/50 dark:bg-accent-500/10'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Manual Upload
                </div>
                {sourceType === 'upload' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500" />
                )}
              </button>

              <button
                onClick={() => setSourceType('employees')}
                className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
                  sourceType === 'employees'
                    ? 'text-accent-600 dark:text-accent-400 bg-accent-50/50 dark:bg-accent-500/10'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  Employees
                </div>
                {sourceType === 'employees' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500" />
                )}
              </button>

              <button
                disabled
                className="flex-1 px-6 py-3.5 text-sm font-medium transition-all relative text-gray-500 dark:text-gray-400 opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  ATS / Candidates
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-dark-border text-gray-500 dark:text-gray-400 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </button>
            </div>

            <div className="p-6">
              {sourceType === 'upload' && (
                <FileUpload
                  onFilesSelected={handleFilesSelected}
                  acceptedFormats={['.pdf', '.docx', '.doc', '.txt']}
                  multiple={processingMode !== 'single'}
                  maxFiles={processingMode === 'single' ? 1 : 20}
                  maxSizeMB={10}
                />
              )}

              {sourceType === 'employees' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dark-hover flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-primary mb-2">Internal Employee Directory</h3>
                  <p className="text-xs text-muted max-w-xs">
                    API integration required — Connect your HR system to browse and select employee resumes directly.
                  </p>
                </div>
              )}

              {sourceType === 'ats-candidates' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Select Candidate</label>
                    <div className="relative mb-3">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search candidates by name or email..."
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl border border-gray-200/50 dark:border-dark-border/50 p-2">
                      {filteredCandidates.length === 0 ? (
                        <p className="text-sm text-muted text-center py-4">No candidates found</p>
                      ) : (
                        filteredCandidates.map((candidate) => (
                          <button
                            key={candidate.id}
                            onClick={() => handleCandidateSelect(candidate)}
                            className={`w-full text-left p-3 rounded-lg transition-all ${
                              selectedCandidate?.id === candidate.id
                                ? 'bg-accent-50 dark:bg-accent-500/15 border-2 border-accent-500'
                                : 'bg-white/50 dark:bg-dark-hover/30 border-2 border-transparent hover:bg-white/80 dark:hover:bg-dark-hover/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold text-sm">
                                {candidate.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-primary truncate">{candidate.name}</h4>
                                <p className="text-xs text-muted truncate">{candidate.email}</p>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {candidate.skills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400 rounded"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-xs text-muted">
                                {candidate.positions.length} position{candidate.positions.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {selectedCandidate && (
                    <div className="p-4 bg-accent-50/50 dark:bg-accent-500/10 rounded-xl border border-accent-200/50 dark:border-accent-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-accent-500/15 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold">
                          {selectedCandidate.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-primary">{selectedCandidate.name}</h4>
                          <p className="text-xs text-muted">
                            {selectedCandidate.email} • {selectedCandidate.phone}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCandidate(null);
                            setSelectedPosition(null);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex justify-between">
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
                disabled={!canProceedFromStep2}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {currentStepKey === 'refinement' && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-base font-semibold text-primary mb-1">Enhancement Mode</h2>
            <p className="text-sm text-muted mb-5">Choose how you want to enhance this resume.</p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setRefinementMode('professional-polish')}
                className={`relative glass-card-hover p-5 text-left transition-all rounded-xl ${
                  refinementMode === 'professional-polish'
                    ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
                    : 'border border-transparent'
                }`}
              >
                {refinementMode === 'professional-polish' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-primary mb-1">AI Enhancer</h3>
                <p className="text-xs text-muted leading-relaxed">
                  AI will automatically refine, restructure, and enhance the resume using professional standards.
                </p>
              </button>

              <button
                onClick={() => setRefinementMode('job-tailoring')}
                className={`relative glass-card-hover p-5 text-left transition-all rounded-xl ${
                  refinementMode === 'job-tailoring'
                    ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
                    : 'border border-transparent'
                }`}
              >
                {refinementMode === 'job-tailoring' && (
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
                <h3 className="text-sm font-bold text-primary mb-1">Job Description Tailoring</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Reshape the resume to emphasize the most relevant experience for a specific role. Provide a job description in the next step.
                </p>
              </button>
            </div>

            <div className="flex justify-between mt-6">
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
                onClick={handleNextFromStep3}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
              >
                {refinementMode === 'job-tailoring' ? (
                  <>
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    Enhance{' '}
                    {sourceType === 'ats-candidates' && selectedCandidate
                      ? `${selectedCandidate.name}'s Resume`
                      : `${selectedFiles.length} Resume${selectedFiles.length !== 1 ? 's' : ''}`}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {currentStepKey === 'job-description' && (
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
                <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-dark-border text-gray-500 dark:text-gray-400 rounded-full">
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
                onClick={() => {
                  handleTransform();
                  setCompletedSteps((prev) => new Set([...prev, 'job-description']));
                  setCurrentStepKey('review');
                }}
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
        )}

        {currentStepKey === 'review' && (
          <div className="mb-6">
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
                  onClick={handleTransform}
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
                              <p className="text-xs font-medium text-primary truncate">{resume.candidateName}</p>
                              <p className="text-[10px] text-muted truncate">{resume.originalFileName}</p>
                            </div>
                          </div>
                          <span className="mt-2 inline-block px-2 py-0.5 bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium rounded-full">Ready</span>
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
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {resumeWarnings.length > 0 && (
                          <button
                            onClick={() => setShowWarningsModal(true)}
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
                          onClick={() => setShowEnhancerModal(true)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-lg hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {enhancerModeLabel(enhancerMode)}
                        </button>
                        <button
                          onClick={handleEnhanceClick}
                          disabled={isEnhancing}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                        >
                          {isEnhancing ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                            </svg>
                          )}
                          {isEnhancing ? 'Enhancing...' : 'Enhance Resume'}
                        </button>
                      </div>
                    </div>

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
                    </div>

                    {validationResults.length > 0 && (
                      <div className="mt-4">
                        <ValidationPanel results={validationResults} completeness={completeness} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-6">
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
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {currentStepKey === 'save' && (
          <div className="mb-6">
            {processingMetrics.length > 0 && (() => {
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
                      <p className="text-[11px] text-muted">Prompt Tokens</p>
                    </div>
                    <div className="bg-white/50 dark:bg-dark-hover/30 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-primary">{aggregated.completionTokens.toLocaleString()}</p>
                      <p className="text-[11px] text-muted">Completion Tokens</p>
                    </div>
                    <div className="bg-white/50 dark:bg-dark-hover/30 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-primary">{aggregated.totalTokens.toLocaleString()}</p>
                      <p className="text-[11px] text-muted">Total Tokens</p>
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {resume.candidateName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{resume.candidateName}</p>
                      <p className="text-xs text-muted truncate">{resume.originalFileName}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                      Ready
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setActiveExportResume(resume); setShowPreviewModal(true); }}
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
                      onClick={() => { setDownloadTargetResume(resume); setShowDownloadModal(true); }}
                      className="glass-card-hover p-4 text-left rounded-xl transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center mb-2.5">
                        <svg className="w-4 h-4 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-primary mb-0.5">Download</p>
                      <p className="text-xs text-muted">Choose format and download</p>
                    </button>

                    <button
                      onClick={() => { handleSyncToATS(resume); setHasSaved(true); }}
                      className="glass-card-hover p-4 text-left rounded-xl transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center mb-2.5">
                        <svg className="w-4 h-4 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-primary mb-0.5">
                        {sourceType === 'ats-candidates' ? 'Upload to ATS' : sourceType === 'employees' ? 'Upload to Profile' : 'Save to Cloud'}
                      </p>
                      <p className="text-xs text-muted">
                        {sourceType === 'ats-candidates'
                          ? 'Sync the enhanced resume back to the ATS'
                          : sourceType === 'employees'
                          ? 'Update the employee profile with the enhanced resume'
                          : 'Save a copy to cloud storage'}
                      </p>
                    </button>

                    <button
                      onClick={() => { handlePresentToPosition(resume); setHasSaved(true); }}
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
                  </div>
                </div>
              );
              })}
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
                onClick={() => {
                  if (!hasSaved) {
                    setShowUnsavedWarning(true);
                  } else {
                    sessionStorage.removeItem(SESSION_KEY);
                    navigate('/resume');
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Complete
              </button>
            </div>
          </div>
        )}
      </div>

      {modalPosition && (
        <PositionDetailsModal
          position={modalPosition}
          onClose={() => setModalPosition(null)}
        />
      )}

      {showPreviewModal && activeExportResume && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200/30 dark:border-dark-border/30">
              <h2 className="text-sm font-semibold text-primary">Resume Preview</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PdfPreviewPanel resume={activeExportResume} />
            </div>
          </div>
        </div>
      )}

      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-primary mb-2">Unsaved Changes</h3>
            <p className="text-sm text-muted mb-5">You haven't downloaded or uploaded this resume yet. If you continue, your changes may be lost.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowUnsavedWarning(false); sessionStorage.removeItem(SESSION_KEY); navigate('/resume'); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnhancerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-primary mb-4">Select Enhancement Mode</h3>
            <div className="space-y-3">
              <button
                onClick={() => { setEnhancerMode('professional-polish'); setShowEnhancerModal(false); }}
                className={`relative w-full p-4 text-left rounded-xl transition-all glass-card-hover ${
                  enhancerMode === 'professional-polish'
                    ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
                    : 'border border-transparent'
                }`}
              >
                {enhancerMode === 'professional-polish' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <h4 className="text-sm font-semibold text-primary mb-0.5">Professional Polish</h4>
                <p className="text-xs text-muted">Improves clarity, grammar, and professional tone</p>
              </button>
              <button
                onClick={() => { setEnhancerMode('impact-focused'); setShowEnhancerModal(false); }}
                className={`relative w-full p-4 text-left rounded-xl transition-all glass-card-hover ${
                  enhancerMode === 'impact-focused'
                    ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
                    : 'border border-transparent'
                }`}
              >
                {enhancerMode === 'impact-focused' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <h4 className="text-sm font-semibold text-primary mb-0.5">Impact-Focused</h4>
                <p className="text-xs text-muted">Transforms responsibility-focused to achievement-focused language</p>
              </button>
              <button
                onClick={() => { setEnhancerMode('ats-optimized'); setShowEnhancerModal(false); }}
                className={`relative w-full p-4 text-left rounded-xl transition-all glass-card-hover ${
                  enhancerMode === 'ats-optimized'
                    ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-card bg-accent-50/80 dark:bg-accent-500/15'
                    : 'border border-transparent'
                }`}
              >
                {enhancerMode === 'ats-optimized' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <h4 className="text-sm font-semibold text-primary mb-0.5">ATS-Optimized</h4>
                <p className="text-xs text-muted">Maximizes ATS compatibility through keyword optimization</p>
              </button>
            </div>
            <div className="flex justify-end mt-5">
              <button
                onClick={() => setShowEnhancerModal(false)}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showFallbackWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary">Claude Max Not Available</h3>
                <p className="text-xs text-muted">AI-powered extraction is offline</p>
              </div>
            </div>
            <p className="text-sm text-secondary mb-5 leading-relaxed">
              The Claude Max proxy is not running. Processing will use fallback methods (regex-based extraction) which may produce less accurate results.
            </p>
            <p className="text-xs text-muted mb-5">
              To enable AI extraction, start your Claude Max proxy (e.g. <code className="px-1 py-0.5 bg-gray-100 dark:bg-dark-hover rounded text-[11px]">claude-max-api-proxy</code>) and click Retry.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFallbackWarning(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  aiService.checkConnection().then((connected) => {
                    setClaudeConnected(connected);
                    if (connected) {
                      setShowFallbackWarning(false);
                      executeTransform();
                    }
                  });
                }}
                className="px-4 py-2.5 text-sm font-medium text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-500/10 rounded-xl hover:bg-accent-100 dark:hover:bg-accent-500/20 transition-colors"
              >
                Retry Connection
              </button>
              <button
                onClick={() => { setShowFallbackWarning(false); executeTransform(); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {showWarningsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-primary mb-3">Missing Resume Information</h3>
            <ul className="space-y-2 mb-5">
              {resumeWarnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {w}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowWarningsModal(false)} className="w-full px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {showEnhanceWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-primary mb-2">Missing Information Warning</h3>
            <p className="text-sm text-muted mb-4">Some required information is missing from this resume. Enhancement results may be incomplete.</p>
            <ul className="space-y-1.5 mb-5">
              {resumeWarnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-secondary">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {w}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEnhanceWarningModal(false)} className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors">
                Cancel
              </button>
              <button onClick={() => { setShowEnhanceWarningModal(false); handleEnhanceResume(); }} className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-xl hover:bg-purple-600 transition-colors">
                Enhance Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {showDownloadModal && downloadTargetResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-primary mb-1">Download Resume</h3>
            <p className="text-xs text-muted mb-4">Choose your preferred format</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  handleDownload(downloadTargetResume);
                  setHasSaved(true);
                  setShowDownloadModal(false);
                  setDownloadTargetResume(null);
                }}
                className="glass-card-hover p-5 rounded-xl text-center transition-all group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-primary mb-0.5">DOCX</p>
                <p className="text-[11px] text-muted">Word document using Unosquare template</p>
              </button>
              <button
                onClick={() => {
                  pdfExportService.downloadPdf(downloadTargetResume);
                  setHasSaved(true);
                  setShowDownloadModal(false);
                  setDownloadTargetResume(null);
                }}
                className="glass-card-hover p-5 rounded-xl text-center transition-all group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-primary mb-0.5">PDF</p>
                <p className="text-[11px] text-muted">Print-ready format via browser</p>
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setShowDownloadModal(false); setDownloadTargetResume(null); }}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
