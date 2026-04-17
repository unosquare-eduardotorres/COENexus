import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

let nexusDb: Database.Database
let agentsDb: Database.Database

vi.mock('../../db/connection', () => ({
  getDatabase: () => nexusDb,
}))

vi.mock('../../db/agents/agentsConnection', () => ({
  getAgentsDatabase: () => agentsDb,
}))

import { braniacDataAggregator } from '../braniacDataAggregator'

function setupNexusDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE synced_open_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      upstream_id INTEGER NOT NULL,
      account TEXT NOT NULL DEFAULT '',
      stakeholder TEXT NOT NULL DEFAULT '',
      main_skill TEXT NOT NULL DEFAULT '',
      countries TEXT NOT NULL DEFAULT '',
      seniorities TEXT NOT NULL DEFAULT '',
      job_title TEXT NOT NULL DEFAULT '',
      position_status TEXT NOT NULL DEFAULT 'Active',
      aging INTEGER NOT NULL DEFAULT 0,
      maximum_rate REAL,
      minimum_rate REAL,
      closed_reason TEXT
    );

    CREATE TABLE open_position_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      open_position_id INTEGER NOT NULL,
      candidate_requisition_id INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      candidate_name TEXT NOT NULL DEFAULT '',
      main_skill TEXT NOT NULL DEFAULT '',
      is_employee INTEGER NOT NULL DEFAULT 0,
      candidate_status TEXT NOT NULL DEFAULT '',
      rate REAL NOT NULL DEFAULT 0,
      rejection_feedback TEXT NOT NULL DEFAULT '[]',
      rejection_comments TEXT NOT NULL DEFAULT '',
      rejection_action_date TEXT,
      UNIQUE(open_position_id, candidate_requisition_id)
    );

    CREATE TABLE feedback_catalog (
      id INTEGER PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

function setupAgentsDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE salary_bands (
      id TEXT PRIMARY KEY,
      country_code TEXT NOT NULL,
      job_family_group TEXT NOT NULL DEFAULT 'engineering',
      band TEXT NOT NULL,
      level INTEGER NOT NULL,
      min_monthly REAL NOT NULL,
      max_monthly REAL NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `)
}

describe('BraniacDataAggregator', () => {
  beforeEach(() => {
    nexusDb = new Database(':memory:')
    agentsDb = new Database(':memory:')
    setupNexusDb(nexusDb)
    setupAgentsDb(agentsDb)
  })

  describe('aggregateForAccount', () => {
    it('should return empty data for unknown account', () => {
      const result = braniacDataAggregator.aggregateForAccount('UnknownCo')
      expect(result.account).toBe('UnknownCo')
      expect(result.positions).toHaveLength(0)
      expect(result.dataPointsCount).toBe(0)
    })

    it('should aggregate positions and candidates for an account', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US,MX', 'Senior', 'Frontend Dev', 15)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate)
        VALUES (1, 100, 200, 'Alice', 'React', 'Presented', 85)
      `).run()

      const result = braniacDataAggregator.aggregateForAccount('Acme')

      expect(result.positions).toHaveLength(1)
      expect(result.positions[0].stakeholder).toBe('JSmith')
      expect(result.positions[0].candidates).toHaveLength(1)
      expect(result.positions[0].candidates[0].candidateName).toBe('Alice')
      expect(result.dataPointsCount).toBe(1)
    })

    it('should degrade gracefully when feedback_catalog is empty', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate, rejection_feedback)
        VALUES (1, 100, 200, 'Bob', 'Node', 'Rejected', 90, '[1, 2]')
      `).run()

      const result = braniacDataAggregator.aggregateForAccount('Acme')

      expect(result.dataCompleteness.hasFeedbackCatalog).toBe(false)
      expect(result.positions[0].candidates[0].rejectionFeedback).toEqual(['feedback_id:1', 'feedback_id:2'])
    })

    it('should resolve feedback labels when catalog is populated', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate, rejection_feedback)
        VALUES (1, 100, 200, 'Carol', 'Java', 'Rejected', 70, '[1]')
      `).run()

      nexusDb.prepare("INSERT INTO feedback_catalog (id, label) VALUES (1, 'Too expensive')").run()

      const result = braniacDataAggregator.aggregateForAccount('Acme')

      expect(result.dataCompleteness.hasFeedbackCatalog).toBe(true)
      expect(result.positions[0].candidates[0].rejectionFeedback).toEqual(['Too expensive'])
    })

    it('should report salary band availability', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5)
      `).run()

      agentsDb.prepare(`
        INSERT INTO salary_bands (id, country_code, band, level, min_monthly, max_monthly)
        VALUES ('sb-1', 'US', 'B', 3, 5000, 8000)
      `).run()

      const result = braniacDataAggregator.aggregateForAccount('Acme')

      expect(result.dataCompleteness.hasSalaryBands).toBe(true)
      expect(result.salaryBands).toHaveLength(1)
    })
  })

  describe('aggregateForStakeholder', () => {
    it('should filter by stakeholder', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5),
               (2, 'Acme', 'JDoe', 'Python', 'UK', 'Mid', 'Dev', 3)
      `).run()

      const result = braniacDataAggregator.aggregateForStakeholder('Acme', 'JSmith')

      expect(result.positions).toHaveLength(1)
      expect(result.positions[0].stakeholder).toBe('JSmith')
      expect(result.stakeholder).toBe('JSmith')
    })
  })
})
