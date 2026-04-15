import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAdminDashboard } from './useAdminDashboard'

vi.mock('../services/aiService', () => ({
  aiService: {
    getConfig: vi.fn().mockReturnValue({ model: 'claude-sonnet', temperature: 0.3 }),
    updateConfig: vi.fn().mockReturnValue({ model: 'claude-sonnet', temperature: 0.3 }),
  },
}))

vi.mock('../data/defaultPrompts', () => ({
  getPrompts: vi.fn().mockReturnValue([{ id: 'p1', name: 'Test', template: 'text', isDefault: true }]),
  savePrompt: vi.fn(),
  resetPrompt: vi.fn().mockReturnValue(true),
  resetAllPrompts: vi.fn().mockReturnValue([]),
}))

vi.mock('../data/defaultMatchPrompts', () => ({
  getMatchPrompts: vi.fn().mockReturnValue([]),
  saveMatchPrompt: vi.fn(),
  resetMatchPrompt: vi.fn().mockReturnValue(true),
  resetAllMatchPrompts: vi.fn().mockReturnValue([]),
}))

vi.mock('../../../shared/utils/rendererLogger', () => ({
  createRendererLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

describe('useAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should initialize with default tab and config', () => {
    const { result } = renderHook(() => useAdminDashboard())
    expect(result.current.tabs.activeTab).toBe('validation')
    expect(result.current.ai.aiConfig).toBeDefined()
    expect(result.current.saveStatus).toBe('idle')
  })

  it('should switch active tab', () => {
    const { result } = renderHook(() => useAdminDashboard())
    act(() => { result.current.tabs.setActiveTab('prompts') })
    expect(result.current.tabs.activeTab).toBe('prompts')
  })

  it('should toggle prompt expand', () => {
    const { result } = renderHook(() => useAdminDashboard())
    act(() => { result.current.prompts.handleTogglePromptExpand('p1') })
    expect(result.current.prompts.expandedPromptId).toBe('p1')

    act(() => { result.current.prompts.handleTogglePromptExpand('p1') })
    expect(result.current.prompts.expandedPromptId).toBeNull()
  })

  it('should set editing prompt id', () => {
    const { result } = renderHook(() => useAdminDashboard())
    act(() => { result.current.prompts.handleEditPrompt('p1') })
    expect(result.current.prompts.editingPromptId).toBe('p1')
  })

  it('should handle reset all prompts with confirmation', () => {
    const { result } = renderHook(() => useAdminDashboard())
    act(() => { result.current.prompts.handleResetAllPrompts() })
    expect(result.current.confirm.confirmAction).toBe('reset-prompts')

    act(() => { result.current.confirm.handleConfirmAction() })
    expect(result.current.confirm.confirmAction).toBeNull()
  })

  it('should handle output template reset', () => {
    localStorage.setItem('output_template_docx', 'test')
    localStorage.setItem('output_template_name', 'custom.docx')

    const { result } = renderHook(() => useAdminDashboard())
    act(() => { result.current.outputTemplate.handleResetOutputTemplate() })
    expect(result.current.outputTemplate.outputTemplateName).toBe('USQ Resume Template.docx')
    expect(localStorage.getItem('output_template_docx')).toBeNull()
  })
})
