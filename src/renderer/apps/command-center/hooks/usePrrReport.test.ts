import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { usePrrReport } from './usePrrReport'

vi.mock('../services/prrService', () => ({
  prrService: {
    getAll: vi.fn().mockResolvedValue([]),
    getDetail: vi.fn().mockResolvedValue(null),
    updateCoeStatus: vi.fn().mockResolvedValue({ updated: true }),
    addComment: vi.fn().mockResolvedValue({ comments: [] }),
    delete: vi.fn().mockResolvedValue({ deleted: true }),
    getSyncStatus: vi.fn().mockResolvedValue({ total: 0, lastSyncedAt: null }),
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

describe('usePrrReport', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

  it('should render without crashing and return expected keys', async () => {
    const { result } = renderHook(() => usePrrReport(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.results).toBeDefined()
      expect(result.current.isLoading).toBeDefined()
    })
  })

  it('should expose search and filter state', async () => {
    const { result } = renderHook(() => usePrrReport(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.searchText).toBeDefined()
      expect(result.current.setSearchText).toBeTypeOf('function')
    })
  })
})
