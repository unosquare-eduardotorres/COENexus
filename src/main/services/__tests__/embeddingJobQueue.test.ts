import { beforeEach, describe, expect, it } from 'vitest'

import { type EmbeddingJob, embeddingJobQueue } from '../embeddingJobQueue'

function createJob(overrides: Partial<EmbeddingJob> = {}): EmbeddingJob {
  return {
    source: 'employees',
    dbId: 1,
    upstreamId: 1001,
    name: 'Test Candidate',
    resumeNoteId: null,
    resumeFilename: null,
    isBench: false,
    token: 'token',
    model: 'voyage-3',
    ...overrides,
  }
}

describe('embeddingJobQueue', () => {
  beforeEach(() => {
    embeddingJobQueue.drain()
  })

  it('should increment pending count on enqueue', () => {
    const job = createJob()

    embeddingJobQueue.enqueue(job)

    expect(embeddingJobQueue.pendingCount).toBe(1)
  })

  it('should dequeue jobs in FIFO order', async () => {
    const firstJob = createJob({ dbId: 1, upstreamId: 1001, name: 'First' })
    const secondJob = createJob({ dbId: 2, upstreamId: 1002, name: 'Second' })
    embeddingJobQueue.enqueue(firstJob)
    embeddingJobQueue.enqueue(secondJob)

    const dequeuedFirst = await embeddingJobQueue.dequeue()
    const dequeuedSecond = await embeddingJobQueue.dequeue()

    expect(dequeuedFirst).toEqual(firstJob)
    expect(dequeuedSecond).toEqual(secondJob)
  })

  it('should reflect queue depth correctly', async () => {
    const firstJob = createJob({ dbId: 1 })
    const secondJob = createJob({ dbId: 2 })
    embeddingJobQueue.enqueue(firstJob)
    embeddingJobQueue.enqueue(secondJob)

    await embeddingJobQueue.dequeue()

    expect(embeddingJobQueue.pendingCount).toBe(1)
  })

  it('should drain all jobs and reset count', () => {
    const firstJob = createJob({ dbId: 1, upstreamId: 1001 })
    const secondJob = createJob({ dbId: 2, upstreamId: 1002 })
    embeddingJobQueue.enqueue(firstJob)
    embeddingJobQueue.enqueue(secondJob)

    const drainedJobs = embeddingJobQueue.drain()

    expect(drainedJobs).toEqual([firstJob, secondJob])
    expect(embeddingJobQueue.pendingCount).toBe(0)
  })

  it('should resolve dequeue when job is enqueued after waiting', async () => {
    const waitingDequeue = embeddingJobQueue.dequeue()
    let resolved = false
    waitingDequeue.then(() => {
      resolved = true
    })

    await Promise.resolve()
    expect(resolved).toBe(false)
    const job = createJob()
    embeddingJobQueue.enqueue(job)
    const dequeuedJob = await waitingDequeue

    expect(resolved).toBe(true)
    expect(dequeuedJob).toEqual(job)
    expect(embeddingJobQueue.pendingCount).toBe(0)
  })
})
