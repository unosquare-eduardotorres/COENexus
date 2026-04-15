import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../db/agents/repositories/jobRepository', () => ({
  jobRepository: {
    create: vi.fn().mockReturnValue({ id: 'job-1', metadata_json: '{}' }),
    update: vi.fn(),
    list: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('../../db/agents/repositories/configRepository', () => ({
  getConfig: vi.fn().mockReturnValue({ max_run_duration_ms: 300000 }),
}))

vi.mock('../scout9PipelineService', () => ({
  runScout9Pipeline: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../scout9Steps', () => ({
  fetchPositions: vi.fn(),
  gatherCandidates: vi.fn(),
  crossReference: vi.fn(),
  runAgenticPhase: vi.fn(),
}))

import { scout9JobManager } from '../scout9JobManager'
import { jobRepository } from '../../db/agents/repositories/jobRepository'
import { runScout9Pipeline } from '../scout9PipelineService'
import type { Scout9StatusEvent } from '../scout9JobManager'
import type { Scout9PipelineEvent } from '../scout9PipelineService'

describe('Scout9JobManager', () => {
  let pipelineEvents: Scout9PipelineEvent[]
  let statusEvents: Scout9StatusEvent[]

  beforeEach(() => {
    vi.clearAllMocks()
    pipelineEvents = []
    statusEvents = []
    vi.mocked(jobRepository.create).mockReturnValue({ id: 'job-1', metadata_json: '{}' } as ReturnType<typeof jobRepository.create>)
    vi.mocked(jobRepository.list).mockReturnValue([])
  })

  describe('run', () => {
    it('should create a job and emit running status', async () => {
      await scout9JobManager.run(
        {},
        (e) => pipelineEvents.push(e),
        (e) => statusEvents.push(e)
      )

      expect(jobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'queued' })
      )
      expect(statusEvents[0]).toEqual(expect.objectContaining({ status: 'running', jobId: 'job-1' }))
    })

    it('should emit completed status on success', async () => {
      await scout9JobManager.run(
        {},
        (e) => pipelineEvents.push(e),
        (e) => statusEvents.push(e)
      )

      const completed = statusEvents.find(e => e.status === 'completed')
      expect(completed).toBeDefined()
      expect(completed?.jobId).toBe('job-1')
    })

    it('should return job id', async () => {
      const jobId = await scout9JobManager.run({}, () => {}, () => {})
      expect(jobId).toBe('job-1')
    })

    it('should throw if already running', async () => {
      vi.mocked(runScout9Pipeline).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      )

      const p1 = scout9JobManager.run({}, () => {}, () => {})

      await expect(
        scout9JobManager.run({}, () => {}, () => {})
      ).rejects.toThrow('already running')

      scout9JobManager.cancel()
      await p1
    })
  })

  describe('cancel', () => {
    it('should be a no-op when no job is running', () => {
      expect(() => scout9JobManager.cancel()).not.toThrow()
    })
  })

  describe('getStatus', () => {
    it('should return idle when no jobs exist', () => {
      const status = scout9JobManager.getStatus()
      expect(status.status).toBe('idle')
    })

    it('should return latest job status from repository', () => {
      vi.mocked(jobRepository.list).mockReturnValue([
        { id: 'j-prev', status: 'completed', completed_at: '2024-06-01', started_at: '2024-06-01' } as ReturnType<typeof jobRepository.list>[0],
      ])

      const status = scout9JobManager.getStatus()
      expect(status.status).toBe('completed')
      expect(status.jobId).toBe('j-prev')
    })
  })
})
