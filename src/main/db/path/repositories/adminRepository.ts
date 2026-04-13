import { getPathDatabase } from '../pathConnection'
import { createLogger } from '../../../services/logger'

const log = createLogger('PathAdminRepository')

export interface PathAdminAnalyticsRow {
  total_developers: number
  active_learning_paths: number
  completed_assessments: number
  pending_dossiers: number
  participation_rate: number
}

export interface PathSettingsRow {
  assessment_reminder_days: number
  discussion_moderation_enabled: number
  dossier_auto_archive_days: number
  default_page_size: number
}

export interface PathSaveSettingsInput {
  assessmentReminderDays?: number
  discussionModerationEnabled?: boolean
  dossierAutoArchiveDays?: number
  defaultPageSize?: number
}

const SETTINGS_USER_ID = 'global'

export const adminRepository = {
  getAnalytics(): PathAdminAnalyticsRow {
    const db = getPathDatabase()
    return db.prepare(`
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM path_enrollments) AS total_developers,
        (SELECT COUNT(*) FROM learning_paths WHERE status = 'active') AS active_learning_paths,
        (SELECT COUNT(*) FROM assessment_attempts WHERE status = 'submitted') AS completed_assessments,
        (SELECT COUNT(*) FROM dossiers WHERE last_reviewed_at IS NULL) AS pending_dossiers,
        COALESCE((
          SELECT ROUND(
            (CAST(COUNT(DISTINCT user_id) AS REAL) /
            NULLIF((SELECT COUNT(*) FROM dossiers), 0)) * 100,
            2
          )
          FROM path_enrollments
        ), 0) AS participation_rate
    `).get() as PathAdminAnalyticsRow
  },

  getSettings(): PathSettingsRow {
    const db = getPathDatabase()
    const row = db.prepare(`
      SELECT
        CAST(json_extract(event_payload, '$.assessmentReminderDays') AS INTEGER) AS assessment_reminder_days,
        CAST(json_extract(event_payload, '$.discussionModerationEnabled') AS INTEGER) AS discussion_moderation_enabled,
        CAST(json_extract(event_payload, '$.dossierAutoArchiveDays') AS INTEGER) AS dossier_auto_archive_days,
        CAST(json_extract(event_payload, '$.defaultPageSize') AS INTEGER) AS default_page_size
      FROM analytics_events
      WHERE user_id = ?
        AND event_name = 'path_settings'
      ORDER BY occurred_at DESC, id DESC
      LIMIT 1
    `).get(SETTINGS_USER_ID) as PathSettingsRow | undefined

    if (row) {
      return {
        assessment_reminder_days: Number.isFinite(row.assessment_reminder_days) ? row.assessment_reminder_days : 14,
        discussion_moderation_enabled: Number.isFinite(row.discussion_moderation_enabled) ? row.discussion_moderation_enabled : 0,
        dossier_auto_archive_days: Number.isFinite(row.dossier_auto_archive_days) ? row.dossier_auto_archive_days : 180,
        default_page_size: Number.isFinite(row.default_page_size) ? row.default_page_size : 20,
      }
    }

    return {
      assessment_reminder_days: 14,
      discussion_moderation_enabled: 0,
      dossier_auto_archive_days: 180,
      default_page_size: 20,
    }
  },

  saveSettings(input: PathSaveSettingsInput): boolean {
    const db = getPathDatabase()
    try {
      const current = this.getSettings()
      const payload = JSON.stringify({
        assessmentReminderDays: input.assessmentReminderDays ?? current.assessment_reminder_days,
        discussionModerationEnabled: input.discussionModerationEnabled ?? Boolean(current.discussion_moderation_enabled),
        dossierAutoArchiveDays: input.dossierAutoArchiveDays ?? current.dossier_auto_archive_days,
        defaultPageSize: input.defaultPageSize ?? current.default_page_size,
      })

      db.prepare(`
        INSERT INTO analytics_events (user_id, event_name, event_payload, occurred_at, app_version)
        VALUES (?, 'path_settings', ?, datetime('now'), '')
      `).run(SETTINGS_USER_ID, payload)
      return true
    } catch (err) {
      log.error('saveSettings failed', err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  },

  saveAnalyticsEvent(userId: string, eventName: string, payload: Record<string, unknown>): boolean {
    const db = getPathDatabase()
    db.prepare(`
      INSERT INTO analytics_events (user_id, event_name, event_payload, occurred_at, app_version)
      VALUES (?, ?, ?, datetime('now'), '')
    `).run(userId, eventName, JSON.stringify(payload))
    return true
  },
}
