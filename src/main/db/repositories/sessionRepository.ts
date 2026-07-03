import { getDatabase } from '../connection'

interface ResumeSessionRow {
  id: number
  name: string
  source_type: string
  candidate_upstream_id: number | null
  employee_upstream_id: number | null
  current_step_key: string
  completed_steps_json: string | null
  stepper_context_json: string | null
  resume_content_json: string | null
  original_resume_text: string | null
  original_file_name: string | null
  original_file_type: string | null
  processing_mode: string
  refinement_mode: string | null
  upload_status: string
  vectorization_status: string
  version: number
  status: string
  created_at: string
  updated_at: string
  completed_at: string | null
  resume_embedding_id: number | null
}

interface TransformSessionRow {
  id: number
  name: string
  context_type: string
  context_id: number | null
  context_name: string
  processing_mode: string
  refinement_mode: string
  job_description: string | null
  job_description_source: string | null
  selected_position_id: string | null
  resume_content_json: string | null
  wizard_state_json: string | null
  status: string
  created_at: string
  updated_at: string
}

export const sessionRepository = {
  createResumeSession(data: Omit<ResumeSessionRow, 'id'>): number {
    const db = getDatabase()
    const result = db.prepare(`
      INSERT INTO resume_sessions (name, source_type, candidate_upstream_id, employee_upstream_id,
        current_step_key, completed_steps_json, stepper_context_json, resume_content_json,
        original_resume_text, original_file_name, original_file_type, processing_mode, refinement_mode,
        upload_status, vectorization_status, version, status, created_at, updated_at, completed_at,
        resume_embedding_id)
      VALUES (@name, @source_type, @candidate_upstream_id, @employee_upstream_id,
        @current_step_key, @completed_steps_json, @stepper_context_json, @resume_content_json,
        @original_resume_text, @original_file_name, @original_file_type, @processing_mode, @refinement_mode,
        @upload_status, @vectorization_status, @version, @status, @created_at, @updated_at, @completed_at,
        @resume_embedding_id)
    `).run(data)
    return Number(result.lastInsertRowid)
  },

  updateResumeSession(id: number, data: Partial<Omit<ResumeSessionRow, 'id'>>): void {
    const db = getDatabase()
    const fields: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }

    if (fields.length === 0) return

    if (!data.updated_at) {
      fields.push('updated_at = ?')
      values.push(new Date().toISOString())
    }

    values.push(id)
    db.prepare(`UPDATE resume_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  getResumeSession(id: number): ResumeSessionRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM resume_sessions WHERE id = ?').get(id) as ResumeSessionRow | undefined
  },

  listResumeSessions(limit = 100, offset = 0): ResumeSessionRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM resume_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as ResumeSessionRow[]
  },

  deleteResumeSession(id: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM resume_sessions WHERE id = ?').run(id)
  },

  createTransformSession(data: Omit<TransformSessionRow, 'id'>): number {
    const db = getDatabase()
    const result = db.prepare(`
      INSERT INTO transform_sessions (name, context_type, context_id, context_name,
        processing_mode, refinement_mode, job_description, job_description_source,
        selected_position_id, resume_content_json, wizard_state_json, status, created_at, updated_at)
      VALUES (@name, @context_type, @context_id, @context_name,
        @processing_mode, @refinement_mode, @job_description, @job_description_source,
        @selected_position_id, @resume_content_json, @wizard_state_json, @status, @created_at, @updated_at)
    `).run(data)
    return Number(result.lastInsertRowid)
  },

  updateTransformSession(id: number, data: Partial<Omit<TransformSessionRow, 'id'>>): void {
    const db = getDatabase()
    const fields: string[] = []
    const values: unknown[] = []

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }

    if (fields.length === 0) return

    if (!data.updated_at) {
      fields.push('updated_at = ?')
      values.push(new Date().toISOString())
    }

    values.push(id)
    db.prepare(`UPDATE transform_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  getTransformSession(id: number): TransformSessionRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM transform_sessions WHERE id = ?').get(id) as TransformSessionRow | undefined
  },

  getTransformSessionParsed(id: number): (Omit<TransformSessionRow, 'resume_content_json' | 'wizard_state_json'> & {
    resumeContent: unknown
    wizardState: unknown
  }) | undefined {
    const row = this.getTransformSession(id)
    if (!row) return undefined
    return {
      ...row,
      resumeContent: row.resume_content_json ? JSON.parse(row.resume_content_json) : null,
      wizardState: row.wizard_state_json ? JSON.parse(row.wizard_state_json) : null,
    }
  },

  listTransformSessions(limit = 100, offset = 0): TransformSessionRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM transform_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as TransformSessionRow[]
  },

  deleteTransformSession(id: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM transform_sessions WHERE id = ?').run(id)
  },
}
