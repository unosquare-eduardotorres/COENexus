import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBanner from './ErrorBanner'

describe('ErrorBanner', () => {
  it('should render error message', () => {
    render(<ErrorBanner message="Something went wrong" severity="error" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should render with alert role for error severity', () => {
    render(<ErrorBanner message="Error" severity="error" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should render with status role for info severity', () => {
    render(<ErrorBanner message="Info" severity="info" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('should show dismiss button when onDismiss provided', () => {
    const onDismiss = vi.fn()
    render(<ErrorBanner message="Dismissible" severity="warning" onDismiss={onDismiss} />)
    const dismissBtn = screen.getByLabelText('Dismiss banner')
    fireEvent.click(dismissBtn)
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('should not show dismiss button without onDismiss', () => {
    render(<ErrorBanner message="No dismiss" severity="info" />)
    expect(screen.queryByLabelText('Dismiss banner')).not.toBeInTheDocument()
  })
})
