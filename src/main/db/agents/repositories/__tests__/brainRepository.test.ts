import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import { brainRepository } from '../brainRepository'

describe('brainRepository', () => {
  beforeEach(() => {
    db = createAgentsDb()
  })

  it('should create a brain snapshot and return row', () => {
    const snapshot = brainRepository.create({
      snapshot_markdown: '# Brain State\n\nAll systems operational.',
      token_estimate: 500,
    })

    expect(snapshot.id).toBeDefined()
    expect(snapshot.snapshot_markdown).toContain('Brain State')
    expect(snapshot.token_estimate).toBe(500)
    expect(snapshot.source_job_id).toBeNull()
  })

  it('should list snapshots ordered by created_at DESC', () => {
    brainRepository.create({ snapshot_markdown: 'First', token_estimate: 100 })
    brainRepository.create({ snapshot_markdown: 'Second', token_estimate: 200 })

    const list = brainRepository.list()
    expect(list).toHaveLength(2)
    expect(list[0].snapshot_markdown).toBe('Second')
  })

  it('should getLatest snapshot', () => {
    brainRepository.create({ snapshot_markdown: 'Old', token_estimate: 100 })
    brainRepository.create({ snapshot_markdown: 'Latest', token_estimate: 300 })

    const latest = brainRepository.getLatest()
    expect(latest).toBeDefined()
    expect(latest!.snapshot_markdown).toBe('Latest')
  })

  it('should delete a snapshot by id', () => {
    const snapshot = brainRepository.create({ snapshot_markdown: 'ToDelete', token_estimate: 50 })
    expect(brainRepository.delete(snapshot.id)).toBe(true)
    expect(brainRepository.getById(snapshot.id)).toBeUndefined()
  })
})
