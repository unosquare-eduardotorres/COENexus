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

  it('should render action buttons when actions are provided', () => {
    const action = { label: 'Open File', onClick: vi.fn() }
    const onDismiss = vi.fn()
    render(<Toast id={1} message="Exported" severity="success" isVisible={true} onDismiss={onDismiss} actions={[action]} />)
    const btn = screen.getByText('Open File')
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(action.onClick).toHaveBeenCalled()
    expect(onDismiss).toHaveBeenCalledWith(1)
  })

  it('should not render action row when no actions provided', () => {
    render(<Toast id={1} message="No actions" severity="info" isVisible={true} onDismiss={() => {}} />)
    expect(screen.queryByRole('button', { name: /open/i })).not.toBeInTheDocument()
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
