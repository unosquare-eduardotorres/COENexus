import { getPathDatabase } from '../pathConnection'
import { createLogger } from '../../../services/logger'

const log = createLogger('PathLearningPathRepository')

export interface PathLearningPathSummaryRow {
  id: number
  title: string
  role: string
  level: string
  status: string
  completion_percent: number
  updated_at: string
}

export interface PathLearningPathDetailRow extends PathLearningPathSummaryRow {
  description: string
  owner_id: number
}

export interface PathLearningPathSkillRow {
  id: number
  skill_code: string
  skill_name: string
  target_level: string
  current_level: string
  status: string
}

export interface CreateLearningPathInput {
  title: string
  role: string
  level: string
  description?: string
  ownerId: number
}

export interface UpdateLearningPathInput {
  id: number
  title?: string
  role?: string
  level?: string
  description?: string
  status?: string
}

export interface LearningPathListParams {
  search?: string
  role?: string
  page?: number
  pageSize?: number
}

function normalizePaging(params: LearningPathListParams): { limit: number; offset: number } {
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 200)
  const page = Math.max(params.page ?? 1, 1)
  return { limit: pageSize, offset: (page - 1) * pageSize }
}

function toPathKey(title: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${normalized || 'path'}-${Date.now()}`
}

export const learningPathRepository = {
  list(params: LearningPathListParams): PathLearningPathSummaryRow[] {
    const db = getPathDatabase()
    const { limit, offset } = normalizePaging(params)
    const pattern = `%${params.search?.trim() ?? ''}%`
    const role = params.role?.trim() ?? ''

    return db.prepare(`
      SELECT
        lp.id,
        lp.title,
        COALESCE(rc.title, '') AS role,
        lp.difficulty_level AS level,
        lp.status,
        COALESCE(ROUND(AVG(pe.progress_percent), 2), 0) AS completion_percent,
        lp.updated_at
      FROM learning_paths lp
      LEFT JOIN role_catalog rc ON rc.id = lp.owner_role_id
      LEFT JOIN path_enrollments pe ON pe.path_id = lp.id
      WHERE (? = '%%' OR lp.title LIKE ? OR lp.summary LIKE ?)
        AND (? = '' OR rc.title = ?)
      GROUP BY lp.id
      ORDER BY lp.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(pattern, pattern, pattern, role, role, limit, offset) as PathLearningPathSummaryRow[]
  },

  getById(id: number): PathLearningPathDetailRow | undefined {
    const db = getPathDatabase()
    return db.prepare(`
      SELECT
        lp.id,
        lp.title,
        COALESCE(rc.title, '') AS role,
        lp.difficulty_level AS level,
        lp.status,
        COALESCE(ROUND(AVG(pe.progress_percent), 2), 0) AS completion_percent,
        lp.updated_at,
        lp.summary AS description,
        COALESCE(lp.owner_role_id, 0) AS owner_id
      FROM learning_paths lp
      LEFT JOIN role_catalog rc ON rc.id = lp.owner_role_id
      LEFT JOIN path_enrollments pe ON pe.path_id = lp.id
      WHERE lp.id = ?
      GROUP BY lp.id
    `).get(id) as PathLearningPathDetailRow | undefined
  },

  listSkills(pathId: number): PathLearningPathSkillRow[] {
    const db = getPathDatabase()
    return db.prepare(`
      SELECT
        sc.id,
        sc.skill_key AS skill_code,
        sc.display_name AS skill_name,
        'intermediate' AS target_level,
        COALESCE((
          SELECT sa.proficiency_level
          FROM skill_assessments sa
          WHERE sa.skill_id = sc.id
          ORDER BY sa.updated_at DESC
          LIMIT 1
        ), 'beginner') AS current_level,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM learning_path_versions lpv
            JOIN learning_path_modules lpm ON lpm.path_version_id = lpv.id
            JOIN module_tags mt ON mt.module_id = lpm.id
            WHERE lpv.path_id = ?
              AND mt.tag = sc.skill_key
          ) THEN 'in_progress'
          ELSE 'pending'
        END AS status
      FROM skill_catalog sc
      ORDER BY sc.display_name
      LIMIT 50
    `).all(pathId) as PathLearningPathSkillRow[]
  },

  create(input: CreateLearningPathInput): number {
    const db = getPathDatabase()
    try {
      const roleRow = db.prepare('SELECT id FROM role_catalog WHERE title = ?').get(input.role) as { id: number } | undefined
      const roleId = roleRow?.id ?? null
      const result = db.prepare(`
        INSERT INTO learning_paths (
          path_key, title, summary, owner_role_id, difficulty_level, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'draft', datetime('now'), datetime('now'))
      `).run(
        toPathKey(input.title),
        input.title,
        input.description ?? '',
        roleId,
        input.level,
      )
      return Number(result.lastInsertRowid)
    } catch (err) {
      log.error('create failed', err instanceof Error ? err : new Error(String(err)), { title: input.title })
      throw err
    }
  },

  update(input: UpdateLearningPathInput): boolean {
    const db = getPathDatabase()
    const current = db.prepare('SELECT * FROM learning_paths WHERE id = ?').get(input.id) as {
      title: string
      summary: string
      owner_role_id: number | null
      difficulty_level: string
      status: string
    } | undefined
    if (!current) return false

    const resolvedRoleId = input.role === undefined
      ? current.owner_role_id
      : (db.prepare('SELECT id FROM role_catalog WHERE title = ?').get(input.role) as { id: number } | undefined)?.id ?? null

    const result = db.prepare(`
      UPDATE learning_paths
      SET title = ?,
          summary = ?,
          owner_role_id = ?,
          difficulty_level = ?,
          status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      input.title ?? current.title,
      input.description ?? current.summary,
      resolvedRoleId,
      input.level ?? current.difficulty_level,
      input.status ?? current.status,
      input.id,
    )

    return result.changes > 0
  },

  delete(id: number): boolean {
    const db = getPathDatabase()
    const result = db.prepare('DELETE FROM learning_paths WHERE id = ?').run(id)
    return result.changes > 0
  },
}
