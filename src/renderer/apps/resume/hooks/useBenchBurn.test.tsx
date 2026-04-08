import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBenchBurn } from './useBenchBurn';

vi.mock('../services/benchBurnService', () => ({
  benchBurnService: {
    search: vi.fn().mockResolvedValue({ sessionId: 1 }),
    loadSession: vi.fn().mockResolvedValue(null),
    onSearchProgress: vi.fn().mockReturnValue(() => {}),
    onSearchComplete: vi.fn().mockReturnValue(() => {}),
    onSearchError: vi.fn().mockReturnValue(() => {}),
  },
  BenchBurnSearchResult: {},
}));

vi.mock('../utils/rendererLogger', () => ({
  createRendererLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../components/shared/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('useBenchBurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with data-source step', () => {
    const { result } = renderHook(() => useBenchBurn());

    expect(result.current.currentStepKey).toBe('data-source');
    expect(result.current.selectedEmployees).toEqual([]);
    expect(result.current.selectedPositions).toEqual([]);
    expect(result.current.customPositions).toEqual([]);
  });

  it('should navigate between steps', () => {
    const { result } = renderHook(() => useBenchBurn());

    act(() => {
      result.current.handleEmployeesNext([
        { upstreamId: 1, name: 'Test Employee', email: 'test@test.com' } as any,
      ]);
    });

    expect(result.current.selectedEmployees).toHaveLength(1);
  });

  it('should manage custom positions', () => {
    const { result } = renderHook(() => useBenchBurn());

    act(() => {
      result.current.setCustomPositions([
        { id: 'custom-1', title: 'Custom Position', description: 'Test' } as any,
      ]);
    });

    expect(result.current.customPositions).toHaveLength(1);
  });

  it('should track completed steps', () => {
    const { result } = renderHook(() => useBenchBurn());

    expect(result.current.completedSteps.has('data-source')).toBe(false);
  });

  it('should manage search depth state', () => {
    const { result } = renderHook(() => useBenchBurn());

    expect(result.current.searchDepth).toBeDefined();
  });

  it('should initialize with no results', () => {
    const { result } = renderHook(() => useBenchBurn());

    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });
});
