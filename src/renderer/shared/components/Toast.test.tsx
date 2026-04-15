import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Toast from './Toast'

describe('Toast', () => {
  it('should render message text', () => {
    render(<Toast id={1} message="Operation completed" severity="success" isVisible={true} onDismiss={() => {}} />)
    expect(screen.getByText('Operation completed')).toBeInTheDocument()
  })

  it('should use alert role for error severity', () => {
    render(<Toast id={1} message="Error" severity="error" isVisible={true} onDismiss={() => {}} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should use status role for info severity', () => {
    render(<Toast id={1} message="Info" severity="info" isVisible={true} onDismiss={() => {}} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should call onDismiss with toast id when dismiss clicked', () => {
    const onDismiss = vi.fn()
    render(<Toast id={42} message="Dismiss me" severity="warning" isVisible={true} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByLabelText('Dismiss notification'))
    expect(onDismiss).toHaveBeenCalledWith(42)
  })

  it('should render all severity types without crashing', () => {
    const severities = ['success', 'warning', 'error', 'info'] as const
    severities.forEach((severity) => {
      const { unmount } = render(
        <Toast id={1} message={`${severity} toast`} severity={severity} isVisible={true} onDismiss={() => {}} />
      )
      expect(screen.getByText(`${severity} toast`)).toBeInTheDocument()
      unmount()
    })
  })
})
