import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CandidateProfile from './CandidateProfile'
import { MatchCandidate } from '../../types'

vi.mock('./shared/matchDetailUtils', () => ({
  getStatusChipClasses: vi.fn(() => 'bg-gray-100'),
  getStatusLabel: vi.fn((s: string) => s),
  getStatusDotColor: vi.fn(() => 'bg-green-500'),
  getScoreColor: vi.fn(() => 'text-emerald-500'),
  getConfidenceBarClass: vi.fn(() => 'bg-emerald-500'),
  getFitVerdictConfig: vi.fn(() => ({ icon: '✅', label: 'Strong Fit', classes: 'text-emerald-500' })),
  getInitials: vi.fn((name: string) => name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)),
  STATUS_ORDER: ['matched', 'partial', 'missing'],
  PRIORITY_LABELS: { high: 'High', medium: 'Medium', low: 'Low' },
  AI_ASSESSMENT_SECTIONS: [{ key: 'fitNarrative', label: 'Fit Narrative' }],
}))

vi.mock('./shared/FitVerdictSummary', () => ({
  default: ({ summary }: { summary: string }) => <span data-testid="fit-verdict">{summary}</span>,
}))

vi.mock('./ScoreRing', () => ({
  default: ({ score }: { score: number }) => <span data-testid="score-ring">{score}</span>,
}))

vi.mock('./CategoryBar', () => ({
  default: () => <span data-testid="category-bar" />,
}))

vi.mock('./RadarChart', () => ({
  default: () => <span data-testid="radar-chart" />,
}))

vi.mock('../../utils/formatSalary', () => ({
  formatSalary: vi.fn((val: number) => `$${val}`),
}))

function buildCandidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    id: 1,
    name: 'Jane Doe',
    email: 'jane@test.com',
    type: 'candidate',
    seniority: 'Senior',
    mainSkill: 'TypeScript',
    country: 'US',
    scores: { overall: 85, technical: 90, experience: 80, skills: 85, nonTechnical: 70 },
    skills: [
      { name: 'TypeScript', years: 5, status: 'matched', required: true },
      { name: 'React', years: 3, status: 'partial', required: true },
    ],
    nonTechSkills: [],
    gaps: [],
    summary: 'Strong candidate overall',
    analysis: null,
    rank: 1,
    ...overrides,
  } as unknown as MatchCandidate
}

describe('CandidateProfile', () => {
  it('should render candidate name and back button', () => {
    render(<CandidateProfile candidate={buildCandidate()} onBack={() => {}} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Back to Results')).toBeInTheDocument()
  })

  it('should call onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<CandidateProfile candidate={buildCandidate()} onBack={onBack} />)
    fireEvent.click(screen.getByText('Back to Results'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('should display candidate initials from name', () => {
    render(<CandidateProfile candidate={buildCandidate()} onBack={() => {}} />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('should show employee type badge for employee candidates', () => {
    render(<CandidateProfile candidate={buildCandidate({ type: 'employee' })} onBack={() => {}} />)
    const badges = screen.getAllByText('employee')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('should show candidate type badge for candidate type', () => {
    render(<CandidateProfile candidate={buildCandidate({ type: 'candidate' })} onBack={() => {}} />)
    const badges = screen.getAllByText('candidate')
    expect(badges.length).toBeGreaterThan(0)
  })

  it('should display seniority and main skill', () => {
    render(<CandidateProfile candidate={buildCandidate()} onBack={() => {}} />)
    expect(screen.getByText('Senior')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('should render tabs including AI Assessment when analysis is present', () => {
    render(<CandidateProfile candidate={buildCandidate({ analysis: { fitNarrative: 'Great fit' } as unknown as MatchCandidate['analysis'] })} onBack={() => {}} />)
    expect(screen.getByText('AI Assessment')).toBeInTheDocument()
  })

  it('should not render AI Assessment tab when analysis is null', () => {
    render(<CandidateProfile candidate={buildCandidate({ analysis: null })} onBack={() => {}} />)
    expect(screen.queryByText('AI Assessment')).not.toBeInTheDocument()
  })

  it('should display gap counts', () => {
    const gaps = [
      { skill: 'Go', severity: 'high', recommendation: '' },
      { skill: 'K8s', severity: 'medium', recommendation: '' },
      { skill: 'Docker', severity: 'low', recommendation: '' },
    ]
    render(<CandidateProfile candidate={buildCandidate({ gaps: gaps as MatchCandidate['gaps'] })} onBack={() => {}} />)
    expect(screen.getByText('Gap Analysis')).toBeInTheDocument()
  })
})
