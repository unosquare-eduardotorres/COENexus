import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BatchResults from './BatchResults'
import { BatchResult } from '../../types'

function buildResult(overrides: Partial<BatchResult> = {}): BatchResult {
  return {
    id: '1',
    fileName: 'resume.pdf',
    status: 'success',
    flow: 'resume-processing',
    ...overrides,
  } as BatchResult
}

describe('BatchResults', () => {
  it('should display total, success, and error counts', () => {
    const results = [
      buildResult({ id: '1', status: 'success' }),
      buildResult({ id: '2', status: 'success' }),
      buildResult({ id: '3', status: 'error', error: 'Parse failed' }),
    ]
    render(<BatchResults results={results} onReset={() => {}} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Total Processed')).toBeInTheDocument()
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('should render file names in the table', () => {
    const results = [
      buildResult({ id: '1', fileName: 'alice_resume.pdf' }),
      buildResult({ id: '2', fileName: 'bob_cv.docx' }),
    ]
    render(<BatchResults results={results} onReset={() => {}} />)
    expect(screen.getByText('alice_resume.pdf')).toBeInTheDocument()
    expect(screen.getByText('bob_cv.docx')).toBeInTheDocument()
  })

  it('should show Success badge for successful results', () => {
    render(<BatchResults results={[buildResult()]} onReset={() => {}} />)
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('should show Error badge for failed results', () => {
    render(<BatchResults results={[buildResult({ status: 'error', error: 'Timeout' })]} onReset={() => {}} />)
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('should show View and Download for successful results', () => {
    render(<BatchResults results={[buildResult()]} onReset={() => {}} />)
    expect(screen.getByText('View')).toBeInTheDocument()
    expect(screen.getByText('Download')).toBeInTheDocument()
  })

  it('should show Retry for failed results', () => {
    render(<BatchResults results={[buildResult({ status: 'error' })]} onReset={() => {}} />)
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('should display Resume Processing flow label', () => {
    render(<BatchResults results={[buildResult({ flow: 'resume-processing' })]} onReset={() => {}} />)
    expect(screen.getByText('Resume Processing')).toBeInTheDocument()
  })

  it('should call onReset when Start New Batch is clicked', () => {
    const onReset = vi.fn()
    render(<BatchResults results={[buildResult()]} onReset={onReset} />)
    fireEvent.click(screen.getByText('Start New Batch'))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
