import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PATH_SCHEMA } from './testPathSchema'
import { adminRepository } from '../adminRepository'

let testDb: Database.Database

vi.mock('../../pathConnection', () => ({
  getPathDatabase: () => testDb,
}))

vi.mock('../../../../services/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

describe('adminRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(PATH_SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  describe('getAnalytics', () => {
    it('should return zeroes on empty database', () => {
      const analytics = adminRepository.getAnalytics()
      expect(analytics.total_developers).toBe(0)
      expect(analytics.active_learning_paths).toBe(0)
      expect(analytics.completed_assessments).toBe(0)
      expect(analytics.pending_dossiers).toBe(0)
      expect(analytics.participation_rate).toBe(0)
    })

    it('should return correct counts after seeding data', () => {
      testDb.prepare(`
        INSERT INTO learning_paths (path_key, title, summary, difficulty_level, status, created_at, updated_at)
        VALUES ('lp1', 'Active Path', '', 'beginner', 'active', datetime('now'), datetime('now'))
      `).run()
      testDb.prepare(`
        INSERT INTO learning_paths (path_key, title, summary, difficulty_level, status, created_at, updated_at)
        VALUES ('lp2', 'Draft Path', '', 'beginner', 'draft', datetime('now'), datetime('now'))
      `).run()

      testDb.prepare(`
        INSERT INTO path_enrollments (user_id, path_id, cohort_key, enrolled_at, status, progress_percent)
        VALUES ('u1', 1, '', datetime('now'), 'enrolled', 50)
      `).run()
      testDb.prepare(`
        INSERT INTO path_enrollments (user_id, path_id, cohort_key, enrolled_at, status, progress_percent)
        VALUES ('u2', 1, '', datetime('now'), 'enrolled', 30)
      `).run()

      testDb.prepare(`
        INSERT INTO assessments (assessment_key, title, assessment_type, total_points, pass_score, created_at, updated_at)
        VALUES ('a1', 'Quiz', 'quiz', 10, 70, datetime('now'), datetime('now'))
      `).run()
      testDb.prepare(`
        INSERT INTO assessment_attempts (assessment_id, user_id, started_at, submitted_at, status, score, max_score, passed)
        VALUES (1, 'u1', datetime('now'), datetime('now'), 'submitted', 8, 10, 1)
      `).run()

      testDb.prepare(`
        INSERT INTO dossiers (user_id, summary, strengths, growth_areas, recommendations, created_at, updated_at)
        VALUES ('u1', '', '', '', '', datetime('now'), datetime('now'))
      `).run()

      const analytics = adminRepository.getAnalytics()
      expect(analytics.total_developers).toBe(2)
      expect(analytics.active_learning_paths).toBe(1)
      expect(analytics.completed_assessments).toBe(1)
      expect(analytics.pending_dossiers).toBe(1)
    })
  })

  describe('getSettings', () => {
    it('should return defaults when no settings saved', () => {
      const settings = adminRepository.getSettings()
      expect(settings.assessment_reminder_days).toBe(14)
      expect(settings.discussion_moderation_enabled).toBe(0)
      expect(settings.dossier_auto_archive_days).toBe(180)
      expect(settings.default_page_size).toBe(20)
    })

    it('should return saved settings after saveSettings', () => {
      adminRepository.saveSettings({
        assessmentReminderDays: 7,
        discussionModerationEnabled: true,
        dossierAutoArchiveDays: 90,
        defaultPageSize: 50,
      })

      const settings = adminRepository.getSettings()
      expect(settings.assessment_reminder_days).toBe(7)
      expect(settings.discussion_moderation_enabled).toBe(1)
      expect(settings.dossier_auto_archive_days).toBe(90)
      expect(settings.default_page_size).toBe(50)
    })
  })

  describe('saveSettings', () => {
    it('should persist settings and return true', () => {
      const result = adminRepository.saveSettings({ assessmentReminderDays: 30 })
      expect(result).toBe(true)
    })

    it('should merge partial updates with current settings', () => {
      adminRepository.saveSettings({
        assessmentReminderDays: 7,
        defaultPageSize: 50,
      })

      adminRepository.saveSettings({
        dossierAutoArchiveDays: 60,
      })

      const settings = adminRepository.getSettings()
      expect(settings.assessment_reminder_days).toBe(7)
      expect(settings.default_page_size).toBe(50)
      expect(settings.dossier_auto_archive_days).toBe(60)
    })
  })

  describe('saveAnalyticsEvent', () => {
    it('should insert event and return true', () => {
      const result = adminRepository.saveAnalyticsEvent('user-1', 'page_view', { page: '/dashboard' })
      expect(result).toBe(true)

      const row = testDb.prepare(`
        SELECT user_id, event_name, event_payload
        FROM analytics_events
        WHERE user_id = 'user-1' AND event_name = 'page_view'
      `).get() as { user_id: string; event_name: string; event_payload: string }

      expect(row).toBeDefined()
      expect(JSON.parse(row.event_payload)).toEqual({ page: '/dashboard' })
    })
  })
})
