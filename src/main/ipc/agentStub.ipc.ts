import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { IpcContracts } from '../../shared/ipc-types'
import { registerIpcHandler } from './registerIpcHandler'
import { validateSender } from './validate'
import { agentStubExecutor } from '../services/agentStubExecutor'

export function registerAgentStubHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.AGENT_STUB_RUN,
    async (
      event: IpcMainInvokeEvent,
      params: IpcContracts[typeof IPC_CHANNELS.AGENT_STUB_RUN]['request']
    ): Promise<IpcContracts[typeof IPC_CHANNELS.AGENT_STUB_RUN]['response']> => {
      validateSender(event)
      return agentStubExecutor.run({
        agentId: params.agentId,
        prompt: params.prompt,
        event,
      })
    }
  )
}
