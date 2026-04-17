import { braniacExecutor, type BraniacExecutorRunParams } from './braniacExecutor'
import type { AgentJobRow } from '../db/agents/repositories/jobRepository'
import { createLogger } from './logger'

const log = createLogger('BraniacScheduler')

export const braniacScheduler = {
  async trigger(params: BraniacExecutorRunParams): Promise<AgentJobRow> {
    const status = braniacExecutor.getStatus()
    if (status.running) {
      log.warn('Braniac trigger rejected — already running', { existingJobId: status.job_id })
      throw new Error(`Braniac job already running (job_id: ${status.job_id})`)
    }

    log.info('Braniac run triggered', {
      scope: params.scope,
      account: params.account,
      stakeholder: params.stakeholder,
    })

    return braniacExecutor.run(params)
  },

  cancel(jobId: string): boolean {
    log.info('Braniac run canceled', { jobId })
    return braniacExecutor.cancel(jobId)
  },

  getStatus(): { running: boolean; job_id: string | null } {
    return braniacExecutor.getStatus()
  },
}
