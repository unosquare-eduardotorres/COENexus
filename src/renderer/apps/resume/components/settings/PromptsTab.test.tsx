import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PromptsTab from './PromptsTab'
import { RefinementPrompt, MatchEnginePromptConfig } from '../../types'

vi.mock('../../data/defaultPrompts', () => ({
  getPrompts: vi.fn(() => []),
}))

vi.mock('../../data/defaultMatchPrompts', () => ({
  getMatchPrompts: vi.fn(() => []),
}))

vi.mock('../../../../shared/components/icons', () => ({
  ChevronIcon: ({ direction }: { direction: string }) => <span data-testid="chevron">{direction}</span>,
}))

function buildPrompt(overrides: Partial<RefinementPrompt> = {}): RefinementPrompt {
  return {
    id: 'p1',
    name: 'Grammar Fix',
    description: 'Fixes grammar issues',
    mode: 'grammar' as RefinementPrompt['mode'],
    promptTemplate: 'Fix grammar in {{resume}}',
    variables: ['resume'],
    ...overrides,
  } as RefinementPrompt
}

function buildMatchPrompt(overrides: Partial<MatchEnginePromptConfig> = {}): MatchEnginePromptConfig {
  return {
    id: 'mp1',
    key: 'haiku-triage',
    name: 'Haiku Triage',
    description: 'Fast triage prompt',
    promptTemplate: 'Score {{candidate}} against {{job}}',
    variables: ['candidate', 'job'],
    maxTokens: 512,
    temperature: 0.3,
    ...overrides,
  } as MatchEnginePromptConfig
}

function renderPromptsTab(overrides = {}) {
  const defaultProps = {
    prompts: [buildPrompt()],
    setPrompts: vi.fn(),
    expandedPromptId: null as string | null,
    editingPromptId: null as string | null,
    setEditingPromptId: vi.fn(),
    handleTogglePromptExpand: vi.fn(),
    handleEditPrompt: vi.fn(),
    handleSavePrompt: vi.fn(),
    handleResetPrompt: vi.fn(),
    handleResetAllPrompts: vi.fn(),
    matchPrompts: [buildMatchPrompt()],
    setMatchPrompts: vi.fn(),
    expandedMatchPromptId: null as string | null,
    editingMatchPromptId: null as string | null,
    setEditingMatchPromptId: vi.fn(),
    activeContextTab: 'matchEngine' as const,
    setActiveContextTab: vi.fn(),
    handleToggleMatchPromptExpand: vi.fn(),
    handleEditMatchPrompt: vi.fn(),
    handleSaveMatchPrompt: vi.fn(),
    handleResetMatchPrompt: vi.fn(),
    getModeIcon: () => <span data-testid="mode-icon">📝</span>,
    ...overrides,
  }
  return { ...render(<PromptsTab {...defaultProps} />), ...defaultProps }
}

describe('PromptsTab', () => {
  it('should render AI Refinement Prompts heading', () => {
    renderPromptsTab()
    expect(screen.getByText('AI Refinement Prompts')).toBeInTheDocument()
  })

  it('should render Match Engine Prompts heading', () => {
    renderPromptsTab()
    expect(screen.getByText('Match Engine Prompts')).toBeInTheDocument()
  })

  it('should display prompt name and description', () => {
    renderPromptsTab()
    expect(screen.getByText('Grammar Fix')).toBeInTheDocument()
    expect(screen.getByText('Fixes grammar issues')).toBeInTheDocument()
  })

  it('should display match prompt name and token info', () => {
    renderPromptsTab()
    expect(screen.getByText('Haiku Triage')).toBeInTheDocument()
    expect(screen.getByText('512 tok • 0.3 temp')).toBeInTheDocument()
  })

  it('should call handleTogglePromptExpand when prompt button is clicked', () => {
    const { handleTogglePromptExpand } = renderPromptsTab()
    fireEvent.click(screen.getByText('Grammar Fix'))
    expect(handleTogglePromptExpand).toHaveBeenCalledWith('p1')
  })

  it('should show textarea when prompt is expanded', () => {
    renderPromptsTab({ expandedPromptId: 'p1' })
    expect(screen.getByDisplayValue('Fix grammar in {{resume}}')).toBeInTheDocument()
  })

  it('should show Edit button when viewing expanded prompt', () => {
    renderPromptsTab({ expandedPromptId: 'p1' })
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('should show Save and Cancel when editing', () => {
    renderPromptsTab({ expandedPromptId: 'p1', editingPromptId: 'p1' })
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should show variable badges when expanded', () => {
    renderPromptsTab({ expandedPromptId: 'p1' })
    expect(screen.getByText('{{resume}}')).toBeInTheDocument()
  })

  it('should call handleResetAllPrompts when Reset All is clicked', () => {
    const { handleResetAllPrompts } = renderPromptsTab()
    fireEvent.click(screen.getByText('Reset All to Defaults'))
    expect(handleResetAllPrompts).toHaveBeenCalledOnce()
  })
})
