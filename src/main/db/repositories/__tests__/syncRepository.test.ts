import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA } from './testSchema'
import { syncRepository } from '../syncRepository'

let testDb: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => testDb,
}))

describe('syncRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  it('should upsert employee and find by upstream id', () => {
    const syncedAt = new Date().toISOString()

    syncRepository.upsertEmployee({
      upstream_id: 42,
      full_name: 'Alice Ruiz',
      email: 'alice@example.com',
      seniority: 'Senior',
      main_skill: 'React',
      country: 'Mexico',
      gross_monthly_salary: 8000,
      salary_currency: 'USD',
      last_account: 'Acme',
      last_account_start_date: '2024-01-01',
      rate: 55,
      has_resume: 1,
      resume_note_id: 700,
      resume_date_created: '2024-02-01',
      resume_filename: 'alice.pdf',
      is_bench: 0,
      job_title: 'Frontend Engineer',
      status: 'synced',
      status_reason: null,

      synced_at: syncedAt,
    })

    const employee = syncRepository.findEmployeeByUpstreamId(42)

    expect(employee).toBeDefined()
    expect(employee?.full_name).toBe('Alice Ruiz')
    expect(employee?.status).toBe('synced')
  })

  it('should update status', () => {
    const syncedAt = new Date().toISOString()

    syncRepository.upsertEmployee({
      upstream_id: 50,
      full_name: 'Status Test',
      email: 'status@example.com',
      seniority: 'Mid',
      main_skill: 'Node',
      country: 'Peru',
      gross_monthly_salary: null,
      salary_currency: null,
      last_account: null,
      last_account_start_date: null,
      rate: null,
      has_resume: 0,
      resume_note_id: null,
      resume_date_created: null,
      resume_filename: null,
      is_bench: 0,
      job_title: 'Engineer',
      status: 'synced',
      status_reason: null,

      synced_at: syncedAt,
    })
    const row = syncRepository.findEmployeeByUpstreamId(50)

    syncRepository.updateStatus('synced_employees', row!.id, 'processing')
    const updated = syncRepository.findEmployeeByUpstreamId(50)

    expect(updated?.status).toBe('processing')
    expect(updated?.status_reason).toBeNull()
  })

  it('should mark failed with reason', () => {
    const syncedAt = new Date().toISOString()

    syncRepository.upsertEmployee({
      upstream_id: 60,
      full_name: 'Failure Test',
      email: 'failure@example.com',
      seniority: 'Junior',
      main_skill: 'QA',
      country: 'Chile',
      gross_monthly_salary: null,
      salary_currency: null,
      last_account: null,
      last_account_start_date: null,
      rate: null,
      has_resume: 0,
      resume_note_id: null,
      resume_date_created: null,
      resume_filename: null,
      is_bench: 0,
      job_title: 'QA Engineer',
      status: 'processing',
      status_reason: null,

      synced_at: syncedAt,
    })
    const row = syncRepository.findEmployeeByUpstreamId(60)

    syncRepository.markFailed('synced_employees', row!.id, 'extract_failed', 'Upstream timeout')
    const failed = syncRepository.findEmployeeByUpstreamId(60)

    expect(failed?.status).toBe('extract_failed')
    expect(failed?.status_reason).toBe('Upstream timeout')
  })

  it('should list all employees', () => {
    const syncedAt = new Date().toISOString()

    syncRepository.upsertEmployee({
      upstream_id: 70,
      full_name: 'Zoe Last',
      email: 'zoe@example.com',
      seniority: 'Senior',
      main_skill: 'Backend',
      country: 'Argentina',
      gross_monthly_salary: null,
      salary_currency: null,
      last_account: null,
      last_account_start_date: null,
      rate: null,
      has_resume: 0,
      resume_note_id: null,
      resume_date_created: null,
      resume_filename: null,
      is_bench: 0,
      job_title: 'Developer',
      status: 'synced',
      status_reason: null,

      synced_at: syncedAt,
    })
    syncRepository.upsertEmployee({
      upstream_id: 71,
      full_name: 'Ana First',
      email: 'ana@example.com',
      seniority: 'Mid',
      main_skill: 'Fullstack',
      country: 'Mexico',
      gross_monthly_salary: null,
      salary_currency: null,
      last_account: null,
      last_account_start_date: null,
      rate: null,
      has_resume: 1,
      resume_note_id: null,
      resume_date_created: null,
      resume_filename: null,
      is_bench: 1,
      job_title: 'Engineer',
      status: 'synced',
      status_reason: null,

      synced_at: syncedAt,
    })

    const employees = syncRepository.getAllEmployees()

    expect(employees).toHaveLength(2)
    expect(employees[0]?.full_name).toBe('Ana First')
    expect(employees[1]?.full_name).toBe('Zoe Last')
  })

  it('should count by status', () => {
    const syncedAt = new Date().toISOString()

    syncRepository.upsertEmployee({
      upstream_id: 81,
      full_name: 'Synced One',
      email: 'synced1@example.com',
      seniority: 'Senior',
      main_skill: 'Java',
      country: 'Mexico',
      gross_monthly_salary: null,
      salary_currency: null,
      last_account: null,
      last_account_start_date: null,
      rate: null,
      has_resume: 0,
      resume_note_id: null,
      resume_date_created: null,
      resume_filename: null,
      is_bench: 0,
      job_title: 'Engineer',
      status: 'synced',
      status_reason: null,

      synced_at: syncedAt,
    })
    syncRepository.upsertEmployee({
      upstream_id: 82,
      full_name: 'Processing One',
      email: 'processing@example.com',
      seniority: 'Mid',
      main_skill: 'Python',
      country: 'Mexico',
      gross_monthly_salary: null,
      salary_currency: null,
      last_account: null,
      last_account_start_date: null,
      rate: null,
      has_resume: 0,
      resume_note_id: null,
      resume_date_created: null,
      resume_filename: null,
      is_bench: 0,
      job_title: 'Engineer',
      status: 'processing',
      status_reason: null,

      synced_at: syncedAt,
    })
    syncRepository.upsertEmployee({
      upstream_id: 83,
      full_name: 'Failed One',
      email: 'failed@example.com',
      seniority: 'Junior',
      main_skill: 'Go',
      country: 'Mexico',
      gross_monthly_salary: null,
      salary_currency: null,
      last_account: null,
      last_account_start_date: null,
      rate: null,
      has_resume: 0,
      resume_note_id: null,
      resume_date_created: null,
      resume_filename: null,
      is_bench: 0,
      job_title: 'Engineer',
      status: 'failed',
      status_reason: 'Error',
      failed: 1,
      synced_at: syncedAt,
    })

    const counts = syncRepository.getCountByStatus('synced_employees')

    expect(counts).toEqual({
      total: 3,
      synced: 1,
      failed: 1,
      processing: 1,
    })
  })
})
