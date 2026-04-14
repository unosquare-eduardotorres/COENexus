import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useTransformWizard } from './useTransformWizard';

const mockNavigate = vi.fn();
const mockShowToast = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useLocation: () => ({ pathname: '/resume/enhance', search: '', hash: '' }),
}));

vi.mock('../../../shared/components/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('../services/aiService', () => ({
  aiService: {
    checkConnection: vi.fn().mockResolvedValue(true),
    generateSuggestions: vi.fn().mockResolvedValue([]),
    transformResume: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services/sessionService', () => ({
  sessionService: {
    listSessions: vi.fn().mockResolvedValue([]),
    loadSession: vi.fn().mockResolvedValue(null),
    saveSession: vi.fn().mockResolvedValue({ id: 1 }),
    deleteSession: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/validationService', () => ({
  validationService: {
    validateResume: vi.fn().mockReturnValue([]),
    getCompleteness: vi.fn().mockReturnValue({
      percentage: 0,
      filledFields: 0,
      totalFields: 0,
      missingFields: [],
    }),
  },
}));

vi.mock('../services/matchEngineService', () => ({
  matchEngineService: {
    searchCandidates: vi.fn().mockResolvedValue([]),
    searchEmployees: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/pdfExportService', () => ({
  pdfExportService: {
    generatePdf: vi.fn().mockResolvedValue(new Blob()),
  },
}));

vi.mock('../services/templateFillService', () => ({
  templateFillService: {
    generateDocx: vi.fn().mockResolvedValue(new Blob()),
  },
}));

vi.mock('../utils/rendererLogger', () => ({
  createRendererLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('./transform/useTransformSession', () => ({
  useTransformSession: () => ({
    currentStepKey: 'intent',
    setCurrentStepKey: vi.fn(),
    completedSteps: new Set(),
    setCompletedSteps: vi.fn(),
    savedSessionId: null,
    setSavedSessionId: vi.fn(),
    savingSession: vi.fn(),
    setSavingSession: vi.fn(),
    showSaveSessionModal: false,
    setShowSaveSessionModal: vi.fn(),
    isSavingSession: false,
    setIsSavingSession: vi.fn(),
    sessionSaved: false,
    setSessionSaved: vi.fn(),
    savedSessionName: '',
    setSavedSessionName: vi.fn(),
    pendingSessionName: null,
    setPendingSessionName: vi.fn(),
    hasSaved: false,
    setHasSaved: vi.fn(),
    history: {
      sessionCount: 0,
      showHistoryPage: false,
      setShowHistoryPage: vi.fn(),
      historySessions: [],
      navigate: vi.fn(),
    },
    getStepLabels: vi.fn().mockReturnValue({}),
    getNextStepKey: vi.fn(),
    getPrevStepKey: vi.fn(),
    goToStep: vi.fn(),
    handleStepClick: vi.fn(),
    handleNext: vi.fn(),
    handleBack: vi.fn(),
    handleNextFromStep3: vi.fn(),
    defaultSessionName: vi.fn().mockReturnValue('Transform Session'),
    loadSessionFromUrl: vi.fn().mockResolvedValue(undefined),
  }),
  StepKey: {},
}));

vi.mock('./transform/useTransformSearch', () => ({
  useTransformSearch: () => ({
    selection: {
      selectedCandidate: null,
      setSelectedCandidate: vi.fn(),
      selectedEmployee: null,
      setSelectedEmployee: vi.fn(),
      selectedFiles: [],
      setSelectedFiles: vi.fn(),
      candidateSearch: '',
      setCandidateSearch: vi.fn(),
      employeeSearch: '',
      setEmployeeSearch: vi.fn(),
      filteredCandidates: [],
      filteredEmployees: [],
      handleFilesSelected: vi.fn(),
      handleCandidateSelect: vi.fn(),
      handleEmployeeSelect: vi.fn(),
      canProceedFromStep2: false,
    },
    search: {
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchResults: [],
      isSearching: false,
      liveCandidates: [],
    },
  }),
}));

vi.mock('./transform/useTransformPipeline', () => ({
  useTransformPipeline: () => ({
    isTransforming: false,
    setIsTransforming: vi.fn(),
    transformProgress: 0,
    setTransformProgress: vi.fn(),
    transformedResumes: [],
    setTransformedResumes: vi.fn(),
    processingMetrics: null,
    setProcessingMetrics: vi.fn(),
    error: null,
    setError: vi.fn(),
    editedResumes: new Map(),
    setEditedResumes: vi.fn(),
    activeResumeId: null,
    setActiveResumeId: vi.fn(),
    activeResume: null,
    handleUpdateResume: vi.fn(),
    executeTransform: vi.fn(),
    isEnhancing: false,
    setIsEnhancing: vi.fn(),
    enhancerMode: 'professional-polish',
    setEnhancerMode: vi.fn(),
    originalResume: null,
    setOriginalResume: vi.fn(),
    resumeWarnings: [],
    handleEnhanceResume: vi.fn(),
    handleEnhanceClick: vi.fn(),
    confirmReEnhance: vi.fn(),
    showEnhanceWarningModal: false,
    setShowEnhanceWarningModal: vi.fn(),
    showReEnhanceConfirm: false,
    setShowReEnhanceConfirm: vi.fn(),
  }),
}));

vi.mock('./transform/useTransformExport', () => ({
  useTransformExport: () => ({
    export: {
      generatedDocx: null,
      setGeneratedDocx: vi.fn(),
      showDownloadModal: false,
      setShowDownloadModal: vi.fn(),
      downloadTargetResume: null,
      setDownloadTargetResume: vi.fn(),
      activeExportResume: null,
      setActiveExportResume: vi.fn(),
      handleExportDocx: vi.fn(),
      handleExportPdf: vi.fn(),
      handleDownload: vi.fn(),
      handlePresentToPosition: vi.fn(),
    },
    ats: {
      uploadingToATS: false,
      setUploadingToATS: vi.fn(),
      uploadedToATS: false,
      setUploadedToATS: vi.fn(),
      canUploadToATS: false,
      canPresent: false,
      handleSyncToATS: vi.fn(),
      isCandidateAlreadyPresented: vi.fn().mockReturnValue(false),
      getStatusColor: vi.fn().mockReturnValue(''),
    },
    misc: {
      getFileName: vi.fn().mockReturnValue('resume'),
      refinementModeLabel: vi.fn().mockReturnValue('Professional Polish'),
    },
  }),
}));

vi.mock('./transform/useTransformValidation', () => ({
  useTransformValidation: () => ({
    review: {
      handleRequestAISuggestion: vi.fn(),
      handleSelectSuggestion: vi.fn(),
      completeness: { percentage: 0, filledFields: 0, totalFields: 0, missingFields: [] },
    },
    validation: {
      validationResults: [],
      validationCollapsed: false,
      setValidationCollapsed: vi.fn(),
      validationFilter: null,
      setValidationFilter: vi.fn(),
      showValidationNotice: false,
      setShowValidationNotice: vi.fn(),
      validationHighlight: null,
    },
    suggestions: {
      aiSuggestions: [],
      setAiSuggestions: vi.fn(),
      isGeneratingSuggestions: false,
    },
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useTransformWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default compositor state', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.intent.processingMode).toBe('single');
    expect(result.current.intent.sourceType).toBe('upload');
    expect(result.current.refinement.refinementMode).toBe('professional-polish');
  });

  it('should expose session sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.session).toBeDefined();
    expect(result.current.wizard.currentStepKey).toBe('intent');
  });

  it('should expose search sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.search).toBeDefined();
    expect(result.current.search.searchQuery).toBe('');
  });

  it('should expose transform sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.transform).toBeDefined();
    expect(result.current.transform.isTransforming).toBe(false);
  });

  it('should expose export sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.export).toBeDefined();
    expect(result.current.export.generatedDocx).toBeNull();
  });

  it('should expose validation sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.validation).toBeDefined();
    expect(result.current.validation.validationResults).toEqual([]);
  });

  it('should update processing mode', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.intent.setProcessingMode('batch');
    });

    expect(result.current.intent.processingMode).toBe('batch');
  });

  it('should update source type', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.intent.setSourceType('ats-candidates');
    });

    expect(result.current.intent.sourceType).toBe('ats-candidates');
  });

  it('should update refinement mode', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.refinement.setRefinementMode('impact-focused');
    });

    expect(result.current.refinement.refinementMode).toBe('impact-focused');
  });

  it('should manage review view mode', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.review.setReviewViewMode('split');
    });

    expect(result.current.review.reviewViewMode).toBe('split');
  });

  it('should provide step summaries', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.wizard.stepSummaries).toBeDefined();
  });

  it('should provide wizard step labels', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.wizard.stepLabels).toBeDefined();
  });
});
