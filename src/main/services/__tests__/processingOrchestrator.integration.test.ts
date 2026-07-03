import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

const mockDb = {
  prepare: vi.fn().mockReturnValue({
    run: vi.fn(),
    get: vi.fn().mockReturnValue({ c: 0 }),
    all: vi.fn().mockReturnValue([]),
  }),
  exec: vi.fn(),
  pragma: vi.fn(),
}

vi.mock('../../db/connection', () => ({
  getDatabase: () => mockDb,
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    getRecordsByStatus: vi.fn().mockReturnValue([]),
    updateStatus: vi.fn(),
    findEmployeeByUpstreamId: vi.fn(),
    findCandidateByUpstreamId: vi.fn(),
  },
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    upsertEmbedding: vi.fn(),
    deleteBySource: vi.fn(),
    getBySourceId: vi.fn().mockReturnValue(null),
  },
}))

vi.mock('../../db/repositories/sessionRepository', () => ({
  sessionRepository: {
    upsertResume: vi.fn(),
    getResumeByUpstreamId: vi.fn(),
  },
}))

vi.mock('../resumeTextExtractor', () => ({
  resumeTextExtractor: {
    extract: vi.fn().mockResolvedValue({ text: 'extracted resume text', method: 'ai' }),
  },
}))

vi.mock('../voyageEmbeddingService', () => ({
  voyageEmbeddingService: {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    isConfigured: vi.fn().mockReturnValue(true),
  },
}))

vi.mock('../../config', () => ({
  getConfig: vi.fn().mockReturnValue({ upstreamApiToken: 'test' }),
}))

vi.mock('../upstreamApiService', () => ({
  upstreamApiService: {
    getEmployeeNotes: vi.fn().mockResolvedValue([]),
  },
}))

import { processingOrchestrator } from '../processingOrchestrator'

describe('processingOrchestrator integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should expose extraction and vectorization methods', () => {
    expect(typeof processingOrchestrator.extractAsync).toBe('function')
    expect(typeof processingOrchestrator.vectorizeAsync).toBe('function')
    expect(typeof processingOrchestrator.processAllAsync).toBe('function')
    expect(typeof processingOrchestrator.vectorizeSingle).toBe('function')
  })

  it('should expose pause controls', () => {
    expect(typeof processingOrchestrator.requestPauseExtraction).toBe('function')
    expect(typeof processingOrchestrator.requestPauseVectorization).toBe('function')
  })

  it('should return status', () => {
    const status = processingOrchestrator.getStatus()
    expect(status).toBeDefined()
  })
})
