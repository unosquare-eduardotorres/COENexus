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

    it('should normalize minimum_rate=0 to null (treat as missing floor)', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging, minimum_rate, maximum_rate)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5, 0, 100)
      `).run()

      const result = braniacDataAggregator.aggregateForAccount('Acme')

      expect(result.positions[0].minimumRate).toBeNull()
      expect(result.positions[0].maximumRate).toBe(100)
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

  describe('salary data in aggregated candidates', () => {
    it('should include normalizedMonthlyUsd in AggregatedCandidate when available', () => {
      nexusDb.exec(`
        CREATE TABLE synced_candidates (
          upstream_id INTEGER PRIMARY KEY,
          full_name TEXT NOT NULL DEFAULT '',
          country TEXT,
          seniority TEXT,
          main_skill TEXT,
          normalized_monthly_usd REAL,
          inferred_currency TEXT,
          currency_confidence TEXT
        );
      `)

      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'MX', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate, is_employee)
        VALUES (1, 100, 200, 'Alice', 'React', 'Presented', 85, 0)
      `).run()

      nexusDb.prepare(`
        INSERT INTO synced_candidates (upstream_id, full_name, country, seniority, normalized_monthly_usd, inferred_currency, currency_confidence)
        VALUES (200, 'Alice', 'MX', 'Senior', 4500.0, 'MXN', 'high')
      `).run()

      const result = braniacDataAggregator.aggregateForAccount('Acme')
      expect(result.positions[0].candidates[0].normalizedMonthlyUsd).toBe(4500.0)
      expect(result.positions[0].candidates[0].inferredCurrency).toBe('MXN')
      expect(result.positions[0].candidates[0].currencyConfidence).toBe('high')
    })

    it('should return null salary fields when synced record not found', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate, is_employee)
        VALUES (1, 100, 999, 'Ghost', 'React', 'Presented', 80, 0)
      `).run()

      const result = braniacDataAggregator.aggregateForAccount('Acme')
      expect(result.positions[0].candidates[0].normalizedMonthlyUsd).toBeNull()
      expect(result.positions[0].candidates[0].inferredCurrency).toBeNull()
      expect(result.positions[0].candidates[0].currencyConfidence).toBeNull()
    })

    it('should query synced_employees for employee candidates (is_employee=1)', () => {
      nexusDb.exec(`
        CREATE TABLE synced_employees (
          upstream_id INTEGER PRIMARY KEY,
          full_name TEXT NOT NULL DEFAULT '',
          country TEXT,
          seniority TEXT,
          main_skill TEXT,
          normalized_monthly_usd REAL,
          inferred_currency TEXT,
          currency_confidence TEXT
        );
      `)

      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'CO', 'Mid', 'Dev', 3)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate, is_employee)
        VALUES (1, 100, 300, 'Bob Employee', 'React', 'Presented', 90, 1)
      `).run()

      nexusDb.prepare(`
        INSERT INTO synced_employees (upstream_id, full_name, country, seniority, normalized_monthly_usd, inferred_currency, currency_confidence)
        VALUES (300, 'Bob Employee', 'CO', 'Mid', 3200.0, 'COP', 'medium')
      `).run()

      const result = braniacDataAggregator.aggregateForAccount('Acme')
      expect(result.positions[0].candidates[0].normalizedMonthlyUsd).toBe(3200.0)
      expect(result.positions[0].candidates[0].country).toBe('CO')
    })

    it('should query synced_candidates for non-employee candidates (is_employee=0)', () => {
      nexusDb.exec(`
        CREATE TABLE synced_candidates (
          upstream_id INTEGER PRIMARY KEY,
          full_name TEXT NOT NULL DEFAULT '',
          country TEXT,
          seniority TEXT,
          main_skill TEXT,
          normalized_monthly_usd REAL,
          inferred_currency TEXT,
          currency_confidence TEXT
        );
      `)

      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'Node', 'MX', 'Junior', 'Dev', 2)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate, is_employee)
        VALUES (1, 101, 400, 'Carol Candidate', 'Node', 'Presented', 60, 0)
      `).run()

      nexusDb.prepare(`
        INSERT INTO synced_candidates (upstream_id, full_name, country, seniority, normalized_monthly_usd, inferred_currency, currency_confidence)
        VALUES (400, 'Carol Candidate', 'MX', 'Junior', 2500.0, 'MXN', 'exact')
      `).run()

      const result = braniacDataAggregator.aggregateForAccount('Acme')
      expect(result.positions[0].candidates[0].normalizedMonthlyUsd).toBe(2500.0)
      expect(result.positions[0].candidates[0].seniority).toBe('Junior')
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

  describe('resume skills enrichment', () => {
    function addResumeEmbeddingsTable(db: Database.Database): void {
      db.exec(`
        CREATE TABLE IF NOT EXISTS resume_embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_type TEXT NOT NULL,
          source_id INTEGER NOT NULL,
          upstream_id INTEGER NOT NULL,
          embedding BLOB,
          resume_text TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          is_bench INTEGER NOT NULL DEFAULT 0,
          extracted_skills_json TEXT,
          skills_extracted_at TEXT,
          skills_extractor_model TEXT,
          UNIQUE(source_type, source_id)
        );
      `)
    }

    it('should use requisitionTaggedSkill field instead of mainSkill', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'Java', 'US', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate)
        VALUES (1, 100, 200, 'Alice', 'Java', 'Presented', 85)
      `).run()

      addResumeEmbeddingsTable(nexusDb)

      const result = braniacDataAggregator.aggregateForAccount('Acme')

      expect(result.positions[0].candidates[0].requisitionTaggedSkill).toBe('Java')
      expect(result.positions[0].candidates[0]).not.toHaveProperty('mainSkill')
    })

    it('should enrich candidates with resumeSkills when available', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'Java', 'US', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate)
        VALUES (1, 100, 200, 'Alice', 'Java', 'Presented', 85)
      `).run()

      addResumeEmbeddingsTable(nexusDb)

      const skillsJson = JSON.stringify({
        primary_tech_stack: ['C#', '.NET'],
        secondary_tech_stack: ['Docker'],
        roles: ['Backend Developer'],
        domains: ['Fintech'],
        years_experience: 5,
        seniority_signals: [],
        certifications: [],
        languages: [],
        summary: 'C# developer',
      })

      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text, extracted_skills_json, skills_extracted_at)
        VALUES ('candidates', 1, 200, 'Resume text', ?, datetime('now'))
      `).run(skillsJson)

      const result = braniacDataAggregator.aggregateForAccount('Acme')
      const candidate = result.positions[0].candidates[0]

      expect(candidate.requisitionTaggedSkill).toBe('Java')
      expect(candidate.resumeSkills).not.toBeNull()
      expect(candidate.resumeSkills!.primaryStack).toContain('C#')
      expect(candidate.resumeSkills!.source).toBe('candidates')
    })

    it('should prefer resume-session source over employees/candidates', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate, is_employee)
        VALUES (1, 100, 300, 'Bob', 'React', 'Hired', 90, 1)
      `).run()

      addResumeEmbeddingsTable(nexusDb)

      const employeeSkills = JSON.stringify({
        primary_tech_stack: ['React'],
        secondary_tech_stack: [],
        roles: [],
        domains: [],
        years_experience: null,
        seniority_signals: [],
        certifications: [],
        languages: [],
        summary: 'React developer (old)',
      })

      const sessionSkills = JSON.stringify({
        primary_tech_stack: ['React', 'Next.js', 'TypeScript'],
        secondary_tech_stack: ['Node.js'],
        roles: ['Frontend Lead'],
        domains: [],
        years_experience: 6,
        seniority_signals: ['Lead'],
        certifications: [],
        languages: [],
        summary: 'React lead with Next.js expertise (newer)',
      })

      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text, extracted_skills_json, skills_extracted_at)
        VALUES ('employees', 1, 300, 'Old resume', ?, datetime('now', '-1 day')),
               ('resume-session', 2, 300, 'Newer resume', ?, datetime('now'))
      `).run(employeeSkills, sessionSkills)

      const result = braniacDataAggregator.aggregateForAccount('Acme')
      const candidate = result.positions[0].candidates[0]

      expect(candidate.resumeSkills).not.toBeNull()
      expect(candidate.resumeSkills!.source).toBe('resume-session')
      expect(candidate.resumeSkills!.primaryStack).toContain('Next.js')
    })

    it('should report resumeSkillsCoverage in dataCompleteness', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate)
        VALUES (1, 100, 200, 'Alice', 'React', 'Presented', 85),
               (1, 101, 201, 'Bob', 'React', 'Presented', 90)
      `).run()

      addResumeEmbeddingsTable(nexusDb)

      const skillsJson = JSON.stringify({
        primary_tech_stack: ['React'],
        secondary_tech_stack: [],
        roles: [],
        domains: [],
        years_experience: null,
        seniority_signals: [],
        certifications: [],
        languages: [],
        summary: '',
      })

      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text, extracted_skills_json, skills_extracted_at)
        VALUES ('candidates', 1, 200, 'Resume', ?, datetime('now'))
      `).run(skillsJson)

      const result = braniacDataAggregator.aggregateForAccount('Acme')

      expect(result.dataCompleteness.hasResumeSkills).toBe(true)
      expect(result.dataCompleteness.resumeSkillsCoverage).toBe(0.5)
    })

    it('should report zero coverage when no skills extracted', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate)
        VALUES (1, 100, 200, 'Alice', 'React', 'Presented', 85)
      `).run()

      addResumeEmbeddingsTable(nexusDb)

      const result = braniacDataAggregator.aggregateForAccount('Acme')

      expect(result.dataCompleteness.hasResumeSkills).toBe(false)
      expect(result.dataCompleteness.resumeSkillsCoverage).toBe(0)
    })

    it('should have null resumeSkills when no embedding found for candidate', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, stakeholder, main_skill, countries, seniorities, job_title, aging)
        VALUES (1, 'Acme', 'JSmith', 'React', 'US', 'Senior', 'Dev', 5)
      `).run()

      nexusDb.prepare(`
        INSERT INTO open_position_candidates (open_position_id, candidate_requisition_id, candidate_id, candidate_name, main_skill, candidate_status, rate)
        VALUES (1, 100, 200, 'Alice', 'React', 'Presented', 85)
      `).run()

      addResumeEmbeddingsTable(nexusDb)

      const result = braniacDataAggregator.aggregateForAccount('Acme')

      expect(result.positions[0].candidates[0].resumeSkills).toBeNull()
    })
  })
})
