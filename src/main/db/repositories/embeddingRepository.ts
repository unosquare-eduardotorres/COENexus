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
  extracted_skills_json: string | null
  skills_extracted_at: string | null
  skills_extractor_model: string | null
}

export interface ResumeSkills {
  primary_tech_stack: string[]
  secondary_tech_stack: string[]
  roles: string[]
  domains: string[]
  years_experience: number | null
  seniority_signals: string[]
  certifications: string[]
  languages: string[]
  summary: string
}

export type { EmbeddingRow }

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
    const embeddingBuffer = Buffer.from(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength)

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
    ) as { id: number | bigint } | undefined

    if (!resultRow) {
      throw new Error(`Failed to upsert embedding for ${row.sourceType}/${row.sourceId}: no row returned`)
    }

    const embeddingId = Number(resultRow.id)

    if (!Number.isInteger(embeddingId) || embeddingId <= 0) {
      throw new Error(`Invalid embedding id ${resultRow.id} for ${row.sourceType}/${row.sourceId}`)
    }

    if (row.embedding.length > 0) {
      const bigId = BigInt(embeddingId)
      try {
        db.prepare('DELETE FROM vec_embeddings WHERE rowid = ?').run(bigId)
      } catch {
        // vec0 DELETE may fail if rowid doesn't exist — safe to ignore
      }
      try {
        db.prepare('INSERT INTO vec_embeddings(rowid, embedding) VALUES (?, ?)').run(bigId, embeddingBuffer)
      } catch (insertErr) {
        const isUniqueConstraint = insertErr instanceof Error && insertErr.message.includes('UNIQUE constraint failed')
        if (isUniqueConstraint) {
          try {
            db.prepare('DELETE FROM vec_embeddings WHERE rowid = ?').run(bigId)
            db.prepare('INSERT INTO vec_embeddings(rowid, embedding) VALUES (?, ?)').run(bigId, embeddingBuffer)
          } catch (retryErr) {
            db.prepare('UPDATE resume_embeddings SET embedding = NULL WHERE id = ?').run(embeddingId)
            throw retryErr
          }
        } else {
          db.prepare('UPDATE resume_embeddings SET embedding = NULL WHERE id = ?').run(embeddingId)
          throw insertErr
        }
      }
    }

    return embeddingId
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
      db.prepare('DELETE FROM vec_embeddings WHERE rowid = ?').run(BigInt(existing.id))
      db.prepare('DELETE FROM resume_embeddings WHERE id = ?').run(existing.id)
    }
  },

  searchSimilar(
    queryEmbedding: Float32Array,
    limit: number,
    sourceType?: string,
    sourceTypes?: string[]
  ): VectorSearchResult[] {
    const db = getDatabase()
    const queryBuffer = Buffer.from(queryEmbedding.buffer, queryEmbedding.byteOffset, queryEmbedding.byteLength)

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

    if (sourceTypes && sourceTypes.length > 0) {
      const placeholders = sourceTypes.map(() => '?').join(',')
      return db.prepare(`
        SELECT re.id, re.source_type, re.source_id, re.upstream_id,
               re.resume_text, re.is_bench, re.created_at, re.updated_at,
               ve.distance
        FROM vec_embeddings ve
        JOIN resume_embeddings re ON re.id = ve.rowid
        WHERE ve.embedding MATCH ?
          AND k = ?
          AND re.source_type IN (${placeholders})
        ORDER BY ve.distance
      `).all(queryBuffer, limit * 2, ...sourceTypes)
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

  findNeedingSkillExtraction(sourceType?: string, limit = 100): EmbeddingRow[] {
    const db = getDatabase()
    if (sourceType) {
      return db.prepare(`
        SELECT * FROM resume_embeddings
        WHERE resume_text IS NOT NULL
          AND extracted_skills_json IS NULL
          AND source_type = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(sourceType, limit) as EmbeddingRow[]
    }
    return db.prepare(`
      SELECT * FROM resume_embeddings
      WHERE resume_text IS NOT NULL
        AND extracted_skills_json IS NULL
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(limit) as EmbeddingRow[]
  },

  updateExtractedSkills(id: number, skillsJson: string, model: string): void {
    const db = getDatabase()
    db.prepare(`
      UPDATE resume_embeddings
      SET extracted_skills_json = ?, skills_extracted_at = ?, skills_extractor_model = ?
      WHERE id = ?
    `).run(skillsJson, new Date().toISOString(), model, id)
  },

  getSkillsByUpstreamId(sourceType: string, upstreamId: number): ResumeSkills | null {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT extracted_skills_json FROM resume_embeddings
      WHERE source_type = ? AND upstream_id = ? AND extracted_skills_json IS NOT NULL
      ORDER BY skills_extracted_at DESC
      LIMIT 1
    `).get(sourceType, upstreamId) as { extracted_skills_json: string } | undefined
    if (!row) return null
    try {
      return JSON.parse(row.extracted_skills_json) as ResumeSkills
    } catch {
      return null
    }
  },

  getSkillsWithFallback(upstreamId: number, preferredSourceType: 'employees' | 'candidates'): { skills: ResumeSkills; source: string } | null {
    const fallbackOrder = [
      'resume-session',
      preferredSourceType,
      preferredSourceType === 'employees' ? 'candidates' : 'employees',
    ]
    for (const st of fallbackOrder) {
      const skills = this.getSkillsByUpstreamId(st, upstreamId)
      if (skills) return { skills, source: st }
    }
    return null
  },

  getSkillsBatchByUpstreamIds(upstreamIds: number[]): Map<number, { skills: ResumeSkills; source: string }> {
    if (upstreamIds.length === 0) return new Map()
    const db = getDatabase()
    const placeholders = upstreamIds.map(() => '?').join(',')
    const rows = db.prepare(`
      SELECT source_type, upstream_id, extracted_skills_json, skills_extracted_at
      FROM resume_embeddings
      WHERE extracted_skills_json IS NOT NULL
        AND upstream_id IN (${placeholders})
      ORDER BY
        CASE source_type
          WHEN 'resume-session' THEN 0
          WHEN 'employees' THEN 1
          WHEN 'candidates' THEN 2
          ELSE 3
        END,
        skills_extracted_at DESC
    `).all(...upstreamIds) as { source_type: string; upstream_id: number; extracted_skills_json: string }[]

    const result = new Map<number, { skills: ResumeSkills; source: string }>()
    for (const row of rows) {
      if (result.has(row.upstream_id)) continue
      try {
        const skills = JSON.parse(row.extracted_skills_json) as ResumeSkills
        result.set(row.upstream_id, { skills, source: row.source_type })
      } catch { /* skip malformed */ }
    }
    return result
  },

  countExtractedSkills(): { total: number; extracted: number; pending: number } {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN extracted_skills_json IS NOT NULL THEN 1 ELSE 0 END) as extracted,
        SUM(CASE WHEN resume_text IS NOT NULL AND extracted_skills_json IS NULL THEN 1 ELSE 0 END) as pending
      FROM resume_embeddings
      WHERE resume_text IS NOT NULL
    `).get() as { total: number; extracted: number; pending: number }
    return row
  },

  getEmbeddingByUpstreamId(
    sourceType: string,
    upstreamId: number
  ): Buffer | null {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT embedding FROM resume_embeddings
      WHERE source_type = ? AND upstream_id = ? AND embedding IS NOT NULL
      LIMIT 1
    `).get(sourceType, upstreamId) as { embedding: Buffer } | undefined
    return row?.embedding ?? null
  },

  searchPositionsBySimilarity(
    personEmbedding: Float32Array,
    limit: number
  ): VectorSearchResult[] {
    const db = getDatabase()
    const queryBuffer = Buffer.from(
      personEmbedding.buffer, personEmbedding.byteOffset, personEmbedding.byteLength
    )
    return db.prepare(`
      SELECT re.id, re.source_type, re.source_id, re.upstream_id,
             re.resume_text, re.is_bench, re.created_at, re.updated_at,
             ve.distance
      FROM vec_embeddings ve
      JOIN resume_embeddings re ON re.id = ve.rowid
      WHERE ve.embedding MATCH ?
        AND k = ?
        AND re.source_type = 'positions'
      ORDER BY ve.distance
    `).all(queryBuffer, limit * 2).slice(0, limit) as VectorSearchResult[]
  },

  crossSimilarity(
    empIds: number[],
    posIds: number[],
    personSourceType: string = 'employees'
  ): { empUpstreamId: number; posUpstreamId: number; similarity: number }[] {
    const db = getDatabase()

    if (empIds.length === 0 || posIds.length === 0) return []

    const empPlaceholders = empIds.map(() => '?').join(',')
    const posPlaceholders = posIds.map(() => '?').join(',')

    const empEmbeddings = db.prepare(`
      SELECT upstream_id, embedding FROM resume_embeddings
      WHERE source_type = ? AND upstream_id IN (${empPlaceholders})
        AND embedding IS NOT NULL
    `).all(personSourceType, ...empIds) as { upstream_id: number; embedding: Buffer }[]

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
