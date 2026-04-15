import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../db/agents/repositories/knowledgeRepository', () => ({
  knowledgeRepository: {
    listRules: vi.fn().mockReturnValue([]),
    listGlossary: vi.fn().mockReturnValue([]),
    listNotes: vi.fn().mockReturnValue([]),
  },
}))
vi.mock('../../db/agents/repositories/patternRepository', () => ({
  patternRepository: { listPatterns: vi.fn().mockReturnValue([]) },
}))
vi.mock('../../db/agents/repositories/brainRepository', () => ({
  brainRepository: { create: vi.fn().mockReturnValue({ id: 'snap-1' }) },
}))
vi.mock('../../db/agents/repositories/configRepository', () => ({
  getConfig: vi.fn().mockReturnValue({ token_budget_ceiling: 10000 }),
  getActivePromptVersion: vi.fn().mockReturnValue(null),
}))

import { assembleBrain, getTokenBudgetBreakdown } from '../scout9BrainService'
import { knowledgeRepository } from '../../db/agents/repositories/knowledgeRepository'
import { patternRepository } from '../../db/agents/repositories/patternRepository'
import { brainRepository } from '../../db/agents/repositories/brainRepository'
import * as configRepository from '../../db/agents/repositories/configRepository'

describe('scout9BrainService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(configRepository.getConfig).mockReturnValue({ token_budget_ceiling: 10000 } as ReturnType<typeof configRepository.getConfig>)
    vi.mocked(configRepository.getActivePromptVersion).mockReturnValue(null)
    vi.mocked(knowledgeRepository.listRules).mockReturnValue([])
    vi.mocked(knowledgeRepository.listGlossary).mockReturnValue([])
    vi.mocked(knowledgeRepository.listNotes).mockReturnValue([])
    vi.mocked(patternRepository.listPatterns).mockReturnValue([])
    vi.mocked(brainRepository.create).mockReturnValue({ id: 'snap-1' } as ReturnType<typeof brainRepository.create>)
  })

  describe('assembleBrain', () => {
    it('should return system prompt with default prompt when no active version', () => {
      const result = assembleBrain('job-1')
      expect(result.systemPrompt).toContain('Scout-9')
      expect(result.snapshotId).toBe('snap-1')
    })

    it('should use active prompt version when available', () => {
      vi.mocked(configRepository.getActivePromptVersion).mockReturnValue({ prompt_text: 'Custom prompt' } as ReturnType<typeof configRepository.getActivePromptVersion>)
      const result = assembleBrain('job-2')
      expect(result.systemPrompt).toContain('Custom prompt')
    })

    it('should include rules section when rules exist', () => {
      vi.mocked(knowledgeRepository.listRules).mockReturnValue([
        { id: 'r1', rule_name: 'Rule 1', rule_text: 'Do not present rejected candidates', is_active: 1 } as ReturnType<typeof knowledgeRepository.listRules>[0],
      ])

      const result = assembleBrain('job-3')
      expect(result.systemPrompt).toContain('[BUSINESS RULES]')
      expect(result.systemPrompt).toContain('Rule 1')
    })

    it('should include glossary section when glossary exists', () => {
      vi.mocked(knowledgeRepository.listGlossary).mockReturnValue([
        { id: 'g1', term: 'COE', definition: 'Center of Excellence', is_active: 1 } as ReturnType<typeof knowledgeRepository.listGlossary>[0],
      ])

      const result = assembleBrain('job-4')
      expect(result.systemPrompt).toContain('[GLOSSARY]')
      expect(result.systemPrompt).toContain('COE: Center of Excellence')
    })

    it('should filter out inactive items', () => {
      vi.mocked(knowledgeRepository.listRules).mockReturnValue([
        { id: 'r1', rule_name: 'Active', rule_text: 'active rule', is_active: 1 } as ReturnType<typeof knowledgeRepository.listRules>[0],
        { id: 'r2', rule_name: 'Inactive', rule_text: 'inactive rule', is_active: 0 } as ReturnType<typeof knowledgeRepository.listRules>[0],
      ])

      const result = assembleBrain('job-5')
      expect(result.systemPrompt).toContain('Active')
      expect(result.systemPrompt).not.toContain('Inactive')
    })

    it('should create brain snapshot', () => {
      assembleBrain('job-7')
      expect(brainRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ source_job_id: 'job-7' })
      )
    })
  })

  describe('getTokenBudgetBreakdown', () => {
    it('should return zero counts when no knowledge items', () => {
      const result = getTokenBudgetBreakdown()
      expect(result.rules).toBe(0)
      expect(result.glossary).toBe(0)
      expect(result.patterns).toBe(0)
      expect(result.notes).toBe(0)
      expect(result.total).toBe(0)
      expect(result.ceiling).toBe(10000)
    })

    it('should sum token counts across active items', () => {
      vi.mocked(knowledgeRepository.listRules).mockReturnValue([
        { id: 'r1', rule_text: 'some rule text here', is_active: 1 } as ReturnType<typeof knowledgeRepository.listRules>[0],
      ])
      vi.mocked(knowledgeRepository.listGlossary).mockReturnValue([
        { id: 'g1', term: 'A', definition: 'B', is_active: 1 } as ReturnType<typeof knowledgeRepository.listGlossary>[0],
      ])

      const result = getTokenBudgetBreakdown()
      expect(result.rules).toBeGreaterThan(0)
      expect(result.glossary).toBeGreaterThan(0)
      expect(result.total).toBe(result.rules + result.glossary + result.patterns + result.notes)
    })
  })
})
