import { getScout9Database } from '../scout9Connection'

export interface BrainSnapshotRow {
  id: string
  snapshot_markdown: string
  token_estimate: number
  source_job_id: string | null
  created_at: string
}

export interface CreateBrainSnapshotInput {
  snapshot_markdown: string
  token_estimate: number
  source_job_id?: string | null
}

export const brainRepository = {
  list(limit = 50, offset = 0): BrainSnapshotRow[] {
    const db = getScout9Database()
    return db.prepare(`
      SELECT * FROM brain_snapshots
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as BrainSnapshotRow[]
  },

  getById(id: string): BrainSnapshotRow | undefined {
    const db = getScout9Database()
    return db.prepare('SELECT * FROM brain_snapshots WHERE id = ?').get(id) as BrainSnapshotRow | undefined
  },

  getLatest(): BrainSnapshotRow | undefined {
    const db = getScout9Database()
    return db.prepare(`
      SELECT * FROM brain_snapshots
      ORDER BY created_at DESC
      LIMIT 1
    `).get() as BrainSnapshotRow | undefined
  },

  create(input: CreateBrainSnapshotInput): BrainSnapshotRow {
    const db = getScout9Database()
    return db.prepare(`
      INSERT INTO brain_snapshots (
        snapshot_markdown, token_estimate, source_job_id
      ) VALUES (
        @snapshot_markdown, @token_estimate, @source_job_id
      )
      RETURNING *
    `).get({
      snapshot_markdown: input.snapshot_markdown,
      token_estimate: input.token_estimate,
      source_job_id: input.source_job_id ?? null,
    }) as BrainSnapshotRow
  },

  delete(id: string): boolean {
    const db = getScout9Database()
    const result = db.prepare('DELETE FROM brain_snapshots WHERE id = ?').run(id)
    return result.changes > 0
  },
}
