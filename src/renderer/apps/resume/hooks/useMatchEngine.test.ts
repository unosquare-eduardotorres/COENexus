import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useMatchEngine } from './useMatchEngine';

vi.mock('../services/matchEngineService', () => ({
  matchEngineService: {
    getPoolCounts: vi.fn().mockResolvedValue({ candidates: 100, employees: 50 }),
    getFilterOptions: vi.fn().mockResolvedValue({ skills: [], seniorities: [] }),
    listSessions: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue({ sessionId: 1 }),
    loadSession: vi.fn().mockResolvedValue(null),
    saveSession: vi.fn().mockResolvedValue(undefined),
    onSearchProgress: vi.fn().mockReturnValue(() => {}),
    onSearchComplete: vi.fn().mockReturnValue(() => {}),
    onSearchError: vi.fn().mockReturnValue(() => {}),
    onHaikuConfirm: vi.fn().mockReturnValue(() => {}),
    confirmHaiku: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../data/sampleJobDescription', () => ({
  SAMPLE_JOB_DESCRIPTION: 'Sample JD',
}));

vi.mock('../data/defaultMatchPrompts', () => ({
  getMatchPrompts: vi.fn().mockReturnValue({}),
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

describe('useMatchEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with intent step', () => {
    const { result } = renderHook(() => useMatchEngine(), {
      wrapper: createWrapper(),
    });

    expect(result.current.wizard.currentStepKey).toBe('intent');
    expect(result.current.results.candidates).toEqual([]);
    expect(result.current.intent.matchFlow).toBeNull();
  });

  it('should navigate steps on intent select', () => {
    const { result } = renderHook(() => useMatchEngine(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.intent.handleIntentSelect('standard');
    });

    expect(result.current.intent.matchFlow).toBe('standard');
    expect(result.current.wizard.currentStepKey).toBe('data-source');
  });

  it('should navigate to bench-burn on bench-burn flow select', () => {
    const { result } = renderHook(() => useMatchEngine(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.intent.handleIntentSelect('bench-burn');
    });

    expect(result.current.intent.matchFlow).toBe('bench-burn');
    expect(result.current.wizard.currentStepKey).toBe('bench-burn');
  });

  it('should load pool counts via TanStack Query', async () => {
    const { result } = renderHook(() => useMatchEngine(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.source.poolCounts).toEqual({ candidates: 100, employees: 50 });
    });
  });

  it('should load filter options via TanStack Query', async () => {
    const { result } = renderHook(() => useMatchEngine(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.source.filterOptions).toEqual({ skills: [], seniorities: [] });
    });
  });

  it('should provide session history via TanStack Query', async () => {
    const { result } = renderHook(() => useMatchEngine(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.sessions.sessions).toEqual([]);
    });
  });

  it('should provide sync and results handlers', () => {
    const { result } = renderHook(() => useMatchEngine(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.search.handleStartSearch).toBe('function');
    expect(typeof result.current.results.handleReset).toBe('function');
    expect(typeof result.current.results.handleExportToExcel).toBe('function');
  });

  it('should provide deep dive handlers', () => {
    const { result } = renderHook(() => useMatchEngine(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.deepDive.handleSelectCandidate).toBe('function');
    expect(typeof result.current.deepDive.handleBackToResults).toBe('function');
    expect(typeof result.current.deepDive.handleToggleCompare).toBe('function');
    expect(typeof result.current.deepDive.handleStartCompare).toBe('function');
  });
});
