import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import {
  validatePayload,
  presentCreateSessionSchema,
  presentUpdateSessionSchema,
  presentAddEntrySchema,
  presentUpdateEntrySchema,
  presentCheckResumeFormatSchema,
  presentTransformResumeSchema,
  presentGenerateIntroSchema,
  presentGenerateCandidateProfileSchema,
  presentGenerateHtmlSchema,
} from '../schemas'
import { validateSender } from '../validate'
import { presentationRepository } from '../../db/repositories/presentationRepository'
import { presentationService } from '../../services/presentationService'
import { registerIpcHandler } from '../registerIpcHandler'
import { createLogger } from '../../services/logger'

const log = createLogger('PresentationIPC')

const SESSION_FIELD_MAP: Record<string, string> = {
  name: 'name',
  mode: 'mode',
  introText: 'intro_text',
  status: 'status',
  openPositionId: 'open_position_id',
  positionTitle: 'position_title',
  accountName: 'account_name',
  positionUpstreamId: 'position_upstream_id',
  jobDescription: 'job_description',
}

const ENTRY_FIELD_MAP: Record<string, string> = {
  sourceType: 'source_type',
  upstreamId: 'upstream_id',
  fullName: 'full_name',
  mainSkill: 'main_skill',
  seniority: 'seniority',
  country: 'country',
  yearsOfExperience: 'years_of_experience',
  availability: 'availability',
  recommendedRate: 'recommended_rate',
  techStack: 'tech_stack_json',
  professionalSummary: 'professional_summary',
  domainExperience: 'domain_experience',
  resumeFormatStatus: 'resume_format_status',
  transformSessionId: 'transform_session_id',
  individualIntroText: 'individual_intro_text',
  sortOrder: 'sort_order',
}

function mapUpdateData<T extends object>(data: T, map: Record<string, string>): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}
  for (const [camelKey, snakeKey] of Object.entries(map)) {
    const value = (data as Record<string, unknown>)[camelKey]
    if (value !== undefined) {
      updateData[snakeKey] = camelKey === 'techStack' && Array.isArray(value) ? JSON.stringify(value) : value
    }
  }
  return updateData
}

export function registerPresentationHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.PRESENT_CREATE_SESSION,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentCreateSessionSchema, data, IPC_CHANNELS.PRESENT_CREATE_SESSION)
      const now = new Date().toISOString()
      const id = presentationRepository.createPresentationSession({
        name: d.name ?? 'Presentation Session',
        mode: d.mode ?? 'manual',
        intro_text: '',
        status: 'draft',
        open_position_id: d.openPositionId ?? null,
        position_title: d.positionTitle ?? null,
        account_name: d.accountName ?? null,
        position_upstream_id: d.positionUpstreamId ?? null,
        job_description: d.jobDescription ?? null,
        created_at: now,
        updated_at: now,
      })
      log.info('Presentation session created', { id })
      return { id }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_UPDATE_SESSION,
    async (event: IpcMainInvokeEvent, id: number, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentUpdateSessionSchema, data, IPC_CHANNELS.PRESENT_UPDATE_SESSION)
      const updateData = mapUpdateData(d, SESSION_FIELD_MAP)
      presentationRepository.updatePresentationSession(id, updateData)
      log.info('Presentation session updated', { id, fields: Object.keys(updateData) })
      return { success: true }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_GET_SESSION,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      const session = presentationRepository.getPresentationSession(id)
      if (!session) return null
      const entries = presentationRepository.listPresentationEntries(id)
      return { ...session, entries }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_LIST_SESSIONS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return presentationRepository.listPresentationSessions()
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_DELETE_SESSION,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      presentationRepository.deletePresentationSession(id)
      log.info('Presentation session deleted', { id })
      return { deleted: true }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_ADD_ENTRY,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentAddEntrySchema, data, IPC_CHANNELS.PRESENT_ADD_ENTRY)
      const now = new Date().toISOString()
      const id = presentationRepository.addPresentationEntry({
        session_id: d.sessionId,
        source_type: d.sourceType,
        upstream_id: d.upstreamId,
        full_name: d.fullName,
        main_skill: d.mainSkill,
        seniority: d.seniority,
        country: d.country,
        years_of_experience: d.yearsOfExperience ?? null,
        availability: d.availability ?? null,
        recommended_rate: d.recommendedRate ?? null,
        tech_stack_json: d.techStack ? JSON.stringify(d.techStack) : null,
        professional_summary: d.professionalSummary ?? null,
        domain_experience: d.domainExperience ?? null,
        resume_format_status: d.resumeFormatStatus ?? null,
        transform_session_id: d.transformSessionId ?? null,
        individual_intro_text: d.individualIntroText ?? null,
        sort_order: d.sortOrder ?? 0,
        created_at: now,
        updated_at: now,
      })
      log.info('Presentation entry added', { id, sessionId: d.sessionId })
      return { id }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_UPDATE_ENTRY,
    async (event: IpcMainInvokeEvent, id: number, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentUpdateEntrySchema, data, IPC_CHANNELS.PRESENT_UPDATE_ENTRY)
      const updateData = mapUpdateData(d, ENTRY_FIELD_MAP)
      presentationRepository.updatePresentationEntry(id, updateData)
      log.info('Presentation entry updated', { id, fields: Object.keys(updateData) })
      return { success: true }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_DELETE_ENTRY,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      presentationRepository.deletePresentationEntry(id)
      log.info('Presentation entry deleted', { id })
      return { deleted: true }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_CHECK_RESUME_FORMAT,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentCheckResumeFormatSchema, data, IPC_CHANNELS.PRESENT_CHECK_RESUME_FORMAT)
      return presentationService.checkResumeFormat(d)
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_TRANSFORM_RESUME,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentTransformResumeSchema, data, IPC_CHANNELS.PRESENT_TRANSFORM_RESUME)
      return presentationService.transformResume(d)
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_GENERATE_INTRO,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentGenerateIntroSchema, data, IPC_CHANNELS.PRESENT_GENERATE_INTRO)
      return presentationService.generateIntro(d)
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_GENERATE_CANDIDATE_PROFILE,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentGenerateCandidateProfileSchema, data, IPC_CHANNELS.PRESENT_GENERATE_CANDIDATE_PROFILE)
      return presentationService.generateCandidateProfile(d)
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_GENERATE_HTML,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentGenerateHtmlSchema, data, IPC_CHANNELS.PRESENT_GENERATE_HTML)
      return presentationService.generatePresentationHtml(d.sessionId, d.mode)
    })
}
