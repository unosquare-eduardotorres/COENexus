import { jobRepository } from '../db/agents/repositories/jobRepository'
import { runScout9Pipeline } from './scout9PipelineService'
import { fetchPositions, gatherCandidates, crossReference, runAgenticPhase } from './scout9Steps'
import * as configRepository from '../db/agents/repositories/configRepository'
import { createLogger } from './logger'
import type { Scout9PipelineEvent, Scout9RunParams } from './scout9PipelineService'

const log = createLogger('Scout9JobManager')

export interface Scout9StatusEvent {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'
  jobId?: string
  lastRunAt?: string
}

class Scout9JobManager {
  private currentJob: {
    id: string
    abortController: AbortController
    timeoutId: ReturnType<typeof setTimeout>
  } | null = null

  async run(
    params: Scout9RunParams,
    emitPipeline: (e: Scout9PipelineEvent) => void,
    emitStatus: (e: Scout9StatusEvent) => void
  ): Promise<string> {
    if (this.currentJob) {
      throw new Error('Scout-9 is already running — cancel the current run first')
    }

    const config = configRepository.getConfig()
    const maxDurationMs = config.max_run_duration_ms

    const abortController = new AbortController()
    const job = jobRepository.create({
      status: 'queued',
      scope_type: params.preset ? 'custom' : 'org',
      scope_value: params.preset ?? null,
      initiated_by: 'user',
      run_reason: params.preset ?? 'manual',
      pipeline_phase: 'starting',
      metadata_json: JSON.stringify(params),
    })

    const timeoutId = setTimeout(() => {
      log.error('Scout-9 run exceeded max duration — force-aborting', undefined, { jobId: job.id, maxMs: maxDurationMs })
      abortController.abort(new Error('Run exceeded maximum duration'))
    }, maxDurationMs)

    this.currentJob = { id: job.id, abortController, timeoutId }

    const startTime = Date.now()

    try {
      jobRepository.update(job.id, { status: 'running', started_at: new Date().toISOString() })
      emitStatus({ status: 'running', jobId: job.id })

      const steps = [
        { name: 'Fetch Positions', fn: fetchPositions },
        { name: 'Gather Candidates', fn: gatherCandidates },
        { name: 'Cross-Reference', fn: crossReference },
        { name: 'Agentic Analysis', fn: runAgenticPhase },
      ]

      await runScout9Pipeline(params, job.id, emitPipeline, abortController.signal, steps)

      const durationMs = Date.now() - startTime
      jobRepository.update(job.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata_json: JSON.stringify({ ...JSON.parse(job.metadata_json || '{}'), duration_ms: durationMs }),
      })
      emitStatus({ status: 'completed', jobId: job.id, lastRunAt: new Date().toISOString() })
      log.info('Scout-9 run completed', { jobId: job.id, durationMs })
      return job.id
    } catch (err) {
      const isAbort = err instanceof Error && (err.name === 'AbortError' || abortController.signal.aborted)
      const status = isAbort ? 'canceled' : 'failed'
      const message = err instanceof Error ? err.message : 'Unknown error'
      const durationMs = Date.now() - startTime

      jobRepository.update(job.id, {
        status,
        error_message: message,
        completed_at: new Date().toISOString(),
        metadata_json: JSON.stringify({ ...JSON.parse(job.metadata_json || '{}'), duration_ms: durationMs }),
      })
      emitStatus({ status: isAbort ? 'cancelled' : 'failed', jobId: job.id })

      if (!isAbort) {
        log.error('Scout-9 run failed', err instanceof Error ? err : new Error(String(err)), { jobId: job.id })
        throw err
      }
      return job.id
    } finally {
      clearTimeout(timeoutId)
      this.currentJob = null
    }
  }

  cancel(): void {
    if (!this.currentJob) return
    log.info('Scout-9 run cancelled by user', { jobId: this.currentJob.id })
    this.currentJob.abortController.abort(new Error('Cancelled by user'))
  }

  getStatus(): Scout9StatusEvent {
    if (this.currentJob) {
      return { status: 'running', jobId: this.currentJob.id }
    }
    const jobs = jobRepository.list(1)
    const latest = jobs[0]
    if (!latest) return { status: 'idle' }
    return {
      status: latest.status === 'canceled' ? 'cancelled' : latest.status as Scout9StatusEvent['status'],
      jobId: latest.id,
      lastRunAt: latest.completed_at ?? latest.started_at ?? undefined,
    }
  }
}

export const scout9JobManager = new Scout9JobManager()
