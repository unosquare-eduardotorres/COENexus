import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnalyzeDeeperModal from './AnalyzeDeeperModal'

function renderModal(overrides = {}) {
  const defaults = {
    searchMode: 'vector' as const,
    deeperTopN: 10 as const,
    candidates: [],
    dataSource: 'candidates' as const,
    matchFlow: null,
    onSetDeeperTopN: vi.fn(),
    onStartHaikuUpgrade: vi.fn(),
    onStartOpusUpgrade: vi.fn(),
    onCancel: vi.fn(),
  }
  const props = { ...defaults, ...overrides }
  return { ...render(<AnalyzeDeeperModal {...props} />), ...props }
}

describe('AnalyzeDeeperModal', () => {
  it('should render title and description', () => {
    renderModal()
    expect(screen.getByText('Analyze Deeper')).toBeInTheDocument()
    expect(screen.getByText('Upgrade your search with more AI analysis')).toBeInTheDocument()
  })

  it('should render top N selection buttons', () => {
    renderModal()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('should call onSetDeeperTopN when a top N button is clicked', () => {
    const { onSetDeeperTopN } = renderModal()
    fireEvent.click(screen.getByText('20'))
    expect(onSetDeeperTopN).toHaveBeenCalledWith(20)
  })

  it('should show Haiku Pre-filter option in vector mode', () => {
    renderModal({ searchMode: 'vector' })
    expect(screen.getByText('Haiku Pre-filter')).toBeInTheDocument()
  })

  it('should hide Haiku Pre-filter option in non-vector mode', () => {
    renderModal({ searchMode: 'haiku' })
    expect(screen.queryByText('Haiku Pre-filter')).not.toBeInTheDocument()
  })

  it('should always show Full Opus Analysis option', () => {
    renderModal({ searchMode: 'haiku' })
    expect(screen.getByText('Full Opus Analysis')).toBeInTheDocument()
  })

  it('should call onStartHaikuUpgrade when Haiku button clicked', () => {
    const { onStartHaikuUpgrade } = renderModal()
    fireEvent.click(screen.getByText('Haiku Pre-filter'))
    expect(onStartHaikuUpgrade).toHaveBeenCalledOnce()
  })

  it('should call onStartOpusUpgrade when Opus button clicked', () => {
    const { onStartOpusUpgrade } = renderModal()
    fireEvent.click(screen.getByText('Full Opus Analysis'))
    expect(onStartOpusUpgrade).toHaveBeenCalledOnce()
  })

  it('should call onCancel when Cancel clicked', () => {
    const { onCancel } = renderModal()
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
