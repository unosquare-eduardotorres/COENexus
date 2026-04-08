import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA } from './testSchema'
import { embeddingRepository } from '../embeddingRepository'

let testDb: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => testDb,
}))

describe('embeddingRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  it('should upsert and retrieve by source', () => {
    const embedding = Float32Array.from([0.1, 0.2, 0.3, 0.4])

    const id = embeddingRepository.upsert({
      sourceType: 'employees',
      sourceId: 101,
      upstreamId: 5001,
      embedding,
      resumeText: 'Senior engineer resume',
      isBench: true,
    })
    const result = embeddingRepository.findBySource('employees', 101)

    expect(result).toBeDefined()
    expect(result?.id).toBe(id)
    expect(result?.upstream_id).toBe(5001)
    expect(result?.resume_text).toBe('Senior engineer resume')
    expect(result?.is_bench).toBe(1)
    expect(result?.embedding).toBeInstanceOf(Buffer)
  })

  it('should upsertTextOnly without embedding', () => {
    embeddingRepository.upsertTextOnly({
      sourceType: 'candidates',
      sourceId: 202,
      upstreamId: 6002,
      resumeText: 'Text-only resume body',
      isBench: false,
    })

    const result = embeddingRepository.findBySource('candidates', 202)

    expect(result).toBeDefined()
    expect(result?.embedding).toBeNull()
    expect(result?.resume_text).toBe('Text-only resume body')
  })

  it('should delete by source', () => {
    embeddingRepository.upsertTextOnly({
      sourceType: 'positions',
      sourceId: 303,
      upstreamId: 7003,
      resumeText: 'Position summary',
      isBench: false,
    })

    embeddingRepository.deleteBySource('positions', 303)
    const result = embeddingRepository.findBySource('positions', 303)

    expect(result).toBeUndefined()
  })

  it('should count by source type', () => {
    embeddingRepository.upsert({
      sourceType: 'employees',
      sourceId: 1,
      upstreamId: 1001,
      embedding: Float32Array.from([1, 2, 3, 4]),
      resumeText: 'Has embedding',
      isBench: false,
    })
    embeddingRepository.upsertTextOnly({
      sourceType: 'employees',
      sourceId: 2,
      upstreamId: 1002,
      resumeText: 'No embedding',
      isBench: false,
    })
    embeddingRepository.upsert({
      sourceType: 'positions',
      sourceId: 3,
      upstreamId: 1003,
      embedding: Float32Array.from([4, 3, 2, 1]),
      resumeText: 'Other source type',
      isBench: false,
    })

    const count = embeddingRepository.countBySourceType('employees')

    expect(count).toBe(1)
  })

  it.skip('should perform vector search operations', () => {
    expect(true).toBe(true)
  })
})
