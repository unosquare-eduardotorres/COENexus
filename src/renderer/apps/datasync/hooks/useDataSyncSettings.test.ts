import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useDataSyncSettings } from './useDataSyncSettings'

vi.mock('../services/vectorizationConfigService', () => ({
  vectorizationConfigService: {
    getConfig: vi.fn().mockReturnValue({ model: 'voyage-4-large' }),
    saveModel: vi.fn(),
    checkVoyageKey: vi.fn().mockResolvedValue({ configured: false }),
    addVoyageKey: vi.fn().mockResolvedValue({ saved: true }),
    removeVoyageKey: vi.fn().mockResolvedValue({ deleted: true }),
  },
}))

vi.mock('../services/databaseSharingService', () => ({
  databaseSharingService: {
    getConfig: vi.fn().mockResolvedValue({ isConfigured: false }),
    saveConfig: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../../shared/utils/rendererLogger', () => ({
  createRendererLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useDataSyncSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => useDataSyncSettings(), { wrapper: createWrapper() })
    expect(result.current).toBeDefined()
  })
})
