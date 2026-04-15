import { getDatabase } from '../connection'
import { createLogger } from '../../services/logger'

const log = createLogger('PrrRepository')

export type CoeStatus = 'Not Set' | 'Pending Evaluation' | 'Ready to Present' | 'Not Applies' | 'Other' | 'Closed'

export interface PrrCommentEntry {
  text: string
  author: string
  createdAt: string
}

export interface PrrReportRow {
  id: number
  upstream_id: number
  employee: string
  account: string
  team: string
  main_skill: string
  seniority: string
  transition_status: string
  transition_sub_type: string
  location: string
  request_date: string | null
  days_since_last_interview: string
  impact: string
  attrition_risk: string
  comments: string
  presentations_count: number
  coe_status: CoeStatus
  coe_comments: string
  status: string
  status_reason: string | null
  synced_at: string
}

function parseComments(raw: string | null | undefined): PrrCommentEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((entry): entry is PrrCommentEntry => {
        if (!entry || typeof entry !== 'object') return false
        const candidate = entry as Record<string, unknown>
        return (
          typeof candidate.text === 'string' &&
          typeof candidate.author === 'string' &&
          typeof candidate.createdAt === 'string'
        )
      })
      .map((entry) => ({ text: entry.text, author: entry.author, createdAt: entry.createdAt }))
  } catch {
    return []
  }
}

export const prrRepository = {
  getAll(): PrrReportRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_project_reallocations ORDER BY employee').all() as PrrReportRow[]
  },

  getByUpstreamId(upstreamId: number): PrrReportRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM synced_project_reallocations WHERE upstream_id = ?').get(upstreamId) as PrrReportRow | undefined
  },

  updateCoeStatus(upstreamId: number, coeStatus: CoeStatus): boolean {
    const db = getDatabase()
    try {
      const result = db.prepare('UPDATE synced_project_reallocations SET coe_status = ? WHERE upstream_id = ?').run(coeStatus, upstreamId)
      return result.changes > 0
    } catch (err) {
      log.error(`updateCoeStatus failed for upstream_id=${upstreamId}`, err instanceof Error ? err : new Error(String(err)), { upstreamId, coeStatus })
      throw err
    }
  },

  addComment(upstreamId: number, text: string, author: string): PrrCommentEntry[] {
    const db = getDatabase()
    const entry: PrrCommentEntry = {
      text: text.trim(),
      author: author.trim(),
      createdAt: new Date().toISOString(),
    }

    const existing = prrRepository.getComments(upstreamId)
    const updated = [...existing, entry]

    try {
      db.prepare('UPDATE synced_project_reallocations SET coe_comments = ? WHERE upstream_id = ?')
        .run(JSON.stringify(updated), upstreamId)
      return updated
    } catch (err) {
      log.error(`addComment failed for upstream_id=${upstreamId}`, err instanceof Error ? err : new Error(String(err)), { upstreamId })
      throw err
    }
  },

  getComments(upstreamId: number): PrrCommentEntry[] {
    const db = getDatabase()
    const row = db.prepare('SELECT coe_comments FROM synced_project_reallocations WHERE upstream_id = ?').get(upstreamId) as { coe_comments: string } | undefined
    if (!row) return []
    return parseComments(row.coe_comments)
  },

  deleteByUpstreamId(upstreamId: number): boolean {
    const db = getDatabase()
    const tx = db.transaction((id: number): boolean => {
      db.prepare('DELETE FROM prr_presentations WHERE prr_id = ?').run(id)
      const result = db.prepare('DELETE FROM synced_project_reallocations WHERE upstream_id = ?').run(id)
      return result.changes > 0
    })

    try {
      return tx(upstreamId)
    } catch (err) {
      log.error(`deleteByUpstreamId failed for upstream_id=${upstreamId}`, err instanceof Error ? err : new Error(String(err)), { upstreamId })
      throw err
    }
  },

  getSyncStatus(): { hasData: boolean; total: number; lastSyncedAt: string | null } {
    const db = getDatabase()
    const total = (db.prepare('SELECT COUNT(*) as c FROM synced_project_reallocations').get() as { c: number }).c
    const latest = db.prepare('SELECT MAX(synced_at) as latest FROM synced_project_reallocations').get() as { latest: string | null }
    return { hasData: total > 0, total, lastSyncedAt: latest?.latest ?? null }
  },

  markClosed(upstreamId: number): boolean {
    const db = getDatabase()
    try {
      const result = db.prepare("UPDATE synced_project_reallocations SET coe_status = 'Closed' WHERE upstream_id = ?").run(upstreamId)
      return result.changes > 0
    } catch (err) {
      log.error(`markClosed failed for upstream_id=${upstreamId}`, err instanceof Error ? err : new Error(String(err)), { upstreamId })
      throw err
    }
  },

  getLocalUpstreamIds(): number[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT upstream_id FROM synced_project_reallocations').all() as Array<{ upstream_id: number }>
    return rows.map((row) => row.upstream_id)
  },
}
