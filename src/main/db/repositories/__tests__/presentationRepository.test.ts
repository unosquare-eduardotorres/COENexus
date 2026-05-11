import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

let db: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => db,
}))

import { presentationRepository } from '../presentationRepository'

const SCHEMA = `
CREATE TABLE presentation_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'manual',
  intro_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  open_position_id INTEGER,
  position_title TEXT,
  account_name TEXT,
  position_upstream_id INTEGER,
  job_description TEXT,
  generated_html TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE presentation_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES presentation_sessions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT '',
  upstream_id INTEGER NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  main_skill TEXT NOT NULL DEFAULT '',
  seniority TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  years_of_experience TEXT,
  availability TEXT,
  recommended_rate TEXT,
  tech_stack_json TEXT,
  professional_summary TEXT,
  domain_experience TEXT,
  resume_format_status TEXT,
  transform_session_id INTEGER,
  individual_intro_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(session_id, source_type, upstream_id)
);
`

function makeSession(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString()
  return {
    name: 'Test Session',
    mode: 'manual',
    intro_text: null,
    status: 'draft',
    open_position_id: null,
    position_title: 'Developer',
    account_name: 'Acme',
    position_upstream_id: null,
    job_description: null,
    generated_html: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

function makeEntry(sessionId: number, overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString()
  return {
    session_id: sessionId,
    source_type: 'employee',
    upstream_id: 100,
    full_name: 'John Doe',
    main_skill: 'React',
    seniority: 'Senior',
    country: 'US',
    years_of_experience: '5',
    availability: 'Immediate',
    recommended_rate: null,
    tech_stack_json: null,
    professional_summary: null,
    domain_experience: null,
    resume_format_status: null,
    transform_session_id: null,
    individual_intro_text: null,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

describe('presentationRepository', () => {
  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(SCHEMA)
  })

  it('should createSession and return ID', () => {
    const id = presentationRepository.createSession(makeSession())
    expect(id).toBe(1)
  })

  it('should getSession by ID', () => {
    const id = presentationRepository.createSession(makeSession({ name: 'My Session' }))
    const session = presentationRepository.getSession(id)

    expect(session).toBeDefined()
    expect(session!.name).toBe('My Session')
    expect(session!.mode).toBe('manual')
  })

  it('should updateSession and auto-set updated_at', () => {
    const id = presentationRepository.createSession(makeSession({ name: 'Original' }))
    presentationRepository.updateSession(id, { name: 'Updated' })

    const session = presentationRepository.getSession(id)
    expect(session!.name).toBe('Updated')
  })

  it('should listSessions with limit/offset ordered by created_at DESC', () => {
    presentationRepository.createSession(makeSession({ name: 'A', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }))
    presentationRepository.createSession(makeSession({ name: 'B', created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' }))
    presentationRepository.createSession(makeSession({ name: 'C', created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z' }))

    const all = presentationRepository.listSessions()
    expect(all).toHaveLength(3)
    expect(all[0].name).toBe('C')

    const limited = presentationRepository.listSessions(2, 0)
    expect(limited).toHaveLength(2)

    const offset = presentationRepository.listSessions(100, 2)
    expect(offset).toHaveLength(1)
    expect(offset[0].name).toBe('A')
  })

  it('should deleteSession', () => {
    const id = presentationRepository.createSession(makeSession())
    presentationRepository.deleteSession(id)

    expect(presentationRepository.getSession(id)).toBeUndefined()
  })

  it('should createEntry linked to session', () => {
    const sessionId = presentationRepository.createSession(makeSession())
    const entryId = presentationRepository.createEntry(makeEntry(sessionId))

    expect(entryId).toBe(1)
    const entry = presentationRepository.getEntry(entryId)
    expect(entry!.session_id).toBe(sessionId)
    expect(entry!.full_name).toBe('John Doe')
  })

  it('should listEntriesBySession ordered by sort_order', () => {
    const sessionId = presentationRepository.createSession(makeSession())
    presentationRepository.createEntry(makeEntry(sessionId, { upstream_id: 1, sort_order: 2, full_name: 'Second' }))
    presentationRepository.createEntry(makeEntry(sessionId, { upstream_id: 2, sort_order: 1, full_name: 'First' }))

    const entries = presentationRepository.listEntriesBySession(sessionId)
    expect(entries).toHaveLength(2)
    expect(entries[0].full_name).toBe('First')
    expect(entries[1].full_name).toBe('Second')
  })

  it('should deleteEntriesBySession', () => {
    const sessionId = presentationRepository.createSession(makeSession())
    presentationRepository.createEntry(makeEntry(sessionId, { upstream_id: 1 }))
    presentationRepository.createEntry(makeEntry(sessionId, { upstream_id: 2 }))

    presentationRepository.deleteEntriesBySession(sessionId)

    const entries = presentationRepository.listEntriesBySession(sessionId)
    expect(entries).toHaveLength(0)
  })
})
