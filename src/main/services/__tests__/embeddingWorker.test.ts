import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../embeddingJobQueue', () => ({
  embeddingJobQueue: {
    dequeue: vi.fn(),
  },
}))

vi.mock('../upstreamApiService', () => ({
  upstreamApiService: {
    getNoteFile: vi.fn(),
  },
}))

vi.mock('../voyageEmbeddingService', () => ({
  voyageEmbeddingService: {
    generateEmbedding: vi.fn(),
  },
}))

vi.mock('../resumeTextExtractor', () => ({
  resumeTextExtractor: {
    extractText: vi.fn(),
  },
}))

vi.mock('../../db/repositories/embeddingRepository', () => ({
  embeddingRepository: {
    upsert: vi.fn(),
  },
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    updateStatus: vi.fn(),
    markFailed: vi.fn(),
    findPositionByUpstreamId: vi.fn(),
    findEmployeeByUpstreamId: vi.fn(),
  },
}))

import { embeddingWorker } from '../embeddingWorker'
import { embeddingJobQueue } from '../embeddingJobQueue'

describe('embeddingWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.mocked(embeddingJobQueue.dequeue).mockImplementation(() => new Promise(() => {}))
  })

  afterEach(async () => {
    embeddingWorker.stop()
    await vi.advanceTimersByTimeAsync(600)
    vi.useRealTimers()
  })

  it('should start and stop worker', async () => {
    embeddingWorker.start()
    expect(embeddingWorker.isRunning).toBe(true)

    embeddingWorker.stop()
    await vi.advanceTimersByTimeAsync(600)

    expect(embeddingWorker.isRunning).toBe(false)
  })

  it('should report isRunning status', async () => {
    expect(embeddingWorker.isRunning).toBe(false)

    embeddingWorker.start()
    expect(embeddingWorker.isRunning).toBe(true)

    embeddingWorker.stop()
    await vi.advanceTimersByTimeAsync(600)

    expect(embeddingWorker.isRunning).toBe(false)
  })
})
