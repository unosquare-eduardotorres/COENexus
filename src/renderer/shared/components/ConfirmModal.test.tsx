import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmModal from './ConfirmModal'

describe('ConfirmModal', () => {
  it('should render title and message', () => {
    render(
      <ConfirmModal title="Delete?" message="This cannot be undone." onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByText('Delete?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('should call onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmModal title="Are you sure?" message="This is permanent." onConfirm={onConfirm} onCancel={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('should call onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal title="Are you sure?" message="This is permanent." onConfirm={() => {}} onCancel={onCancel} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('should use custom button labels', () => {
    render(
      <ConfirmModal title="T" message="M" confirmLabel="Yes, delete" cancelLabel="No, keep" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByText('Yes, delete')).toBeInTheDocument()
    expect(screen.getByText('No, keep')).toBeInTheDocument()
  })

  it('should call onCancel on Escape key', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
