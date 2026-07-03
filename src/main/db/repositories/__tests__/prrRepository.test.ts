import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prrRepository } from '../prrRepository'

let testDb: Database.Database

vi.mock('../../connection', () => ({
  getDatabase: () => testDb,
}))

vi.mock('../../../services/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

const SCHEMA = `
  CREATE TABLE synced_project_reallocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upstream_id INTEGER NOT NULL UNIQUE,
    employee TEXT NOT NULL DEFAULT '',
    account TEXT NOT NULL DEFAULT '',
    team TEXT NOT NULL DEFAULT '',
    main_skill TEXT NOT NULL DEFAULT '',
    seniority TEXT NOT NULL DEFAULT '',
    transition_status TEXT NOT NULL DEFAULT '',
    transition_sub_type TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    request_date TEXT,
    days_since_last_interview TEXT NOT NULL DEFAULT '',
    impact TEXT NOT NULL DEFAULT '',
    attrition_risk TEXT NOT NULL DEFAULT '',
    comments TEXT NOT NULL DEFAULT '',
    presentations_count INTEGER NOT NULL DEFAULT 0,
    coe_status TEXT NOT NULL DEFAULT 'Not Set',
    coe_comments TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'synced',
    status_reason TEXT,
    synced_at TEXT NOT NULL
  );

  CREATE TABLE prr_presentations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prr_id INTEGER NOT NULL,
    open_position_id INTEGER NOT NULL,
    account TEXT NOT NULL DEFAULT '',
    open_position_status TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    presented_on TEXT,
    candidate_status TEXT NOT NULL DEFAULT '',
    synced_at TEXT NOT NULL,
    UNIQUE(prr_id, open_position_id)
  );
`

function insertPrr(overrides: Partial<{ upstreamId: number; employee: string; coeStatus: string; coeComments: string; syncedAt: string }> = {}): void {
  const upstreamId = overrides.upstreamId ?? 100
  const employee = overrides.employee ?? 'John Doe'
  const coeStatus = overrides.coeStatus ?? 'Not Set'
  const coeComments = overrides.coeComments ?? '[]'
  const syncedAt = overrides.syncedAt ?? new Date().toISOString()

  testDb.prepare(`
    INSERT INTO synced_project_reallocations (
      upstream_id, employee, account, team, main_skill, seniority, transition_status, transition_sub_type,
      location, request_date, days_since_last_interview, impact, attrition_risk, comments,
      presentations_count, coe_status, coe_comments, status, status_reason, synced_at
    ) VALUES (?, ?, '', '', '', '', '', '', '', NULL, '', '', '', '', 0, ?, ?, 'synced', NULL, ?)
  `).run(upstreamId, employee, coeStatus, coeComments, syncedAt)
}

describe('prrRepository', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.exec(SCHEMA)
  })

  afterEach(() => {
    testDb.close()
  })

  it('getAll returns rows ordered by employee', () => {
    insertPrr({ upstreamId: 1, employee: 'Zoe' })
    insertPrr({ upstreamId: 2, employee: 'Ana' })

    const rows = prrRepository.getAll()

    expect(rows).toHaveLength(2)
    expect(rows[0]?.employee).toBe('Ana')
    expect(rows[1]?.employee).toBe('Zoe')
  })

  it('getByUpstreamId returns the expected row', () => {
    insertPrr({ upstreamId: 10, employee: 'Alice' })

    const row = prrRepository.getByUpstreamId(10)

    expect(row).toBeDefined()
    expect(row?.employee).toBe('Alice')
  })

  it('updateCoeStatus updates an existing record and returns true', () => {
    insertPrr({ upstreamId: 20, coeStatus: 'Not Set' })

    const updated = prrRepository.updateCoeStatus(20, 'Pending Evaluation')
    const row = prrRepository.getByUpstreamId(20)

    expect(updated).toBe(true)
    expect(row?.coe_status).toBe('Pending Evaluation')
  })

  it('updateCoeStatus returns false when record does not exist', () => {
    expect(prrRepository.updateCoeStatus(999, 'Pending Evaluation')).toBe(false)
  })

  it('addComment appends and getComments returns parsed list', () => {
    insertPrr({ upstreamId: 30 })

    const updated = prrRepository.addComment(30, ' Needs review ', ' COE Lead ')
    const comments = prrRepository.getComments(30)

    expect(updated).toHaveLength(1)
    expect(updated[0]?.text).toBe('Needs review')
    expect(updated[0]?.author).toBe('COE Lead')
    expect(comments).toHaveLength(1)
    expect(comments[0]?.text).toBe('Needs review')
  })

  it('getComments returns empty array for malformed JSON', () => {
    insertPrr({ upstreamId: 40, coeComments: 'not-json' })

    expect(prrRepository.getComments(40)).toEqual([])
  })

  it('deleteByUpstreamId removes PRR and related presentations', () => {
    insertPrr({ upstreamId: 50 })
    testDb.prepare(`
      INSERT INTO prr_presentations (
        prr_id, open_position_id, account, open_position_status, location, presented_on, candidate_status, synced_at
      ) VALUES (50, 501, '', '', '', NULL, '', ?)
    `).run(new Date().toISOString())

    const deleted = prrRepository.deleteByUpstreamId(50)
    const row = prrRepository.getByUpstreamId(50)
    const presentationCount = (testDb.prepare('SELECT COUNT(*) as c FROM prr_presentations WHERE prr_id = 50').get() as { c: number }).c

    expect(deleted).toBe(true)
    expect(row).toBeUndefined()
    expect(presentationCount).toBe(0)
  })

  it('deleteByUpstreamId returns false when record does not exist', () => {
    expect(prrRepository.deleteByUpstreamId(404)).toBe(false)
  })

  it('getSyncStatus returns totals and latest sync timestamp', () => {
    expect(prrRepository.getSyncStatus()).toEqual({ hasData: false, total: 0, lastSyncedAt: null })

    insertPrr({ upstreamId: 60, syncedAt: '2026-01-01T10:00:00.000Z' })
    insertPrr({ upstreamId: 61, syncedAt: '2026-01-02T10:00:00.000Z' })

    expect(prrRepository.getSyncStatus()).toEqual({
      hasData: true,
      total: 2,
      lastSyncedAt: '2026-01-02T10:00:00.000Z',
    })
  })

  it('markClosed sets coe_status to Closed', () => {
    insertPrr({ upstreamId: 70, coeStatus: 'Ready to Present' })

    const changed = prrRepository.markClosed(70)

    expect(changed).toBe(true)
    expect(prrRepository.getByUpstreamId(70)?.coe_status).toBe('Closed')
  })

  it('getLocalUpstreamIds returns every local upstream id', () => {
    insertPrr({ upstreamId: 81 })
    insertPrr({ upstreamId: 82 })

    expect(prrRepository.getLocalUpstreamIds().sort((a, b) => a - b)).toEqual([81, 82])
  })
})
