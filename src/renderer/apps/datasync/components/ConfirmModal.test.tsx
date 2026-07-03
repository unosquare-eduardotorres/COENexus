import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmModal from './ConfirmModal'

describe('ConfirmModal (DataSync)', () => {
  it('should render title and message', () => {
    render(<ConfirmModal title="Delete All?" message="This will clear all data." onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Delete All?')).toBeInTheDocument()
    expect(screen.getByText('This will clear all data.')).toBeInTheDocument()
  })

  it('should use default button labels', () => {
    render(<ConfirmModal title="T" message="M" onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should use custom button labels', () => {
    render(<ConfirmModal title="T" message="M" confirmLabel="Yes, Delete" cancelLabel="No, Keep" onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument()
    expect(screen.getByText('No, Keep')).toBeInTheDocument()
  })

  it('should call onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmModal title="T" message="M" onConfirm={onConfirm} onCancel={() => {}} />)
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('should call onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should call onCancel on Escape key', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should call onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />)
    const backdrop = document.querySelector('[role="presentation"]')!
    fireEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should have dialog role with aria attributes', () => {
    render(<ConfirmModal title="T" message="M" onConfirm={() => {}} onCancel={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('should apply danger variant styling', () => {
    render(<ConfirmModal title="T" message="M" variant="danger" onConfirm={() => {}} onCancel={() => {}} />)
    const confirmBtn = screen.getByText('Confirm')
    expect(confirmBtn.className).toContain('bg-red')
  })
})
