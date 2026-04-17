import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
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
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear() })

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

  it('should expose column filter API instead of individual filter states', async () => {
    const { result } = renderHook(() => useOpenPositionReport(), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(result.current.columnFilters).toEqual({})
      expect(result.current.setColumnFilter).toBeTypeOf('function')
      expect(result.current.clearColumnFilter).toBeTypeOf('function')
      expect(result.current.availableColumnValues).toBeDefined()
    })
  })

  it('should set and clear column filters', async () => {
    const { result } = renderHook(() => useOpenPositionReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.columnFilters).toEqual({}))

    act(() => {
      result.current.setColumnFilter('coe', ['Engineering', 'Design'])
    })
    expect(result.current.columnFilters).toEqual({ coe: ['Engineering', 'Design'] })

    act(() => {
      result.current.clearColumnFilter('coe')
    })
    expect(result.current.columnFilters).toEqual({})
  })

  it('should count column filters in activeFilterCount', async () => {
    const { result } = renderHook(() => useOpenPositionReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.activeFilterCount).toBe(0))

    act(() => {
      result.current.setColumnFilter('coe', ['Engineering'])
      result.current.setColumnFilter('practice', ['Frontend'])
    })
    expect(result.current.activeFilterCount).toBe(2)
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('should clear all filters including column filters', async () => {
    const { result } = renderHook(() => useOpenPositionReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.columnFilters).toEqual({}))

    act(() => {
      result.current.setColumnFilter('coe', ['Engineering'])
      result.current.setColumnFilter('status', ['Active'])
    })
    expect(Object.keys(result.current.columnFilters)).toHaveLength(2)

    act(() => {
      result.current.clearAllFilters()
    })
    expect(result.current.columnFilters).toEqual({})
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('should remove column filter when setting empty values', async () => {
    const { result } = renderHook(() => useOpenPositionReport(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.columnFilters).toEqual({}))

    act(() => {
      result.current.setColumnFilter('coe', ['Engineering'])
    })
    expect(result.current.columnFilters).toEqual({ coe: ['Engineering'] })

    act(() => {
      result.current.setColumnFilter('coe', [])
    })
    expect(result.current.columnFilters).toEqual({})
  })
})
