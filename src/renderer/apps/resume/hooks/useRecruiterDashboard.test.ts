import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecruiterDashboard } from './useRecruiterDashboard';

vi.mock('../services/validationService', () => ({
  validationService: {
    validateResume: vi.fn().mockReturnValue([]),
    getCompleteness: vi.fn().mockReturnValue({
      percentage: 75,
      filledFields: 15,
      totalFields: 20,
      missingFields: ['skills'],
    }),
  },
}));

vi.mock('../services/aiService', () => ({
  aiService: {
    generateSuggestions: vi.fn().mockResolvedValue([]),
    checkConnection: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/pdfExportService', () => ({
  pdfExportService: {
    generatePdf: vi.fn().mockResolvedValue(new Blob()),
  },
}));

vi.mock('../../../shared/components/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../utils/rendererLogger', () => ({
  createRendererLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useRecruiterDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.resumes.selectedResumeId).toBeNull();
    expect(result.current.resumes.selectedResume).toBeNull();
    expect(result.current.filter.filterStatus).toBe('all');
    expect(result.current.filter.searchQuery).toBe('');
    expect(result.current.validation.isValidating).toBe(false);
    expect(result.current.review.isGeneratingSuggestions).toBe(false);
    expect(result.current.ui.showPreview).toBe(true);
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    act(() => {
      result.current.filter.setSearchQuery('John');
    });

    expect(result.current.filter.searchQuery).toBe('John');
  });

  it('should update filter status', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    act(() => {
      result.current.filter.setFilterStatus('approved');
    });

    expect(result.current.filter.filterStatus).toBe('approved');
  });

  it('should toggle drawer', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.ui.isDrawerOpen).toBe(false);

    act(() => {
      result.current.ui.setIsDrawerOpen(true);
    });

    expect(result.current.ui.isDrawerOpen).toBe(true);
  });

  it('should toggle preview visibility', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.ui.showPreview).toBe(true);

    act(() => {
      result.current.ui.setShowPreview(false);
    });

    expect(result.current.ui.showPreview).toBe(false);
  });

  it('should manage reject modal state', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.reject.showRejectModal).toBe(false);

    act(() => {
      result.current.reject.setShowRejectModal(true);
    });

    expect(result.current.reject.showRejectModal).toBe(true);
  });

  it('should update reject reason', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    act(() => {
      result.current.reject.setRejectReason('Not qualified');
    });

    expect(result.current.reject.rejectReason).toBe('Not qualified');
  });

  it('should compute completeness as zero when no resume selected', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.validation.completeness.percentage).toBe(0);
  });

  it('should return empty filtered resumes when no resumes loaded', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.resumes.filteredResumes).toEqual([]);
  });

  it('should manage validation filter', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    act(() => {
      result.current.validation.setValidationFilter('warning');
    });

    expect(result.current.validation.validationFilter).toBe('warning');
  });
});
