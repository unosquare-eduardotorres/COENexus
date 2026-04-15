import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LogStream, { LogEntry } from './LogStream'

function buildLog(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: '12:00:00',
    source: 'info',
    message: 'Test log message',
    ...overrides,
  }
}

describe('LogStream', () => {
  it('should render Event Log heading', () => {
    render(<LogStream logs={[]} />)
    expect(screen.getByText('Event Log')).toBeInTheDocument()
  })

  it('should show empty state when no logs', () => {
    render(<LogStream logs={[]} />)
    expect(screen.getByText(/No events yet/)).toBeInTheDocument()
  })

  it('should render log entries with timestamp, source, and message', () => {
    const logs = [
      buildLog({ timestamp: '12:00:01', source: 'step', message: 'Starting pipeline' }),
      buildLog({ timestamp: '12:00:02', source: 'tool', message: 'Fetching data' }),
    ]
    render(<LogStream logs={logs} />)
    expect(screen.getByText('12:00:01')).toBeInTheDocument()
    expect(screen.getByText('step')).toBeInTheDocument()
    expect(screen.getByText('Starting pipeline')).toBeInTheDocument()
    expect(screen.getByText('12:00:02')).toBeInTheDocument()
    expect(screen.getByText('tool')).toBeInTheDocument()
    expect(screen.getByText('Fetching data')).toBeInTheDocument()
  })

  it('should render different source types with correct labels', () => {
    const logs = [
      buildLog({ source: 'ai', message: 'AI response' }),
      buildLog({ source: 'error', message: 'Failed step' }),
    ]
    render(<LogStream logs={logs} />)
    expect(screen.getByText('ai')).toBeInTheDocument()
    expect(screen.getByText('error')).toBeInTheDocument()
  })

  it('should limit display to last 500 logs', () => {
    const logs = Array.from({ length: 600 }, (_, i) =>
      buildLog({ timestamp: `${i}`, message: `Log ${i}` })
    )
    render(<LogStream logs={logs} />)
    expect(screen.queryByText('Log 0')).not.toBeInTheDocument()
    expect(screen.getByText('Log 599')).toBeInTheDocument()
    expect(screen.getByText('Log 100')).toBeInTheDocument()
  })

  it('should not show empty message when logs exist', () => {
    render(<LogStream logs={[buildLog()]} />)
    expect(screen.queryByText(/No events yet/)).not.toBeInTheDocument()
  })
})
