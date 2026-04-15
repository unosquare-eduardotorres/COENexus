import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../db/path/repositories/developerDashboardRepository', () => ({
  developerDashboardRepository: { getByDeveloperId: vi.fn() },
}))
vi.mock('../../db/path/repositories/learningPathRepository', () => ({
  learningPathRepository: { list: vi.fn(), getById: vi.fn(), listSkills: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../db/path/repositories/assessmentRepository', () => ({
  assessmentRepository: { list: vi.fn(), getById: vi.fn(), listQuestions: vi.fn(), listAnswers: vi.fn(), saveDraft: vi.fn(), submit: vi.fn() },
}))
vi.mock('../../db/path/repositories/discussionRepository', () => ({
  discussionRepository: { listThreads: vi.fn(), getThreadById: vi.fn(), listPosts: vi.fn(), createPost: vi.fn() },
}))
vi.mock('../../db/path/repositories/dossierRepository', () => ({
  dossierRepository: { list: vi.fn(), getById: vi.fn(), updateStatus: vi.fn() },
}))
vi.mock('../../db/path/repositories/adminRepository', () => ({
  adminRepository: { getAnalytics: vi.fn(), getSettings: vi.fn(), saveSettings: vi.fn() },
}))

import { pathService } from '../pathService'
import { developerDashboardRepository } from '../../db/path/repositories/developerDashboardRepository'
import { learningPathRepository } from '../../db/path/repositories/learningPathRepository'
import { assessmentRepository } from '../../db/path/repositories/assessmentRepository'
import { discussionRepository } from '../../db/path/repositories/discussionRepository'
import { dossierRepository } from '../../db/path/repositories/dossierRepository'
import { adminRepository } from '../../db/path/repositories/adminRepository'

describe('pathService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDeveloperDashboard', () => {
    it('should return null when repository returns undefined', () => {
      vi.mocked(developerDashboardRepository.getByDeveloperId).mockReturnValue(undefined)
      const result = pathService.getDeveloperDashboard({ id: 1 })
      expect(result).toBeNull()
    })

    it('should transform row to camelCase dashboard', () => {
      vi.mocked(developerDashboardRepository.getByDeveloperId).mockReturnValue({
        developer_id: 1,
        full_name: 'Dev One',
        role: 'Frontend',
        completion_percent: 75,
        active_learning_path_id: 5,
        next_assessment_due_at: '2024-06-01',
        pending_threads: 3,
      })

      const result = pathService.getDeveloperDashboard({ id: 1 })
      expect(result).toEqual({
        developerId: 1,
        fullName: 'Dev One',
        role: 'Frontend',
        completionPercent: 75,
        activeLearningPathId: 5,
        nextAssessmentDueAt: '2024-06-01',
        pendingThreads: 3,
      })
    })
  })

  describe('listLearningPaths', () => {
    it('should transform rows to camelCase', () => {
      vi.mocked(learningPathRepository.list).mockReturnValue([
        { id: 1, title: 'React', role: 'FE', level: 'mid', status: 'active', completion_percent: 50, updated_at: '2024-01-01' },
      ])

      const result = pathService.listLearningPaths({})
      expect(result).toHaveLength(1)
      expect(result[0].completionPercent).toBe(50)
      expect(result[0].updatedAt).toBe('2024-01-01')
    })
  })

  describe('getLearningPath', () => {
    it('should return null when path not found', () => {
      vi.mocked(learningPathRepository.getById).mockReturnValue(undefined)
      expect(pathService.getLearningPath({ id: 999 })).toBeNull()
    })

    it('should include skills in detail response', () => {
      vi.mocked(learningPathRepository.getById).mockReturnValue({
        id: 1, title: 'Path', role: '', level: 'mid', status: 'active',
        completion_percent: 0, updated_at: '', description: '', owner_id: 0,
      })
      vi.mocked(learningPathRepository.listSkills).mockReturnValue([
        { id: 1, skill_code: 'react', skill_name: 'React', target_level: 'mid', current_level: 'beginner', status: 'pending' },
      ])

      const result = pathService.getLearningPath({ id: 1 })
      expect(result?.skills).toHaveLength(1)
      expect(result?.skills[0].skillCode).toBe('react')
    })
  })

  describe('createLearningPath', () => {
    it('should delegate to repository and return id', () => {
      vi.mocked(learningPathRepository.create).mockReturnValue(42)
      const result = pathService.createLearningPath({ title: 'New', role: 'BE', level: 'senior', ownerId: 1 })
      expect(result).toEqual({ id: 42 })
    })
  })

  describe('updateLearningPath', () => {
    it('should return updated flag from repository', () => {
      vi.mocked(learningPathRepository.update).mockReturnValue(true)
      expect(pathService.updateLearningPath({ id: 1, title: 'Updated' })).toEqual({ updated: true })
    })
  })

  describe('deleteLearningPath', () => {
    it('should return deleted flag from repository', () => {
      vi.mocked(learningPathRepository.delete).mockReturnValue(false)
      expect(pathService.deleteLearningPath({ id: 999 })).toEqual({ deleted: false })
    })
  })

  describe('getAssessment', () => {
    it('should return null when not found', () => {
      vi.mocked(assessmentRepository.getById).mockReturnValue(undefined)
      expect(pathService.getAssessment({ id: 999 })).toBeNull()
    })

    it('should include questions and answers', () => {
      vi.mocked(assessmentRepository.getById).mockReturnValue({
        id: 1, learning_path_id: 0, title: 'Quiz', status: 'submitted', score: 8, submitted_at: '2024-06-01', updated_at: '',
      })
      vi.mocked(assessmentRepository.listQuestions).mockReturnValue([
        { id: 1, prompt: 'Q1', category: 'single_choice', weight: 5 },
      ])
      vi.mocked(assessmentRepository.listAnswers).mockReturnValue([
        { question_id: 1, score: 4, notes: null },
      ])

      const result = pathService.getAssessment({ id: 1 })
      expect(result?.questions).toHaveLength(1)
      expect(result?.answers).toHaveLength(1)
      expect(result?.answers[0].notes).toBeUndefined()
    })
  })

  describe('submitAssessment', () => {
    it('should delegate to repository submit', () => {
      vi.mocked(assessmentRepository.submit).mockReturnValue({ submitted: true, score: 9 })
      const result = pathService.submitAssessment({
        assessmentId: 1, reviewerId: 5, answers: [{ questionId: 1, score: 9 }],
      })
      expect(result).toEqual({ submitted: true, score: 9 })
    })
  })

  describe('getDiscussionThread', () => {
    it('should return null when not found', () => {
      vi.mocked(discussionRepository.getThreadById).mockReturnValue(undefined)
      expect(pathService.getDiscussionThread({ id: 999 })).toBeNull()
    })

    it('should include posts in response', () => {
      vi.mocked(discussionRepository.getThreadById).mockReturnValue({
        id: 1, learning_path_id: 0, title: 'Thread', status: 'open', created_by: 1, reply_count: 1, last_activity_at: '',
      })
      vi.mocked(discussionRepository.listPosts).mockReturnValue([
        { id: 1, author_id: 1, message: 'Hello', created_at: '', parent_post_id: null },
      ])

      const result = pathService.getDiscussionThread({ id: 1 })
      expect(result?.posts).toHaveLength(1)
      expect(result?.posts[0].authorId).toBe(1)
    })
  })

  describe('getDossier', () => {
    it('should return null when not found', () => {
      vi.mocked(dossierRepository.getById).mockReturnValue(undefined)
      expect(pathService.getDossier({ id: 999 })).toBeNull()
    })

    it('should parse delimited strengths and growth areas', () => {
      vi.mocked(dossierRepository.getById).mockReturnValue({
        id: 1, developer_id: 1, full_name: 'Dev', role: '', status: 'pending', updated_at: '',
        strengths: 'React, TypeScript', growth_areas: 'SQL\nDocker', manager_notes: 'Focus on DB',
      })

      const result = pathService.getDossier({ id: 1 })
      expect(result?.strengths).toEqual(['React', 'TypeScript'])
      expect(result?.growthAreas).toEqual(['SQL', 'Docker'])
    })
  })

  describe('getAdminAnalytics', () => {
    it('should transform analytics to camelCase', () => {
      vi.mocked(adminRepository.getAnalytics).mockReturnValue({
        total_developers: 10, active_learning_paths: 5, completed_assessments: 20,
        pending_dossiers: 3, participation_rate: 75.5,
      })

      const result = pathService.getAdminAnalytics()
      expect(result.totalDevelopers).toBe(10)
      expect(result.participationRate).toBe(75.5)
    })
  })

  describe('getSettings', () => {
    it('should transform settings and convert boolean', () => {
      vi.mocked(adminRepository.getSettings).mockReturnValue({
        assessment_reminder_days: 7, discussion_moderation_enabled: 1,
        dossier_auto_archive_days: 90, default_page_size: 50,
      })

      const result = pathService.getSettings()
      expect(result.discussionModerationEnabled).toBe(true)
      expect(result.assessmentReminderDays).toBe(7)
    })
  })

  describe('saveSettings', () => {
    it('should delegate to admin repository', () => {
      vi.mocked(adminRepository.saveSettings).mockReturnValue(true)
      const result = pathService.saveSettings({ assessmentReminderDays: 30 })
      expect(result).toEqual({ saved: true })
    })
  })
})
