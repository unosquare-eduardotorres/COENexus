import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  PathIdParams,
  PathPaginationParams,
  PathCreateLearningPathParams,
  PathUpdateLearningPathParams,
  PathSaveAssessmentDraftParams,
  PathSubmitAssessmentParams,
  PathCreateDiscussionPostParams,
  PathReplyDiscussionPostParams,
  PathUpdateDossierStatusParams,
  PathSaveSettingsParams,
  PathSaveAnalyticsEventParams,
  PathRecalculateReadinessParams,
  PathGenerateDefensePrepParams,
  PathGenerateRemediationParams,
  PathSearchDynamicResourcesParams,
} from '../../shared/ipc-types'
import { registerIpcHandler } from './registerIpcHandler'
import { validateSender } from './validate'
import { pathService } from '../services/pathService'
import { createLogger } from '../services/logger'
import { adminRepository } from '../db/path/repositories/adminRepository'
import { learningPathRepository } from '../db/path/repositories/learningPathRepository'
import { calculateReadiness } from '../services/readinessCalculator'
import { pathAiService } from '../services/pathAiService'
import { dynamicContentService } from '../services/dynamicContentService'

const log = createLogger('PathIPC')

export function registerPathHandlers(): void {
  log.info('Registering PATH IPC handlers')

  registerIpcHandler(
    IPC_CHANNELS.PATH_GET_DEVELOPER_DASHBOARD,
    async (event, params: PathIdParams) => {
      validateSender(event)
      log.info('Developer dashboard requested', { developerId: params.id })
      return pathService.getDeveloperDashboard(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_LIST_LEARNING_PATHS,
    async (event, params: PathPaginationParams) => {
      validateSender(event)
      log.info('Learning paths list requested', {
        search: params.search,
        role: params.role,
        page: params.page,
        pageSize: params.pageSize,
      })
      return pathService.listLearningPaths(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_GET_LEARNING_PATH,
    async (event, params: PathIdParams) => {
      validateSender(event)
      log.info('Learning path requested', { learningPathId: params.id })
      return pathService.getLearningPath(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_CREATE_LEARNING_PATH,
    async (event, params: PathCreateLearningPathParams) => {
      validateSender(event)
      log.info('Create learning path requested', {
        title: params.title,
        level: params.level,
        ownerId: params.ownerId,
      })
      return pathService.createLearningPath(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_UPDATE_LEARNING_PATH,
    async (event, params: PathUpdateLearningPathParams) => {
      validateSender(event)
      log.info('Update learning path requested', { learningPathId: params.id, title: params.title, status: params.status })
      return pathService.updateLearningPath(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_DELETE_LEARNING_PATH,
    async (event, params: PathIdParams) => {
      validateSender(event)
      log.info('Delete learning path requested', { learningPathId: params.id })
      return pathService.deleteLearningPath(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_LIST_ASSESSMENTS,
    async (event, params: PathPaginationParams) => {
      validateSender(event)
      log.info('Assessments list requested', {
        search: params.search,
        role: params.role,
        page: params.page,
        pageSize: params.pageSize,
      })
      return pathService.listAssessments(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_GET_ASSESSMENT,
    async (event, params: PathIdParams) => {
      validateSender(event)
      log.info('Assessment requested', { assessmentId: params.id })
      return pathService.getAssessment(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_SAVE_ASSESSMENT_DRAFT,
    async (event, params: PathSaveAssessmentDraftParams) => {
      validateSender(event)
      log.info('Save assessment draft requested', {
        assessmentId: params.assessmentId,
        answersCount: params.answers.length,
      })
      return pathService.saveAssessmentDraft(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_SUBMIT_ASSESSMENT,
    async (event, params: PathSubmitAssessmentParams) => {
      validateSender(event)
      log.info('Submit assessment requested', {
        assessmentId: params.assessmentId,
        reviewerId: params.reviewerId,
        answersCount: params.answers.length,
      })
      return pathService.submitAssessment(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_LIST_DISCUSSION_THREADS,
    async (event, params: PathPaginationParams) => {
      validateSender(event)
      log.info('Discussion threads list requested', {
        search: params.search,
        role: params.role,
        page: params.page,
        pageSize: params.pageSize,
      })
      return pathService.listDiscussionThreads(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_GET_DISCUSSION_THREAD,
    async (event, params: PathIdParams) => {
      validateSender(event)
      log.info('Discussion thread requested', { threadId: params.id })
      return pathService.getDiscussionThread(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_CREATE_DISCUSSION_POST,
    async (event, params: PathCreateDiscussionPostParams) => {
      validateSender(event)
      log.info('Create discussion post requested', { threadId: params.threadId, authorId: params.authorId })
      return pathService.createDiscussionPost(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_REPLY_DISCUSSION_POST,
    async (event, params: PathReplyDiscussionPostParams) => {
      validateSender(event)
      log.info('Reply discussion post requested', {
        threadId: params.threadId,
        parentPostId: params.parentPostId,
        authorId: params.authorId,
      })
      return pathService.replyDiscussionPost(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_LIST_DOSSIERS,
    async (event, params: PathPaginationParams) => {
      validateSender(event)
      log.info('Dossiers list requested', {
        search: params.search,
        role: params.role,
        page: params.page,
        pageSize: params.pageSize,
      })
      return pathService.listDossiers(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_GET_DOSSIER,
    async (event, params: PathIdParams) => {
      validateSender(event)
      log.info('Dossier requested', { dossierId: params.id })
      return pathService.getDossier(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_UPDATE_DOSSIER_STATUS,
    async (event, params: PathUpdateDossierStatusParams) => {
      validateSender(event)
      log.info('Update dossier status requested', {
        dossierId: params.dossierId,
        status: params.status,
        reviewerId: params.reviewerId,
      })
      return pathService.updateDossierStatus(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_GET_ADMIN_ANALYTICS,
    async (event) => {
      validateSender(event)
      log.info('Admin analytics requested')
      return pathService.getAdminAnalytics()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_GET_SETTINGS,
    async (event) => {
      validateSender(event)
      log.info('PATH settings requested')
      return pathService.getSettings()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_SAVE_SETTINGS,
    async (event, params: PathSaveSettingsParams) => {
      validateSender(event)
      log.info('Save PATH settings requested', {
        assessmentReminderDays: params.assessmentReminderDays,
        discussionModerationEnabled: params.discussionModerationEnabled,
        dossierAutoArchiveDays: params.dossierAutoArchiveDays,
        defaultPageSize: params.defaultPageSize,
      })
      return pathService.saveSettings(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_SAVE_ANALYTICS_EVENT,
    async (event, params: PathSaveAnalyticsEventParams) => {
      validateSender(event)
      const userIdFromPayload = params.payload.userId
      const userId = typeof userIdFromPayload === 'string' || typeof userIdFromPayload === 'number'
        ? String(userIdFromPayload)
        : 'unknown'
      log.info('Save analytics event requested', { eventName: params.eventName, userId })
      return adminRepository.saveAnalyticsEvent(userId, params.eventName, params.payload)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_RECALCULATE_READINESS,
    async (event, params: PathRecalculateReadinessParams) => {
      validateSender(event)
      log.info('Recalculate readiness requested', { developerId: params.developerId })
      const paths = learningPathRepository.list({ page: 1, pageSize: 100 })
      const allSkills = paths.flatMap(p =>
        learningPathRepository.listSkills(p.id).map(s => ({
          domainId: s.skill_code,
          progress: s.current_level,
          isCoreGate: s.status === 'core-gate',
        }))
      )
      const gateStatuses = allSkills
        .filter(s => s.isCoreGate)
        .map(s => ({
          gateId: s.domainId,
          status: (s.progress >= 80 ? 'met' : s.progress >= 40 ? 'in-progress' : 'not-started') as 'met' | 'in-progress' | 'not-started' | 'blocked',
        }))
      return calculateReadiness(allSkills, gateStatuses)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_GENERATE_DEFENSE_PREP,
    async (event, params: PathGenerateDefensePrepParams) => {
      validateSender(event)
      log.info('Generate defense prep requested', {
        candidateName: params.candidateName,
        targetLevel: params.targetLevel,
      })
      return pathAiService.generateDefensePrepKit(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_GENERATE_REMEDIATION,
    async (event, params: PathGenerateRemediationParams) => {
      validateSender(event)
      log.info('Generate remediation requested', { candidateName: params.candidateName })
      return pathAiService.generateRemediationPath(params)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.PATH_SEARCH_DYNAMIC_RESOURCES,
    async (event, params: PathSearchDynamicResourcesParams) => {
      validateSender(event)
      log.info('Search dynamic resources requested', {
        topicName: params.topicName,
        skillDomain: params.skillDomain,
      })
      return dynamicContentService.searchResources(params)
    }
  )
}
