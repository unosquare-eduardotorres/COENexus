import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DataMaintenanceTab from './DataMaintenanceTab'

vi.mock('../../../../shared/utils/rendererLogger', () => ({
  createRendererLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

const mockBackfill = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockBackfill.mockReset()
  Object.defineProperty(window, 'api', {
    value: {
      sync: {
        backfillSalaryNormalization: mockBackfill,
      },
    },
    writable: true,
  })
})

describe('DataMaintenanceTab', () => {
  it('should render backfill button', () => {
    render(<DataMaintenanceTab />)
    expect(screen.getByText('Normalize Salaries')).toBeInTheDocument()
  })

  it('should show loading state when running', async () => {
    mockBackfill.mockImplementation(() => new Promise(() => {}))

    render(<DataMaintenanceTab />)
    fireEvent.click(screen.getByText('Normalize Salaries'))

    await waitFor(() => {
      expect(screen.getByText('Running...')).toBeInTheDocument()
    })
  })

  it('should display results after successful backfill', async () => {
    mockBackfill.mockResolvedValue({
      candidatesUpdated: 15,
      employeesUpdated: 8,
      errors: 0,
    })

    render(<DataMaintenanceTab />)
    fireEvent.click(screen.getByText('Normalize Salaries'))

    await waitFor(() => {
      expect(screen.getByText('Backfill Complete')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
    })
  })

  it('should display error message on failure', async () => {
    mockBackfill.mockRejectedValue(new Error('Database locked'))

    render(<DataMaintenanceTab />)
    fireEvent.click(screen.getByText('Normalize Salaries'))

    await waitFor(() => {
      expect(screen.getByText('Database locked')).toBeInTheDocument()
    })
  })

  it('should disable button while running', async () => {
    mockBackfill.mockImplementation(() => new Promise(() => {}))

    render(<DataMaintenanceTab />)
    const button = screen.getByText('Normalize Salaries')
    fireEvent.click(button)

    await waitFor(() => {
      const runningButton = screen.getByText('Running...').closest('button')
      expect(runningButton).toBeDisabled()
    })
  })
})
