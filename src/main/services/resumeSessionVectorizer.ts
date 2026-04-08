import { sessionRepository } from '../db/repositories/sessionRepository'
import { embeddingRepository } from '../db/repositories/embeddingRepository'
import { voyageEmbeddingService } from './voyageEmbeddingService'
import { createLogger } from './logger'

const log = createLogger('Vectorizer')

export const resumeSessionVectorizer = {
  async vectorizeSession(sessionId: number, model: string): Promise<void> {
    const session = sessionRepository.getResumeSession(sessionId)
    if (!session) {
      log.warn(`Session ${sessionId} not found`)
      return
    }

    if (!session.original_resume_text?.trim()) {
      sessionRepository.updateResumeSession(sessionId, {
        vectorization_status: 'failed',
      })
      log.warn(`Session ${sessionId} has no resume text to vectorize`)
      return
    }

    try {
      sessionRepository.updateResumeSession(sessionId, {
        vectorization_status: 'processing',
      })

      const vector = await voyageEmbeddingService.generateEmbedding(session.original_resume_text, model)

      const embeddingId = embeddingRepository.upsert({
        sourceType: 'resume-session',
        sourceId: session.id,
        upstreamId: session.candidate_upstream_id ?? session.employee_upstream_id ?? 0,
        embedding: vector,
        resumeText: session.original_resume_text,
        isBench: false,
      })

      sessionRepository.updateResumeSession(sessionId, {
        resume_embedding_id: embeddingId,
        vectorization_status: 'completed',
      })

      log.info(`Session ${sessionId} vectorized successfully`, { embeddingId })
    } catch (err) {
      log.error(`Failed to vectorize session ${sessionId}`, err instanceof Error ? err : new Error(String(err)))
      try {
        sessionRepository.updateResumeSession(sessionId, {
          vectorization_status: 'failed',
        })
      } catch (markErr) {
        log.error(`Failed to mark session ${sessionId} as failed`, markErr instanceof Error ? markErr : new Error(String(markErr)))
      }
    }
  },
}
