import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { ErrorGenerateDescriptionRequest, ErrorReportRequest } from '../../shared/ipc-types'
import { validateSender } from './validate'
import { registerIpcHandler } from './registerIpcHandler'
import { readAllErrors, clearErrors, markReported, captureError, getErrorsFilePath, deleteError, updateAiDescription } from '../services/errorTransport'
import { claudeService } from '../services/claudeService'

export function registerBugHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.ERRORS_LIST,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return readAllErrors()
    })

  registerIpcHandler(IPC_CHANNELS.ERRORS_CLEAR,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      clearErrors()
      return { cleared: true }
    })

  registerIpcHandler(IPC_CHANNELS.ERRORS_MARK_REPORTED,
    async (event: IpcMainInvokeEvent, errorId: string) => {
      validateSender(event)
      return { updated: markReported(errorId) }
    })

  registerIpcHandler(IPC_CHANNELS.ERRORS_GENERATE_DESCRIPTION,
    async (event: IpcMainInvokeEvent, params: ErrorGenerateDescriptionRequest) => {
      validateSender(event)
      const allErrors = readAllErrors()
      const error = allErrors.errors.find(e => e.id === params.errorId)
      if (!error) throw new Error('Error entry not found')

      const prompt = `Analyze this application error and provide a concise, developer-friendly bug description.
Include: likely cause, affected area, and suggested fix.

Error Details:
- Scope: ${error.scope}
- Message: ${error.message}
- Stack: ${error.stack ?? 'N/A'}
- Platform: ${error.platform}
- Occurrences: ${error.occurrences}
- Module: ${error.source ?? 'Unknown'}`

      const description = await claudeService.chatAsync(
        'haiku',
        prompt,
        1024,
        0.2,
        'You are a senior software engineer analyzing error logs from an Electron desktop application. Be concise and actionable.'
      )

      updateAiDescription(params.errorId, description)

      return { description }
    })

  registerIpcHandler(IPC_CHANNELS.ERRORS_REPORT,
    async (event: IpcMainInvokeEvent, params: ErrorReportRequest) => {
      validateSender(event)
      captureError({
        message: params.message,
        stack: params.stack,
        componentStack: params.componentStack,
        scope: params.scope,
        url: params.url,
        severity: 'error',
      })
      return { captured: true }
    })

  registerIpcHandler(IPC_CHANNELS.ERRORS_GET_LOG_PATH,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      return getErrorsFilePath()
    })
}
