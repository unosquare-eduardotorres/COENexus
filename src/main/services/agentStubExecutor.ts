import { randomUUID } from 'crypto'
import type { IpcMainInvokeEvent } from 'electron'
import type { AgentId } from '../../shared/ipc-types'
import { createLogger } from './logger'
import { createStepEmitter } from './agentStepEmitter'

const log = createLogger('AgentStubExecutor')

interface AgentStubRunParams {
  agentId: AgentId
  prompt?: string
  event: IpcMainInvokeEvent
}

interface StubStep {
  step: string
  fallback: string
  status: 'started' | 'running' | 'completed'
  delayMs: number
}

const STUB_AGENT_STEPS: Record<AgentId, StubStep[]> = {
  switchboard: [
    {
      step: 'Ingesting request context',
      fallback: 'Reading inbound context from active systems.',
      status: 'started',
      delayMs: 450,
    },
    {
      step: 'Mapping dependencies',
      fallback: 'Linking involved systems and ownership paths.',
      status: 'running',
      delayMs: 650,
    },
    {
      step: 'Publishing routing plan',
      fallback: 'Routing plan prepared and dispatched.',
      status: 'completed',
      delayMs: 350,
    },
  ],
  sensei: [
    {
      step: 'Reviewing objective',
      fallback: 'Parsing objective and learning targets.',
      status: 'started',
      delayMs: 450,
    },
    {
      step: 'Synthesizing guidance',
      fallback: 'Generating recommendations and next actions.',
      status: 'running',
      delayMs: 650,
    },
    {
      step: 'Delivering coaching output',
      fallback: 'Coaching output generated and ready.',
      status: 'completed',
      delayMs: 350,
    },
  ],
  payday: [
    {
      step: 'Collecting payout signals',
      fallback: 'Gathering payout and contribution signals.',
      status: 'started',
      delayMs: 450,
    },
    {
      step: 'Computing distribution draft',
      fallback: 'Calculating payout distribution draft.',
      status: 'running',
      delayMs: 650,
    },
    {
      step: 'Finalizing payout summary',
      fallback: 'Payout summary finalized.',
      status: 'completed',
      delayMs: 350,
    },
  ],
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const agentStubExecutor = {
  async run({ agentId, prompt, event }: AgentStubRunParams): Promise<{ success: boolean; runId: string }> {
    const runId = randomUUID()
    const emitter = createStepEmitter({ agentId, runId, event })
    const steps = STUB_AGENT_STEPS[agentId]

    log.info('Starting stub agent run', { agentId, runId, hasPrompt: Boolean(prompt?.trim()) })

    try {
      for (const [index, step] of steps.entries()) {
        await emitter.narrate(step.step, step.fallback, step.status, {
          runId,
          agentId,
          stepIndex: index + 1,
          totalSteps: steps.length,
          prompt: prompt?.trim() || null,
        })
        await delay(step.delayMs)
      }

      emitter.emitDirect({
        step: 'Stub run complete',
        status: 'completed',
        message: `${agentId} stub run completed successfully.`,
      })

      return { success: true, runId }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error('Stub agent run failed', error instanceof Error ? error : new Error(message), { agentId, runId })

      emitter.emitDirect({
        step: 'Stub run failed',
        status: 'failed',
        message,
      })

      throw error
    }
  },
}
