import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DatabaseUpdateBanner from './DatabaseUpdateBanner'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(window.api.database.getConfig).mockResolvedValue({
    isConfigured: true,
    sharedPath: '/shared',
    exporterName: 'admin',
  })
  vi.mocked(window.api.database.listSnapshots).mockResolvedValue({
    snapshots: [{
      filename: 'nexus-2026-04-14.db',
      exportedAt: '2026-04-14T10:00:00Z',
      exportedBy: 'Eduardo',
      sizeBytes: 1024,
      recordCounts: { candidates: 50, employees: 30 },
      isNew: true,
    }],
  })
})

describe('DatabaseUpdateBanner', () => {
  it('should render nothing when not configured', async () => {
    vi.mocked(window.api.database.getConfig).mockResolvedValue({
      isConfigured: false,
      sharedPath: '',
      exporterName: '',
    })
    const { container } = render(<DatabaseUpdateBanner />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should render nothing when no new snapshots exist', async () => {
    vi.mocked(window.api.database.listSnapshots).mockResolvedValue({
      snapshots: [{ filename: 'old.db', exportedAt: '2026-01-01T00:00:00Z', exportedBy: 'admin', sizeBytes: 100, recordCounts: {}, isNew: false }],
    })
    const { container } = render(<DatabaseUpdateBanner />)
    await waitFor(() => {
      expect(container.querySelector('.glass-card')).toBeNull()
    })
  })

  it('should display banner with snapshot info when new snapshot available', async () => {
    render(<DatabaseUpdateBanner />)
    await waitFor(() => {
      expect(screen.getByText(/New database snapshot available from Eduardo/)).toBeInTheDocument()
    })
    expect(screen.getByText(/80 records across 2 tables/)).toBeInTheDocument()
    expect(screen.getByText(/nexus-2026-04-14.db/)).toBeInTheDocument()
  })

  it('should show Import and Dismiss buttons', async () => {
    render(<DatabaseUpdateBanner />)
    await waitFor(() => {
      expect(screen.getByText('Import')).toBeInTheDocument()
      expect(screen.getByText('Dismiss')).toBeInTheDocument()
    })
  })

  it('should hide banner when Dismiss is clicked', async () => {
    render(<DatabaseUpdateBanner />)
    await waitFor(() => expect(screen.getByText('Dismiss')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Dismiss'))
    expect(screen.queryByText(/New database snapshot/)).not.toBeInTheDocument()
  })

  it('should call import API when Import is clicked', async () => {
    vi.mocked(window.api.database.import).mockResolvedValue({ success: true })
    render(<DatabaseUpdateBanner />)
    await waitFor(() => expect(screen.getByText('Import')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Import'))
    await waitFor(() => {
      expect(window.api.database.import).toHaveBeenCalledWith({ filename: 'nexus-2026-04-14.db' })
    })
  })
})
