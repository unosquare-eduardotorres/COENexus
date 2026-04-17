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

function mapSessionToDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    introText: row.intro_text ?? '',
    status: row.status,
    openPositionId: row.open_position_id ?? null,
    positionTitle: row.position_title ?? null,
    accountName: row.account_name ?? null,
    positionUpstreamId: row.position_upstream_id ?? null,
    jobDescription: row.job_description ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEntryToDto(row: Record<string, unknown>) {
  let techStack: string[] = []
  const raw = row.tech_stack_json as string | null
  if (raw) {
    try { techStack = JSON.parse(raw) as string[] } catch { /* ignore */ }
  }
  return {
    id: row.id,
    sessionId: row.session_id,
    sourceType: row.source_type,
    upstreamId: row.upstream_id,
    fullName: row.full_name,
    mainSkill: row.main_skill,
    seniority: row.seniority,
    country: row.country,
    yearsOfExperience: row.years_of_experience ?? '',
    availability: row.availability ?? '',
    recommendedRate: row.recommended_rate ?? '',
    techStack,
    professionalSummary: row.professional_summary ?? '',
    domainExperience: row.domain_experience ?? '',
    resumeFormatStatus: row.resume_format_status ?? 'unknown',
    transformSessionId: row.transform_session_id ?? null,
    individualIntroText: row.individual_intro_text ?? '',
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function registerPresentationHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.PRESENT_CREATE_SESSION,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentCreateSessionSchema, data, IPC_CHANNELS.PRESENT_CREATE_SESSION)
      const now = new Date().toISOString()
      const id = presentationRepository.createSession({
        name: d.name ?? 'Presentation Session',
        mode: d.mode ?? 'manual',
        intro_text: '',
        status: 'draft',
        generated_html: null,
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
      presentationRepository.updateSession(id, updateData)
      log.info('Presentation session updated', { id, fields: Object.keys(updateData) })
      return { success: true }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_GET_SESSION,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      const session = presentationRepository.getSession(id)
      if (!session) return null
      const entries = presentationRepository.listEntriesBySession(id)
      return { ...mapSessionToDto(session as unknown as Record<string, unknown>), entries: entries.map(e => mapEntryToDto(e as unknown as Record<string, unknown>)) }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_LIST_SESSIONS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      const rows = presentationRepository.listSessions()
      return rows.map(row => {
        const dto = mapSessionToDto(row as unknown as Record<string, unknown>)
        const entries = presentationRepository.listEntriesBySession(row.id)
        return { ...dto, entryCount: entries.length }
      })
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_DELETE_SESSION,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      presentationRepository.deleteSession(id)
      log.info('Presentation session deleted', { id })
      return { deleted: true }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_ADD_ENTRY,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentAddEntrySchema, data, IPC_CHANNELS.PRESENT_ADD_ENTRY)
      const now = new Date().toISOString()
      const id = presentationRepository.createEntry({
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
      presentationRepository.updateEntry(id, updateData)
      log.info('Presentation entry updated', { id, fields: Object.keys(updateData) })
      return { success: true }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_DELETE_ENTRY,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      presentationRepository.deleteEntry(id)
      log.info('Presentation entry deleted', { id })
      return { deleted: true }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_CHECK_RESUME_FORMAT,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentCheckResumeFormatSchema, data, IPC_CHANNELS.PRESENT_CHECK_RESUME_FORMAT)
      return presentationService.checkResumeFormat(d.resumeText)
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_TRANSFORM_RESUME,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentTransformResumeSchema, data, IPC_CHANNELS.PRESENT_TRANSFORM_RESUME)
      const transformedResumeText = await presentationService.transformResume(d.resumeText, d.fullName, d.jobDescription ?? '')
      return { transformedResumeText }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_GENERATE_INTRO,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentGenerateIntroSchema, data, IPC_CHANNELS.PRESENT_GENERATE_INTRO)
      const introText = await presentationService.generateIntro(d.candidateNames, d.positionTitle, d.accountName, d.jobDescription, d.mainSkill)
      return { introText }
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_GENERATE_CANDIDATE_PROFILE,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentGenerateCandidateProfileSchema, data, IPC_CHANNELS.PRESENT_GENERATE_CANDIDATE_PROFILE)
      return presentationService.generateCandidateProfile(d.resumeText, d.fullName, d.mainSkill, d.jobDescription ?? '', d.positionTitle ?? '')
    })

  registerIpcHandler(IPC_CHANNELS.PRESENT_GENERATE_HTML,
    async (event: IpcMainInvokeEvent, data: unknown) => {
      validateSender(event)
      const d = validatePayload(presentGenerateHtmlSchema, data, IPC_CHANNELS.PRESENT_GENERATE_HTML)
      const html = presentationService.generatePresentationHtml(d.sessionId, d.mode)
      return { html }
    })
}
