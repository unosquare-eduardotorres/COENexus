import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { AiChatParams } from '../../../shared/ipc-types'
import { validateSender } from '../validate'
import { claudeProxyService } from '../../services/claudeProxyService'
import { validatePayload, aiChatSchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'

export function registerAiHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.AI_CHAT,
    async (event: IpcMainInvokeEvent, params: AiChatParams) => {
      validateSender(event)
      const validated = validatePayload(aiChatSchema, params, IPC_CHANNELS.AI_CHAT)
      const userMessage = validated.messages.find(m => m.role === 'user')
      const systemMessage = validated.messages.find(m => m.role === 'system')

      if (!userMessage) throw new Error('No user message provided')

      const response = await claudeProxyService.chatAsync(
        validated.model,
        userMessage.content,
        validated.maxTokens ?? 4096,
        0.1,
        systemMessage?.content
      )

      return {
        choices: [{
          message: { role: 'assistant', content: response },
        }],
      }
    })

  registerIpcHandler(IPC_CHANNELS.AI_CHECK_CONNECTION,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      const available = await claudeProxyService.checkAvailability()
      return { available }
    })
}
