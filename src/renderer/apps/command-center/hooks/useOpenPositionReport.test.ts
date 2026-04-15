import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useOpenPositionReport } from './useOpenPositionReport'

vi.mock('../services/reportService', () => ({
  reportService: {
    evaluatePositions: vi.fn().mockResolvedValue({ results: [], totalPositions: 0, lastSyncedAt: null }),
    getPositionDetail: vi.fn().mockResolvedValue(null),
    exportCsv: vi.fn().mockResolvedValue({ saved: true }),
    getSyncStatus: vi.fn().mockResolvedValue({ total: 0, lastSyncedAt: null }),
    getFeedbackCatalog: vi.fn().mockResolvedValue({}),
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

describe('useOpenPositionReport', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

  it('should render without crashing and return expected keys', async () => {
    const { result } = renderHook(() => useOpenPositionReport(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.thresholds).toBeDefined()
      expect(result.current.results).toBeDefined()
      expect(result.current.isLoading).toBeDefined()
    })
  })

  it('should expose threshold and filter controls', async () => {
    const { result } = renderHook(() => useOpenPositionReport(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.setDraftThreshold).toBeTypeOf('function')
      expect(result.current.applyThresholds).toBeTypeOf('function')
      expect(result.current.searchText).toBeDefined()
    })
  })
})
