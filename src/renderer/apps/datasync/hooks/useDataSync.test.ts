import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useDataSync } from './useDataSync';

vi.mock('../../../contexts/NexusStatusContext', () => ({
  useNexusStatus: () => ({
    sharepoint: {
      token: '',
      isValid: false,
      isValidating: false,
      error: undefined,
      remainingMs: 0,
      showExpirationWarning: false,
    },
    requireSharePointToken: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock('../services/dataSyncService', () => ({
  dataSyncService: {
    validateToken: vi.fn().mockResolvedValue({ valid: true }),
    fetchRecords: vi.fn().mockResolvedValue([]),
    fetchSyncStatus: vi.fn().mockResolvedValue({ totalRecords: 0, fetchedRecords: 0 }),
    startSync: vi.fn().mockResolvedValue(undefined),
    pauseSync: vi.fn().mockResolvedValue(undefined),
    resumeSync: vi.fn().mockResolvedValue(undefined),
    retryFailed: vi.fn().mockResolvedValue(undefined),
    retryNotProcessed: vi.fn().mockResolvedValue(undefined),
    syncSingleRecord: vi.fn().mockResolvedValue(undefined),
    clearRecords: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/processingService', () => ({
  resumeProcessingService: {
    getProcessingStatus: vi.fn().mockResolvedValue(undefined),
    startExtraction: vi.fn().mockResolvedValue(undefined),
    startVectorization: vi.fn().mockResolvedValue(undefined),
    retryFailed: vi.fn().mockResolvedValue(undefined),
    retryFailedVectorization: vi.fn().mockResolvedValue(undefined),
    vectorizeSingle: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../utils/tokenUtils', () => ({
  isTokenExpired: vi.fn().mockReturnValue(false),
  getTokenExpiration: vi.fn().mockReturnValue(null),
}));

vi.mock('../utils/rendererLogger', () => ({
  createRendererLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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

describe('useDataSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize progress for active pipeline', () => {
    const { result } = renderHook(() => useDataSync('candidates'), {
      wrapper: createWrapper(),
    });

    expect(result.current.records.activeProgress.source).toBe('candidates');
    expect(result.current.records.activeProgress.status).toBe('idle');
  });

  it('should manage year selection for candidates', () => {
    const { result } = renderHook(() => useDataSync('candidates'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.year.handleYearChange(2025);
    });

    expect(result.current.year.selectedYear).toBe(2025);
  });

  it('should track clearing state', () => {
    const { result } = renderHook(() => useDataSync('candidates'), {
      wrapper: createWrapper(),
    });

    expect(result.current.clear.isClearing).toBe(false);
  });

  it('should track refreshing and vectorizing IDs', () => {
    const { result } = renderHook(() => useDataSync('candidates'), {
      wrapper: createWrapper(),
    });

    expect(result.current.singleRecord.refreshingId).toBeUndefined();
    expect(result.current.singleRecord.vectorizingId).toBeUndefined();
  });

  it('should provide sync control handlers', () => {
    const { result } = renderHook(() => useDataSync('candidates'), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.sync.handleStartSync).toBe('function');
    expect(typeof result.current.sync.handlePauseSync).toBe('function');
    expect(typeof result.current.sync.handleResumeSync).toBe('function');
  });

  it('should provide extraction and vectorization handlers', () => {
    const { result } = renderHook(() => useDataSync('candidates'), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.extraction.handleStartExtraction).toBe('function');
    expect(typeof result.current.extraction.handlePauseExtraction).toBe('function');
    expect(typeof result.current.vectorization.handleStartVectorization).toBe('function');
    expect(typeof result.current.vectorization.handlePauseVectorization).toBe('function');
  });

  it('should report isSyncing as false initially', () => {
    const { result } = renderHook(() => useDataSync('candidates'), {
      wrapper: createWrapper(),
    });

    expect(result.current.sync.isSyncing).toBe(false);
  });

  it('should use employees pipeline when panel is employees', () => {
    const { result } = renderHook(() => useDataSync('employees'), {
      wrapper: createWrapper(),
    });

    expect(result.current.records.activeProgress.source).toBe('employees');
  });

  it('should use open-positions pipeline when panel is open-positions', () => {
    const { result } = renderHook(() => useDataSync('open-positions'), {
      wrapper: createWrapper(),
    });

    expect(result.current.records.activeProgress.source).toBe('open-positions');
  });

  it('should default to candidates pipeline for config panels', () => {
    const { result } = renderHook(() => useDataSync('vectorization'), {
      wrapper: createWrapper(),
    });

    expect(result.current.records.activeProgress.source).toBe('candidates');
  });
});
