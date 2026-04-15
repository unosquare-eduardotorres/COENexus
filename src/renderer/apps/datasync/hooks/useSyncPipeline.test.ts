import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useSyncPipeline } from './useSyncPipeline'

vi.mock('../services/dataSyncService', () => ({
  dataSyncService: {
    validateToken: vi.fn().mockResolvedValue({ valid: true }),
    fetchSyncStatus: vi.fn().mockResolvedValue({ totalRecords: 0, fetchedRecords: 0 }),
    fetchRecords: vi.fn().mockResolvedValue([]),
    startSync: vi.fn().mockResolvedValue({ status: 'completed', totalRecords: 0 }),
    retryFailed: vi.fn().mockResolvedValue({ total: 0, retried: 0 }),
    retryNotProcessed: vi.fn().mockResolvedValue({ total: 0, retried: 0 }),
    clearRecords: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../services/processingService', () => ({
  resumeProcessingService: {
    getProcessingStatus: vi.fn().mockResolvedValue({}),
    startExtraction: vi.fn().mockResolvedValue({}),
    startVectorization: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../../shared/utils/rendererLogger', () => ({
  createRendererLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useSyncPipeline', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should render without crashing with required params', () => {
    const { result } = renderHook(
      () => useSyncPipeline({ source: 'employees', token: 'test-token', enabled: false }),
      { wrapper: createWrapper() }
    )
    expect(result.current.progress).toBeDefined()
    expect(result.current.records).toBeDefined()
  })
})
