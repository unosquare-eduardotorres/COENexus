import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type { AgentId, AgentStepEvent } from '../../shared/ipc-types'
import { agentNarrator } from './agentNarrator'
import { createLogger } from './logger'

const log = createLogger('AgentStepEmitter')

type ExtendedStepStatus = AgentStepEvent['status'] | 'thinking' | 'done' | 'error'

interface CreateStepEmitterParams {
  agentId: AgentId
  runId: string
  event: IpcMainInvokeEvent
}

interface EmitDirectInput {
  step: string
  status: ExtendedStepStatus
  message: string
  narration?: string
}

function normalizeStatus(status: ExtendedStepStatus): AgentStepEvent['status'] {
  if (status === 'thinking') return 'started'
  if (status === 'done') return 'completed'
  if (status === 'error') return 'failed'
  return status
}

function shouldNarrate(agentId: AgentId): boolean {
  return agentId === 'switchboard' || agentId === 'sensei' || agentId === 'payday' || agentId === 'braniac'
}

function toNarrationDetail(runId: string, context: string, metadata?: Record<string, unknown>): string {
  const metadataText = metadata ? JSON.stringify(metadata) : ''
  const parts = [`runId=${runId}`, context.trim(), metadataText].filter(Boolean)
  return parts.join(' | ')
}

export function createStepEmitter({ agentId, runId, event }: CreateStepEmitterParams) {
  const emitDirect = ({ step, status, message, narration }: EmitDirectInput): void => {
    const payload: AgentStepEvent = {
      agentId,
      step,
      status: normalizeStatus(status),
      message,
      narration,
      timestamp: new Date().toISOString(),
    }

    event.sender.send(IPC_CHANNELS.AGENT_STEP_EVENT, payload)
  }

  const narrate = async (
    step: string,
    fallback: string,
    status: ExtendedStepStatus,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    let narration = fallback

    if (shouldNarrate(agentId)) {
      try {
        narration = await agentNarrator.narrateStep({
          agentId,
          phase: status,
          step,
          detail: toNarrationDetail(runId, fallback, metadata),
        })
      } catch (error) {
        log.warn('Falling back to direct narration text', {
          agentId,
          runId,
          step,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    emitDirect({ step, status, message: narration, narration })
  }

  return {
    narrate,
    emitDirect,
  }
}
