import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FitVerdictSummary from './FitVerdictSummary'

vi.mock('./matchDetailUtils', () => ({
  parseSummaryVerdict: vi.fn((summary: string) => {
    if (summary.startsWith('[STRONG_FIT]')) {
      return { verdict: 'STRONG_FIT', reasoning: summary.replace('[STRONG_FIT] ', '') }
    }
    if (summary.startsWith('[MODERATE_FIT]')) {
      return { verdict: 'MODERATE_FIT', reasoning: summary.replace('[MODERATE_FIT] ', '') }
    }
    return { verdict: null, reasoning: summary }
  }),
  getFitVerdictConfig: vi.fn((verdict: string) => {
    const configs: Record<string, { icon: string; label: string; classes: string }> = {
      STRONG_FIT: { icon: '✅', label: 'Strong Fit', classes: 'bg-emerald-100 text-emerald-700' },
      MODERATE_FIT: { icon: '🟡', label: 'Moderate Fit', classes: 'bg-amber-100 text-amber-700' },
    }
    return configs[verdict] ?? { icon: '❓', label: verdict, classes: '' }
  }),
}))

describe('FitVerdictSummary', () => {
  it('should render plain text when no verdict is detected', () => {
    render(<FitVerdictSummary summary="Just a regular summary" />)
    expect(screen.getByText('Just a regular summary')).toBeInTheDocument()
  })

  it('should render verdict badge in block variant by default', () => {
    render(<FitVerdictSummary summary="[STRONG_FIT] Great candidate" />)
    expect(screen.getByText('Strong Fit')).toBeInTheDocument()
    expect(screen.getByText('Great candidate')).toBeInTheDocument()
  })

  it('should render verdict badge in inline variant', () => {
    render(<FitVerdictSummary summary="[STRONG_FIT] Great candidate" variant="inline" />)
    expect(screen.getByText((_, el) => el?.textContent === '✅ Strong Fit')).toBeInTheDocument()
  })

  it('should use explicit fitVerdict prop over parsed verdict', () => {
    render(<FitVerdictSummary summary="[STRONG_FIT] text" fitVerdict="MODERATE_FIT" />)
    expect(screen.getByText('Moderate Fit')).toBeInTheDocument()
  })

  it('should show icon in block variant', () => {
    render(<FitVerdictSummary summary="[STRONG_FIT] Reasoning text" />)
    expect(screen.getByText('✅')).toBeInTheDocument()
  })
})
