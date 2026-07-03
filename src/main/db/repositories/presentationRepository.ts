import { getDatabase } from '../connection'

interface PresentationSessionRow {
  id: number
  name: string
  mode: string
  intro_text: string | null
  status: string
  open_position_id: number | null
  position_title: string | null
  account_name: string | null
  position_upstream_id: number | null
  job_description: string | null
  generated_html: string | null
  created_at: string
  updated_at: string
}

interface PresentationEntryRow {
  id: number
  session_id: number
  source_type: string
  upstream_id: number
  full_name: string
  main_skill: string
  seniority: string
  country: string
  years_of_experience: string | null
  availability: string | null
  recommended_rate: string | null
  tech_stack_json: string | null
  professional_summary: string | null
  domain_experience: string | null
  resume_format_status: string | null
  transform_session_id: number | null
  individual_intro_text: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export const presentationRepository = {
  createSession(data: Omit<PresentationSessionRow, 'id'>): number {
    const db = getDatabase()
    const result = db.prepare(`
      INSERT INTO presentation_sessions (name, mode, intro_text, status, open_position_id, position_title,
        account_name, position_upstream_id, job_description, generated_html, created_at, updated_at)
      VALUES (@name, @mode, @intro_text, @status, @open_position_id, @position_title,
        @account_name, @position_upstream_id, @job_description, @generated_html, @created_at, @updated_at)
    `).run(data)
    return Number(result.lastInsertRowid)
  },

  updateSession(id: number, data: Partial<Omit<PresentationSessionRow, 'id'>>): void {
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
    db.prepare(`UPDATE presentation_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  getSession(id: number): PresentationSessionRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM presentation_sessions WHERE id = ?').get(id) as PresentationSessionRow | undefined
  },

  listSessions(limit = 100, offset = 0): PresentationSessionRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM presentation_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as PresentationSessionRow[]
  },

  deleteSession(id: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM presentation_sessions WHERE id = ?').run(id)
  },

  createEntry(data: Omit<PresentationEntryRow, 'id'>): number {
    const db = getDatabase()
    const result = db.prepare(`
      INSERT INTO presentation_entries (session_id, source_type, upstream_id, full_name, main_skill, seniority,
        country, years_of_experience, availability, recommended_rate, tech_stack_json, professional_summary,
        domain_experience, resume_format_status, transform_session_id, individual_intro_text, sort_order,
        created_at, updated_at)
      VALUES (@session_id, @source_type, @upstream_id, @full_name, @main_skill, @seniority,
        @country, @years_of_experience, @availability, @recommended_rate, @tech_stack_json, @professional_summary,
        @domain_experience, @resume_format_status, @transform_session_id, @individual_intro_text, @sort_order,
        @created_at, @updated_at)
    `).run(data)
    return Number(result.lastInsertRowid)
  },

  updateEntry(id: number, data: Partial<Omit<PresentationEntryRow, 'id'>>): void {
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
    db.prepare(`UPDATE presentation_entries SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  getEntry(id: number): PresentationEntryRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM presentation_entries WHERE id = ?').get(id) as PresentationEntryRow | undefined
  },

  listEntriesBySession(sessionId: number): PresentationEntryRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM presentation_entries WHERE session_id = ? ORDER BY sort_order ASC, created_at ASC').all(sessionId) as PresentationEntryRow[]
  },

  deleteEntry(id: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM presentation_entries WHERE id = ?').run(id)
  },

  deleteEntriesBySession(sessionId: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM presentation_entries WHERE session_id = ?').run(sessionId)
  },
}
