import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useDeliveryToOp } from './useDeliveryToOp'

vi.mock('../services/benchBurnService', () => ({
  benchBurnService: {
    getAllEmployees: vi.fn().mockResolvedValue([]),
    getOpenPositions: vi.fn().mockResolvedValue([]),
    searchEmployees: vi.fn().mockResolvedValue([]),
    executeBenchBurn: vi.fn().mockResolvedValue({ results: [] }),
    getResumeText: vi.fn().mockResolvedValue(''),
  },
}))

vi.mock('../services/matchEngineService', () => ({
  matchEngineService: {
    getProxyStatus: vi.fn().mockResolvedValue({ available: true }),
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

describe('useDeliveryToOp', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should render without crashing and return expected keys', () => {
    const { result } = renderHook(() => useDeliveryToOp(), { wrapper: createWrapper() })
    expect(result.current.wizard).toBeDefined()
    expect(result.current.employee).toBeDefined()
    expect(result.current.positions).toBeDefined()
    expect(result.current.search).toBeDefined()
    expect(result.current.results).toBeDefined()
    expect(result.current.actions).toBeDefined()
  })
})
