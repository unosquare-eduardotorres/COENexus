import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMatchEngine } from './useMatchEngine'

vi.mock('../services/matchEngineService', () => ({
  matchEngineService: {
    getPoolCounts: vi.fn().mockResolvedValue({ candidates: 100, employees: 50, positions: 25 }),
    getFilterOptions: vi.fn().mockResolvedValue({ skills: ['React'], seniorities: ['Senior'], accounts: ['Acme'] }),
    search: vi.fn().mockResolvedValue({ candidates: [], stats: null }),
    listSessions: vi.fn().mockResolvedValue([]),
    onSearchEvent: vi.fn().mockReturnValue(() => {}),
  },
}))

vi.mock('../utils/normalizeCandidate', () => ({
  normalizeCandidate: vi.fn((c: unknown) => c),
}))

vi.mock('../utils/exportToExcel', () => ({
  exportToExcel: vi.fn(),
}))

vi.mock('../utils/formatSalary', () => ({
  formatSalary: vi.fn(() => '$0'),
}))

vi.mock('../data/sampleJobDescription', () => ({
  SAMPLE_JOB_DESCRIPTION: 'Sample JD for testing',
}))

vi.mock('../data/defaultMatchPrompts', () => ({
  getMatchPrompts: vi.fn().mockReturnValue([]),
}))

vi.mock('../../../shared/hooks/useIpcQuery', () => ({
  useIpcQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useInvalidateQueries: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock('../../../shared/utils/rendererLogger', () => ({
  createRendererLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('./useStepWizard', () => ({
  useStepWizard: () => ({
    currentStep: 'intent',
    completedSteps: new Set(),
    navigateStep: vi.fn(),
    completeStep: vi.fn(),
    setCurrentStep: vi.fn(),
    setCompletedSteps: vi.fn(),
    resetWizard: vi.fn(),
  }),
}))

describe('useMatchEngine integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return grouped state sections', () => {
    const { result } = renderHook(() => useMatchEngine())
    expect(result.current.wizard).toBeDefined()
    expect(result.current.intent).toBeDefined()
    expect(result.current.source).toBeDefined()
    expect(result.current.jd).toBeDefined()
    expect(result.current.depth).toBeDefined()
    expect(result.current.search).toBeDefined()
    expect(result.current.results).toBeDefined()
    expect(result.current.deepDive).toBeDefined()
    expect(result.current.sessions).toBeDefined()
  })

  it('should initialize with default job description', () => {
    const { result } = renderHook(() => useMatchEngine())
    expect(result.current.jd.jobDescription).toBe('Sample JD for testing')
  })

  it('should allow updating job description', () => {
    const { result } = renderHook(() => useMatchEngine())
    act(() => {
      result.current.jd.setJobDescription('New job description')
    })
    expect(result.current.jd.jobDescription).toBe('New job description')
  })

  it('should have search mode in depth section', () => {
    const { result } = renderHook(() => useMatchEngine())
    act(() => {
      result.current.depth.setSearchMode('haiku')
    })
    expect(result.current.depth.searchMode).toBe('haiku')
  })

  it('should have empty candidates initially', () => {
    const { result } = renderHook(() => useMatchEngine())
    expect(result.current.results.candidates).toEqual([])
  })

  it('should have no selected profile initially', () => {
    const { result } = renderHook(() => useMatchEngine())
    expect(result.current.deepDive.selectedProfile).toBeNull()
  })

  it('should have empty compare list initially', () => {
    const { result } = renderHook(() => useMatchEngine())
    expect(result.current.deepDive.compareList).toEqual([])
  })

  it('should expose pipeline stage controls', () => {
    const { result } = renderHook(() => useMatchEngine())
    expect(typeof result.current.pipeline.handleStageClick).toBe('function')
    expect(typeof result.current.pipeline.setActiveStageDrawer).toBe('function')
  })
})
