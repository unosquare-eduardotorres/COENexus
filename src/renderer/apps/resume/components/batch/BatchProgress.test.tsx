import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import BatchProgress from './BatchProgress'
import { BatchConfig, BatchResult } from '../../types'

vi.mock('../../services/batchService', () => ({
  batchService: {
    processFiles: vi.fn(),
  },
}))

const { batchService } = await import('../../services/batchService')

function createFile(name: string): File {
  return new File(['content'], name, { type: 'application/pdf' })
}

const mockConfig: BatchConfig = {
  flow: 'resume-processing',
  template: 'default',
} as BatchConfig

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BatchProgress', () => {
  it('should render initial progress state', () => {
    vi.mocked(batchService.processFiles).mockReturnValue(new Promise(() => {}))
    const files = [createFile('file1.pdf'), createFile('file2.pdf')]
    render(<BatchProgress files={files} config={mockConfig} onComplete={() => {}} />)
    expect(screen.getByText(/Processing 0 of 2/)).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should display file names in status list', () => {
    vi.mocked(batchService.processFiles).mockReturnValue(new Promise(() => {}))
    const files = [createFile('resume_a.pdf'), createFile('resume_b.pdf')]
    render(<BatchProgress files={files} config={mockConfig} onComplete={() => {}} />)
    expect(screen.getByText('resume_a.pdf')).toBeInTheDocument()
    expect(screen.getByText('resume_b.pdf')).toBeInTheDocument()
  })

  it('should show Initializing when no file name is set', () => {
    vi.mocked(batchService.processFiles).mockReturnValue(new Promise(() => {}))
    render(<BatchProgress files={[createFile('test.pdf')]} config={mockConfig} onComplete={() => {}} />)
    expect(screen.getByText('Initializing...')).toBeInTheDocument()
  })

  it('should call onComplete when processing finishes', async () => {
    const results: BatchResult[] = [
      { id: '1', fileName: 'file1.pdf', status: 'success', flow: 'resume-processing' } as BatchResult,
    ]
    vi.mocked(batchService.processFiles).mockResolvedValue(results)
    const onComplete = vi.fn()
    render(<BatchProgress files={[createFile('file1.pdf')]} config={mockConfig} onComplete={onComplete} />)
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(results)
    }, { timeout: 2000 })
  })

  it('should render File Status heading', () => {
    vi.mocked(batchService.processFiles).mockReturnValue(new Promise(() => {}))
    render(<BatchProgress files={[createFile('a.pdf')]} config={mockConfig} onComplete={() => {}} />)
    expect(screen.getByText('File Status')).toBeInTheDocument()
  })
})
