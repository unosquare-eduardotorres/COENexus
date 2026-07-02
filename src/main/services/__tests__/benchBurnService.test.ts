import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'

vi.mock('../llmRouter', () => ({
  llmRouter: {
    chatAsync: vi.fn().mockResolvedValue({ text: '{"match_score":85,"summary":"Good match"}', usage: { inputTokens: 0, outputTokens: 0 } }),
    getConcurrencyLimit: vi.fn().mockReturnValue(8),
  },
}))

vi.mock('../voyageEmbeddingService', () => ({
  voyageEmbeddingService: {
    generateEmbedding: vi.fn().mockResolvedValue(new Float32Array(1024)),
  },
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    searchSimilar: vi.fn().mockReturnValue([]),
    getEmbeddingBySourceId: vi.fn(),
  },
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    findEmployeeByUpstreamId: vi.fn(),
    findCandidateByUpstreamId: vi.fn(),
    findOpenPositionByUpstreamId: vi.fn(),
  },
}))

vi.mock('../../db/repositories/matchRepository', () => ({
  matchRepository: {
    insertSession: vi.fn().mockReturnValue(1),
    insertCandidate: vi.fn(),
  },
}))

vi.mock('../../config', () => ({
  getConfig: vi.fn(() => ({
    voyage: { apiUrl: 'https://api.test', defaultModel: 'voyage-test', apiKeys: ['key1'] },
    modelConfig: {
      presetMode: 'claude',
      localServerUrl: 'http://localhost:8080',
      localDefaultModel: '',
      concurrency: { claude: { max: 2, haikuMax: 2 }, local: { max: 1 } },
      features: {
        resumeSkillExtraction: { provider: 'claude', model: 'claude-haiku-4-5' },
        resumeFormatCheck: { provider: 'claude', model: 'claude-sonnet-4-6' },
        resumeTransform: { provider: 'claude', model: 'claude-sonnet-4-6' },
        candidateProfile: { provider: 'claude', model: 'claude-sonnet-4-6' },
        coverLetter: { provider: 'claude', model: 'claude-sonnet-4-6' },
        matchTriage: { provider: 'claude', model: 'claude-haiku-4-5' },
        matchDeepAnalysis: { provider: 'claude', model: 'claude-opus-4-8' },
        benchBurnAnalysis: { provider: 'claude', model: 'claude-opus-4-8' },
        responsivenessAnalysis: { provider: 'claude', model: 'claude-sonnet-4-6' },
        responsivenessReport: { provider: 'claude', model: 'claude-sonnet-4-6' },
        bugDescription: { provider: 'claude', model: 'claude-haiku-4-5' },
        aiChat: { provider: 'claude', model: 'claude-sonnet-4-6' },
      },
    },
  })),
}))

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('../promptTemplates', () => ({
  OPUS_ANALYSIS: 'test prompt',
  BENCH_BURN_CONTEXT_BLOCK: 'bench context',
  EXTERNAL_CANDIDATE_CONTEXT_BLOCK: 'external context',
  fillTemplate: vi.fn((_t: string, vars: Record<string, string>) => JSON.stringify(vars)),
}))

vi.mock('../utils/concurrency', () => ({
  runConcurrent: vi.fn(async (items: unknown[], _c: number, fn: (item: unknown) => Promise<unknown>) => {
    return Promise.all(items.map(fn))
  }),
}))

vi.mock('../utils/aiResponseParser', () => ({
  parseAiResponse: vi.fn(() => ({
    match_score: 85,
    overall_fit: 'strong',
    scores: {},
    key_skills: [],
    gaps: [],
    domain_relevance: [],
    fit_verdict: { verdict: 'Strong Fit', confidence: 0.9, reasoning: 'Test' },
    summary: 'Good match',
  })),
}))

vi.mock('../utils/aiResponseSchemas', () => ({
  opusAnalysisSchema: {},
}))

describe('benchBurnService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hashJobDescription', () => {
    it('should produce consistent hash', () => {
      const jd = '  Senior Developer  '
      const hash1 = createHash('sha256').update(jd.trim().toLowerCase()).digest('hex')
      const hash2 = createHash('sha256').update('senior developer').digest('hex')
      expect(hash1).toBe(hash2)
    })
  })

  describe('module exports', () => {
    it('should export benchBurnService with expected methods', async () => {
      const { benchBurnService } = await import('../benchBurnService')
      expect(benchBurnService).toBeDefined()
      expect(typeof benchBurnService.executeAsync).toBe('function')
      expect(typeof benchBurnService.executeExternalCandidateAsync).toBe('function')
    })
  })

  describe('BenchBurnRequest interface validation', () => {
    it('should require expected fields', () => {
      const request = {
        name: 'Test Bench Burn',
        employeeUpstreamIds: [1001, 1002],
        positionUpstreamIds: [2001],
        topNPerEmployee: 3,
        topNPerPosition: 5,
      }

      expect(request.name).toBe('Test Bench Burn')
      expect(request.employeeUpstreamIds).toHaveLength(2)
      expect(request.positionUpstreamIds).toHaveLength(1)
    })

    it('should support optional customPositions', () => {
      const request = {
        name: 'Test',
        employeeUpstreamIds: [1001],
        positionUpstreamIds: [],
        customPositions: [{ name: 'Custom Role', jobDescription: 'Build things' }],
      }

      expect(request.customPositions).toHaveLength(1)
      expect(request.customPositions![0].name).toBe('Custom Role')
    })
  })

  describe('ExternalCandidateMatchRequest interface validation', () => {
    it('should require candidate list', () => {
      const request = {
        name: 'External Match',
        positionUpstreamIds: [2001],
        candidates: [
          { name: 'John Doe', resumeText: 'Experienced developer...' },
          { name: 'Jane Smith', resumeText: 'Frontend specialist...' },
        ],
      }

      expect(request.candidates).toHaveLength(2)
      expect(request.candidates[0].resumeText).toBeTruthy()
    })
  })

  describe('CrossMatchResult structure', () => {
    it('should contain all required match result fields', () => {
      const result = {
        employeeUpstreamId: 1001,
        employeeName: 'John Doe',
        positionUpstreamId: 2001,
        positionLabel: 'Senior React Developer',
        matchScore: 85,
        cosineSimilarity: 0.92,
        scores: { technical: 90, experience: 80 },
        skills: [{ name: 'React', level: 'Expert' }],
        gaps: [{ skill: 'AWS', severity: 'minor' }],
        domains: [{ name: 'Web Development', relevance: 0.95 }],
        analysis: null,
        summary: 'Strong technical fit',
      }

      expect(result.matchScore).toBe(85)
      expect(result.cosineSimilarity).toBeCloseTo(0.92)
      expect(result.skills).toHaveLength(1)
      expect(result.gaps).toHaveLength(1)
    })
  })
})
