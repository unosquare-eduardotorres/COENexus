import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../db/agents/repositories/knowledgeRepository', () => ({
  knowledgeRepository: {
    listRules: vi.fn().mockReturnValue([]),
    listGlossary: vi.fn().mockReturnValue([]),
    listNotes: vi.fn().mockReturnValue([]),
    listOverrides: vi.fn().mockReturnValue([]),
  },
}))
vi.mock('../../db/agents/repositories/stakeholderProfileRepository', () => ({
  stakeholderProfileRepository: {
    listByAccount: vi.fn().mockReturnValue([]),
    getByStakeholderAndAccount: vi.fn().mockReturnValue(null),
    listAll: vi.fn().mockReturnValue([]),
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
import { stakeholderProfileRepository } from '../../db/agents/repositories/stakeholderProfileRepository'
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
    vi.mocked(knowledgeRepository.listOverrides).mockReturnValue([])
    vi.mocked(patternRepository.listPatterns).mockReturnValue([])
    vi.mocked(stakeholderProfileRepository.listByAccount).mockReturnValue([])
    vi.mocked(stakeholderProfileRepository.getByStakeholderAndAccount).mockReturnValue(null)
    vi.mocked(stakeholderProfileRepository.listAll).mockReturnValue([])
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

    it('should include [CLIENT RULE OVERRIDES] section when overrides exist for scoped client', () => {
      vi.mocked(knowledgeRepository.listOverrides).mockReturnValue([
        { id: 'o1', client_id: 'Axos', override_text: 'Allow seniority -1', is_active: 1 } as ReturnType<typeof knowledgeRepository.listOverrides>[0],
      ])

      const result = assembleBrain('job-override', 'Axos')
      expect(result.systemPrompt).toContain('[CLIENT RULE OVERRIDES]')
      expect(result.systemPrompt).toContain('Allow seniority -1')
    })

    it('should NOT include overrides when no scopeClient provided', () => {
      vi.mocked(knowledgeRepository.listOverrides).mockReturnValue([
        { id: 'o1', client_id: 'Axos', override_text: 'Allow seniority -1', is_active: 1 } as ReturnType<typeof knowledgeRepository.listOverrides>[0],
      ])

      const result = assembleBrain('job-no-scope')
      expect(result.systemPrompt).not.toContain('[CLIENT RULE OVERRIDES]')
    })

    it('should include [STAKEHOLDER PROFILES] section when profiles exist', () => {
      vi.mocked(stakeholderProfileRepository.listByAccount).mockReturnValue([
        {
          id: 'sp1', stakeholder_name: 'JSmith', account: 'Acme',
          observed_rate_floor: 30, observed_rate_ceiling: 50, avg_accepted_rate: 40,
          accepted_countries: 'MX,CO', rejected_countries: 'US', seniority_flexibility: 1,
          top_rejection_reasons: 'Too expensive', preference_summary: 'Prefers MX candidates',
        } as ReturnType<typeof stakeholderProfileRepository.listByAccount>[0],
      ])

      const result = assembleBrain('job-profiles', 'Acme')
      expect(result.systemPrompt).toContain('[STAKEHOLDER PROFILES]')
      expect(result.systemPrompt).toContain('JSmith')
    })

    it('should gracefully handle stakeholder profile load failure', () => {
      vi.mocked(stakeholderProfileRepository.listByAccount).mockImplementation(() => {
        throw new Error('DB table missing')
      })

      const result = assembleBrain('job-profile-fail', 'Acme')
      expect(result.systemPrompt).not.toContain('[STAKEHOLDER PROFILES]')
      expect(result.snapshotId).toBe('snap-1')
    })

    it('should include overrides and profiles in token budget calculation', () => {
      vi.mocked(knowledgeRepository.listOverrides).mockReturnValue([
        { id: 'o1', client_id: 'Axos', override_text: 'Some override text here', is_active: 1 } as ReturnType<typeof knowledgeRepository.listOverrides>[0],
      ])
      vi.mocked(stakeholderProfileRepository.listByAccount).mockReturnValue([
        {
          id: 'sp1', stakeholder_name: 'JSmith', account: 'Axos',
          observed_rate_floor: 30, observed_rate_ceiling: 50, avg_accepted_rate: 40,
          accepted_countries: 'MX', rejected_countries: 'US', seniority_flexibility: 0,
          top_rejection_reasons: 'Rate too high', preference_summary: 'Likes MX devs',
        } as ReturnType<typeof stakeholderProfileRepository.listByAccount>[0],
      ])

      const result = assembleBrain('job-budget', 'Axos')
      expect(result.systemPrompt).toContain('[CLIENT RULE OVERRIDES]')
      expect(result.systemPrompt).toContain('[STAKEHOLDER PROFILES]')
    })
  })

  describe('getTokenBudgetBreakdown', () => {
    it('should return zero counts when no knowledge items', () => {
      const result = getTokenBudgetBreakdown()
      expect(result.rules).toBe(0)
      expect(result.glossary).toBe(0)
      expect(result.patterns).toBe(0)
      expect(result.notes).toBe(0)
      expect(result.overrides).toBe(0)
      expect(result.profiles).toBe(0)
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
      expect(result.total).toBe(result.rules + result.glossary + result.patterns + result.notes + result.overrides + result.profiles)
    })

    it('getTokenBudgetBreakdown should include overrides and profiles counts', () => {
      vi.mocked(knowledgeRepository.listOverrides).mockReturnValue([
        { id: 'o1', override_text: 'Some override', is_active: 1 } as ReturnType<typeof knowledgeRepository.listOverrides>[0],
      ])
      vi.mocked(stakeholderProfileRepository.listAll).mockReturnValue([
        { id: 'sp1', preference_summary: 'Prefers MX engineers' } as ReturnType<typeof stakeholderProfileRepository.listAll>[0],
      ])

      const result = getTokenBudgetBreakdown()
      expect(result.overrides).toBeGreaterThan(0)
      expect(result.profiles).toBeGreaterThan(0)
      expect(result.total).toBe(result.rules + result.glossary + result.patterns + result.notes + result.overrides + result.profiles)
    })
  })
})
