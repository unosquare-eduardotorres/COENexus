import { createLogger } from './logger'

const log = createLogger('Scout9Pipeline')

export interface Scout9RunParams {
  filters?: {
    coe?: string[]
    vertical?: string[]
    client?: string[]
    positions?: number[]
  }
  preset?: string
}

export interface PipelineContext {
  params: Scout9RunParams
  jobId: string
  signal: AbortSignal
  positions?: unknown[]
  candidates?: Map<number, unknown[]>
  crossRefData?: Map<number, Set<number>>
  agenticResult?: string
  stepData?: Record<string, unknown>
}

export interface Scout9PipelineEvent {
  type: 'step-update' | 'log' | 'stats'
  step?: number
  stepName?: string
  status?: 'running' | 'completed' | 'failed'
  elapsed?: number
  data?: Record<string, unknown>
  message?: string
}

interface PipelineStep {
  name: string
  fn: (ctx: PipelineContext, emit: (e: Scout9PipelineEvent) => void) => Promise<PipelineContext>
}

export async function runScout9Pipeline(
  params: Scout9RunParams,
  jobId: string,
  emit: (e: Scout9PipelineEvent) => void,
  signal: AbortSignal,
  steps: PipelineStep[],
  emitter?: {
    narrate: (context: string, fallback: string, status: string, metadata?: Record<string, unknown>) => Promise<void>
  } | null
): Promise<void> {
  let context: PipelineContext = { params, jobId, signal }

  log.info('Pipeline started', { jobId, filters: params.filters, preset: params.preset })

  for (let i = 0; i < steps.length; i++) {
    if (signal.aborted) break
    const step = steps[i]
    const startMs = Date.now()

    emit({ type: 'step-update', step: i + 1, stepName: step.name, status: 'running' })
    emit({ type: 'log', message: `Starting: ${step.name}` })
    await emitter?.narrate(
      `Starting step ${i + 1}/${steps.length}: ${step.name}`,
      `Running ${step.name}...`,
      'thinking',
      { step: i + 1, totalSteps: steps.length, stepName: step.name, phase: 'start' }
    )

    try {
      context = await step.fn(context, emit)
      const elapsed = Date.now() - startMs
      emit({ type: 'step-update', step: i + 1, stepName: step.name, status: 'completed', elapsed, data: context.stepData })
      emit({ type: 'log', message: `Completed: ${step.name} (${elapsed}ms)` })
      await emitter?.narrate(
        `Completed step ${i + 1}/${steps.length}: ${step.name}`,
        `Finished ${step.name}.`,
        'done',
        { step: i + 1, totalSteps: steps.length, stepName: step.name, phase: 'complete', elapsed }
      )
      log.info(`Step ${i + 1} complete: ${step.name}`, { jobId, elapsed })
    } catch (err) {
      emit({ type: 'step-update', step: i + 1, stepName: step.name, status: 'failed' })
      emit({ type: 'log', message: `Failed: ${step.name} - ${err instanceof Error ? err.message : 'Unknown error'}` })
      log.error(`Step ${i + 1} failed: ${step.name}`, err instanceof Error ? err : new Error(String(err)), { jobId })
      throw err
    }
  }

  log.info('Pipeline completed', { jobId })
}
