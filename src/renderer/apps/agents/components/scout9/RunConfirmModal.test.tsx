import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RunConfirmModal from './RunConfirmModal'

vi.mock('lucide-react', () => ({
  Zap: ({ size }: { size: number }) => <span data-testid="zap-icon">{size}</span>,
  X: ({ size }: { size: number }) => <span data-testid="x-icon">{size}</span>,
}))

describe('RunConfirmModal', () => {
  it('should return null when not open', () => {
    const { container } = render(
      <RunConfirmModal open={false} onConfirm={() => {}} onCancel={() => {}} scopeLabel="All Active" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render modal title and scope label when open', () => {
    render(<RunConfirmModal open onConfirm={() => {}} onCancel={() => {}} scopeLabel="All Active" />)
    expect(screen.getByText('Run Scout-9 Pipeline')).toBeInTheDocument()
    expect(screen.getByText('All Active')).toBeInTheDocument()
  })

  it('should render scope details when provided', () => {
    render(<RunConfirmModal open onConfirm={() => {}} onCancel={() => {}} scopeLabel="Custom" scopeDetails="coe: COE-A" />)
    expect(screen.getByText('coe: COE-A')).toBeInTheDocument()
  })

  it('should not render scope details when not provided', () => {
    render(<RunConfirmModal open onConfirm={() => {}} onCancel={() => {}} scopeLabel="All Active" />)
    expect(screen.queryByText('coe:')).not.toBeInTheDocument()
  })

  it('should call onConfirm when Run Pipeline clicked', () => {
    const onConfirm = vi.fn()
    render(<RunConfirmModal open onConfirm={onConfirm} onCancel={() => {}} scopeLabel="All Active" />)
    fireEvent.click(screen.getByText('Run Pipeline'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('should call onCancel when Cancel clicked', () => {
    const onCancel = vi.fn()
    render(<RunConfirmModal open onConfirm={() => {}} onCancel={onCancel} scopeLabel="All Active" />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should call onCancel when backdrop clicked', () => {
    const onCancel = vi.fn()
    render(<RunConfirmModal open onConfirm={() => {}} onCancel={onCancel} scopeLabel="All Active" />)
    const backdrop = document.querySelector('.absolute.inset-0')!
    fireEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should call onCancel when X button clicked', () => {
    const onCancel = vi.fn()
    render(<RunConfirmModal open onConfirm={() => {}} onCancel={onCancel} scopeLabel="All Active" />)
    const xButtons = screen.getAllByTestId('x-icon')
    fireEvent.click(xButtons[0].closest('button')!)
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
