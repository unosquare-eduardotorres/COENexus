import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BenchEmployeeSelector from './BenchEmployeeSelector'
import { BenchEmployee } from '../../types'

const mockEmployee = (overrides: Partial<BenchEmployee> = {}): BenchEmployee => ({
  upstreamId: 1,
  name: 'Alice Smith',
  email: 'alice@test.com',
  seniority: 'Senior',
  mainSkill: 'React',
  country: 'US',
  grossMonthlySalary: 5000,
  salaryCurrency: 'USD',
  lastAccount: 'Acme Corp',
  isVectorized: true,
  ...overrides,
} as BenchEmployee)

vi.mock('../../services/benchBurnService', () => ({
  benchBurnService: {
    getBenchEmployees: vi.fn(),
  },
}))

vi.mock('./SortableHeader', () => {
  const SortableHeader = ({ label }: { label: string }) => <th>{label}</th>
  SortableHeader.displayName = 'SortableHeader'
  return {
    default: SortableHeader,
    useSort: () => ({ sortKey: 'name', sortDir: 'asc' as const, handleSort: vi.fn() }),
    sortData: <T,>(data: T[]) => data,
  }
})

const { benchBurnService } = await import('../../services/benchBurnService')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BenchEmployeeSelector', () => {
  it('should show loading spinner initially', () => {
    vi.mocked(benchBurnService.getBenchEmployees).mockReturnValue(new Promise(() => {}))
    render(<BenchEmployeeSelector onNext={() => {}} />)
    expect(screen.getByText('Loading bench employees...')).toBeInTheDocument()
  })

  it('should show error message when load fails', async () => {
    vi.mocked(benchBurnService.getBenchEmployees).mockRejectedValue(new Error('Network error'))
    render(<BenchEmployeeSelector onNext={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/Failed to load bench employees: Network error/)).toBeInTheDocument()
    })
  })

  it('should render employee rows after loading', async () => {
    vi.mocked(benchBurnService.getBenchEmployees).mockResolvedValue([
      mockEmployee(),
      mockEmployee({ upstreamId: 2, name: 'Bob Jones', email: 'bob@test.com' }),
    ])
    render(<BenchEmployeeSelector onNext={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    })
  })

  it('should toggle employee selection on row click', async () => {
    vi.mocked(benchBurnService.getBenchEmployees).mockResolvedValue([mockEmployee()])
    render(<BenchEmployeeSelector onNext={() => {}} />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Alice Smith'))
    expect(screen.getByText(/selected/)).toBeInTheDocument()
    expect(screen.getByText(/Continue with 1/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Alice Smith'))
    expect(screen.getByText(/Continue with 0/)).toBeInTheDocument()
  })

  it('should not select non-vectorized employees', async () => {
    vi.mocked(benchBurnService.getBenchEmployees).mockResolvedValue([
      mockEmployee({ isVectorized: false }),
    ])
    render(<BenchEmployeeSelector onNext={() => {}} />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alice Smith'))
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should disable Continue button when no employees selected', async () => {
    vi.mocked(benchBurnService.getBenchEmployees).mockResolvedValue([mockEmployee()])
    render(<BenchEmployeeSelector onNext={() => {}} />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    const continueBtn = screen.getByText(/Continue with 0/i)
    expect(continueBtn).toBeDisabled()
  })

  it('should call onNext with selected employees', async () => {
    const onNext = vi.fn()
    vi.mocked(benchBurnService.getBenchEmployees).mockResolvedValue([mockEmployee()])
    render(<BenchEmployeeSelector onNext={onNext} />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Alice Smith'))
    fireEvent.click(screen.getByText(/Continue with 1/i))
    expect(onNext).toHaveBeenCalledWith([expect.objectContaining({ name: 'Alice Smith' })])
  })

  it('should filter employees by search text', async () => {
    vi.mocked(benchBurnService.getBenchEmployees).mockResolvedValue([
      mockEmployee({ upstreamId: 1, name: 'Alice Smith' }),
      mockEmployee({ upstreamId: 2, name: 'Bob Jones', email: 'bob@test.com' }),
    ])
    render(<BenchEmployeeSelector onNext={() => {}} />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'bob' } })
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
  })

  it('should deselect all when Clear is clicked', async () => {
    vi.mocked(benchBurnService.getBenchEmployees).mockResolvedValue([mockEmployee()])
    render(<BenchEmployeeSelector onNext={() => {}} />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Alice Smith'))
    expect(screen.getByText(/Continue with 1/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Clear'))
    expect(screen.getByText(/Continue with 0/)).toBeInTheDocument()
  })
})
