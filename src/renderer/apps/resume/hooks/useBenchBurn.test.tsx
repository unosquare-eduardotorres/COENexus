import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
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

vi.mock('../../../shared/components/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
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

describe('useBenchBurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with data-source step', () => {
    const { result } = renderHook(() => useBenchBurn(), { wrapper: createWrapper() });

    expect(result.current.wizard.currentStep).toBe('data-source');
    expect(result.current.employees.selectedEmployees).toEqual([]);
    expect(result.current.positions.selectedPositions).toEqual([]);
  });

  it('should navigate between steps', () => {
    const { result } = renderHook(() => useBenchBurn(), { wrapper: createWrapper() });

    act(() => {
      result.current.employees.handleEmployeesNext([
        { upstreamId: 1, name: 'Test Employee', email: 'test@test.com' } as any,
      ]);
    });

    expect(result.current.employees.selectedEmployees).toHaveLength(1);
  });

  it('should manage custom positions', () => {
    const { result } = renderHook(() => useBenchBurn(), { wrapper: createWrapper() });

    act(() => {
      result.current.search.setSessionName('test');
    });

    expect(result.current.search.sessionName).toBe('test');
  });

  it('should track completed steps', () => {
    const { result } = renderHook(() => useBenchBurn(), { wrapper: createWrapper() });

    expect(result.current.wizard.completedSteps.has('data-source')).toBe(false);
  });

  it('should manage search state', () => {
    const { result } = renderHook(() => useBenchBurn(), { wrapper: createWrapper() });

    expect(result.current.search.progress).toBeDefined();
  });

  it('should initialize with no results', () => {
    const { result } = renderHook(() => useBenchBurn(), { wrapper: createWrapper() });

    expect(result.current.results.results).toBeNull();
  });
});
