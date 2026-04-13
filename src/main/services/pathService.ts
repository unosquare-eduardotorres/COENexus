import type {
  PathIdParams,
  PathPaginationParams,
  PathDeveloperDashboard,
  PathLearningPathSummary,
  PathLearningPathDetail,
  PathCreateLearningPathParams,
  PathUpdateLearningPathParams,
  PathAssessmentSummary,
  PathAssessmentDetail,
  PathSaveAssessmentDraftParams,
  PathSubmitAssessmentParams,
  PathDiscussionThreadSummary,
  PathDiscussionThreadDetail,
  PathCreateDiscussionPostParams,
  PathReplyDiscussionPostParams,
  PathDossierSummary,
  PathDossierDetail,
  PathUpdateDossierStatusParams,
  PathAdminAnalytics,
  PathSettings,
  PathSaveSettingsParams,
} from '../../shared/ipc-types'
import { createLogger } from './logger'
import { developerDashboardRepository } from '../db/path/repositories/developerDashboardRepository'
import { learningPathRepository } from '../db/path/repositories/learningPathRepository'
import { assessmentRepository } from '../db/path/repositories/assessmentRepository'
import { discussionRepository } from '../db/path/repositories/discussionRepository'
import { dossierRepository } from '../db/path/repositories/dossierRepository'
import { adminRepository } from '../db/path/repositories/adminRepository'

const log = createLogger('PathService')

function parseDelimitedList(value: string): string[] {
  if (!value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).trim()).filter(Boolean)
    }
  } catch {
  }
  return value
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function asDashboard(dto: ReturnType<typeof developerDashboardRepository.getByDeveloperId>): PathDeveloperDashboard | null {
  if (!dto) return null
  return {
    developerId: dto.developer_id,
    fullName: dto.full_name,
    role: dto.role,
    completionPercent: dto.completion_percent,
    activeLearningPathId: dto.active_learning_path_id,
    nextAssessmentDueAt: dto.next_assessment_due_at,
    pendingThreads: dto.pending_threads,
  }
}

export const pathService = {
  getDeveloperDashboard(params: PathIdParams): PathDeveloperDashboard | null {
    return asDashboard(developerDashboardRepository.getByDeveloperId(params.id))
  },

  listLearningPaths(params: PathPaginationParams): PathLearningPathSummary[] {
    return learningPathRepository.list(params).map(row => ({
      id: row.id,
      title: row.title,
      role: row.role,
      level: row.level,
      status: row.status,
      completionPercent: row.completion_percent,
      updatedAt: row.updated_at,
    }))
  },

  getLearningPath(params: PathIdParams): PathLearningPathDetail | null {
    const detail = learningPathRepository.getById(params.id)
    if (!detail) return null

    const skills = learningPathRepository.listSkills(params.id).map(skill => ({
      id: skill.id,
      skillCode: skill.skill_code,
      skillName: skill.skill_name,
      targetLevel: skill.target_level,
      currentLevel: skill.current_level,
      status: skill.status,
    }))

    return {
      id: detail.id,
      title: detail.title,
      role: detail.role,
      level: detail.level,
      status: detail.status,
      completionPercent: detail.completion_percent,
      updatedAt: detail.updated_at,
      description: detail.description,
      ownerId: detail.owner_id,
      skills,
    }
  },

  createLearningPath(params: PathCreateLearningPathParams): { id: number } {
    log.info('Creating learning path', { title: params.title, level: params.level })
    const id = learningPathRepository.create(params)
    log.info('Learning path created', { id })
    return { id }
  },

  updateLearningPath(params: PathUpdateLearningPathParams): { updated: boolean } {
    log.info('Updating learning path', { id: params.id })
    const updated = learningPathRepository.update(params)
    log.info('Learning path update result', { id: params.id, updated })
    return { updated }
  },

  deleteLearningPath(params: PathIdParams): { deleted: boolean } {
    log.info('Deleting learning path', { id: params.id })
    const deleted = learningPathRepository.delete(params.id)
    log.info('Learning path delete result', { id: params.id, deleted })
    return { deleted }
  },

  listAssessments(params: PathPaginationParams): PathAssessmentSummary[] {
    return assessmentRepository.list(params).map(row => ({
      id: row.id,
      learningPathId: row.learning_path_id,
      title: row.title,
      status: row.status,
      score: row.score,
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
    }))
  },

  getAssessment(params: PathIdParams): PathAssessmentDetail | null {
    const summary = assessmentRepository.getById(params.id)
    if (!summary) return null

    return {
      id: summary.id,
      learningPathId: summary.learning_path_id,
      title: summary.title,
      status: summary.status,
      score: summary.score,
      submittedAt: summary.submitted_at,
      updatedAt: summary.updated_at,
      questions: assessmentRepository.listQuestions(params.id).map(question => ({
        id: question.id,
        prompt: question.prompt,
        category: question.category,
        weight: question.weight,
      })),
      answers: assessmentRepository.listAnswers(params.id).map(answer => ({
        questionId: answer.question_id,
        score: answer.score,
        notes: answer.notes ?? undefined,
      })),
    }
  },

  saveAssessmentDraft(params: PathSaveAssessmentDraftParams): { saved: boolean } {
    log.info('Saving assessment draft', { assessmentId: params.assessmentId })
    const saved = assessmentRepository.saveDraft(params.assessmentId, params.answers.map(answer => ({
        questionId: answer.questionId,
        score: answer.score,
        notes: answer.notes,
      })))
    log.info('Assessment draft saved', { assessmentId: params.assessmentId, saved })
    return { saved }
  },

  submitAssessment(params: PathSubmitAssessmentParams): { submitted: boolean; score: number | null } {
    log.info('Submitting assessment', { assessmentId: params.assessmentId, reviewerId: params.reviewerId })
    const result = assessmentRepository.submit(
      params.assessmentId,
      params.reviewerId,
      params.answers.map(answer => ({
        questionId: answer.questionId,
        score: answer.score,
        notes: answer.notes,
      }))
    )
    log.info('Assessment submitted', {
      assessmentId: params.assessmentId,
      reviewerId: params.reviewerId,
      submitted: result.submitted,
      score: result.score,
    })
    return result
  },

  listDiscussionThreads(params: PathPaginationParams): PathDiscussionThreadSummary[] {
    return discussionRepository.listThreads(params).map(row => ({
      id: row.id,
      learningPathId: row.learning_path_id,
      title: row.title,
      status: row.status,
      createdBy: row.created_by,
      replyCount: row.reply_count,
      lastActivityAt: row.last_activity_at,
    }))
  },

  getDiscussionThread(params: PathIdParams): PathDiscussionThreadDetail | null {
    const thread = discussionRepository.getThreadById(params.id)
    if (!thread) return null
    return {
      id: thread.id,
      learningPathId: thread.learning_path_id,
      title: thread.title,
      status: thread.status,
      createdBy: thread.created_by,
      replyCount: thread.reply_count,
      lastActivityAt: thread.last_activity_at,
      posts: discussionRepository.listPosts(thread.id).map(post => ({
        id: post.id,
        authorId: post.author_id,
        message: post.message,
        createdAt: post.created_at,
        parentPostId: post.parent_post_id,
      })),
    }
  },

  createDiscussionPost(params: PathCreateDiscussionPostParams): { id: number } {
    log.info('Creating discussion post', { threadId: params.threadId, authorId: params.authorId })
    const id = discussionRepository.createPost(params.threadId, params.authorId, params.message, null)
    log.info('Discussion post created', { threadId: params.threadId, id })
    return { id }
  },

  replyDiscussionPost(params: PathReplyDiscussionPostParams): { id: number } {
    log.info('Replying to discussion post', { threadId: params.threadId, parentPostId: params.parentPostId })
    const id = discussionRepository.createPost(params.threadId, params.authorId, params.message, params.parentPostId)
    log.info('Discussion reply created', { threadId: params.threadId, parentPostId: params.parentPostId, id })
    return { id }
  },

  listDossiers(params: PathPaginationParams): PathDossierSummary[] {
    return dossierRepository.list(params).map(row => ({
      id: row.id,
      developerId: row.developer_id,
      fullName: row.full_name,
      role: row.role,
      status: row.status,
      updatedAt: row.updated_at,
    }))
  },

  getDossier(params: PathIdParams): PathDossierDetail | null {
    const row = dossierRepository.getById(params.id)
    if (!row) return null
    return {
      id: row.id,
      developerId: row.developer_id,
      fullName: row.full_name,
      role: row.role,
      status: row.status,
      updatedAt: row.updated_at,
      strengths: parseDelimitedList(row.strengths),
      growthAreas: parseDelimitedList(row.growth_areas),
      managerNotes: row.manager_notes,
    }
  },

  updateDossierStatus(params: PathUpdateDossierStatusParams): { updated: boolean } {
    log.info('Updating dossier status', { dossierId: params.dossierId, status: params.status })
    const updated = dossierRepository.updateStatus(params.dossierId, params.status, params.reviewerId)
    log.info('Dossier status update result', { dossierId: params.dossierId, updated })
    return { updated }
  },

  getAdminAnalytics(): PathAdminAnalytics {
    const row = adminRepository.getAnalytics()
    return {
      totalDevelopers: row.total_developers,
      activeLearningPaths: row.active_learning_paths,
      completedAssessments: row.completed_assessments,
      pendingDossiers: row.pending_dossiers,
      participationRate: row.participation_rate,
    }
  },

  getSettings(): PathSettings {
    const row = adminRepository.getSettings()
    return {
      assessmentReminderDays: row.assessment_reminder_days,
      discussionModerationEnabled: Boolean(row.discussion_moderation_enabled),
      dossierAutoArchiveDays: row.dossier_auto_archive_days,
      defaultPageSize: row.default_page_size,
    }
  },

  saveSettings(params: PathSaveSettingsParams): { saved: boolean } {
    const saved = adminRepository.saveSettings(params)
    if (saved) {
      log.info('PATH settings saved')
    }
    return { saved }
  },
}
