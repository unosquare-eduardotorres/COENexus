import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { CreateOrUpdateTransformSession } from '../../../renderer/apps/resume/types'
import { validateSender } from '../validate'
import { sessionRepository } from '../../db/repositories/sessionRepository'
import { validatePayload, sessionsCreateSchema, sessionsUpdateSchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'
import { createLogger } from '../../services/logger'

const log = createLogger('SessionsIPC')

const SESSION_FIELD_MAP: Record<string, string> = {
  name: 'name',
  contextType: 'context_type',
  contextId: 'context_id',
  contextName: 'context_name',
  processingMode: 'processing_mode',
  refinementMode: 'refinement_mode',
  jobDescription: 'job_description',
  jobDescriptionSource: 'job_description_source',
  selectedPositionId: 'selected_position_id',
  resumeContentJson: 'resume_content_json',
  wizardStateJson: 'wizard_state_json',
  status: 'status',
}

export function registerSessionsHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.SESSIONS_CREATE,
    async (event: IpcMainInvokeEvent, data: CreateOrUpdateTransformSession) => {
      validateSender(event)
      const d = validatePayload(sessionsCreateSchema, data, IPC_CHANNELS.SESSIONS_CREATE)
      const now = new Date().toISOString()
      const id = sessionRepository.createTransformSession({
        name: d.name,
        context_type: d.contextType,
        context_id: d.contextId ?? null,
        context_name: d.contextName ?? '',
        processing_mode: d.processingMode ?? 'single',
        refinement_mode: d.refinementMode ?? '',
        job_description: d.jobDescription ?? null,
        job_description_source: d.jobDescriptionSource ?? null,
        selected_position_id: d.selectedPositionId ?? null,
        resume_content_json: d.resumeContentJson ?? null,
        wizard_state_json: d.wizardStateJson ?? null,
        status: d.status ?? 'draft',
        created_at: now,
        updated_at: now,
      })
      log.info('Transform session created', { name: d.name, contextType: d.contextType })
      return { id }
    })

  registerIpcHandler(IPC_CHANNELS.SESSIONS_UPDATE,
    async (event: IpcMainInvokeEvent, id: number, data: Partial<CreateOrUpdateTransformSession>) => {
      validateSender(event)
      const d = validatePayload(sessionsUpdateSchema, data, IPC_CHANNELS.SESSIONS_UPDATE)
      const updateData: Record<string, unknown> = {}
      for (const [camelKey, snakeKey] of Object.entries(SESSION_FIELD_MAP)) {
        if ((d as Record<string, unknown>)[camelKey] !== undefined) {
          updateData[snakeKey] = (d as Record<string, unknown>)[camelKey]
        }
      }

      sessionRepository.updateTransformSession(id, updateData)
      log.info('Transform session updated', { id, fields: Object.keys(updateData) })
      return { success: true }
    })

  registerIpcHandler(IPC_CHANNELS.SESSIONS_GET,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      return sessionRepository.getTransformSessionParsed(id) ?? null
    })

  registerIpcHandler(IPC_CHANNELS.SESSIONS_LIST,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return sessionRepository.listTransformSessions()
    })

  registerIpcHandler(IPC_CHANNELS.SESSIONS_DELETE,
    async (event: IpcMainInvokeEvent, id: number) => {
      validateSender(event)
      sessionRepository.deleteTransformSession(id)
      log.info('Transform session deleted', { id })
      return { deleted: true }
    })
}
