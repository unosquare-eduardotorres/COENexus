import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorDetailModal from './ErrorDetailModal'

describe('ErrorDetailModal', () => {
  it('should render name and error text', () => {
    render(<ErrorDetailModal name="Alice Smith" error="Network timeout on upstream API" onClose={() => {}} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Network timeout on upstream API')).toBeInTheDocument()
    expect(screen.getByText('Error Detail')).toBeInTheDocument()
  })

  it('should call onClose when Close button is clicked', () => {
    const onClose = vi.fn()
    render(<ErrorDetailModal name="Test" error="err" onClose={onClose} />)
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should call onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<ErrorDetailModal name="Test" error="err" onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<ErrorDetailModal name="Test" error="err" onClose={onClose} />)
    const backdrop = screen.getByText('Test').closest('.fixed')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('should render error in a pre element', () => {
    render(<ErrorDetailModal name="X" error="Stack trace line 1\nline 2" onClose={() => {}} />)
    const pre = screen.getByText(/Stack trace line 1/)
    expect(pre.tagName).toBe('PRE')
  })
})
