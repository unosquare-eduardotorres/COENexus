import { getPathDatabase } from '../pathConnection'
import { createLogger } from '../../../services/logger'

const log = createLogger('PathDeveloperDashboardRepository')

export interface PathDeveloperDashboardRow {
  developer_id: number
  full_name: string
  role: string
  completion_percent: number
  active_learning_path_id: number | null
  next_assessment_due_at: string | null
  pending_threads: number
}

export const developerDashboardRepository = {
  getByDeveloperId(developerId: number): PathDeveloperDashboardRow | undefined {
    const db = getPathDatabase()
    try {
      return db.prepare(`
        SELECT
          ? AS developer_id,
          ('Developer ' || ?) AS full_name,
          COALESCE((
            SELECT rc.title
            FROM path_enrollments pe
            JOIN learning_paths lp ON lp.id = pe.path_id
            LEFT JOIN role_catalog rc ON rc.id = lp.owner_role_id
            WHERE pe.user_id = CAST(? AS TEXT)
            ORDER BY pe.enrolled_at DESC
            LIMIT 1
          ), 'Developer') AS role,
          COALESCE((
            SELECT ROUND(AVG(pe.progress_percent), 2)
            FROM path_enrollments pe
            WHERE pe.user_id = CAST(? AS TEXT)
          ), 0) AS completion_percent,
          (
            SELECT pe.path_id
            FROM path_enrollments pe
            WHERE pe.user_id = CAST(? AS TEXT)
              AND pe.status IN ('enrolled', 'in_progress')
            ORDER BY pe.enrolled_at DESC
            LIMIT 1
          ) AS active_learning_path_id,
          (
            SELECT MIN(date(aa.submitted_at, '+30 day'))
            FROM assessment_attempts aa
            WHERE aa.user_id = CAST(? AS TEXT)
              AND aa.submitted_at IS NOT NULL
          ) AS next_assessment_due_at,
          COALESCE((
            SELECT COUNT(*)
            FROM discussion_threads dt
            WHERE dt.status = 'open'
              AND dt.author_id = CAST(? AS TEXT)
          ), 0) AS pending_threads
      `).get(
        developerId,
        developerId,
        developerId,
        developerId,
        developerId,
        developerId,
        developerId,
      ) as PathDeveloperDashboardRow | undefined
    } catch (err) {
      log.error('getByDeveloperId failed', err instanceof Error ? err : new Error(String(err)), { developerId })
      throw err
    }
  },
}
