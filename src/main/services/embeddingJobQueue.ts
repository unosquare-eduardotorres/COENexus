import { EventEmitter } from 'events'
import { createLogger } from './logger'

const log = createLogger('EmbeddingJobQueue')

export interface EmbeddingJob {
  source: string
  dbId: number
  upstreamId: number
  name: string
  resumeNoteId: number | null
  resumeFilename: string | null
  isBench: boolean
  token: string
  model: string
}

const queue: EmbeddingJob[] = []
const emitter = new EventEmitter()
let _pendingCount = 0

export const embeddingJobQueue = {
  enqueue(job: EmbeddingJob): void {
    queue.push(job)
    _pendingCount++
    log.debug('Job enqueued', { source: job.source, dbId: job.dbId, name: job.name, pendingCount: _pendingCount })
    emitter.emit('job')
  },

  async dequeue(): Promise<EmbeddingJob> {
    const existing = queue.shift()
    if (existing) {
      _pendingCount--
      log.debug('Job dequeued', { source: existing.source, dbId: existing.dbId, name: existing.name, pendingCount: _pendingCount })
      return existing
    }

    return new Promise<EmbeddingJob>(resolve => {
      const handler = () => {
        const job = queue.shift()
        if (job) {
          _pendingCount--
          log.debug('Job dequeued', { source: job.source, dbId: job.dbId, name: job.name, pendingCount: _pendingCount })
          emitter.removeListener('job', handler)
          resolve(job)
        }
      }
      emitter.on('job', handler)
    })
  },

  drain(): EmbeddingJob[] {
    const items = [...queue]
    const count = items.length
    queue.length = 0
    _pendingCount = 0
    log.info('Queue drained', { drainedCount: count })
    return items
  },
}
