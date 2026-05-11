import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import { reportRepository } from '../reportRepository'
import { jobRepository } from '../jobRepository'

describe('reportRepository', () => {
  let jobId: string

  beforeEach(() => {
    db = createAgentsDb()
    const job = jobRepository.create({ agent_type: 'scout9' })
    jobId = job.id
  })

  it('should createReport and return row', () => {
    const report = reportRepository.createReport({
      job_id: jobId,
      report_title: 'Weekly Report',
      report_markdown: '# Report',
    })

    expect(report.id).toBeDefined()
    expect(report.report_title).toBe('Weekly Report')
    expect(report.status).toBe('draft')
  })

  it('should listReports ordered by created_at DESC', () => {
    reportRepository.createReport({ job_id: jobId, report_title: 'A' })
    reportRepository.createReport({ job_id: jobId, report_title: 'B' })

    const reports = reportRepository.listReports()
    expect(reports).toHaveLength(2)
  })

  it('should createCandidate linked to report', () => {
    const report = reportRepository.createReport({ job_id: jobId, report_title: 'R' })
    const candidate = reportRepository.createCandidate(report.id, {
      candidate_type: 'issue',
      title: 'Missing skill',
      details: 'React not found',
    })

    expect(candidate.id).toBeDefined()
    expect(candidate.report_id).toBe(report.id)
    expect(candidate.candidate_type).toBe('issue')
  })

  it('should createWithCandidates in a single transaction', () => {
    const result = reportRepository.createWithCandidates({
      report: { job_id: jobId, report_title: 'Full Report' },
      candidates: [
        { candidate_type: 'insight', title: 'Key finding' },
        { candidate_type: 'action', title: 'Follow up' },
      ],
    })

    expect(result.report.report_title).toBe('Full Report')
    expect(result.candidates).toHaveLength(2)
    expect(result.candidates[0].report_id).toBe(result.report.id)
  })

  it('should updateReport fields', () => {
    const report = reportRepository.createReport({ job_id: jobId, report_title: 'Old' })
    const updated = reportRepository.updateReport(report.id, { report_title: 'New', status: 'published' })

    expect(updated).toBe(true)
    const fetched = reportRepository.getReportById(report.id)
    expect(fetched!.report_title).toBe('New')
    expect(fetched!.status).toBe('published')
  })

  it('should deleteReport', () => {
    const report = reportRepository.createReport({ job_id: jobId, report_title: 'ToDelete' })
    expect(reportRepository.deleteReport(report.id)).toBe(true)
    expect(reportRepository.getReportById(report.id)).toBeUndefined()
  })
})
