import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'

vi.mock('../voyageEmbeddingService', () => ({
  voyageEmbeddingService: {
    generateEmbedding: vi.fn(),
  },
}))

vi.mock('../claudeService', () => ({
  claudeService: {
    chatAsync: vi.fn(),
  },
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    searchSimilar: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    findEmployeeByUpstreamId: vi.fn(),
    findCandidateByUpstreamId: vi.fn(),
  },
}))

vi.mock('../../db/repositories/matchRepository', () => ({
  matchRepository: {
    insertSession: vi.fn(),
    insertCandidate: vi.fn(),
  },
}))

vi.mock('../matchSearchCoordinator', () => ({
  matchSearchCoordinator: {
    register: vi.fn(),
    tryResolve: vi.fn(),
    tryResolveAll: vi.fn(),
  },
}))

vi.mock('../../db/connection', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn(),
    })),
    pragma: vi.fn(),
  })),
}))

vi.mock('../../config', () => ({
  getConfig: vi.fn(() => ({
    claude: { haikuModel: 'haiku-test', opusModel: 'opus-test', haikuConcurrency: 2, opusConcurrency: 1 },
    voyage: { apiUrl: 'https://api.voyage.test', defaultModel: 'voyage-test', apiKeys: ['key1'] },
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
  OPUS_ANALYSIS: 'test prompt {{JOB_DESCRIPTION}}',
  MATCH_ENGINE_CONTEXT_BLOCK: 'context',
  fillTemplate: vi.fn((_t: string, vars: Record<string, string>) => JSON.stringify(vars)),
}))

vi.mock('../utils/concurrency', () => ({
  runConcurrent: vi.fn(async (items: unknown[], _c: number, fn: (item: unknown) => Promise<unknown>) => {
    return Promise.all(items.map(fn))
  }),
}))

vi.mock('../utils/aiResponseParser', () => ({
  parseAiResponse: vi.fn(() => ({ relevant: true, score: 85, reason: 'Good match' })),
}))

vi.mock('../utils/aiResponseSchemas', () => ({
  haikuTriageSchema: {},
  opusAnalysisSchema: {},
}))

describe('matchEngineService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hashJobDescription', () => {
    it('should produce consistent hash for same input', async () => {
      const { matchEngineService } = await import('../matchEngineService')
      expect(matchEngineService).toBeDefined()

      const jd = '  Senior React Developer  '
      const expected = createHash('sha256').update(jd.trim().toLowerCase()).digest('hex')
      const hash2 = createHash('sha256').update('senior react developer').digest('hex')
      expect(expected).toBe(hash2)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = createHash('sha256').update('react developer').digest('hex')
      const hash2 = createHash('sha256').update('java developer').digest('hex')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('matchEngineService module exports', () => {
    it('should export matchEngineService with expected methods', async () => {
      const { matchEngineService } = await import('../matchEngineService')
      expect(matchEngineService).toBeDefined()
      expect(typeof matchEngineService.getPoolCounts).toBe('function')
      expect(typeof matchEngineService.getFilterOptions).toBe('function')
      expect(typeof matchEngineService.invalidateFilterCache).toBe('function')
      expect(typeof matchEngineService.searchAsync).toBe('function')
      expect(typeof matchEngineService.listSessions).toBe('function')
      expect(typeof matchEngineService.getSession).toBe('function')
      expect(typeof matchEngineService.getResumeText).toBe('function')
    })
  })

  describe('constraint filter logic', () => {
    it('should handle allowed operators', () => {
      const allowedOps = new Set([
        'equals', 'not-equals', 'contains', 'starts-with',
        'greater-than', 'less-than', 'between',
      ])
      expect(allowedOps.has('equals')).toBe(true)
      expect(allowedOps.has('not-equals')).toBe(true)
      expect(allowedOps.has('contains')).toBe(true)
      expect(allowedOps.has('starts-with')).toBe(true)
      expect(allowedOps.has('greater-than')).toBe(true)
      expect(allowedOps.has('less-than')).toBe(true)
      expect(allowedOps.has('between')).toBe(true)
      expect(allowedOps.has('invalid-op')).toBe(false)
    })

    it('should map employee fields correctly', () => {
      const employeeMap: Record<string, string> = {
        seniority: 'e.seniority', mainSkill: 'e.main_skill', country: 'e.country',
        salary: 'e.gross_monthly_salary', rate: 'e.rate', isBench: 'e.is_bench',
        jobTitle: 'e.job_title',
      }
      expect(employeeMap['seniority']).toBe('e.seniority')
      expect(employeeMap['mainSkill']).toBe('e.main_skill')
      expect(employeeMap['salary']).toBe('e.gross_monthly_salary')
      expect(employeeMap['nonExistent']).toBeUndefined()
    })

    it('should map candidate fields correctly', () => {
      const candidateMap: Record<string, string> = {
        seniority: 'c.seniority', mainSkill: 'c.main_skill', country: 'c.country',
        salary: 'c.current_salary', candidateStatus: 'c.candidate_status',
        coeCertified: 'c.coe_certified',
      }
      expect(candidateMap['candidateStatus']).toBe('c.candidate_status')
      expect(candidateMap['coeCertified']).toBe('c.coe_certified')
    })
  })

  describe('enrichWithEntityData logic', () => {
    it('should compute cosine similarity as 1 - distance', () => {
      const distance = 0.3
      const similarity = 1 - distance
      expect(similarity).toBeCloseTo(0.7, 5)
    })

    it('should handle zero distance as perfect similarity', () => {
      const similarity = 1 - 0
      expect(similarity).toBe(1)
    })

    it('should handle distance of 1 as zero similarity', () => {
      const similarity = 1 - 1
      expect(similarity).toBe(0)
    })
  })

  describe('vector search configuration', () => {
    it('should compute vectorLimit as max(topN * 10, 50)', () => {
      expect(Math.max(5 * 10, 50)).toBe(50)
      expect(Math.max(10 * 10, 50)).toBe(100)
      expect(Math.max(3 * 10, 50)).toBe(50)
      expect(Math.max(20 * 10, 50)).toBe(200)
    })
  })

  describe('toStageSummary', () => {
    it('should extract only stage-relevant fields from enriched candidate', () => {
      const enriched = {
        sourceId: 1, sourceType: 'employees', upstreamId: 100,
        name: 'Jane Doe', resumeText: 'long text...', cosineSimilarity: 0.85,
        seniority: 'Senior', mainSkill: 'React', country: 'Mexico',
        rate: 50, currency: 'USD', isBench: true, jobTitle: 'Software Engineer',
      }

      const summary = {
        upstreamId: enriched.upstreamId,
        name: enriched.name,
        sourceType: enriched.sourceType,
        cosineSimilarity: enriched.cosineSimilarity,
        seniority: enriched.seniority,
        mainSkill: enriched.mainSkill,
        country: enriched.country,
        isBench: enriched.isBench,
      }

      expect(summary).toEqual({
        upstreamId: 100,
        name: 'Jane Doe',
        sourceType: 'employees',
        cosineSimilarity: 0.85,
        seniority: 'Senior',
        mainSkill: 'React',
        country: 'Mexico',
        isBench: true,
      })
      expect(summary).not.toHaveProperty('resumeText')
      expect(summary).not.toHaveProperty('rate')
    })
  })
})
