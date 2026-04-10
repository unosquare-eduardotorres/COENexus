import { syncRepository } from '../../db/repositories/syncRepository'
import { embeddingRepository } from '../../db/repositories/embeddingRepository'
import { createLogger } from '../logger'

const log = createLogger('ChangeDetection')

interface BaseRow {
  id: number
  upstream_id: number
  status: string
  status_reason: string | null
  has_resume: number
  resume_date_created: string | null
}

export interface ChangeDetectionConfig<TRow extends BaseRow> {
  tableName: 'synced_employees' | 'synced_candidates'
  source: string
  findByUpstreamId: (upstreamId: number) => TRow | undefined
  upsert: (entity: Omit<TRow, 'id'>) => number
  hasInfoChanged: (existing: TRow, entity: Omit<TRow, 'id'>) => boolean
}

export function upsertWithChangeDetection<TRow extends BaseRow>(
  entity: Omit<TRow, 'id'>,
  config: ChangeDetectionConfig<TRow>
): { dbId: number; resumeChanged: boolean; syncDetail: string } {
  const existing = config.findByUpstreamId(entity.upstream_id)

  if (existing) {
    const infoChanged = config.hasInfoChanged(existing, entity)

    const resumeChanged = entity.has_resume === 1 &&
      !!entity.resume_date_created &&
      (!existing.resume_date_created || entity.resume_date_created > existing.resume_date_created)

    if (!infoChanged && !resumeChanged) {
      const needsStatusFix = existing.status !== 'extracted' && existing.status !== 'vectorized' &&
        (existing.status !== entity.status)
      if (needsStatusFix) {
        syncRepository.updateStatus(config.tableName, existing.id, entity.status)
      }
      return { dbId: existing.id, resumeChanged: false, syncDetail: 'unchanged' }
    }

    if (resumeChanged) {
      log.info('Resume changed — clearing embeddings for re-index', { source: config.source, dbId: existing.id })
      embeddingRepository.deleteBySource(config.source, existing.id)
    }

    config.upsert(entity)
    log.info('Record updated', { source: config.source, upstreamId: entity.upstream_id, resumeChanged })
    return { dbId: existing.id, resumeChanged, syncDetail: 'updated' }
  }

  const dbId = config.upsert(entity)
  log.info('New record inserted', { source: config.source, upstreamId: entity.upstream_id })
  return { dbId, resumeChanged: false, syncDetail: 'new' }
}
