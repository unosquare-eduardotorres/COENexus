import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useDatabaseSharing } from './useDatabaseSharing'

vi.mock('../services/databaseSharingService', () => ({
  databaseSharingService: {
    getConfig: vi.fn().mockResolvedValue({ isConfigured: false, sharedPath: '', exporterName: '' }),
    getStatus: vi.fn().mockResolvedValue({ dbSize: 0, recordCount: 0 }),
    listSnapshots: vi.fn().mockResolvedValue({ snapshots: [] }),
    saveConfig: vi.fn().mockResolvedValue({}),
    export: vi.fn().mockResolvedValue({ success: true }),
    import: vi.fn().mockResolvedValue({ success: true }),
    importFile: vi.fn().mockResolvedValue({ success: true }),
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

describe('useDatabaseSharing', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should render without crashing and expose state and actions', () => {
    const { result } = renderHook(() => useDatabaseSharing(), { wrapper: createWrapper() })
    expect(result.current.state).toBeDefined()
    expect(result.current.actions).toBeDefined()
    expect(result.current.state.sharedPath).toBeDefined()
    expect(result.current.actions.handleExportSnapshot).toBeTypeOf('function')
    expect(result.current.actions.handleImportSnapshot).toBeTypeOf('function')
  })
})
