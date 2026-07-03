import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type { AiChatParams } from '../../../shared/ipc-types'
import { validateSender } from '../validate'
import { claudeService } from '../../services/claudeService'
import { llmRouter } from '../../services/llmRouter'
import { subscriptionService } from '../../services/subscriptionService'
import { validatePayload, aiChatSchema } from '../schemas'
import { registerIpcHandler } from '../registerIpcHandler'
import { createLogger } from '../../services/logger'

const log = createLogger('AiIPC')

export function registerAiHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.AI_CHAT,
    async (event: IpcMainInvokeEvent, params: AiChatParams) => {
      validateSender(event)
      const validated = validatePayload(aiChatSchema, params, IPC_CHANNELS.AI_CHAT)
      const userMessage = validated.messages.find(m => m.role === 'user')
      const systemMessage = validated.messages.find(m => m.role === 'system')

      if (!userMessage) throw new Error('No user message provided')

      log.info('AI chat requested', {
        featureKey: 'aiChat',
        maxTokens: validated.maxTokens ?? 4096,
        messageCount: validated.messages.length,
        hasSystemMessage: Boolean(systemMessage),
      })

      const { text, usage } = await llmRouter.chatAsync(
        'aiChat',
        userMessage.content,
        validated.maxTokens ?? 4096,
        0.1,
        systemMessage?.content
      )

      return {
        choices: [{
          message: { role: 'assistant', content: text },
        }],
        usage: {
          prompt_tokens: usage.inputTokens,
          completion_tokens: usage.outputTokens,
          total_tokens: usage.inputTokens + usage.outputTokens,
        },
      }
    })

  registerIpcHandler(IPC_CHANNELS.AI_CHECK_CONNECTION,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      log.info('AI connection check requested')
      const available = await claudeService.checkAvailability()
      log.info('AI connection check result', { available })
      return { available }
    })

  registerIpcHandler(IPC_CHANNELS.AI_TOKEN_USAGE,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      log.info('AI token usage requested')
      return llmRouter.getTokenUsage()
    })

  registerIpcHandler(IPC_CHANNELS.AI_RESET_TOKEN_USAGE,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      log.warn('AI token usage reset requested')
      llmRouter.resetTokenUsage()
      return { ok: true }
    })

  registerIpcHandler(IPC_CHANNELS.AI_SUBSCRIPTION_STATUS,
    async (event: IpcMainInvokeEvent) => {
      validateSender(event)
      log.info('AI subscription status requested')
      return subscriptionService.validateAll()
    })
}
