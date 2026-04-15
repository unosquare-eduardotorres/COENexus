import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StepperBar from './StepperBar'

const stepLabels = [
  { key: 'step1', title: 'Upload', icon: '1' },
  { key: 'step2', title: 'Review', icon: '2' },
  { key: 'step3', title: 'Complete', icon: '3' },
]

describe('StepperBar', () => {
  it('should render all step titles', () => {
    render(
      <StepperBar
        stepLabels={stepLabels}
        currentStepKey="step1"
        completedSteps={new Set()}
        onStepClick={() => {}}
        stepSummaries={{}}
      />
    )
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('should call onStepClick when completed step is clicked', () => {
    const onClick = vi.fn()
    render(
      <StepperBar
        stepLabels={stepLabels}
        currentStepKey="step2"
        completedSteps={new Set(['step1'])}
        onStepClick={onClick}
        stepSummaries={{}}
      />
    )
    fireEvent.click(screen.getByText('Upload'))
    expect(onClick).toHaveBeenCalledWith('step1')
  })

  it('should not call onStepClick for incomplete steps', () => {
    const onClick = vi.fn()
    render(
      <StepperBar
        stepLabels={stepLabels}
        currentStepKey="step1"
        completedSteps={new Set()}
        onStepClick={onClick}
        stepSummaries={{}}
      />
    )
    fireEvent.click(screen.getByText('Review'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('should show summary for completed steps', () => {
    render(
      <StepperBar
        stepLabels={stepLabels}
        currentStepKey="step2"
        completedSteps={new Set(['step1'])}
        onStepClick={() => {}}
        stepSummaries={{ step1: { icon: '✓', label: 'file.pdf' } }}
      />
    )
    expect(screen.getByText('file.pdf')).toBeInTheDocument()
  })
})
