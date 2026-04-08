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

vi.mock('../components/shared/ToastContext', () => ({
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
    currentStep: 'intent',
    setCurrentStep: vi.fn(),
    sessionId: null,
    sessionName: '',
    setSessionName: vi.fn(),
    sessions: [],
    goToStep: vi.fn(),
    saveSession: vi.fn(),
    loadSession: vi.fn(),
    completedSteps: new Set(),
    markStepComplete: vi.fn(),
  }),
  StepKey: {},
}));

vi.mock('./transform/useTransformSearch', () => ({
  useTransformSearch: () => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    searchResults: [],
    isSearching: false,
    selectedCandidate: null,
    setSelectedCandidate: vi.fn(),
    selectedEmployee: null,
    setSelectedEmployee: vi.fn(),
    uploadedFiles: [],
    handleFileUpload: vi.fn(),
    clearUploadedFiles: vi.fn(),
  }),
}));

vi.mock('./transform/useTransformPipeline', () => ({
  useTransformPipeline: () => ({
    isTransforming: false,
    transformProgress: 0,
    transformedResumes: [],
    activeResume: null,
    setActiveResume: vi.fn(),
    executeTransform: vi.fn(),
    reEnhance: vi.fn(),
  }),
}));

vi.mock('./transform/useTransformExport', () => ({
  useTransformExport: () => ({
    exportDocx: vi.fn(),
    exportPdf: vi.fn(),
    isExporting: false,
    atsUploadStatus: null,
    setAtsUploadStatus: vi.fn(),
  }),
}));

vi.mock('./transform/useTransformValidation', () => ({
  useTransformValidation: () => ({
    validationResults: [],
    completeness: { percentage: 0, filledFields: 0, totalFields: 0, missingFields: [] },
    isValidating: false,
    validate: vi.fn(),
    suggestions: [],
    isGeneratingSuggestions: false,
    generateSuggestions: vi.fn(),
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

    expect(result.current.processingMode).toBe('single');
    expect(result.current.sourceType).toBe('upload');
    expect(result.current.refinementMode).toBe('professional-polish');
  });

  it('should expose session sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.session).toBeDefined();
    expect(result.current.session.currentStep).toBe('intent');
  });

  it('should expose search sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.search).toBeDefined();
    expect(result.current.search.searchQuery).toBe('');
  });

  it('should expose pipeline sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.pipeline).toBeDefined();
    expect(result.current.pipeline.isTransforming).toBe(false);
  });

  it('should expose export sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.exportCtl).toBeDefined();
    expect(result.current.exportCtl.isExporting).toBe(false);
  });

  it('should expose validation sub-hook values', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.validation).toBeDefined();
    expect(result.current.validation.isValidating).toBe(false);
  });

  it('should update processing mode', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setProcessingMode('batch');
    });

    expect(result.current.processingMode).toBe('batch');
  });

  it('should update source type', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setSourceType('ats-candidates');
    });

    expect(result.current.sourceType).toBe('ats-candidates');
  });

  it('should update refinement mode', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setRefinementMode('impact-focused');
    });

    expect(result.current.refinementMode).toBe('impact-focused');
  });

  it('should manage review view mode', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setReviewViewMode('split');
    });

    expect(result.current.reviewViewMode).toBe('split');
  });

  it('should provide step summaries', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.stepSummaries).toBeDefined();
  });

  it('should provide steps array', () => {
    const { result } = renderHook(
      () => useTransformWizard(mockNavigate, mockShowToast),
      { wrapper: createWrapper() },
    );

    expect(result.current.steps).toBeDefined();
    expect(Array.isArray(result.current.steps)).toBe(true);
  });
});
