import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDataSync } from './useDataSync'

vi.mock('../../../shared/utils/rendererLogger', () => ({
  createRendererLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../../contexts/NexusStatusContext', () => ({
  useNexusStatus: () => ({
    isOnline: true,
    voyageKeyConfigured: false,
    claudeAvailable: false,
    refreshStatus: vi.fn(),
  }),
}))

describe('useDataSync integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(window.api.sync.getStatus).mockResolvedValue({
      employees: { status: 'idle', total: 0, current: 0, synced: 0, failed: 0 },
      candidates: { status: 'idle', total: 0, current: 0, synced: 0, failed: 0 },
      openPositions: { status: 'idle', total: 0, current: 0, synced: 0, failed: 0 },
    })
    vi.mocked(window.api.sync.getRecords).mockResolvedValue([])
    vi.mocked(window.api.processing.getVoyageKeyStatus).mockResolvedValue({ configured: false })
  })

  it('should initialize and return datasync controls', async () => {
    const { result } = renderHook(() => useDataSync())
    expect(result.current).toBeDefined()
    expect(typeof result.current.handleStartSync).toBe('function')
  })

  it('should expose active source state', () => {
    const { result } = renderHook(() => useDataSync())
    expect(result.current.activeSource).toBeDefined()
  })

  it('should have sync control functions', () => {
    const { result } = renderHook(() => useDataSync())
    expect(typeof result.current.handleStartSync).toBe('function')
    expect(typeof result.current.handlePauseSync).toBe('function')
  })

  it('should fetch initial status on mount', async () => {
    renderHook(() => useDataSync())
    await waitFor(() => {
      expect(window.api.sync.getStatus).toHaveBeenCalled()
    })
  })
})
