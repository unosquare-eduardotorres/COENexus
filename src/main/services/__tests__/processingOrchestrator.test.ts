import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../db/connection', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn(),
      run: vi.fn(),
    })),
  })),
}))

vi.mock('../voyageEmbeddingService', () => ({
  voyageEmbeddingService: {
    generateEmbedding: vi.fn().mockResolvedValue(new Float32Array(1024)),
  },
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    upsertTextOnly: vi.fn(),
    upsertEmbedding: vi.fn(),
    countBySource: vi.fn().mockReturnValue(0),
  },
}))

vi.mock('../upstreamApiService', () => ({
  upstreamApiService: {
    downloadResumeFile: vi.fn(),
  },
}))

vi.mock('../resumeTextExtractor', () => ({
  resumeTextExtractor: {
    extractText: vi.fn().mockResolvedValue('Extracted resume text content'),
  },
}))

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('../../config', () => ({
  getConfig: vi.fn(() => ({
    voyage: { apiUrl: 'https://api.voyage.test', defaultModel: 'voyage-test', apiKeys: ['key1'] },
  })),
}))

describe('processingOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sanitizeUnicode', () => {
    it('should remove control characters', () => {
      const sanitize = (text: string) => text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      expect(sanitize('Hello\u0000World')).toBe('HelloWorld')
      expect(sanitize('\u0001\u0002\u0003Text')).toBe('Text')
    })

    it('should preserve normal text', () => {
      const sanitize = (text: string) => text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      expect(sanitize('Normal text with spaces')).toBe('Normal text with spaces')
    })

    it('should preserve tabs and newlines', () => {
      const sanitize = (text: string) => text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      expect(sanitize('Line1\nLine2\tTabbed')).toBe('Line1\nLine2\tTabbed')
    })
  })

  describe('makeProgress', () => {
    it('should create a processing progress event', () => {
      const makeProgress = (source: string, total: number, processed: number, success: number, failed: number, skipped: number, status = 'processing') => ({
        type: 'progress' as const,
        progress: { source, status, totalRecords: total, processedRecords: processed, successCount: success, failedCount: failed, skippedCount: skipped },
      })

      const event = makeProgress('employees', 100, 50, 45, 3, 2)
      expect(event.type).toBe('progress')
      expect(event.progress.source).toBe('employees')
      expect(event.progress.totalRecords).toBe(100)
      expect(event.progress.processedRecords).toBe(50)
      expect(event.progress.successCount).toBe(45)
      expect(event.progress.failedCount).toBe(3)
      expect(event.progress.skippedCount).toBe(2)
      expect(event.progress.status).toBe('processing')
    })

    it('should use custom status when provided', () => {
      const makeProgress = (source: string, total: number, processed: number, success: number, failed: number, skipped: number, status = 'processing') => ({
        type: 'progress' as const,
        progress: { source, status, totalRecords: total, processedRecords: processed, successCount: success, failedCount: failed, skippedCount: skipped },
      })

      const event = makeProgress('candidates', 10, 10, 10, 0, 0, 'complete')
      expect(event.progress.status).toBe('complete')
    })
  })

  describe('buildEnrichedText', () => {
    it('should prepend employee metadata to resume text', () => {
      const row = { full_name: 'John Doe', main_skill: 'React', seniority: 'Senior', job_title: 'Frontend Dev' }
      const parts = [`Name: ${row.full_name}`]
      if (row.main_skill) parts.push(`Main Skill: ${row.main_skill}`)
      if (row.seniority) parts.push(`Seniority: ${row.seniority}`)
      if (row.job_title) parts.push(`Job Title: ${row.job_title}`)
      parts.push('', 'Resume:', 'Some resume content')

      const enriched = parts.join('\n')
      expect(enriched).toContain('Name: John Doe')
      expect(enriched).toContain('Main Skill: React')
      expect(enriched).toContain('Seniority: Senior')
      expect(enriched).toContain('Job Title: Frontend Dev')
      expect(enriched).toContain('Resume:\nSome resume content')
    })

    it('should skip empty metadata fields', () => {
      const row = { full_name: 'Jane', main_skill: '', seniority: 'Mid', job_title: '' }
      const parts = [`Name: ${row.full_name}`]
      if (row.main_skill) parts.push(`Main Skill: ${row.main_skill}`)
      if (row.seniority) parts.push(`Seniority: ${row.seniority}`)
      if (row.job_title) parts.push(`Job Title: ${row.job_title}`)
      parts.push('', 'Resume:', 'Content')

      const enriched = parts.join('\n')
      expect(enriched).toContain('Name: Jane')
      expect(enriched).toContain('Seniority: Mid')
      expect(enriched).not.toContain('Main Skill:')
      expect(enriched).not.toContain('Job Title:')
    })
  })

  describe('module exports', () => {
    it('should export processingOrchestrator with expected methods', async () => {
      const { processingOrchestrator } = await import('../processingOrchestrator')
      expect(processingOrchestrator).toBeDefined()
      expect(typeof processingOrchestrator.getStatus).toBe('function')
      expect(typeof processingOrchestrator.requestPauseExtraction).toBe('function')
      expect(typeof processingOrchestrator.requestPauseVectorization).toBe('function')
      expect(typeof processingOrchestrator.extractAsync).toBe('function')
      expect(typeof processingOrchestrator.vectorizeAsync).toBe('function')
      expect(typeof processingOrchestrator.processAllAsync).toBe('function')
      expect(typeof processingOrchestrator.vectorizeSingle).toBe('function')
    })
  })
})
