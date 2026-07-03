import Database from 'better-sqlite3'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { SCHEMA } from '../../db/repositories/__tests__/testSchema'

describe('performance benchmarks', () => {
  it('should initialize database in under 500ms', () => {
    const start = performance.now()

    const db = new Database(':memory:')
    db.exec(SCHEMA)
    db.close()

    expect(performance.now() - start).toBeLessThan(500)
  })

  it('should upsert 100 embeddings in under 1s', () => {
    const db = new Database(':memory:')
    db.exec(SCHEMA)

    const stmt = db.prepare(`
      INSERT INTO resume_embeddings (
        source_type,
        source_id,
        upstream_id,
        embedding,
        resume_text,
        created_at,
        updated_at,
        is_bench
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const start = performance.now()
    const tx = db.transaction(() => {
      for (let i = 0; i < 100; i += 1) {
        stmt.run(
          'employees',
          i + 1,
          i + 1000,
          Buffer.alloc(16),
          `resume-${i}`,
          new Date().toISOString(),
          new Date().toISOString(),
          0,
        )
      }
    })

    tx()
    expect(performance.now() - start).toBeLessThan(1000)

    db.close()
  })
})
