import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/resume/enhance', search: '', hash: '', state: null }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

vi.mock('../../../shared/components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('../../../shared/utils/rendererLogger', () => ({
  createRendererLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../services/sessionService', () => ({
  sessionService: {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../services/matchEngineService', () => ({
  matchEngineService: {
    getPoolCounts: vi.fn().mockResolvedValue({}),
    getOpenPositions: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../../shared/hooks/useIpcQuery', () => ({
  useIpcQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useInvalidateQueries: vi.fn().mockReturnValue(vi.fn()),
}))

import { useTransformWizard } from './useTransformWizard'

describe('useTransformWizard integration', () => {
  it('should initialize and return wizard state', () => {
    const navigate = vi.fn()
    const showToast = vi.fn()
    const { result } = renderHook(() => useTransformWizard(navigate, showToast))
    expect(result.current).toBeDefined()
    expect(typeof result.current.handleNext).toBe('function')
    expect(typeof result.current.handleBack).toBe('function')
  })

  it('should expose processing mode state', () => {
    const { result } = renderHook(() => useTransformWizard(vi.fn(), vi.fn()))
    expect(result.current.processingMode).toBeDefined()
  })
})
