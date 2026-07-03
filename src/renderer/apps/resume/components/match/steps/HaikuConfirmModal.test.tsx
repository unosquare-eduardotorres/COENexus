import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HaikuConfirmModal from './HaikuConfirmModal'
import { HaikuConfirmPayload } from '../../../types'

function buildPayload(overrides: Partial<HaikuConfirmPayload> = {}): HaikuConfirmPayload {
  return {
    requestedTopN: 10,
    passedCount: 5,
    bestRejected: [],
    ...overrides,
  } as HaikuConfirmPayload
}

describe('HaikuConfirmModal', () => {
  it('should display requested and passed counts', () => {
    render(<HaikuConfirmModal haikuConfirm={buildPayload()} onDecision={() => {}} />)
    expect(screen.getByText('Fewer Matches Than Requested')).toBeInTheDocument()
    expect(screen.getByText(/Top 10/)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should render best rejected candidates when provided', () => {
    const payload = buildPayload({
      bestRejected: [
        { name: 'Alice', haikuScore: 35, seniority: 'Senior', mainSkill: 'React' },
        { name: 'Bob', haikuScore: 30, seniority: null, mainSkill: null },
      ],
    })
    render(<HaikuConfirmModal haikuConfirm={payload} onDecision={() => {}} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
    expect(screen.getByText('Senior')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('should not render best rejected section when empty', () => {
    render(<HaikuConfirmModal haikuConfirm={buildPayload()} onDecision={() => {}} />)
    expect(screen.queryByText('Next Best Candidates')).not.toBeInTheDocument()
  })

  it('should call onDecision with proceed when proceed button clicked', () => {
    const onDecision = vi.fn()
    render(<HaikuConfirmModal haikuConfirm={buildPayload({ passedCount: 3 })} onDecision={onDecision} />)
    fireEvent.click(screen.getByText('Proceed with 3'))
    expect(onDecision).toHaveBeenCalledWith('proceed')
  })

  it('should call onDecision with include-all when include button clicked', () => {
    const onDecision = vi.fn()
    render(<HaikuConfirmModal haikuConfirm={buildPayload()} onDecision={onDecision} />)
    fireEvent.click(screen.getByText('Include Low Scores'))
    expect(onDecision).toHaveBeenCalledWith('include-all')
  })
})
