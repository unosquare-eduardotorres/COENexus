import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastContext'

function TestConsumer() {
  const { showToast } = useToast()
  return <button onClick={() => showToast('Test message', 'success')}>Show Toast</button>
}

function ActionConsumer() {
  const { showToast } = useToast()
  return (
    <button onClick={() => showToast('Exported', 'success', 8000, [{ label: 'Open', onClick: () => {} }])}>
      Show
    </button>
  )
}

describe('ToastContext', () => {
  it('should render provider without crashing', () => {
    render(
      <ToastProvider>
        <div>App content</div>
      </ToastProvider>
    )
    expect(screen.getByText('App content')).toBeInTheDocument()
  })

  it('should show toast when showToast is called', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Toast').click()
    })

    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('should pass actions to rendered toast', () => {
    render(
      <ToastProvider>
        <ActionConsumer />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show').click()
    })

    expect(screen.getByText('Open')).toBeInTheDocument()
  })
})
