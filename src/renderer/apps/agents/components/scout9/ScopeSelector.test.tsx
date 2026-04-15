import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScopeSelector, { useScopeLabel } from './ScopeSelector'
import { renderHook } from '@testing-library/react'

vi.mock('lucide-react', () => ({
  Filter: () => <span data-testid="filter-icon">Filter</span>,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(window.api.scout9.getScopeOptions).mockResolvedValue({
    success: true,
    data: {
      presets: [
        { name: 'all-active', label: 'All Active', count: 42 },
        { name: 'no-candidates', label: 'No Candidates', count: 10 },
        { name: 'stalled-30d', label: 'Stalled 30d+', count: 5 },
        { name: 'high-priority', label: 'High Priority', count: 8 },
      ],
    },
  })
})

describe('ScopeSelector', () => {
  it('should render preset buttons', async () => {
    render(<ScopeSelector onSelect={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/All Active/)).toBeInTheDocument()
      expect(screen.getByText(/No Candidates/)).toBeInTheDocument()
      expect(screen.getByText(/Stalled 30d\+/)).toBeInTheDocument()
      expect(screen.getByText(/High Priority/)).toBeInTheDocument()
    })
  })

  it('should render Custom button', () => {
    render(<ScopeSelector onSelect={() => {}} />)
    expect(screen.getByText(/Custom/)).toBeInTheDocument()
  })

  it('should call onSelect with preset name when preset clicked', async () => {
    const onSelect = vi.fn()
    render(<ScopeSelector onSelect={onSelect} />)
    await waitFor(() => expect(screen.getByText(/No Candidates/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/No Candidates/))
    expect(onSelect).toHaveBeenCalledWith({ preset: 'no-candidates' })
  })

  it('should show custom filters when Custom is clicked', () => {
    render(<ScopeSelector onSelect={() => {}} />)
    fireEvent.click(screen.getByText(/Custom/))
    expect(screen.getByPlaceholderText(/COE/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/FinTech/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Acme/)).toBeInTheDocument()
  })

  it('should call onSelect with custom filters when Apply clicked', () => {
    const onSelect = vi.fn()
    render(<ScopeSelector onSelect={onSelect} />)
    fireEvent.click(screen.getByText(/Custom/))
    fireEvent.change(screen.getByPlaceholderText(/COE/), { target: { value: 'COE-A' } })
    fireEvent.click(screen.getByText('Apply'))
    expect(onSelect).toHaveBeenCalledWith({ filters: { coe: ['COE-A'] } })
  })

  it('should show checkmark on selected preset', async () => {
    render(<ScopeSelector onSelect={() => {}} />)
    await waitFor(() => expect(screen.getByText(/All Active/)).toBeInTheDocument())
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should disable buttons when disabled prop is true', () => {
    render(<ScopeSelector onSelect={() => {}} disabled />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => expect(btn).toBeDisabled())
  })

  it('should show scope count when > 0', async () => {
    render(<ScopeSelector onSelect={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })
})

describe('useScopeLabel', () => {
  it('should return preset label for known presets', () => {
    const { result } = renderHook(() => useScopeLabel({ preset: 'all-active' }))
    expect(result.current.label).toBe('All Active')
  })

  it('should return Custom for filter-based scope', () => {
    const { result } = renderHook(() => useScopeLabel({ filters: { coe: ['COE-A'] } }))
    expect(result.current.label).toBe('Custom')
    expect(result.current.details).toBe('coe: COE-A')
  })

  it('should return All Active as default', () => {
    const { result } = renderHook(() => useScopeLabel({}))
    expect(result.current.label).toBe('All Active')
  })

  it('should return raw preset name for unknown presets', () => {
    const { result } = renderHook(() => useScopeLabel({ preset: 'custom-preset' }))
    expect(result.current.label).toBe('custom-preset')
  })
})
