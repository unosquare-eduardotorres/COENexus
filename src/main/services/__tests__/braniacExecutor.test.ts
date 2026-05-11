import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../db/agents/repositories/jobRepository', () => ({
  jobRepository: {
    create: vi.fn().mockReturnValue({
      id: 'job-1',
      status: 'running',
      scope_type: 'account',
      scope_value: 'TestAccount',
      initiated_by: 'user',
      run_reason: '',
      pipeline_phase: 'aggregating',
      started_at: null,
      completed_at: null,
      canceled_at: null,
      error_message: null,
      metadata_json: '{}',
      agent_type: 'braniac',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }),
    update: vi.fn().mockReturnValue(true),
    getById: vi.fn(),
    listByAgentType: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('../../db/agents/repositories/patternRepository', () => ({
  patternRepository: {
    createPattern: vi.fn().mockReturnValue({ id: 'pattern-1' }),
  },
}))

vi.mock('../../db/agents/repositories/stakeholderProfileRepository', () => ({
  stakeholderProfileRepository: {
    upsert: vi.fn().mockReturnValue({ id: 'profile-1' }),
  },
}))

vi.mock('../braniacDataAggregator', () => ({
  braniacDataAggregator: {
    aggregateForAccount: vi.fn(),
    aggregateForStakeholder: vi.fn(),
    aggregateInBatches: vi.fn(),
    aggregateByStakeholderChunks: vi.fn(),
  },
  MAX_TOKEN_BUDGET: 80_000,
  computeStakeholderMetrics: vi.fn().mockReturnValue({
    totalPresented: 0, totalAccepted: 0, successRate: null,
    avgPublishedRate: null, avgDaysToClose: null,
    totalClosedPositions: 0, totalWonPositions: 0, winRate: null,
  }),
}))

vi.mock('../claudeService', () => ({
  claudeService: {
    chatAsync: vi.fn(),
    getTokenUsage: vi.fn().mockReturnValue(null),
    checkAvailability: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('../agentStepEmitter', () => ({
  createStepEmitter: () => ({
    narrate: vi.fn(),
    emitDirect: vi.fn(),
  }),
}))

import { braniacExecutor } from '../braniacExecutor'
import { jobRepository } from '../../db/agents/repositories/jobRepository'
import { patternRepository } from '../../db/agents/repositories/patternRepository'
import { stakeholderProfileRepository } from '../../db/agents/repositories/stakeholderProfileRepository'
import { braniacDataAggregator } from '../braniacDataAggregator'
import { claudeService } from '../claudeService'
import type { DataCompleteness, AggregatedPosition, SalaryBandInfo, FeedbackLabel, PositionBatch } from '../braniacDataAggregator'

function makeBatches(
  positions: AggregatedPosition[],
  dataCompleteness: DataCompleteness = { hasSalaryBands: false, hasFeedbackCatalog: false, hasRejectionDetails: false, hasResumeSkills: false, resumeSkillsCoverage: 0 },
  salaryBands: SalaryBandInfo[] = [],
  feedbackCatalog: FeedbackLabel[] = [],
): PositionBatch[] {
  return [{
    batchIndex: 0,
    totalBatches: 1,
    positions,
    salaryBands,
    feedbackCatalog,
    estimatedTokens: 2000,
    dataCompleteness,
  }]
}

function makePosition(overrides?: Partial<AggregatedPosition>): AggregatedPosition {
  return {
    upstreamId: 1, account: 'TestAccount', stakeholder: 'JDoe', mainSkill: 'React',
    countries: 'US', seniorities: 'Senior', jobTitle: 'Dev', positionStatus: 'Active',
    aging: 10, maximumRate: 100, minimumRate: 50, closedReason: null, candidates: [],
    ...overrides,
  }
}

describe('BraniacExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(jobRepository.getById).mockReturnValue({
      id: 'job-1', status: 'completed', scope_type: 'account', scope_value: 'TestAccount',
      initiated_by: 'user', run_reason: '', pipeline_phase: 'done', started_at: null,
      completed_at: '2026-01-01T00:00:00.000Z', canceled_at: null, error_message: null,
      metadata_json: '{}', agent_type: 'braniac',
      created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
    })
  })

  it('should create a job and run analysis for an account', async () => {
    vi.mocked(braniacDataAggregator.aggregateInBatches).mockReturnValue(
      makeBatches([makePosition()])
    )

    vi.mocked(claudeService.chatAsync).mockResolvedValue(JSON.stringify({
      patterns: [
        { pattern_name: 'Rate ceiling', pattern_text: 'Max rate is 100', confidence_score: 0.7, data_points_count: 5 },
      ],
      stakeholder_profiles: [
        {
          stakeholder_name: 'JDoe', observed_rate_floor: 50, observed_rate_ceiling: 100,
          avg_accepted_rate: 75, accepted_countries: ['US'], rejected_countries: [],
          seniority_flexibility: false, posted_seniorities: ['Senior'], accepted_seniorities: ['Senior'],
          avg_time_to_decision_days: 5, top_rejection_reasons: [], top_acceptance_signals: ['React'],
          preference_summary: 'Prefers React devs.',
          actual_accepted_tech_stacks: [['React', 'TypeScript']],
          actual_rejected_tech_stacks: null,
          tech_stack_flexibility: 'moderate',
          tag_vs_resume_divergence_rate: 0.2,
        },
      ],
    }))

    const result = await braniacExecutor.run({ scope: 'account', account: 'TestAccount' })

    expect(jobRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ agent_type: 'braniac', scope_type: 'account' })
    )
    expect(braniacDataAggregator.aggregateInBatches).toHaveBeenCalled()
    expect(claudeService.chatAsync).toHaveBeenCalledOnce()
    expect(patternRepository.createPattern).toHaveBeenCalledWith(
      expect.objectContaining({ source_agent: 'braniac', account: 'TestAccount' })
    )
    expect(stakeholderProfileRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ stakeholder_name: 'JDoe', account: 'TestAccount' })
    )
    expect(result.status).toBe('completed')
  })

  it('should auto-apply patterns with high confidence and enough data points', async () => {
    const positions = Array.from({ length: 20 }, (_, i) => makePosition({ upstreamId: i }))

    vi.mocked(braniacDataAggregator.aggregateInBatches).mockReturnValue(
      makeBatches(
        positions,
        { hasSalaryBands: true, hasFeedbackCatalog: true, hasRejectionDetails: true, hasResumeSkills: true, resumeSkillsCoverage: 0.8 },
        [{ countryCode: 'US', jobFamilyGroup: 'engineering', band: 'A', level: 1, minMonthly: 5000, maxMonthly: 10000 }],
        [{ id: 1, label: 'Too expensive' }],
      )
    )

    vi.mocked(claudeService.chatAsync).mockResolvedValue(JSON.stringify({
      patterns: [
        { pattern_name: 'High confidence pattern', pattern_text: 'Very strong signal', confidence_score: 0.95, data_points_count: 20 },
      ],
      stakeholder_profiles: [],
    }))

    await braniacExecutor.run({ scope: 'account', account: 'TestAccount' })

    expect(patternRepository.createPattern).toHaveBeenCalledWith(
      expect.objectContaining({ approval_status: 'auto_applied', is_active: 1 })
    )
  })

  it('should complete without error when no positions exist', async () => {
    vi.mocked(braniacDataAggregator.aggregateInBatches).mockReturnValue([])

    const result = await braniacExecutor.run({ scope: 'account', account: 'EmptyAccount' })

    expect(claudeService.chatAsync).not.toHaveBeenCalled()
    expect(result.status).toBe('completed')
  })

  it('should reject concurrent runs', async () => {
    vi.mocked(braniacDataAggregator.aggregateInBatches).mockReturnValue(
      makeBatches([makePosition()])
    )

    vi.mocked(claudeService.chatAsync).mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve('{"patterns":[],"stakeholder_profiles":[]}'), 100))
    )

    const firstRun = braniacExecutor.run({ scope: 'account', account: 'TestAccount' })

    await expect(
      braniacExecutor.run({ scope: 'account', account: 'TestAccount' })
    ).rejects.toThrow('Braniac run already in progress')

    await firstRun
  })

  it('should require stakeholder when scope is stakeholder', async () => {
    await expect(
      braniacExecutor.run({ scope: 'stakeholder', account: 'TestAccount' })
    ).rejects.toThrow('Stakeholder name is required')
  })

  describe('getStatus', () => {
    it('should return idle when no run is active', () => {
      const status = braniacExecutor.getStatus()
      expect(status.running).toBe(false)
      expect(status.job_id).toBeNull()
    })
  })

  describe('cancel', () => {
    it('should return false when no run is active', () => {
      expect(braniacExecutor.cancel()).toBe(false)
    })
  })

  describe('tech stack profile fields', () => {
    it('should persist actual_accepted_tech_stacks and tech_stack_flexibility from LLM response', async () => {
      vi.mocked(braniacDataAggregator.aggregateInBatches).mockReturnValue(
        makeBatches(
          [makePosition({
            account: 'TechAccount', stakeholder: 'MGarcia',
            candidates: [{
              candidateId: 200, candidateName: 'Alice',
              requisitionTaggedSkill: 'Java', isEmployee: 0,
              candidateStatus: 'Hired', rate: 80,
              normalizedMonthlyUsd: null, inferredCurrency: null, currencyConfidence: null,
              country: 'US', seniority: 'Senior',
              rejectionFeedback: [], rejectionComments: '', rejectionActionDate: null,
              resumeSkills: {
                primaryStack: ['C#', '.NET'], secondaryStack: [],
                roles: [], yearsExperience: 5, seniority: [], summary: 'C# dev',
                source: 'candidates' as const,
              },
            }],
          })],
          { hasSalaryBands: false, hasFeedbackCatalog: false, hasRejectionDetails: false, hasResumeSkills: true, resumeSkillsCoverage: 1.0 },
        )
      )

      vi.mocked(claudeService.chatAsync).mockResolvedValue(JSON.stringify({
        patterns: [],
        stakeholder_profiles: [{
          stakeholder_name: 'MGarcia',
          observed_rate_floor: 50, observed_rate_ceiling: 100, avg_accepted_rate: 80,
          accepted_countries: ['US'], rejected_countries: [],
          seniority_flexibility: false, posted_seniorities: ['Senior'], accepted_seniorities: ['Senior'],
          avg_time_to_decision_days: 5, top_rejection_reasons: [], top_acceptance_signals: [],
          preference_summary: 'Flexible on tech stacks',
          actual_accepted_tech_stacks: [['C#', '.NET'], ['React', 'TypeScript']],
          actual_rejected_tech_stacks: [['Java', 'Spring']],
          tech_stack_flexibility: 'flexible',
          tag_vs_resume_divergence_rate: 0.6,
        }],
      }))

      await braniacExecutor.run({ scope: 'account', account: 'TechAccount' })

      expect(stakeholderProfileRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          stakeholder_name: 'MGarcia',
          actual_accepted_tech_stacks_json: JSON.stringify([['C#', '.NET'], ['React', 'TypeScript']]),
          actual_rejected_tech_stacks_json: JSON.stringify([['Java', 'Spring']]),
          tech_stack_flexibility: 'flexible',
          tag_vs_resume_divergence_rate: 0.6,
        })
      )
    })

    it('should handle null tech stack fields gracefully', async () => {
      vi.mocked(braniacDataAggregator.aggregateInBatches).mockReturnValue(
        makeBatches([makePosition({ account: 'NoTechAccount', stakeholder: 'JSmith' })])
      )

      vi.mocked(claudeService.chatAsync).mockResolvedValue(JSON.stringify({
        patterns: [],
        stakeholder_profiles: [{
          stakeholder_name: 'JSmith',
          observed_rate_floor: null, observed_rate_ceiling: null, avg_accepted_rate: null,
          accepted_countries: [], rejected_countries: [],
          seniority_flexibility: false, posted_seniorities: [], accepted_seniorities: [],
          avg_time_to_decision_days: null, top_rejection_reasons: [], top_acceptance_signals: [],
          preference_summary: 'Insufficient data.',
        }],
      }))

      await braniacExecutor.run({ scope: 'account', account: 'NoTechAccount' })

      expect(stakeholderProfileRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          actual_accepted_tech_stacks_json: null,
          actual_rejected_tech_stacks_json: null,
          tech_stack_flexibility: null,
          tag_vs_resume_divergence_rate: null,
        })
      )
    })

    it('should include skill data source instructions in the system prompt', async () => {
      vi.mocked(braniacDataAggregator.aggregateInBatches).mockReturnValue(
        makeBatches([makePosition({ account: 'PromptTest' })])
      )

      vi.mocked(claudeService.chatAsync).mockResolvedValue('{"patterns":[],"stakeholder_profiles":[]}')

      await braniacExecutor.run({ scope: 'account', account: 'PromptTest' })

      const systemPromptArg = vi.mocked(claudeService.chatAsync).mock.calls[0][4]
      expect(systemPromptArg).toContain('SKILL DATA SOURCES')
      expect(systemPromptArg).toContain('requisitionTaggedSkill')
      expect(systemPromptArg).toContain('resumeSkills')

      const userPromptArg = vi.mocked(claudeService.chatAsync).mock.calls[0][1]
      expect(userPromptArg).toContain('tech_stack_flexibility')
      expect(userPromptArg).toContain('Resume-based skill patterns')
    })
  })
})
