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

vi.mock('../components/shared/ToastContext', () => ({
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

    expect(result.current.selectedResumeId).toBeNull();
    expect(result.current.selectedResume).toBeNull();
    expect(result.current.filterStatus).toBe('all');
    expect(result.current.searchQuery).toBe('');
    expect(result.current.isValidating).toBe(false);
    expect(result.current.isGeneratingSuggestions).toBe(false);
    expect(result.current.showPreview).toBe(true);
  });

  it('should update search query', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    act(() => {
      result.current.setSearchQuery('John');
    });

    expect(result.current.searchQuery).toBe('John');
  });

  it('should update filter status', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    act(() => {
      result.current.setFilterStatus('approved');
    });

    expect(result.current.filterStatus).toBe('approved');
  });

  it('should toggle drawer', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.isDrawerOpen).toBe(false);

    act(() => {
      result.current.setIsDrawerOpen(true);
    });

    expect(result.current.isDrawerOpen).toBe(true);
  });

  it('should toggle preview visibility', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.showPreview).toBe(true);

    act(() => {
      result.current.setShowPreview(false);
    });

    expect(result.current.showPreview).toBe(false);
  });

  it('should manage reject modal state', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.showRejectModal).toBe(false);

    act(() => {
      result.current.setShowRejectModal(true);
    });

    expect(result.current.showRejectModal).toBe(true);
  });

  it('should update reject reason', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    act(() => {
      result.current.setRejectReason('Not qualified');
    });

    expect(result.current.rejectReason).toBe('Not qualified');
  });

  it('should compute completeness as zero when no resume selected', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.completeness.percentage).toBe(0);
  });

  it('should return empty filtered resumes when no resumes loaded', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    expect(result.current.filteredResumes).toEqual([]);
  });

  it('should manage validation filter', () => {
    const { result } = renderHook(() => useRecruiterDashboard());

    act(() => {
      result.current.setValidationFilter('warning');
    });

    expect(result.current.validationFilter).toBe('warning');
  });
});
