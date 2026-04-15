import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SaveExportStep from './SaveExportStep'

const mockContextValue = {
  transform: {
    processingMetrics: [],
    transformedResumes: [],
  },
  review: {
    editedResumes: new Map(),
  },
  export: {
    handleExportDocx: vi.fn(),
    handleExportPdf: vi.fn(),
    handlePresentToPosition: vi.fn(),
  },
  ats: {
    handleSyncToATS: vi.fn(),
    canUploadToATS: false,
    uploadingToATS: new Set<string>(),
    uploadedToATS: new Set<string>(),
    canPresent: false,
  },
  intent: { sourceType: 'ats-candidates' },
  jobDescription: { selectedPosition: null },
  session: {
    savingSession: false,
    savedSessionId: null,
    setShowSaveSessionModal: vi.fn(),
  },
  modals: { setShowPreviewModal: vi.fn() },
  misc: { handleReset: vi.fn() },
  history: { navigate: vi.fn() },
}

vi.mock('../../contexts/TransformContext', () => ({
  useTransformContext: () => mockContextValue,
}))

describe('SaveExportStep', () => {
  it('should render the Complete button', () => {
    render(<SaveExportStep />)
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('should render Start Over button', () => {
    render(<SaveExportStep />)
    expect(screen.getByText('Start Over')).toBeInTheDocument()
  })

  it('should call handleReset when Start Over is clicked', () => {
    render(<SaveExportStep />)
    fireEvent.click(screen.getByText('Start Over'))
    expect(mockContextValue.misc.handleReset).toHaveBeenCalledOnce()
  })

  it('should call navigate when Complete is clicked', () => {
    render(<SaveExportStep />)
    fireEvent.click(screen.getByText('Complete'))
    expect(mockContextValue.history.navigate).toHaveBeenCalledWith('/resume')
  })

  it('should render Save Session section', () => {
    render(<SaveExportStep />)
    const saveElements = screen.getAllByText('Save Session')
    expect(saveElements.length).toBeGreaterThan(0)
  })

  it('should show Update Session text when savedSessionId is set', () => {
    mockContextValue.session.savedSessionId = 'session-1' as unknown as null
    render(<SaveExportStep />)
    expect(screen.getByText('Update Session')).toBeInTheDocument()
    mockContextValue.session.savedSessionId = null
  })

  it('should show processing metrics when available', () => {
    mockContextValue.transform.processingMetrics = [{
      totalTokens: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      processingTimeMs: 2000,
      wasAiExtraction: true,
      modelUsed: 'claude-3-haiku',
    }] as unknown as []
    render(<SaveExportStep />)
    expect(screen.getByText('Processing Metrics')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    mockContextValue.transform.processingMetrics = []
  })

  it('should show regex fallback message when wasAiExtraction is false', () => {
    mockContextValue.transform.processingMetrics = [{
      totalTokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      processingTimeMs: 500,
      wasAiExtraction: false,
      modelUsed: null,
    }] as unknown as []
    render(<SaveExportStep />)
    expect(screen.getByText(/Regex Fallback/)).toBeInTheDocument()
    expect(screen.getByText(/AI extraction was unavailable/)).toBeInTheDocument()
    mockContextValue.transform.processingMetrics = []
  })

  it('should render resume cards with export actions', () => {
    mockContextValue.transform.transformedResumes = [{
      id: 'r1',
      candidateName: 'Jane Doe',
      originalFileName: 'resume.pdf',
    }] as unknown as []
    render(<SaveExportStep />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('Download DOCX')).toBeInTheDocument()
    expect(screen.getByText('Export PDF')).toBeInTheDocument()
    mockContextValue.transform.transformedResumes = []
  })
})
