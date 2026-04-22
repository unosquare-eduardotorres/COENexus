import { BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  OracleChatMessage,
  OracleListChatMessagesParams,
  OracleResponse,
  OracleSendChatMessageParams,
} from '../../shared/ipc-types'
import { oracleRepository } from '../db/agents/repositories/oracleRepository'
import type { OracleChatMessageRow } from '../db/agents/repositories/oracleRepository'
import { oracleChatService } from '../services/oracleChatService'
import { createLogger } from '../services/logger'
import { registerIpcHandler } from './registerIpcHandler'
import { validateSender } from './validate'

const log = createLogger('OracleIPC')

function ok<T>(data: T): OracleResponse<T> {
  return { success: true, data }
}

function fail(error: string): OracleResponse<never> {
  return { success: false, error }
}

function mapChatRow(row: OracleChatMessageRow): OracleChatMessage {
  let toolCalls: number | undefined
  if (row.metadata_json) {
    try {
      const meta = JSON.parse(row.metadata_json)
      toolCalls = meta.toolCalls
    } catch { /* ignore */ }
  }
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    metadata_json: row.metadata_json,
    created_at: row.created_at,
    toolCalls,
  }
}

export function registerOracleHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.ORACLE_CHAT_SEND_MESSAGE, async (event: IpcMainInvokeEvent, params: OracleSendChatMessageParams) => {
    validateSender(event)
    try {
      const content = params.content?.trim()
      if (!content) {
        return fail('Message content is required')
      }

      const userMessage = oracleRepository.createChatMessage({
        role: 'user',
        content,
        metadata_json: params.metadata_json ?? null,
        created_at: new Date().toISOString(),
      })

      const emitStep = (step: string) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.ORACLE_CHAT_STEP_EVENT, {
            step,
            timestamp: new Date().toISOString(),
          })
        }
      }

      const emitChunk = (text: string) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.ORACLE_CHAT_CHUNK_EVENT, {
            text,
            timestamp: new Date().toISOString(),
          })
        }
      }

      const reply = await oracleChatService.chat(content, emitStep, emitChunk)

      const assistantMessage = oracleRepository.createChatMessage({
        role: 'assistant',
        content: reply.content,
        metadata_json: JSON.stringify({ in_reply_to: userMessage.id, toolCalls: reply.toolCalls }),
        created_at: new Date().toISOString(),
      })

      return ok(mapChatRow(assistantMessage))
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to send Oracle chat message')
    }
  })

  registerIpcHandler(IPC_CHANNELS.ORACLE_CHAT_LIST_MESSAGES, async (event: IpcMainInvokeEvent, params: OracleListChatMessagesParams | void) => {
    validateSender(event)
    try {
      const rows = oracleRepository.listChatMessages({
        limit: params?.limit,
        offset: params?.offset,
      })
      return ok(rows.map(mapChatRow))
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to list Oracle chat messages')
    }
  })

  registerIpcHandler(IPC_CHANNELS.ORACLE_CHAT_CLEAR_MESSAGES, async (event: IpcMainInvokeEvent) => {
    validateSender(event)
    try {
      oracleRepository.clearChatMessages()
      return ok({ cleared: true })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to clear Oracle chat messages')
    }
  })

  log.info('Registered Oracle IPC handlers')
}
