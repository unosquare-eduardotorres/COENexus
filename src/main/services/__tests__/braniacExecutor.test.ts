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
  },
}))

vi.mock('../claudeService', () => ({
  claudeService: {
    chatAsync: vi.fn(),
    getTokenUsage: vi.fn().mockReturnValue(null),
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

describe('BraniacExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(jobRepository.getById).mockReturnValue({
      id: 'job-1',
      status: 'completed',
      scope_type: 'account',
      scope_value: 'TestAccount',
      initiated_by: 'user',
      run_reason: '',
      pipeline_phase: 'done',
      started_at: null,
      completed_at: '2026-01-01T00:00:00.000Z',
      canceled_at: null,
      error_message: null,
      metadata_json: '{}',
      agent_type: 'braniac',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
  })

  it('should create a job and run analysis for an account', async () => {
    vi.mocked(braniacDataAggregator.aggregateForAccount).mockReturnValue({
      account: 'TestAccount',
      positions: [{ upstreamId: 1, account: 'TestAccount', stakeholder: 'JDoe', mainSkill: 'React', countries: 'US', seniorities: 'Senior', jobTitle: 'Dev', positionStatus: 'Active', aging: 10, maximumRate: 100, minimumRate: 50, closedReason: null, candidates: [] }],
      salaryBands: [],
      feedbackCatalog: [],
      dataPointsCount: 5,
      estimatedTokens: 2000,
      dataCompleteness: { hasSalaryBands: false, hasFeedbackCatalog: false, hasRejectionDetails: false },
    })

    vi.mocked(claudeService.chatAsync).mockResolvedValue(JSON.stringify({
      patterns: [
        { pattern_name: 'Rate ceiling', pattern_text: 'Max rate is 100', confidence_score: 0.7, data_points_count: 5 },
      ],
      stakeholder_profiles: [
        { stakeholder_name: 'JDoe', observed_rate_floor: 50, observed_rate_ceiling: 100, avg_accepted_rate: 75, accepted_countries: ['US'], rejected_countries: [], seniority_flexibility: false, posted_seniorities: ['Senior'], accepted_seniorities: ['Senior'], avg_time_to_decision_days: 5, top_rejection_reasons: [], top_acceptance_signals: ['React'], preference_summary: 'Prefers React devs.' },
      ],
    }))

    const result = await braniacExecutor.run({ scope: 'account', account: 'TestAccount' })

    expect(jobRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ agent_type: 'braniac', scope_type: 'account' })
    )
    expect(braniacDataAggregator.aggregateForAccount).toHaveBeenCalledWith('TestAccount')
    expect(claudeService.chatAsync).toHaveBeenCalledOnce()
    expect(patternRepository.createPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        source_agent: 'braniac',
        approval_status: 'pending_review',
        account: 'TestAccount',
      })
    )
    expect(stakeholderProfileRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ stakeholder_name: 'JDoe', account: 'TestAccount' })
    )
    expect(result.status).toBe('completed')
  })

  it('should auto-apply patterns with high confidence and enough data points', async () => {
    vi.mocked(braniacDataAggregator.aggregateForAccount).mockReturnValue({
      account: 'TestAccount',
      positions: Array.from({ length: 20 }, (_, i) => ({
        upstreamId: i, account: 'TestAccount', stakeholder: 'JDoe', mainSkill: 'React',
        countries: 'US', seniorities: 'Senior', jobTitle: 'Dev', positionStatus: 'Active',
        aging: 10, maximumRate: 100, minimumRate: 50, closedReason: null, candidates: [],
      })),
      salaryBands: [{ countryCode: 'US', jobFamilyGroup: 'engineering', band: 'A', level: 1, minMonthly: 5000, maxMonthly: 10000 }],
      feedbackCatalog: [{ id: 1, label: 'Too expensive' }],
      dataPointsCount: 20,
      estimatedTokens: 5000,
      dataCompleteness: { hasSalaryBands: true, hasFeedbackCatalog: true, hasRejectionDetails: true },
    })

    vi.mocked(claudeService.chatAsync).mockResolvedValue(JSON.stringify({
      patterns: [
        { pattern_name: 'High confidence pattern', pattern_text: 'Very strong signal', confidence_score: 0.95, data_points_count: 20 },
      ],
      stakeholder_profiles: [],
    }))

    await braniacExecutor.run({ scope: 'account', account: 'TestAccount' })

    expect(patternRepository.createPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        approval_status: 'auto_applied',
        is_active: 1,
      })
    )
  })

  it('should complete without error when no positions exist', async () => {
    vi.mocked(braniacDataAggregator.aggregateForAccount).mockReturnValue({
      account: 'EmptyAccount',
      positions: [],
      salaryBands: [],
      feedbackCatalog: [],
      dataPointsCount: 0,
      estimatedTokens: 0,
      dataCompleteness: { hasSalaryBands: false, hasFeedbackCatalog: false, hasRejectionDetails: false },
    })

    const result = await braniacExecutor.run({ scope: 'account', account: 'EmptyAccount' })

    expect(claudeService.chatAsync).not.toHaveBeenCalled()
    expect(result.status).toBe('completed')
  })

  it('should reject concurrent runs', async () => {
    vi.mocked(braniacDataAggregator.aggregateForAccount).mockReturnValue({
      account: 'TestAccount',
      positions: [{ upstreamId: 1, account: 'TestAccount', stakeholder: 'JDoe', mainSkill: 'React', countries: 'US', seniorities: 'Senior', jobTitle: 'Dev', positionStatus: 'Active', aging: 10, maximumRate: 100, minimumRate: 50, closedReason: null, candidates: [] }],
      salaryBands: [],
      feedbackCatalog: [],
      dataPointsCount: 1,
      estimatedTokens: 500,
      dataCompleteness: { hasSalaryBands: false, hasFeedbackCatalog: false, hasRejectionDetails: false },
    })

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
})
