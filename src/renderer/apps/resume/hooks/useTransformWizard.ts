import { createElement, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { useToast } from '../../../shared/components/ToastContext';
import { aiService } from '../services/aiService';
import { sessionService } from '../services/sessionService';
import { useTransformExport } from './transform/useTransformExport';
import { useTransformPipeline } from './transform/useTransformPipeline';
import { StepKey, useTransformSession } from './transform/useTransformSession';
import { useTransformSearch } from './transform/useTransformSearch';
import { useTransformValidation } from './transform/useTransformValidation';
import { ATSCandidate, ATSPosition, BenchEmployee, RefinementMode, ResumeSourceType } from '../types';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('useTransformWizard');

type ReviewViewMode = 'editor' | 'resume' | 'split' | 'original' | 'checks';

const createIcon = (paths: string[], className = 'w-4 h-4'): ReactNode =>
  createElement(
    'svg',
    { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
    ...paths.map((d) =>
      createElement('path', {
        key: d,
        d,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 1.5,
      }),
    ),
  );

const STEP_SUMMARY_ICONS = {
  intent: createIcon(['M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'], 'w-3 h-3'),
  upload: createIcon(['M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'], 'w-3 h-3'),
  employees: createIcon(['M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'], 'w-3 h-3'),
  candidates: createIcon(['M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'], 'w-3 h-3'),
};

const enhancerModeLabel = (mode: RefinementMode): string => {
  switch (mode) {
    case 'professional-polish':
      return 'Professional Polish';
    case 'job-tailoring':
      return 'Job Description Tailoring';
    default:
      return 'Professional Polish';
  }
};

export function useTransformWizard(
  navigateArg?: NavigateFunction,
  showToastArg?: (message: string, type: string) => void,
) {
  const navigateFromHook = useNavigate();
  const { showToast: showToastFromContext } = useToast();
  const navigate = navigateArg ?? navigateFromHook;
  const showToast = showToastArg ?? showToastFromContext;

  const [processingMode, setProcessingMode] = useState<'single' | 'batch'>('single');
  const [sourceType, setSourceType] = useState<ResumeSourceType>('upload');
  const [refinementMode, setRefinementMode] = useState<RefinementMode>('professional-polish');
  const [jobDescriptionSource, setJobDescriptionSource] = useState<'positions' | 'custom'>('positions');
  const [customJobDescription, setCustomJobDescription] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<ATSPosition | null>(null);
  const [reviewViewMode, setReviewViewMode] = useState<ReviewViewMode>('editor');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showEnhancerModal, setShowEnhancerModal] = useState(false);
  const [showWarningsModal, setShowWarningsModal] = useState(false);
  const [showFallbackWarning, setShowFallbackWarning] = useState(false);
  const [modalPosition, setModalPosition] = useState<ATSPosition | null>(null);
  const [claudeConnected, setClaudeConnected] = useState<boolean | null>(null);
  const [generatedDocx, setGeneratedDocx] = useState<Blob | null>(null);

  const session = useTransformSession(navigate);
  const search = useTransformSearch({ sourceType });

  const isCandidateAlreadyPresented = useCallback((position: ATSPosition) => {
    const selectedCandidate = search.selection.selectedCandidate;
    if (!selectedCandidate) return false;
    return position.candidatesPresented.some((presented) => {
      return presented.name.toLowerCase() === selectedCandidate.name.toLowerCase();
    });
  }, [search.selection.selectedCandidate]);

  const pipeline = useTransformPipeline({
    sourceType,
    selectedCandidate: search.selection.selectedCandidate,
    selectedEmployee: search.selection.selectedEmployee,
    selectedPosition,
    selectedFiles: search.selection.selectedFiles,
    liveCandidates: search.search.liveCandidates,
    refinementMode,
    jobDescriptionSource,
    customJobDescription,
    onDocxGenerated: setGeneratedDocx,
  });

  const exportCtl = useTransformExport({
    activeResume: pipeline.activeResume,
    sourceType,
    selectedCandidate: search.selection.selectedCandidate,
    selectedPosition,
    refinementMode,
    jobDescriptionSource,
    isCandidateAlreadyPresented,
    showToast,
    setError: pipeline.setError,
    generatedDocx,
    setGeneratedDocx,
  });

  const validation = useTransformValidation({
    activeResume: pipeline.activeResume,
    currentStepKey: session.currentStepKey,
    onUpdateResume: pipeline.handleUpdateResume,
  });

  const stepLabels = useMemo(() => session.getStepLabels(refinementMode), [refinementMode, session]);

  const stepSummaries = useMemo(() => {
    const map: Partial<Record<StepKey, { icon: ReactNode; label: string } | null>> = {};
    if (session.completedSteps.has('intent')) {
      map.intent = {
        icon: STEP_SUMMARY_ICONS.intent,
        label: 'Enhance Resume',
      };
    }

    if (session.completedSteps.has('select')) {
      map.select = {
        icon:
          sourceType === 'upload'
            ? STEP_SUMMARY_ICONS.upload
            : sourceType === 'employees'
              ? STEP_SUMMARY_ICONS.employees
              : STEP_SUMMARY_ICONS.candidates,
        label: sourceType === 'upload' ? 'Manual Upload' : sourceType === 'employees' ? 'Employees' : 'ATS Candidates',
      };
    }

    if (session.completedSteps.has('refinement')) {
      map.refinement = {
        icon: stepLabels.find((step) => step.key === 'refinement')?.icon ?? null,
        label: exportCtl.misc.refinementModeLabel(refinementMode),
      };
    }

    if (session.completedSteps.has('job-description')) {
      map['job-description'] = {
        icon: stepLabels.find((step) => step.key === 'job-description')?.icon ?? null,
        label:
          jobDescriptionSource === 'custom'
            ? 'Custom JD'
            : selectedPosition
              ? `${selectedPosition.id} — ${selectedPosition.accountName}`
              : 'Open Position',
      };
    }
    return map;
  }, [jobDescriptionSource, refinementMode, selectedPosition, session.completedSteps, sourceType, stepLabels, exportCtl.misc]);

  const defaultSessionName = useMemo(() => {
    return session.defaultSessionName(
      sourceType,
      refinementMode,
      search.selection.selectedCandidate?.name ?? null,
      search.selection.selectedEmployee?.name ?? null,
      search.selection.selectedFiles[0]?.name,
    );
  }, [
    refinementMode,
    search.selection.selectedCandidate?.name,
    search.selection.selectedEmployee?.name,
    search.selection.selectedFiles,
    session,
    sourceType,
  ]);

  const handleFilesSelected = useCallback((files: File[]) => {
    log.info('Transform files selected', { count: files.length });
    search.selection.handleFilesSelected(files);
    pipeline.setError(null);
    pipeline.setTransformedResumes([]);
  }, [pipeline, search.selection]);

  const handleCandidateSelect = useCallback((candidate: ATSCandidate) => {
    log.info('Transform candidate selected', { candidateId: candidate.id, upstreamId: candidate.upstreamId });
    search.selection.handleCandidateSelect(candidate);
    setSelectedPosition(null);
    pipeline.setError(null);
    pipeline.setTransformedResumes([]);
  }, [pipeline, search.selection]);

  const handleEmployeeSelect = useCallback((employee: BenchEmployee) => {
    log.info('Transform employee selected', { upstreamId: employee.upstreamId });
    search.selection.handleEmployeeSelect(employee);
    pipeline.setError(null);
    pipeline.setTransformedResumes([]);
  }, [pipeline, search.selection]);

  const handleNext = useCallback(() => {
    log.info('Transform next step requested', { fromStep: session.currentStepKey });
    session.handleNext(refinementMode);
  }, [refinementMode, session]);

  const handleBack = useCallback(() => {
    log.info('Transform previous step requested', { fromStep: session.currentStepKey });
    session.handleBack(refinementMode);
  }, [refinementMode, session]);

  const executeTransform = useCallback(async () => {
    log.info('Transform execution started', {
      sourceType,
      refinementMode,
      selectedFileCount: search.selection.selectedFiles.length,
      hasCandidate: Boolean(search.selection.selectedCandidate),
      hasEmployee: Boolean(search.selection.selectedEmployee),
    });
    try {
      await pipeline.executeTransform();
      log.info('Transform execution completed');
    } catch (err) {
      log.error('Transform execution failed', err);
      throw err;
    }
  }, [pipeline, refinementMode, search.selection.selectedCandidate, search.selection.selectedEmployee, search.selection.selectedFiles.length, sourceType]);

  const handleTransform = useCallback(() => {
    log.info('Transform requested', { claudeConnected });
    if (claudeConnected === false) setShowFallbackWarning(true);
    else session.setShowSaveSessionModal(true);
  }, [claudeConnected, session]);

  const handleSaveAndEnhance = useCallback((sessionName: string) => {
    log.info('Transform save-and-enhance confirmed', { sessionName });
    session.setPendingSessionName(sessionName);
    session.setSavedSessionName(sessionName);
    session.setShowSaveSessionModal(false);
    void executeTransform();
  }, [executeTransform, session]);

  const handleNextFromStep3 = useCallback(() => {
    session.handleNextFromStep3(refinementMode, handleTransform);
  }, [handleTransform, refinementMode, session]);

  const handleNextFromJobDescription = useCallback(() => {
    session.setCompletedSteps(prev => new Set([...prev, 'job-description']));
    session.setCurrentStepKey('review');
    handleTransform();
  }, [handleTransform, session]);

  const handleSaveSession = useCallback(async () => {
    try {
      log.info('Transform session save requested', {
        sourceType,
        refinementMode,
        transformedResumeCount: pipeline.transformedResumes.length,
      });
      await session.saveSession({
        processingMode,
        sourceType,
        refinementMode,
        jobDescriptionSource,
        customJobDescription,
        selectedCandidateId: search.selection.selectedCandidate?.id ?? null,
        selectedCandidateName: search.selection.selectedCandidate?.name ?? null,
        selectedPositionId: selectedPosition?.id ?? null,
        selectedFileNames: search.selection.selectedFiles.map((f) => f.name),
        transformedResumes: pipeline.transformedResumes,
        editedResumes: pipeline.editedResumes,
      });
      log.info('Transform session save completed');
    } catch (err) {
      log.error('Failed to save session:', err);
      pipeline.setError('Failed to save session');
    }
  }, [
    customJobDescription,
    jobDescriptionSource,
    pipeline,
    processingMode,
    refinementMode,
    search.selection.selectedCandidate,
    search.selection.selectedFiles,
    selectedPosition?.id,
    session,
    sourceType,
  ]);

  const handleReset = useCallback(() => {
    log.info('Transform flow reset');
    search.selection.setSelectedFiles([]);
    search.selection.setSelectedCandidate(null);
    search.selection.setSelectedEmployee(null);
    setSelectedPosition(null);
    pipeline.setTransformedResumes([]);
    pipeline.setError(null);
    search.selection.setCandidateSearch('');
    search.selection.setEmployeeSearch('');
    setModalPosition(null);
    setProcessingMode('single');
    setSourceType('upload');
    setRefinementMode('professional-polish');
    setJobDescriptionSource('custom');
    setCustomJobDescription('');
    pipeline.setIsTransforming(false);
    pipeline.setTransformProgress(null);
    pipeline.setTransformPhase(null);
    pipeline.setEditedResumes(new Map());
    pipeline.setActiveResumeId(null);
    validation.suggestions.setAiSuggestions([]);
    setReviewViewMode('editor');
    pipeline.setIsEnhancing(false);
    setGeneratedDocx(null);
    setShowEnhancerModal(false);
    pipeline.setEnhancerMode('professional-polish');
    pipeline.setOriginalResume(null);
    setShowPreviewModal(false);
    setShowUnsavedWarning(false);
    session.setHasSaved(false);
    exportCtl.export.setActiveExportResume(null);
    session.setCurrentStepKey('intent');
    session.setCompletedSteps(new Set());
    session.history.setShowHistoryPage(false);
    pipeline.setProcessingMetrics([]);
    exportCtl.ats.setUploadingToATS(new Set());
    exportCtl.ats.setUploadedToATS(new Set());
    session.setSavedSessionId(null);
    session.setShowSaveSessionModal(false);
    session.setIsSavingSession(false);
    session.setSessionSaved(false);
    session.setSavedSessionName('');
    session.setPendingSessionName(null);
  }, [exportCtl, pipeline, search.selection, session, validation.suggestions]);

  useEffect(() => {
    aiService.checkConnection()
      .then((connected) => {
        log.info('Transform AI connection checked', { connected });
        setClaudeConnected(connected);
      })
      .catch((error) => {
        log.error('Transform AI connection check failed', error);
        setClaudeConnected(false);
      });
  }, []);

  useEffect(() => {
    void session.loadSessionFromUrl(
      { liveCandidates: search.search.liveCandidates },
      {
        setProcessingMode,
        setSourceType,
        setRefinementMode,
        setJobDescriptionSource,
        setCustomJobDescription,
        setSelectedCandidate: search.selection.setSelectedCandidate,
        setTransformedResumes: pipeline.setTransformedResumes,
        setError: pipeline.setError,
      },
    );
  }, [pipeline, search.search.liveCandidates, search.selection.setSelectedCandidate, session]);

  useEffect(() => {
    if (!session.pendingSessionName || pipeline.transformedResumes.length === 0 || pipeline.isTransforming) return;
    const saveSessionAfterTransform = async () => {
      session.setIsSavingSession(true);
      try {
        const contextType = sourceType === 'ats-candidates' ? 'candidate' : sourceType === 'employees' ? 'employee' : 'upload';
        await sessionService.createSession({
          name: session.pendingSessionName!,
          contextType,
          contextId: search.selection.selectedCandidate ? Number(search.selection.selectedCandidate.upstreamId) : null,
          contextName: search.selection.selectedCandidate?.name ?? search.selection.selectedFiles[0]?.name ?? '',
          processingMode,
          refinementMode,
          jobDescription: refinementMode === 'job-tailoring' ? customJobDescription : null,
          jobDescriptionSource: refinementMode === 'job-tailoring' ? jobDescriptionSource : null,
          selectedPositionId: selectedPosition?.id ?? null,
          resumeContentJson: JSON.stringify(pipeline.transformedResumes),
          status: 'completed',
        });
        log.info('Post-transform session persistence completed', { sessionName: session.pendingSessionName });
        session.setSessionSaved(true);
      } catch (err) {
        log.error('Session save failed:', err);
      } finally {
        session.setIsSavingSession(false);
        session.setPendingSessionName(null);
      }
    };
    void saveSessionAfterTransform();
  }, [
    customJobDescription,
    jobDescriptionSource,
    pipeline.isTransforming,
    pipeline.transformedResumes,
    processingMode,
    refinementMode,
    search.selection.selectedCandidate,
    search.selection.selectedFiles,
    selectedPosition?.id,
    session,
    sourceType,
  ]);

  return {
    wizard: {
      currentStepKey: session.currentStepKey,
      completedSteps: session.completedSteps,
      stepLabels,
      stepSummaries,
      goToStep: session.goToStep,
      canGoToStep: (_key: StepKey) => true,
      handleNext,
      handleBack,
      handleNextFromStep3,
      handleNextFromJobDescription,
      handleStepClick: session.handleStepClick,
    },
    intent: {
      processingMode,
      setProcessingMode,
      sourceType,
      setSourceType,
    },
    selection: {
      selectedCandidate: search.selection.selectedCandidate,
      setSelectedCandidate: search.selection.setSelectedCandidate,
      selectedEmployee: search.selection.selectedEmployee,
      setSelectedEmployee: search.selection.setSelectedEmployee,
      selectedPosition,
      setSelectedPosition,
      selectedFiles: search.selection.selectedFiles,
      setSelectedFiles: search.selection.setSelectedFiles,
      candidateSearch: search.selection.candidateSearch,
      setCandidateSearch: search.selection.setCandidateSearch,
      employeeSearch: search.selection.employeeSearch,
      setEmployeeSearch: search.selection.setEmployeeSearch,
      filteredCandidates: search.selection.filteredCandidates,
      filteredEmployees: search.selection.filteredEmployees,
      handleFilesSelected,
      handleCandidateSelect,
      handleEmployeeSelect,
      canProceedFromStep2: search.selection.canProceedFromStep2,
    },
    refinement: {
      refinementMode,
      setRefinementMode,
      enhancerMode: pipeline.enhancerMode,
      setEnhancerMode: pipeline.setEnhancerMode,
      handleEnhanceClick: pipeline.handleEnhanceClick,
      handleEnhanceResume: pipeline.handleEnhanceResume,
      confirmReEnhance: pipeline.confirmReEnhance,
      enhancerModeLabel,
    },
    jobDescription: {
      customJobDescription,
      setCustomJobDescription,
      jobDescriptionSource,
      setJobDescriptionSource,
      selectedPosition,
      setSelectedPosition,
    },
    transform: {
      isTransforming: pipeline.isTransforming,
      isEnhancing: pipeline.isEnhancing,
      transformPhase: pipeline.transformPhase,
      transformProgress: pipeline.transformProgress,
      transformedResumes: pipeline.transformedResumes,
      setTransformedResumes: pipeline.setTransformedResumes,
      error: pipeline.error,
      setError: pipeline.setError,
      handleTransform,
      executeTransform,
      processingMetrics: pipeline.processingMetrics,
    },
    review: {
      editedResumes: pipeline.editedResumes,
      setEditedResumes: pipeline.setEditedResumes,
      activeResumeId: pipeline.activeResumeId,
      setActiveResumeId: pipeline.setActiveResumeId,
      activeResume: pipeline.activeResume,
      reviewViewMode,
      setReviewViewMode,
      handleUpdateResume: pipeline.handleUpdateResume,
      handleRequestAISuggestion: validation.review.handleRequestAISuggestion,
      handleSelectSuggestion: validation.review.handleSelectSuggestion,
      completeness: validation.review.completeness,
      resumeWarnings: pipeline.resumeWarnings,
    },
    validation: {
      validationResults: validation.validation.validationResults,
      validationCollapsed: validation.validation.validationCollapsed,
      setValidationCollapsed: validation.validation.setValidationCollapsed,
      validationFilter: validation.validation.validationFilter,
      setValidationFilter: validation.validation.setValidationFilter,
      showValidationNotice: validation.validation.showValidationNotice,
      setShowValidationNotice: validation.validation.setShowValidationNotice,
      validationHighlight: validation.validation.validationHighlight,
    },
    suggestions: {
      aiSuggestions: validation.suggestions.aiSuggestions,
      setAiSuggestions: validation.suggestions.setAiSuggestions,
      isGeneratingSuggestions: validation.suggestions.isGeneratingSuggestions,
    },
    session: {
      savedSessionId: session.savedSessionId,
      savingSession: session.savingSession,
      showSaveSessionModal: session.showSaveSessionModal,
      setShowSaveSessionModal: session.setShowSaveSessionModal,
      isSavingSession: session.isSavingSession,
      sessionSaved: session.sessionSaved,
      savedSessionName: session.savedSessionName,
      defaultSessionName,
      setSavedSessionName: session.setSavedSessionName,
      handleSave: handleSaveSession,
      handleSaveSession,
      handleSaveAndEnhance,
      hasSaved: session.hasSaved,
    },
    export: {
      generatedDocx: exportCtl.export.generatedDocx,
      showDownloadModal: exportCtl.export.showDownloadModal,
      setShowDownloadModal: exportCtl.export.setShowDownloadModal,
      downloadTargetResume: exportCtl.export.downloadTargetResume,
      setDownloadTargetResume: exportCtl.export.setDownloadTargetResume,
      activeExportResume: exportCtl.export.activeExportResume,
      setActiveExportResume: exportCtl.export.setActiveExportResume,
      handleExportDocx: exportCtl.export.handleExportDocx,
      handleExportPdf: exportCtl.export.handleExportPdf,
      handleDownload: exportCtl.export.handleDownload,
      handlePresentToPosition: exportCtl.export.handlePresentToPosition,
    },
    modals: {
      showPreviewModal,
      setShowPreviewModal,
      showEnhancerModal,
      setShowEnhancerModal,
      showWarningsModal,
      setShowWarningsModal,
      showEnhanceWarningModal: pipeline.showEnhanceWarningModal,
      setShowEnhanceWarningModal: pipeline.setShowEnhanceWarningModal,
      showReEnhanceConfirm: pipeline.showReEnhanceConfirm,
      setShowReEnhanceConfirm: pipeline.setShowReEnhanceConfirm,
      showFallbackWarning,
      setShowFallbackWarning,
      showUnsavedWarning,
      setShowUnsavedWarning,
      modalPosition,
      setModalPosition,
    },
    claude: {
      claudeConnected,
      setClaudeConnected,
    },
    ats: {
      uploadingToATS: exportCtl.ats.uploadingToATS,
      uploadedToATS: exportCtl.ats.uploadedToATS,
      canUploadToATS: exportCtl.ats.canUploadToATS,
      canPresent: exportCtl.ats.canPresent,
      handleSyncToATS: exportCtl.ats.handleSyncToATS,
      isCandidateAlreadyPresented: exportCtl.ats.isCandidateAlreadyPresented,
      getStatusColor: exportCtl.ats.getStatusColor,
    },
    search: search.search,
    history: session.history,
    misc: {
      handleReset,
      getFileName: exportCtl.misc.getFileName,
      refinementModeLabel: exportCtl.misc.refinementModeLabel,
      originalResume: pipeline.originalResume,
      processingMode,
    },
  };
}
