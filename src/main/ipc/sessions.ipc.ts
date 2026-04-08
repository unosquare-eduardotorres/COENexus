import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { CreateOrUpdateTransformSession } from '../../renderer/apps/resume/types'
import { validateSender } from './validate'
import { sessionRepository } from '../db/repositories/sessionRepository'
import { validatePayload, sessionsCreateSchema, sessionsUpdateSchema } from './schemas'
import { registerIpcHandler } from './registerIpcHandler'

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
      return { id }
    })

  registerIpcHandler(IPC_CHANNELS.SESSIONS_UPDATE,
    async (event: IpcMainInvokeEvent, id: number, data: Partial<CreateOrUpdateTransformSession>) => {
      validateSender(event)
      const d = validatePayload(sessionsUpdateSchema, data, IPC_CHANNELS.SESSIONS_UPDATE)
      const updateData: Record<string, unknown> = {}

      if (d.name !== undefined) updateData.name = d.name
      if (d.contextType !== undefined) updateData.context_type = d.contextType
      if (d.contextId !== undefined) updateData.context_id = d.contextId
      if (d.contextName !== undefined) updateData.context_name = d.contextName
      if (d.processingMode !== undefined) updateData.processing_mode = d.processingMode
      if (d.refinementMode !== undefined) updateData.refinement_mode = d.refinementMode
      if (d.jobDescription !== undefined) updateData.job_description = d.jobDescription
      if (d.jobDescriptionSource !== undefined) updateData.job_description_source = d.jobDescriptionSource
      if (d.selectedPositionId !== undefined) updateData.selected_position_id = d.selectedPositionId
      if (d.resumeContentJson !== undefined) updateData.resume_content_json = d.resumeContentJson
      if (d.wizardStateJson !== undefined) updateData.wizard_state_json = d.wizardStateJson
      if (d.status !== undefined) updateData.status = d.status

      sessionRepository.updateTransformSession(id, updateData)
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
      return { deleted: true }
    })
}
