import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgentActivityListener } from './useAgentActivityListener'

const mockShowToast = vi.fn()
const mockSetAgentActivities = vi.fn()

vi.mock('../shared/components/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

vi.mock('../contexts/NexusStatusContext', () => ({
  useNexusStatus: () => ({
    setAgentActivities: mockSetAgentActivities,
    agentActivities: [],
  }),
}))

type StatusCallback = (e: Record<string, unknown>) => void
type StepCallback = (e: Record<string, unknown>) => void

let vigilStatusCallback: StatusCallback | null = null
let scout9StatusCallback: StatusCallback | null = null
let braniacStatusCallback: StatusCallback | null = null
let agentStepCallback: StepCallback | null = null

const unsubVigil = vi.fn()
const unsubScout9 = vi.fn()
const unsubBraniac = vi.fn()
const unsubSteps = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vigilStatusCallback = null
  scout9StatusCallback = null
  braniacStatusCallback = null
  agentStepCallback = null

  window.api.vigil.onStatusEvent = vi.fn((cb: StatusCallback) => {
    vigilStatusCallback = cb
    return unsubVigil
  })
  window.api.vigil.getStatus = vi.fn().mockResolvedValue({ success: false })

  window.api.scout9.onStatusEvent = vi.fn((cb: StatusCallback) => {
    scout9StatusCallback = cb
    return unsubScout9
  })
  window.api.scout9.getStatus = vi.fn().mockResolvedValue({ success: false })

  window.api.braniac.onStatusEvent = vi.fn((cb: StatusCallback) => {
    braniacStatusCallback = cb
    return unsubBraniac
  })
  window.api.braniac.getStatus = vi.fn().mockResolvedValue({ success: false })

  window.api.agents.onStepEvent = vi.fn((cb: StepCallback) => {
    agentStepCallback = cb
    return unsubSteps
  })
})

describe('useAgentActivityListener', () => {
  it('should subscribe to all agent event channels on mount', () => {
    renderHook(() => useAgentActivityListener())

    expect(window.api.vigil.onStatusEvent).toHaveBeenCalledOnce()
    expect(window.api.scout9.onStatusEvent).toHaveBeenCalledOnce()
    expect(window.api.braniac.onStatusEvent).toHaveBeenCalledOnce()
    expect(window.api.agents.onStepEvent).toHaveBeenCalledOnce()
  })

  it('should add Vigil to activities when running event received', async () => {
    renderHook(() => useAgentActivityListener())
    await vi.waitFor(() => expect(vigilStatusCallback).not.toBeNull())

    act(() => {
      vigilStatusCallback!({ status: 'running', run_id: 'run-1', timestamp: new Date().toISOString() })
    })

    expect(mockSetAgentActivities).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'vigil', name: 'Vigil', status: 'running', runId: 'run-1' }),
    ])
  })

  it('should add Scout-9 to activities when running event received', async () => {
    renderHook(() => useAgentActivityListener())
    await vi.waitFor(() => expect(scout9StatusCallback).not.toBeNull())

    act(() => {
      scout9StatusCallback!({ status: 'running', job_id: 'job-1', timestamp: new Date().toISOString() })
    })

    expect(mockSetAgentActivities).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'scout-9', name: 'Scout-9', status: 'running' }),
    ])
  })

  it('should show success toast and remove from activities on completed', async () => {
    renderHook(() => useAgentActivityListener())
    await vi.waitFor(() => expect(vigilStatusCallback).not.toBeNull())

    act(() => {
      vigilStatusCallback!({ status: 'running', run_id: 'run-1', timestamp: new Date().toISOString() })
    })

    act(() => {
      vigilStatusCallback!({ status: 'completed', run_id: 'run-1', timestamp: new Date().toISOString() })
    })

    expect(mockShowToast).toHaveBeenCalledWith('Vigil completed successfully', 'success', 5000)
    expect(mockSetAgentActivities).toHaveBeenLastCalledWith([])
  })

  it('should show error toast on failed status', async () => {
    renderHook(() => useAgentActivityListener())
    await vi.waitFor(() => expect(braniacStatusCallback).not.toBeNull())

    act(() => {
      braniacStatusCallback!({ status: 'failed', job_id: 'job-1', timestamp: new Date().toISOString() })
    })

    expect(mockShowToast).toHaveBeenCalledWith('Braniac failed — check activity log', 'error', 8000)
  })

  it('should handle multiple agents running simultaneously', async () => {
    renderHook(() => useAgentActivityListener())
    await vi.waitFor(() => expect(vigilStatusCallback).not.toBeNull())

    act(() => {
      vigilStatusCallback!({ status: 'running', run_id: 'run-1', timestamp: new Date().toISOString() })
    })

    act(() => {
      scout9StatusCallback!({ status: 'running', job_id: 'job-1', timestamp: new Date().toISOString() })
    })

    const lastCall = mockSetAgentActivities.mock.calls.at(-1)?.[0]
    expect(lastCall).toHaveLength(2)
    expect(lastCall).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'vigil' }),
        expect.objectContaining({ id: 'scout-9' }),
      ]),
    )
  })

  it('should hydrate from vigil getStatus on mount when active run exists', async () => {
    window.api.vigil.getStatus = vi.fn().mockResolvedValue({
      success: true,
      data: { active_run: { id: 'run-existing', status: 'running' } },
    })

    renderHook(() => useAgentActivityListener())

    await vi.waitFor(() => {
      expect(mockSetAgentActivities).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'vigil', status: 'running', runId: 'run-existing' }),
      ])
    })
  })

  it('should cleanup all subscriptions on unmount', () => {
    const { unmount } = renderHook(() => useAgentActivityListener())
    unmount()

    expect(unsubVigil).toHaveBeenCalledOnce()
    expect(unsubScout9).toHaveBeenCalledOnce()
    expect(unsubBraniac).toHaveBeenCalledOnce()
    expect(unsubSteps).toHaveBeenCalledOnce()
  })

  it('should normalize stub agent step started to running', async () => {
    renderHook(() => useAgentActivityListener())
    await vi.waitFor(() => expect(agentStepCallback).not.toBeNull())

    act(() => {
      agentStepCallback!({
        agentId: 'switchboard',
        step: 'analyzing',
        status: 'started',
        message: 'Starting analysis',
        timestamp: new Date().toISOString(),
      })
    })

    expect(mockSetAgentActivities).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'switchboard', name: 'Switchboard', status: 'running' }),
    ])
  })
})
