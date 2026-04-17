import { inferenceExecutor, type InferenceExecutorRunParams } from './inferenceExecutor'
import type { AgentJobRow } from '../db/agents/repositories/jobRepository'
import { createLogger } from './logger'

const log = createLogger('InferenceScheduler')

export const inferenceScheduler = {
  async trigger(params: InferenceExecutorRunParams): Promise<AgentJobRow> {
    const status = inferenceExecutor.getStatus()
    if (status.running) {
      throw new Error(`Inference job already running (job_id: ${status.job_id})`)
    }

    log.info('Triggering inference run', {
      scope: params.scope,
      account: params.account,
      stakeholder: params.stakeholder,
    })

    return inferenceExecutor.run(params)
  },

  cancel(jobId: string): boolean {
    log.info('Canceling inference job', { jobId })
    return inferenceExecutor.cancel(jobId)
  },

  getStatus(): { running: boolean; job_id: string | null } {
    return inferenceExecutor.getStatus()
  },
}
