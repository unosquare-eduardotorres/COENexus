import { EventEmitter } from 'events'

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
  get pendingCount(): number {
    return _pendingCount
  },

  enqueue(job: EmbeddingJob): void {
    queue.push(job)
    _pendingCount++
    emitter.emit('job')
  },

  async dequeue(): Promise<EmbeddingJob> {
    const existing = queue.shift()
    if (existing) {
      _pendingCount--
      return existing
    }

    return new Promise<EmbeddingJob>(resolve => {
      const handler = () => {
        const job = queue.shift()
        if (job) {
          _pendingCount--
          emitter.removeListener('job', handler)
          resolve(job)
        }
      }
      emitter.on('job', handler)
    })
  },

  drain(): EmbeddingJob[] {
    const items = [...queue]
    queue.length = 0
    _pendingCount = 0
    return items
  },
}
