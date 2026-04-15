import { getDatabase } from '../connection'

interface EmbeddingRow {
  id: number
  source_type: string
  source_id: number
  upstream_id: number
  embedding: Buffer | null
  resume_text: string | null
  created_at: string
  updated_at: string
  is_bench: number
}

interface VectorSearchResult {
  id: number
  source_type: string
  source_id: number
  upstream_id: number
  resume_text: string | null
  is_bench: number
  created_at: string
  updated_at: string
  distance: number
}

export const embeddingRepository = {
  findBySource(sourceType: string, sourceId: number): EmbeddingRow | undefined {
    const db = getDatabase()
    return db.prepare(
      'SELECT * FROM resume_embeddings WHERE source_type = ? AND source_id = ?'
    ).get(sourceType, sourceId) as EmbeddingRow | undefined
  },

  countBySourceType(sourceType: string): number {
    const db = getDatabase()
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM resume_embeddings WHERE source_type = ? AND embedding IS NOT NULL'
    ).get(sourceType) as { count: number }
    return result.count
  },

  upsert(row: {
    sourceType: string
    sourceId: number
    upstreamId: number
    embedding: Float32Array
    resumeText: string | null
    isBench: boolean
  }): number {
    const db = getDatabase()
    const now = new Date().toISOString()
    const embeddingBuffer = Buffer.from(row.embedding.buffer)

    const resultRow = db.prepare(`
      INSERT INTO resume_embeddings (source_type, source_id, upstream_id, embedding, resume_text, is_bench, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_type, source_id) DO UPDATE SET
        embedding = excluded.embedding,
        resume_text = excluded.resume_text,
        is_bench = excluded.is_bench,
        updated_at = excluded.updated_at
      RETURNING id
    `).get(
      row.sourceType, row.sourceId, row.upstreamId,
      embeddingBuffer,
      row.resumeText, row.isBench ? 1 : 0, now, now
    ) as { id: number }

    if (row.embedding.length > 0) {
      db.prepare(
        'INSERT OR REPLACE INTO vec_embeddings(rowid, embedding) VALUES (?, ?)'
      ).run(resultRow.id, embeddingBuffer)
    }

    return resultRow.id
  },

  upsertTextOnly(row: {
    sourceType: string
    sourceId: number
    upstreamId: number
    resumeText: string
    isBench: boolean
  }): number {
    const db = getDatabase()
    const now = new Date().toISOString()

    const resultRow = db.prepare(`
      INSERT INTO resume_embeddings (source_type, source_id, upstream_id, embedding, resume_text, is_bench, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
      ON CONFLICT(source_type, source_id) DO UPDATE SET
        resume_text = excluded.resume_text,
        is_bench = excluded.is_bench,
        updated_at = excluded.updated_at
      RETURNING id
    `).get(
      row.sourceType, row.sourceId, row.upstreamId,
      row.resumeText, row.isBench ? 1 : 0, now, now
    ) as { id: number }

    return resultRow.id
  },

  deleteBySource(sourceType: string, sourceId: number): void {
    const db = getDatabase()
    const existing = this.findBySource(sourceType, sourceId)
    if (existing) {
      db.prepare('DELETE FROM vec_embeddings WHERE rowid = ?').run(existing.id)
      db.prepare('DELETE FROM resume_embeddings WHERE id = ?').run(existing.id)
    }
  },

  searchSimilar(
    queryEmbedding: Float32Array,
    limit: number,
    sourceType?: string
  ): VectorSearchResult[] {
    const db = getDatabase()
    const queryBuffer = Buffer.from(queryEmbedding.buffer)

    if (sourceType) {
      return db.prepare(`
        SELECT re.id, re.source_type, re.source_id, re.upstream_id,
               re.resume_text, re.is_bench, re.created_at, re.updated_at,
               ve.distance
        FROM vec_embeddings ve
        JOIN resume_embeddings re ON re.id = ve.rowid
        WHERE ve.embedding MATCH ?
          AND k = ?
          AND re.source_type = ?
        ORDER BY ve.distance
      `).all(queryBuffer, limit * 2, sourceType)
        .slice(0, limit) as VectorSearchResult[]
    }

    return db.prepare(`
      SELECT re.id, re.source_type, re.source_id, re.upstream_id,
             re.resume_text, re.is_bench, re.created_at, re.updated_at,
             ve.distance
      FROM vec_embeddings ve
      JOIN resume_embeddings re ON re.id = ve.rowid
      WHERE ve.embedding MATCH ?
        AND k = ?
      ORDER BY ve.distance
    `).all(queryBuffer, limit) as VectorSearchResult[]
  },

  crossSimilarity(
    empIds: number[],
    posIds: number[]
  ): { empUpstreamId: number; posUpstreamId: number; similarity: number }[] {
    const db = getDatabase()

    if (empIds.length === 0 || posIds.length === 0) return []

    const empPlaceholders = empIds.map(() => '?').join(',')
    const posPlaceholders = posIds.map(() => '?').join(',')

    const empEmbeddings = db.prepare(`
      SELECT upstream_id, embedding FROM resume_embeddings
      WHERE source_type = 'employees' AND upstream_id IN (${empPlaceholders})
        AND embedding IS NOT NULL
    `).all(...empIds) as { upstream_id: number; embedding: Buffer }[]

    const posEmbeddings = db.prepare(`
      SELECT upstream_id, embedding FROM resume_embeddings
      WHERE source_type = 'positions' AND upstream_id IN (${posPlaceholders})
        AND embedding IS NOT NULL
    `).all(...posIds) as { upstream_id: number; embedding: Buffer }[]

    const results: { empUpstreamId: number; posUpstreamId: number; similarity: number }[] = []

    for (const emp of empEmbeddings) {
      const empVec = new Float32Array(emp.embedding.buffer, emp.embedding.byteOffset, emp.embedding.byteLength / 4)
      for (const pos of posEmbeddings) {
        const posVec = new Float32Array(pos.embedding.buffer, pos.embedding.byteOffset, pos.embedding.byteLength / 4)
        results.push({
          empUpstreamId: emp.upstream_id,
          posUpstreamId: pos.upstream_id,
          similarity: cosineSimilarity(empVec, posVec)
        })
      }
    }

    return results
  },
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}
