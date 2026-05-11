import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ReviewStep from './ReviewStep'

vi.mock('../ResumeEditor', () => ({
  default: () => <div data-testid="resume-editor">ResumeEditor</div>,
}))
vi.mock('../PdfPreviewPanel', () => ({
  default: () => <div data-testid="pdf-preview">PdfPreview</div>,
}))
vi.mock('../ValidationPanel', () => ({
  default: () => <div data-testid="validation-panel">ValidationPanel</div>,
}))
vi.mock('./OriginalDocxViewer', () => ({
  default: () => <div data-testid="docx-viewer">DocxViewer</div>,
}))
vi.mock('./review/ReviewToolbar', () => ({
  default: (props: { reviewViewMode: string; onBack: () => void; onNext: () => void }) => (
    <div data-testid="review-toolbar">
      {props.reviewViewMode}
      <button onClick={props.onBack}>Back</button>
      <button onClick={props.onNext}>Next</button>
    </div>
  ),
}))
vi.mock('./review/ChecksView', () => ({
  default: () => <div data-testid="checks-view">ChecksView</div>,
}))
vi.mock('./TransformProgressOverlay', () => ({
  default: (props: { progress: { currentFile: string } }) => (
    <div data-testid="transform-progress-overlay">{props.progress.currentFile}</div>
  ),
}))

const mockContext = {
  wizard: { handleBack: vi.fn(), handleNext: vi.fn() },
  refinement: { enhancerMode: 'grammar', enhancerModeLabel: (m: string) => m, handleEnhanceClick: vi.fn(), handleEnhanceResume: vi.fn(), confirmReEnhance: vi.fn(), setEnhancerMode: vi.fn() },
  transform: {
    isTransforming: false,
    isEnhancing: false,
    transformPhase: null,
    transformProgress: null,
    transformedResumes: [{
      id: 'r1',
      candidateName: 'Jane Doe',
      originalFileName: 'resume.pdf',
      originalContent: 'text content',
      originalFileUrl: null,
      originalFileType: null,
    }],
    error: null,
    handleTransform: vi.fn(),
  },
  review: {
    activeResumeId: 'r1',
    setActiveResumeId: vi.fn(),
    activeResume: {
      id: 'r1',
      candidateName: 'Jane Doe',
      originalFileName: 'resume.pdf',
      originalContent: 'text content',
      originalFileUrl: null,
      originalFileType: null,
    },
    reviewViewMode: 'editor',
    setReviewViewMode: vi.fn(),
    handleUpdateResume: vi.fn(),
    handleRequestAISuggestion: vi.fn(),
    handleSelectSuggestion: vi.fn(),
    completeness: 85,
    resumeWarnings: [],
  },
  validation: {
    validationResults: [],
    validationHighlight: false,
    validationCollapsed: true,
    setValidationCollapsed: vi.fn(),
    validationFilter: 'all',
    setValidationFilter: vi.fn(),
  },
  suggestions: { aiSuggestions: {} },
  session: { sessionSaved: false, savedSessionName: '' },
  modals: {
    showWarningsModal: false,
    setShowWarningsModal: vi.fn(),
    showEnhancerModal: false,
    setShowEnhancerModal: vi.fn(),
    showEnhanceWarningModal: false,
    setShowEnhanceWarningModal: vi.fn(),
    showReEnhanceConfirm: false,
    setShowReEnhanceConfirm: vi.fn(),
  },
  misc: { originalResume: null },
}

vi.mock('../../contexts/TransformContext', () => ({
  useTransformContext: () => mockContext,
}))

describe('ReviewStep', () => {
  it('should render editor view when reviewViewMode is editor', () => {
    render(<ReviewStep />)
    expect(screen.getByTestId('resume-editor')).toBeInTheDocument()
  })

  it('should render Back and Next buttons', () => {
    render(<ReviewStep />)
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('should call handleBack when Back button clicked', () => {
    render(<ReviewStep />)
    fireEvent.click(screen.getByText('Back'))
    expect(mockContext.wizard.handleBack).toHaveBeenCalledOnce()
  })

  it('should call handleNext when Next button clicked', () => {
    render(<ReviewStep />)
    fireEvent.click(screen.getByText('Next'))
    expect(mockContext.wizard.handleNext).toHaveBeenCalledOnce()
  })

  it('should show progress overlay when isTransforming with progress', () => {
    mockContext.transform.isTransforming = true
    mockContext.transform.transformProgress = { current: 1, total: 3, currentFile: 'resume1.pdf' } as unknown as null
    render(<ReviewStep />)
    expect(screen.getByTestId('transform-progress-overlay')).toBeInTheDocument()
    expect(screen.getByText('resume1.pdf')).toBeInTheDocument()
    mockContext.transform.isTransforming = false
    mockContext.transform.transformProgress = null
  })

  it('should show error state with retry button', () => {
    mockContext.transform.error = 'AI service unavailable' as unknown as null
    mockContext.transform.transformedResumes = [] as unknown as typeof mockContext.transform.transformedResumes
    render(<ReviewStep />)
    expect(screen.getByText('Enhancement Failed')).toBeInTheDocument()
    expect(screen.getByText('AI service unavailable')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    mockContext.transform.error = null
    mockContext.transform.transformedResumes = [mockContext.review.activeResume] as typeof mockContext.transform.transformedResumes
  })

  it('should show session saved notification', () => {
    mockContext.session.sessionSaved = true
    mockContext.session.savedSessionName = 'My Session'
    render(<ReviewStep />)
    expect(screen.getByText('Session Saved')).toBeInTheDocument()
    expect(screen.getByText(/My Session/)).toBeInTheDocument()
    mockContext.session.sessionSaved = false
  })
})
