import { BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getConfig } from '../config'
import { vigilRepository, type VigilChatMessageRow } from '../db/agents/repositories/vigilRepository'
import { createLogger } from './logger'
import { oracleChatService } from './oracleChatService'

const log = createLogger('VigilChatService')

const VIGIL_SYSTEM_PROMPT = `You are Vigil, the backend operations watchdog for Operation Nexus.
You have access to live system state data injected below.
Always answer using the actual data provided — never say "let me check" or "I'll look into it."
When reporting sync results, break down by source with counts (new, updated, unchanged, errors).
Report errors with their actual error messages.
Keep responses concise, factual, and operationally actionable.
Use markdown-style formatting: bold for labels, bullet points for lists.`

interface SendVigilMessageParams {
  content: string
  metadata_json?: string | null
  model?: string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
  _event?: IpcMainInvokeEvent
}

export const vigilChatService = {
  async sendMessage(params: SendVigilMessageParams): Promise<VigilChatMessageRow> {
    const content = params.content?.trim()
    if (!content) {
      throw new Error('Message content is required')
    }

    const userMessage = vigilRepository.createChatMessage({
      role: 'user',
      content,
      metadata_json: params.metadata_json ?? null,
      created_at: new Date().toISOString(),
    })

    const claudeModel = params.model ?? getConfig().claude.sonnetModel

    vigilRepository.createActivityLog({
      run_id: null,
      event_type: 'chat',
      source: 'system',
      severity: 'info',
      message: 'Vigil chat request received',
      details_json: JSON.stringify({ user_message_id: userMessage.id, model: claudeModel }),
    })

    try {
      const emitStep = (step: string) => {
        if (params._event) {
          const win = BrowserWindow.fromWebContents(params._event.sender)
          if (win && !win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.VIGIL_CHAT_STEP_EVENT, {
              step,
              timestamp: new Date().toISOString(),
            })
          }
        }
      }

      const reply = await oracleChatService.chat(content, emitStep, params.signal)

      const assistantMessage = vigilRepository.createChatMessage({
        role: 'assistant',
        content: reply,
        metadata_json: JSON.stringify({
          model: claudeModel,
          in_reply_to: userMessage.id,
        }),
        created_at: new Date().toISOString(),
      })

      vigilRepository.createActivityLog({
        run_id: null,
        event_type: 'chat',
        source: 'system',
        severity: 'info',
        message: 'Vigil chat response generated',
        details_json: JSON.stringify({ assistant_message_id: assistantMessage.id }),
      })

      return assistantMessage
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      vigilRepository.createActivityLog({
        run_id: null,
        event_type: 'chat',
        source: 'system',
        severity: 'error',
        message,
        details_json: JSON.stringify({ user_message_id: userMessage.id }),
      })
      log.error('Vigil chat failed', error instanceof Error ? error : new Error(message))
      throw error
    }
  },

  listMessages(limit = 100, offset = 0): VigilChatMessageRow[] {
    return vigilRepository.listChatMessages({ limit, offset })
  },

  clearMessages(): number {
    return vigilRepository.clearChatMessages()
  },

  getSystemPrompt(): string {
    return VIGIL_SYSTEM_PROMPT
  },
}
