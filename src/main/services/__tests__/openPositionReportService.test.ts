import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../../db/repositories/syncRepository', () => ({
  syncRepository: {
    getActiveOpenPositions: vi.fn().mockReturnValue([]),
    getDiscussionsByPositionIds: vi.fn().mockReturnValue(new Map()),
    getOpenPositionSyncStatus: vi.fn().mockReturnValue({ total: 0, lastSyncedAt: null }),
    getOpenPositionByUpstreamId: vi.fn().mockReturnValue(null),
    getDiscussionsByPositionId: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('../../db/repositories/matchRepository', () => ({
  matchRepository: {
    getOpenPositionCandidates: vi.fn().mockReturnValue([]),
  },
}))

import { openPositionReportService } from '../openPositionReportService'
import { syncRepository } from '../../db/repositories/syncRepository'
import { matchRepository } from '../../db/repositories/matchRepository'

const baseThresholds = {
  'stalled-position': 14,
  'no-active-candidates': 7,
  'idle-cgx': 10,
  'idle-client': 10,
  'idle-customer-interview': 10,
  'draft-positions': 14,
}

function makePosition(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    upstream_id: 100,
    account: 'Acme',
    coe: 'COE-A',
    practice: 'Engineering',
    stakeholder: 'John',
    main_skill: 'React',
    countries: 'Mexico',
    seniorities: 'Senior',
    available_range: '',
    account_overview: '',
    job_description: 'JD text',
    job_title: 'Engineer',
    position_status: 'Active',
    aging: 30,
    created: '2024-01-01',
    ready_date: null,
    last_modification: null,
    sourcing: '',
    replacement: 0,
    vertical_industry: '',
    in_office: 0,
    csu: '',
    cs: '',
    closed_date: null,
    closed_reason: null,
    is_ready: 0,
    is_promotion: 0,
    maximum_rate: null,
    minimum_rate: null,
    additional_skills: '[]',
    created_with_assignments_tool: null,
    candidates_presented: 0,
    last_discussion_date: null,
    status: 'synced',
    status_reason: null,
    failed: 0,
    synced_at: '2024-01-01',
    ...overrides,
  }
}

describe('openPositionReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('evaluate', () => {
    it('should return empty results when no positions', () => {
      vi.mocked(syncRepository.getActiveOpenPositions).mockReturnValue([])

      const result = openPositionReportService.evaluate(baseThresholds)
      expect(result.results).toEqual([])
      expect(result.totalPositions).toBe(0)
    })

    it('should flag stalled positions based on aging', () => {
      const position = makePosition({ aging: 30, last_modification: '2024-01-01' })
      vi.mocked(syncRepository.getActiveOpenPositions).mockReturnValue([position] as ReturnType<typeof syncRepository.getActiveOpenPositions>)
      vi.mocked(syncRepository.getDiscussionsByPositionIds).mockReturnValue(new Map())

      const result = openPositionReportService.evaluate(baseThresholds)
      expect(result.results[0].matchingCriteria).toContain('stalled-position')
    })

    it('should flag positions with no active candidates', () => {
      const position = makePosition({ aging: 30, created: '2024-01-01' })
      vi.mocked(syncRepository.getActiveOpenPositions).mockReturnValue([position] as ReturnType<typeof syncRepository.getActiveOpenPositions>)
      vi.mocked(syncRepository.getDiscussionsByPositionIds).mockReturnValue(new Map())
      vi.mocked(matchRepository.getOpenPositionCandidates).mockReturnValue([])

      const result = openPositionReportService.evaluate(baseThresholds)
      expect(result.results[0].matchingCriteria).toContain('no-active-candidates')
    })

    it('should sort results by aging descending', () => {
      const p1 = makePosition({ upstream_id: 1, aging: 10 })
      const p2 = makePosition({ upstream_id: 2, aging: 50 })
      vi.mocked(syncRepository.getActiveOpenPositions).mockReturnValue([p1, p2] as ReturnType<typeof syncRepository.getActiveOpenPositions>)
      vi.mocked(syncRepository.getDiscussionsByPositionIds).mockReturnValue(new Map())

      const result = openPositionReportService.evaluate(baseThresholds)
      expect(result.results[0].position.aging).toBe(50)
      expect(result.results[1].position.aging).toBe(10)
    })
  })

  describe('getPositionDetail', () => {
    it('should return null when position not found', () => {
      vi.mocked(syncRepository.getOpenPositionByUpstreamId).mockReturnValue(null as unknown as ReturnType<typeof syncRepository.getOpenPositionByUpstreamId>)
      expect(openPositionReportService.getPositionDetail(999)).toBeNull()
    })

    it('should return position with candidates and discussions', () => {
      vi.mocked(syncRepository.getOpenPositionByUpstreamId).mockReturnValue(makePosition() as ReturnType<typeof syncRepository.getOpenPositionByUpstreamId>)
      vi.mocked(matchRepository.getOpenPositionCandidates).mockReturnValue([
        {
          candidate_requisition_id: 1, candidate_id: 100, candidate_name: 'Alice',
          main_skill: 'React', is_employee: 0, candidate_status: 'Presented',
          rate: 50, start_date: '2024-03-01', rejection_feedback: null,
          rejection_comments: '', rejection_action_date: null,
        } as ReturnType<typeof matchRepository.getOpenPositionCandidates>[0],
      ])
      vi.mocked(syncRepository.getDiscussionsByPositionId).mockReturnValue([])

      const result = openPositionReportService.getPositionDetail(100)
      expect(result?.candidates).toHaveLength(1)
      expect(result?.candidates[0].candidateName).toBe('Alice')
      expect(result?.candidates[0].isEmployee).toBe(false)
    })
  })

  describe('getSyncStatus', () => {
    it('should delegate to syncRepository', () => {
      vi.mocked(syncRepository.getOpenPositionSyncStatus).mockReturnValue({ total: 50, lastSyncedAt: '2024-06-01' })
      expect(openPositionReportService.getSyncStatus()).toEqual({ total: 50, lastSyncedAt: '2024-06-01' })
    })
  })

  describe('generateCsv', () => {
    it('should generate CSV with BOM prefix and CRLF line endings', () => {
      const position = makePosition()
      const csv = openPositionReportService.generateCsv([
        { position, matchingCriteria: ['stalled-position'], actors: ['Stakeholder'] } as Parameters<typeof openPositionReportService.generateCsv>[0][0],
      ])

      expect(csv.charCodeAt(0)).toBe(0xFEFF)

      const content = csv.slice(1)
      const lines = content.split('\r\n')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('Account')
      expect(lines[1]).toContain('Acme')
    })

    it('should strip newlines from cell values', () => {
      const position = makePosition({ account: 'Acme\nCorp', stakeholder: 'John\r\nDoe' })
      const csv = openPositionReportService.generateCsv([
        { position, matchingCriteria: ['stalled-position'], actors: ['Stakeholder'] } as Parameters<typeof openPositionReportService.generateCsv>[0][0],
      ])

      expect(csv).not.toMatch(/(?<!")\n(?!")/)
      expect(csv).toContain('Acme Corp')
      expect(csv).toContain('John Doe')
    })
  })
})
