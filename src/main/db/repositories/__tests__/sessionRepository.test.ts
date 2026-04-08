import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA } from './testSchema'
import { sessionRepository } from '../sessionRepository'

let testDb: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => testDb,
}))

describe('sessionRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  it('should create and retrieve resume session', () => {
    const now = '2026-04-03T00:00:00.000Z'
    const sessionId = sessionRepository.createResumeSession({
      name: 'Resume Session',
      source_type: 'candidate',
      candidate_upstream_id: 101,
      employee_upstream_id: null,
      current_step_key: 'processing',
      completed_steps_json: JSON.stringify(['upload']),
      stepper_context_json: JSON.stringify({ step: 1 }),
      resume_content_json: JSON.stringify({ sections: [] }),
      original_resume_text: 'Resume text',
      original_file_name: 'resume.pdf',
      original_file_type: 'application/pdf',
      processing_mode: 'single',
      refinement_mode: 'manual',
      upload_status: 'completed',
      vectorization_status: 'pending',
      version: 1,
      status: 'active',
      created_at: now,
      updated_at: now,
      completed_at: null,
      resume_embedding_id: null,
    })

    const session = sessionRepository.getResumeSession(sessionId)

    expect(session).toBeDefined()
    expect(session?.name).toBe('Resume Session')
    expect(session?.candidate_upstream_id).toBe(101)
    expect(session?.upload_status).toBe('completed')
  })

  it('should update resume session', () => {
    const now = '2026-04-03T00:00:00.000Z'
    const sessionId = sessionRepository.createResumeSession({
      name: 'Resume Update',
      source_type: 'employee',
      candidate_upstream_id: null,
      employee_upstream_id: 202,
      current_step_key: 'processing',
      completed_steps_json: null,
      stepper_context_json: null,
      resume_content_json: null,
      original_resume_text: null,
      original_file_name: null,
      original_file_type: null,
      processing_mode: 'single',
      refinement_mode: null,
      upload_status: 'pending',
      vectorization_status: 'pending',
      version: 1,
      status: 'active',
      created_at: now,
      updated_at: now,
      completed_at: null,
      resume_embedding_id: null,
    })

    sessionRepository.updateResumeSession(sessionId, {
      current_step_key: 'vectorized',
      vectorization_status: 'completed',
      status: 'completed',
      updated_at: '2026-04-03T02:00:00.000Z',
      completed_at: '2026-04-03T02:00:00.000Z',
    })
    const updated = sessionRepository.getResumeSession(sessionId)

    expect(updated?.current_step_key).toBe('vectorized')
    expect(updated?.vectorization_status).toBe('completed')
    expect(updated?.status).toBe('completed')
  })

  it('should create and retrieve transform session', () => {
    const sessionId = sessionRepository.createTransformSession({
      name: 'Transform Session',
      context_type: 'position',
      context_id: 300,
      context_name: 'Open Position',
      processing_mode: 'single',
      refinement_mode: 'manual',
      job_description: 'Transform this profile',
      job_description_source: 'manual',
      selected_position_id: '300',
      resume_content_json: JSON.stringify({ summary: 'x' }),
      wizard_state_json: JSON.stringify({ step: 2 }),
      status: 'draft',
      created_at: '2026-04-03T00:00:00.000Z',
      updated_at: '2026-04-03T00:00:00.000Z',
    })

    const session = sessionRepository.getTransformSession(sessionId)

    expect(session).toBeDefined()
    expect(session?.name).toBe('Transform Session')
    expect(session?.context_type).toBe('position')
    expect(session?.status).toBe('draft')
  })

  it('should list sessions in order', () => {
    sessionRepository.createResumeSession({
      name: 'Resume Older',
      source_type: 'candidate',
      candidate_upstream_id: 1,
      employee_upstream_id: null,
      current_step_key: 'processing',
      completed_steps_json: null,
      stepper_context_json: null,
      resume_content_json: null,
      original_resume_text: null,
      original_file_name: null,
      original_file_type: null,
      processing_mode: 'single',
      refinement_mode: null,
      upload_status: 'pending',
      vectorization_status: 'pending',
      version: 1,
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      resume_embedding_id: null,
    })
    sessionRepository.createResumeSession({
      name: 'Resume Newer',
      source_type: 'candidate',
      candidate_upstream_id: 2,
      employee_upstream_id: null,
      current_step_key: 'processing',
      completed_steps_json: null,
      stepper_context_json: null,
      resume_content_json: null,
      original_resume_text: null,
      original_file_name: null,
      original_file_type: null,
      processing_mode: 'single',
      refinement_mode: null,
      upload_status: 'pending',
      vectorization_status: 'pending',
      version: 1,
      status: 'active',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      completed_at: null,
      resume_embedding_id: null,
    })
    sessionRepository.createTransformSession({
      name: 'Transform Older',
      context_type: 'position',
      context_id: 1,
      context_name: 'One',
      processing_mode: 'single',
      refinement_mode: 'manual',
      job_description: null,
      job_description_source: null,
      selected_position_id: null,
      resume_content_json: null,
      wizard_state_json: null,
      status: 'draft',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    sessionRepository.createTransformSession({
      name: 'Transform Newer',
      context_type: 'position',
      context_id: 2,
      context_name: 'Two',
      processing_mode: 'single',
      refinement_mode: 'manual',
      job_description: null,
      job_description_source: null,
      selected_position_id: null,
      resume_content_json: null,
      wizard_state_json: null,
      status: 'draft',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    })

    const resumeSessions = sessionRepository.listResumeSessions()
    const transformSessions = sessionRepository.listTransformSessions()

    expect(resumeSessions[0]?.name).toBe('Resume Newer')
    expect(resumeSessions[1]?.name).toBe('Resume Older')
    expect(transformSessions[0]?.name).toBe('Transform Newer')
    expect(transformSessions[1]?.name).toBe('Transform Older')
  })

  it('should delete sessions', () => {
    const resumeId = sessionRepository.createResumeSession({
      name: 'Resume Delete',
      source_type: 'candidate',
      candidate_upstream_id: 999,
      employee_upstream_id: null,
      current_step_key: 'processing',
      completed_steps_json: null,
      stepper_context_json: null,
      resume_content_json: null,
      original_resume_text: null,
      original_file_name: null,
      original_file_type: null,
      processing_mode: 'single',
      refinement_mode: null,
      upload_status: 'pending',
      vectorization_status: 'pending',
      version: 1,
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      resume_embedding_id: null,
    })
    const transformId = sessionRepository.createTransformSession({
      name: 'Transform Delete',
      context_type: 'position',
      context_id: 999,
      context_name: 'Delete',
      processing_mode: 'single',
      refinement_mode: 'manual',
      job_description: null,
      job_description_source: null,
      selected_position_id: null,
      resume_content_json: null,
      wizard_state_json: null,
      status: 'draft',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    sessionRepository.deleteResumeSession(resumeId)
    sessionRepository.deleteTransformSession(transformId)

    expect(sessionRepository.getResumeSession(resumeId)).toBeUndefined()
    expect(sessionRepository.getTransformSession(transformId)).toBeUndefined()
  })
})
