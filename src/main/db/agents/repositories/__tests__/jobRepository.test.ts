import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import { jobRepository } from '../jobRepository'

describe('jobRepository', () => {
  beforeEach(() => {
    db = createAgentsDb()
  })

  it('should create a job and return row with generated id', () => {
    const job = jobRepository.create({
      agent_type: 'scout9',
      scope_type: 'account',
      scope_value: 'TestCo',
    })

    expect(job.id).toBeDefined()
    expect(job.agent_type).toBe('scout9')
    expect(job.scope_type).toBe('account')
    expect(job.status).toBe('queued')
  })

  it('should getById', () => {
    const created = jobRepository.create({ agent_type: 'braniac' })
    const fetched = jobRepository.getById(created.id)

    expect(fetched).toBeDefined()
    expect(fetched!.agent_type).toBe('braniac')
  })

  it('should update job fields', () => {
    const job = jobRepository.create({})
    const updated = jobRepository.update(job.id, { status: 'running', pipeline_phase: 'processing' })

    expect(updated).toBe(true)
    const fetched = jobRepository.getById(job.id)
    expect(fetched!.status).toBe('running')
    expect(fetched!.pipeline_phase).toBe('processing')
  })

  it('should list jobs ordered by created_at DESC', () => {
    jobRepository.create({ agent_type: 'scout9' })
    jobRepository.create({ agent_type: 'braniac' })

    const jobs = jobRepository.list()
    expect(jobs).toHaveLength(2)
  })

  it('should listByAgentType', () => {
    jobRepository.create({ agent_type: 'scout9' })
    jobRepository.create({ agent_type: 'braniac' })
    jobRepository.create({ agent_type: 'scout9' })

    const scout9Jobs = jobRepository.listByAgentType('scout9')
    expect(scout9Jobs).toHaveLength(2)
    expect(scout9Jobs.every(j => j.agent_type === 'scout9')).toBe(true)
  })

  it('should delete a job', () => {
    const job = jobRepository.create({})
    expect(jobRepository.delete(job.id)).toBe(true)
    expect(jobRepository.getById(job.id)).toBeUndefined()
  })
})
