import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA } from './testSchema'
import { matchRepository } from '../matchRepository'

let testDb: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => testDb,
}))

describe('matchRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  it('should create and retrieve session', () => {
    const createdAt = new Date().toISOString()

    const sessionId = matchRepository.createSession({
      name: 'Session A',
      match_flow_type: 'match',
      data_source: 'employees',
      top_n: 5,
      search_mode: 'opus',
      job_description: 'Build frontend app',
      jd_source: 'manual',
      constraints_json: JSON.stringify({ country: 'MX' }),
      pipeline_stats_json: null,
      pipeline_stages_json: null,
      results_json: null,
      status: 'running',
      created_at: createdAt,
      completed_at: null,
    })

    const session = matchRepository.getSession(sessionId)

    expect(session).toBeDefined()
    expect(session?.name).toBe('Session A')
    expect(session?.top_n).toBe(5)
  })

  it('should update session fields', () => {
    const createdAt = new Date().toISOString()
    const sessionId = matchRepository.createSession({
      name: 'Session B',
      match_flow_type: 'match',
      data_source: 'candidates',
      top_n: 10,
      search_mode: 'opus',
      job_description: 'Backend role',
      jd_source: 'manual',
      constraints_json: null,
      pipeline_stats_json: null,
      pipeline_stages_json: null,
      results_json: null,
      status: 'running',
      created_at: createdAt,
      completed_at: null,
    })

    matchRepository.updateSession(sessionId, {
      status: 'completed',
      results_json: JSON.stringify([{ candidateId: 1 }]),
      completed_at: '2026-01-01T00:00:00.000Z',
    })
    const updated = matchRepository.getSession(sessionId)

    expect(updated?.status).toBe('completed')
    expect(updated?.results_json).toContain('candidateId')
    expect(updated?.completed_at).toBe('2026-01-01T00:00:00.000Z')
  })

  it('should list sessions in order', () => {
    matchRepository.createSession({
      name: 'Older',
      match_flow_type: 'match',
      data_source: 'employees',
      top_n: 5,
      search_mode: 'opus',
      job_description: 'Older JD',
      jd_source: 'manual',
      constraints_json: null,
      pipeline_stats_json: null,
      pipeline_stages_json: null,
      results_json: null,
      status: 'running',
      created_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
    })
    matchRepository.createSession({
      name: 'Newer',
      match_flow_type: 'match',
      data_source: 'employees',
      top_n: 5,
      search_mode: 'opus',
      job_description: 'Newer JD',
      jd_source: 'manual',
      constraints_json: null,
      pipeline_stats_json: null,
      pipeline_stages_json: null,
      results_json: null,
      status: 'running',
      created_at: '2026-01-02T00:00:00.000Z',
      completed_at: null,
    })

    const sessions = matchRepository.listSessions()

    expect(sessions).toHaveLength(2)
    expect(sessions[0]?.name).toBe('Newer')
    expect(sessions[1]?.name).toBe('Older')
  })

  it('should delete session', () => {
    const sessionId = matchRepository.createSession({
      name: 'To Delete',
      match_flow_type: 'match',
      data_source: 'employees',
      top_n: 10,
      search_mode: 'opus',
      job_description: 'Delete me',
      jd_source: 'manual',
      constraints_json: null,
      pipeline_stats_json: null,
      pipeline_stages_json: null,
      results_json: null,
      status: 'running',
      created_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
    })

    matchRepository.deleteSession(sessionId)
    const session = matchRepository.getSession(sessionId)

    expect(session).toBeUndefined()
  })

  it('should upsert open position candidate', () => {
    matchRepository.upsertOpenPositionCandidate({
      open_position_id: 10,
      candidate_requisition_id: 100,
      candidate_id: 1000,
      candidate_name: 'Candidate One',
      main_skill: 'React',
      is_employee: 1,
      candidate_status: 'Shortlisted',
      rate: 45,
      start_date: '2026-04-01',
      synced_at: '2026-04-01T00:00:00.000Z',
    })
    matchRepository.upsertOpenPositionCandidate({
      open_position_id: 10,
      candidate_requisition_id: 100,
      candidate_id: 1001,
      candidate_name: 'Candidate One Updated',
      main_skill: 'Node',
      is_employee: 0,
      candidate_status: 'Interview',
      rate: 50,
      start_date: '2026-04-05',
      synced_at: '2026-04-02T00:00:00.000Z',
    })

    const candidates = matchRepository.getOpenPositionCandidates(10)

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.candidate_id).toBe(1001)
    expect(candidates[0]?.candidate_name).toBe('Candidate One Updated')
    expect(candidates[0]?.main_skill).toBe('Node')
  })
})
