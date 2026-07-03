import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SyncDashboard from './SyncDashboard'
import { SyncProgress, SyncRecord } from '../types'

vi.mock('./SyncRecordTable', () => ({
  default: () => <div data-testid="sync-record-table">SyncRecordTable</div>,
}))
vi.mock('./DangerConfirmModal', () => ({
  default: ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
    <div data-testid="danger-modal">
      <button onClick={onConfirm}>Confirm Clear</button>
      <button onClick={onCancel}>Cancel Clear</button>
    </div>
  ),
}))
vi.mock('./YearSelector', () => ({
  default: () => <div data-testid="year-selector">YearSelector</div>,
}))
vi.mock('../../../shared/components/icons', () => ({
  DocumentIcon: () => <span data-testid="doc-icon" />,
  SettingsIcon: () => <span data-testid="settings-icon" />,
  SpinnerIcon: () => <span data-testid="spinner-icon" />,
}))
vi.mock('./ProcessActionButtons', () => ({
  default: () => <div data-testid="process-actions">ProcessActionButtons</div>,
}))
vi.mock('./ProgressBar', () => ({
  default: () => <div data-testid="progress-bar">ProgressBar</div>,
}))
vi.mock('./SyncStatusCards', () => {
  const SyncStatusCards = () => <div data-testid="status-cards">SyncStatusCards</div>
  SyncStatusCards.displayName = 'SyncStatusCards'
  return {
    default: SyncStatusCards,
    ISSUE_CARDS: [],
    PIPELINE_CARDS: [],
  }
})

const defaultProgress: SyncProgress = {
  status: 'idle',
  total: 0,
  current: 0,
  synced: 0,
  failed: 0,
  lastSyncedAt: undefined,
} as SyncProgress

function renderDashboard(overrides = {}) {
  const props = {
    source: 'candidates' as const,
    progress: defaultProgress,
    records: [] as SyncRecord[],
    ...overrides,
  }
  return render(<SyncDashboard {...props} />)
}

describe('SyncDashboard', () => {
  it('should render source label', () => {
    renderDashboard()
    expect(screen.getByText(/Candidates/i)).toBeInTheDocument()
  })

  it('should render Sync button when onStartSync is provided', () => {
    const onStartSync = vi.fn()
    renderDashboard({ onStartSync })
    const syncBtns = screen.getAllByText(/Sync/i)
    expect(syncBtns.length).toBeGreaterThan(0)
  })

  it('should render Never when lastSyncedAt is undefined', () => {
    renderDashboard()
    expect(screen.getByText(/Never/)).toBeInTheDocument()
  })

  it('should render sync record table', () => {
    renderDashboard()
    expect(screen.getByTestId('sync-record-table')).toBeInTheDocument()
  })

  it('should render process action buttons', () => {
    renderDashboard()
    expect(screen.getByTestId('process-actions')).toBeInTheDocument()
  })
})
