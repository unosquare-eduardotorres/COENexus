import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../db/repositories/sessionRepository', () => ({
  sessionRepository: {
    getResumeSession: vi.fn(),
    updateResumeSession: vi.fn(),
  },
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    upsert: vi.fn(),
  },
}))

vi.mock('../voyageEmbeddingService', () => ({
  voyageEmbeddingService: {
    generateEmbedding: vi.fn(),
  },
}))

import { resumeSessionVectorizer } from '../resumeSessionVectorizer'
import { sessionRepository } from '../../db/repositories/sessionRepository'
import { embeddingRepository } from '../../db/repositories/embeddingRepository'
import { voyageEmbeddingService } from '../voyageEmbeddingService'

describe('resumeSessionVectorizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  it('should vectorize session with valid resume text', async () => {
    vi.mocked(sessionRepository.getResumeSession).mockReturnValue({
      id: 1,
      candidate_upstream_id: 42,
      employee_upstream_id: null,
      original_resume_text: 'Senior engineer with TypeScript experience.',
    } as never)
    vi.mocked(voyageEmbeddingService.generateEmbedding).mockResolvedValue(new Float32Array([0.1, 0.2]))
    vi.mocked(embeddingRepository.upsert).mockReturnValue(555)

    await resumeSessionVectorizer.vectorizeSession(1, 'voyage-4-large')

    expect(voyageEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
      'Senior engineer with TypeScript experience.',
      'voyage-4-large'
    )
    expect(embeddingRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'resume-session',
        sourceId: 1,
        upstreamId: 42,
      })
    )
    expect(sessionRepository.updateResumeSession).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({ vectorization_status: 'processing' })
    )
    expect(sessionRepository.updateResumeSession).toHaveBeenNthCalledWith(
      2,
      1,
      expect.objectContaining({ vectorization_status: 'completed', resume_embedding_id: 555 })
    )
  })

  it('should mark session failed when no resume text', async () => {
    vi.mocked(sessionRepository.getResumeSession).mockReturnValue({
      id: 2,
      candidate_upstream_id: null,
      employee_upstream_id: 8,
      original_resume_text: '   ',
    } as never)

    await resumeSessionVectorizer.vectorizeSession(2, 'voyage-4-large')

    expect(sessionRepository.updateResumeSession).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ vectorization_status: 'failed' })
    )
    expect(voyageEmbeddingService.generateEmbedding).not.toHaveBeenCalled()
    expect(embeddingRepository.upsert).not.toHaveBeenCalled()
  })

  it('should mark session failed on vectorization error', async () => {
    vi.mocked(sessionRepository.getResumeSession).mockReturnValue({
      id: 3,
      candidate_upstream_id: null,
      employee_upstream_id: 9,
      original_resume_text: 'Resume content',
    } as never)
    vi.mocked(voyageEmbeddingService.generateEmbedding).mockRejectedValue(new Error('vectorization failed'))

    await resumeSessionVectorizer.vectorizeSession(3, 'voyage-4-large')

    expect(sessionRepository.updateResumeSession).toHaveBeenNthCalledWith(
      1,
      3,
      expect.objectContaining({ vectorization_status: 'processing' })
    )
    expect(sessionRepository.updateResumeSession).toHaveBeenNthCalledWith(
      2,
      3,
      expect.objectContaining({ vectorization_status: 'failed' })
    )
  })

  it('should skip when session not found', async () => {
    vi.mocked(sessionRepository.getResumeSession).mockReturnValue(undefined)

    await resumeSessionVectorizer.vectorizeSession(999, 'voyage-4-large')

    expect(sessionRepository.updateResumeSession).not.toHaveBeenCalled()
    expect(voyageEmbeddingService.generateEmbedding).not.toHaveBeenCalled()
    expect(embeddingRepository.upsert).not.toHaveBeenCalled()
  })
})
