import { embeddingJobQueue } from '../embeddingJobQueue'
import { createLogger } from '../logger'

const log = createLogger('EmbeddingEligibility')

export interface EmbeddingCandidate {
  source: string
  dbId: number
  upstreamId: number
  name: string
  resumeNoteId: number | null
  resumeFilename: string | null
  isBench: boolean
  hasResume: number
  status: string
}

export function enqueueEmbeddingIfEligible(
  candidate: EmbeddingCandidate,
  token: string,
  model = 'voyage-4-large'
): void {
  if (candidate.hasResume !== 1 || candidate.status !== 'synced') return
  log.debug('Embedding job enqueued', { source: candidate.source, dbId: candidate.dbId, upstreamId: candidate.upstreamId })
  embeddingJobQueue.enqueue({
    source: candidate.source,
    dbId: candidate.dbId,
    upstreamId: candidate.upstreamId,
    name: candidate.name,
    resumeNoteId: candidate.resumeNoteId,
    resumeFilename: candidate.resumeFilename,
    isBench: candidate.isBench,
    token,
    model,
  })
}
