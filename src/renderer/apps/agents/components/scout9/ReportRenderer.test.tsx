import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ReportRenderer from './ReportRenderer'

vi.mock('lucide-react', () => ({
  Check: ({ size }: { size: number }) => <span data-testid="check-icon">{size}</span>,
  SkipForward: ({ size }: { size: number }) => <span data-testid="skip-icon">{size}</span>,
  Brain: ({ size }: { size: number }) => <span data-testid="brain-icon">{size}</span>,
  User: ({ size }: { size: number }) => <span data-testid="user-icon">{size}</span>,
  Briefcase: ({ size }: { size: number }) => <span data-testid="briefcase-icon">{size}</span>,
}))

vi.mock('./SkipModal', () => ({
  default: ({ candidateName, onSubmit, onClose }: { candidateName: string; onSubmit: (data: { reason: string; scope: string }) => void; onClose: () => void }) => (
    <div data-testid="skip-modal">
      <span>{candidateName}</span>
      <button onClick={() => onSubmit({ reason: 'Not a fit', scope: 'position' })}>Submit Skip</button>
      <button onClick={onClose}>Close Skip</button>
    </div>
  ),
}))

vi.mock('./BrainSnapshotViewer', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="brain-viewer"><button onClick={onClose}>Close Brain</button></div>
  ),
}))

const mockReport = {
  id: 'r1',
  job_id: 'j1',
  report_title: 'Matching Report Q1',
  report_markdown: JSON.stringify({ summary: 'Found 3 candidates' }),
  status: 'complete',
  confidence_score: 85,
  created_at: '2026-04-14T10:00:00Z',
}

function buildCandidate(overrides = {}) {
  return {
    id: 'c1',
    title: 'Alice Smith',
    details: 'Senior React Developer',
    source_ref: 'REQ-001',
    status: 'pending' as const,
    confidence_score: 90,
    metadata_json: '{}',
    ...overrides,
  }
}

describe('ReportRenderer', () => {
  it('should render report title and summary', () => {
    render(<ReportRenderer report={mockReport} candidates={[]} onUpdateCandidate={() => {}} onSubmitSkip={() => {}} />)
    expect(screen.getByText('Matching Report Q1')).toBeInTheDocument()
    expect(screen.getByText('Found 3 candidates')).toBeInTheDocument()
  })

  it('should show empty state when no candidates', () => {
    render(<ReportRenderer report={mockReport} candidates={[]} onUpdateCandidate={() => {}} onSubmitSkip={() => {}} />)
    expect(screen.getByText('No candidates in this report.')).toBeInTheDocument()
  })

  it('should render candidate card with title and details', () => {
    render(<ReportRenderer report={mockReport} candidates={[buildCandidate()]} onUpdateCandidate={() => {}} onSubmitSkip={() => {}} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
    expect(screen.getByText('REQ-001')).toBeInTheDocument()
  })

  it('should render confidence score bar', () => {
    render(<ReportRenderer report={mockReport} candidates={[buildCandidate()]} onUpdateCandidate={() => {}} onSubmitSkip={() => {}} />)
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('should show Select and Skip buttons for pending candidates', () => {
    render(<ReportRenderer report={mockReport} candidates={[buildCandidate()]} onUpdateCandidate={() => {}} onSubmitSkip={() => {}} />)
    expect(screen.getByText('Select')).toBeInTheDocument()
    expect(screen.getByText('Skip')).toBeInTheDocument()
  })

  it('should not show action buttons for approved candidates', () => {
    render(<ReportRenderer report={mockReport} candidates={[buildCandidate({ status: 'approved' })]} onUpdateCandidate={() => {}} onSubmitSkip={() => {}} />)
    expect(screen.queryByText('Select')).not.toBeInTheDocument()
    expect(screen.queryByText('Skip')).not.toBeInTheDocument()
  })

  it('should call onUpdateCandidate when Select clicked', () => {
    const onUpdate = vi.fn()
    render(<ReportRenderer report={mockReport} candidates={[buildCandidate()]} onUpdateCandidate={onUpdate} onSubmitSkip={() => {}} />)
    fireEvent.click(screen.getByText('Select'))
    expect(onUpdate).toHaveBeenCalledWith('c1', 'approved')
  })

  it('should open skip modal when Skip clicked', () => {
    render(<ReportRenderer report={mockReport} candidates={[buildCandidate()]} onUpdateCandidate={() => {}} onSubmitSkip={() => {}} />)
    fireEvent.click(screen.getByText('Skip'))
    expect(screen.getByTestId('skip-modal')).toBeInTheDocument()
  })

  it('should call onSubmitSkip and update status when skip submitted', () => {
    const onSubmitSkip = vi.fn()
    const onUpdate = vi.fn()
    render(<ReportRenderer report={mockReport} candidates={[buildCandidate()]} onUpdateCandidate={onUpdate} onSubmitSkip={onSubmitSkip} />)
    fireEvent.click(screen.getByText('Skip'))
    fireEvent.click(screen.getByText('Submit Skip'))
    expect(onSubmitSkip).toHaveBeenCalledWith('c1', 'Not a fit', 'position')
    expect(onUpdate).toHaveBeenCalledWith('c1', 'skipped')
  })

  it('should open brain snapshot viewer', () => {
    render(<ReportRenderer report={mockReport} candidates={[]} onUpdateCandidate={() => {}} onSubmitSkip={() => {}} />)
    fireEvent.click(screen.getByText('Brain Snapshot'))
    expect(screen.getByTestId('brain-viewer')).toBeInTheDocument()
  })

  it('should display status badge for each candidate', () => {
    render(<ReportRenderer report={mockReport} candidates={[buildCandidate({ status: 'approved' })]} onUpdateCandidate={() => {}} onSubmitSkip={() => {}} />)
    expect(screen.getByText('approved')).toBeInTheDocument()
  })
})
