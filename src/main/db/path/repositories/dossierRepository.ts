import { getPathDatabase } from '../pathConnection'
import { createLogger } from '../../../services/logger'

const log = createLogger('PathDossierRepository')

export interface PathDossierSummaryRow {
  id: number
  developer_id: number
  full_name: string
  role: string
  status: string
  updated_at: string
}

export interface PathDossierDetailRow extends PathDossierSummaryRow {
  strengths: string
  growth_areas: string
  manager_notes: string
}

export interface ListDossiersParams {
  search?: string
  role?: string
  page?: number
  pageSize?: number
}

function normalizePaging(params: ListDossiersParams): { limit: number; offset: number } {
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 200)
  const page = Math.max(params.page ?? 1, 1)
  return { limit: pageSize, offset: (page - 1) * pageSize }
}

function inferStatus(lastReviewedAt: string | null): string {
  return lastReviewedAt ? 'reviewed' : 'pending'
}

export const dossierRepository = {
  list(params: ListDossiersParams): PathDossierSummaryRow[] {
    const db = getPathDatabase()
    const { limit, offset } = normalizePaging(params)
    const pattern = `%${params.search?.trim() ?? ''}%`
    const role = params.role?.trim() ?? ''

    return db.prepare(`
      SELECT
        d.id,
        COALESCE(CAST(d.user_id AS INTEGER), 0) AS developer_id,
        ('Developer ' || d.user_id) AS full_name,
        COALESCE((
          SELECT rc.title
          FROM path_enrollments pe
          JOIN learning_paths lp ON lp.id = pe.path_id
          LEFT JOIN role_catalog rc ON rc.id = lp.owner_role_id
          WHERE pe.user_id = d.user_id
          ORDER BY pe.enrolled_at DESC
          LIMIT 1
        ), '') AS role,
        CASE WHEN d.last_reviewed_at IS NULL THEN 'pending' ELSE 'reviewed' END AS status,
        d.updated_at
      FROM dossiers d
      WHERE (? = '%%' OR d.user_id LIKE ? OR d.summary LIKE ?)
        AND (
          ? = '' OR COALESCE((
            SELECT rc.title
            FROM path_enrollments pe
            JOIN learning_paths lp ON lp.id = pe.path_id
            LEFT JOIN role_catalog rc ON rc.id = lp.owner_role_id
            WHERE pe.user_id = d.user_id
            ORDER BY pe.enrolled_at DESC
            LIMIT 1
          ), '') = ?
        )
      ORDER BY d.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(pattern, pattern, pattern, role, role, limit, offset) as PathDossierSummaryRow[]
  },

  getById(id: number): PathDossierDetailRow | undefined {
    const db = getPathDatabase()
    const row = db.prepare(`
      SELECT
        d.id,
        COALESCE(CAST(d.user_id AS INTEGER), 0) AS developer_id,
        ('Developer ' || d.user_id) AS full_name,
        COALESCE((
          SELECT rc.title
          FROM path_enrollments pe
          JOIN learning_paths lp ON lp.id = pe.path_id
          LEFT JOIN role_catalog rc ON rc.id = lp.owner_role_id
          WHERE pe.user_id = d.user_id
          ORDER BY pe.enrolled_at DESC
          LIMIT 1
        ), '') AS role,
        d.last_reviewed_at AS status_marker,
        d.updated_at,
        d.strengths,
        d.growth_areas,
        d.recommendations AS manager_notes
      FROM dossiers d
      WHERE d.id = ?
    `).get(id) as {
      id: number
      developer_id: number
      full_name: string
      role: string
      status_marker: string | null
      updated_at: string
      strengths: string
      growth_areas: string
      manager_notes: string
    } | undefined

    if (!row) return undefined

    return {
      id: row.id,
      developer_id: row.developer_id,
      full_name: row.full_name,
      role: row.role,
      status: inferStatus(row.status_marker),
      updated_at: row.updated_at,
      strengths: row.strengths,
      growth_areas: row.growth_areas,
      manager_notes: row.manager_notes,
    }
  },

  updateStatus(dossierId: number, _status: string, _reviewerId: number): boolean {
    const db = getPathDatabase()
    try {
      const result = db.prepare(`
        UPDATE dossiers
        SET last_reviewed_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(dossierId)
      return result.changes > 0
    } catch (err) {
      log.error('updateStatus failed', err instanceof Error ? err : new Error(String(err)), { dossierId })
      throw err
    }
  },
}
