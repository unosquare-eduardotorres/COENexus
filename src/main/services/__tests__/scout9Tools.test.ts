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

vi.mock('../salaryFeasibilityService', () => ({
  batchEvaluateFeasibility: vi.fn().mockReturnValue([]),
  buildCountrySalaryMatrix: vi.fn().mockReturnValue([]),
  compareEmploymentCosts: vi.fn().mockReturnValue({
    country: 'BOL', candidateName: 'Test', normalizedMonthlyUsd: 3000,
    fteEstimatedCost: 4050, contractorEstimatedCost: 3300,
    isContractorHeavyCountry: true, recommendation: 'contractor', reason: 'test',
  }),
}))

import { createScout9Tools, ToolCallTracker } from '../scout9Tools'
import { batchEvaluateFeasibility, buildCountrySalaryMatrix, compareEmploymentCosts } from '../salaryFeasibilityService'

function setupNexusDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE resume_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      upstream_id INTEGER NOT NULL,
      resume_text TEXT
    );

    CREATE TABLE open_position_discussions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      open_position_id INTEGER NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE open_position_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      open_position_id INTEGER NOT NULL,
      candidate_requisition_id INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      candidate_status TEXT NOT NULL DEFAULT '',
      rate REAL NOT NULL DEFAULT 0,
      start_date TEXT
    );

    CREATE TABLE synced_open_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      upstream_id INTEGER NOT NULL,
      account TEXT NOT NULL DEFAULT '',
      job_title TEXT NOT NULL DEFAULT '',
      main_skill TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE synced_candidates (
      upstream_id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL DEFAULT '',
      country TEXT,
      seniority TEXT,
      main_skill TEXT,
      salary_expectations TEXT,
      normalized_monthly_usd REAL,
      inferred_currency TEXT,
      currency_confidence TEXT
    );

    CREATE TABLE synced_employees (
      upstream_id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL DEFAULT '',
      country TEXT,
      seniority TEXT,
      main_skill TEXT,
      salary_expectations TEXT,
      normalized_monthly_usd REAL,
      inferred_currency TEXT,
      currency_confidence TEXT
    );
  `)
}

function setupAgentsDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE knowledge_notes (
      id TEXT PRIMARY KEY,
      note_title TEXT NOT NULL,
      note_text TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE stakeholder_profiles (
      id TEXT PRIMARY KEY,
      stakeholder_name TEXT NOT NULL,
      account TEXT NOT NULL,
      observed_rate_floor REAL,
      observed_rate_ceiling REAL,
      avg_accepted_rate REAL,
      accepted_countries TEXT NOT NULL DEFAULT '',
      rejected_countries TEXT NOT NULL DEFAULT '',
      seniority_flexibility INTEGER NOT NULL DEFAULT 0,
      top_rejection_reasons TEXT NOT NULL DEFAULT '',
      preference_summary TEXT NOT NULL DEFAULT '',
      data_points_count INTEGER NOT NULL DEFAULT 0,
      confidence_score REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE client_rule_overrides (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      override_text TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

describe('scout9Tools', () => {
  let tracker: ToolCallTracker

  beforeEach(() => {
    nexusDb = new Database(':memory:')
    agentsDb = new Database(':memory:')
    setupNexusDb(nexusDb)
    setupAgentsDb(agentsDb)
    tracker = new ToolCallTracker({ maxPerRun: 200, maxPerCandidate: 10 })
    vi.clearAllMocks()
  })

  describe('createScout9Tools', () => {
    it('should include all expected tool names (original 5 + new 7)', () => {
      const tools = createScout9Tools(tracker, 5000)
      const names = tools.map(t => t.name)

      expect(names).toContain('get_resume_text')
      expect(names).toContain('get_position_discussions')
      expect(names).toContain('get_candidate_history')
      expect(names).toContain('get_position_detail')
      expect(names).toContain('get_candidate_salary_info')
      expect(names).toContain('filter_candidates_by_salary_range')
      expect(names).toContain('compare_employment_costs')
      expect(names).toContain('get_country_salary_matrix')
      expect(names).toContain('evaluate_salary_feasibility')
      expect(names).toContain('get_stakeholder_profile')
      expect(names).toContain('get_client_rule_overrides')
      expect(names).toContain('get_knowledge_notes')
      expect(names.length).toBe(12)
    })

    it('get_candidate_salary_info should return salary data for candidates', async () => {
      nexusDb.prepare(`
        INSERT INTO synced_candidates (upstream_id, full_name, country, seniority, main_skill, normalized_monthly_usd, inferred_currency, currency_confidence)
        VALUES (100, 'Alice', 'MX', 'Senior', 'React', 4500.0, 'MXN', 'high')
      `).run()

      const tools = createScout9Tools(tracker, 5000)
      const tool = tools.find(t => t.name === 'get_candidate_salary_info')!
      const result = await tool.execute({ sourceType: 'candidates', upstreamId: 100 })
      const parsed = JSON.parse(result)

      expect(parsed.full_name).toBe('Alice')
      expect(parsed.normalized_monthly_usd).toBe(4500.0)
    })

    it('get_candidate_salary_info should return salary data for employees', async () => {
      nexusDb.prepare(`
        INSERT INTO synced_employees (upstream_id, full_name, country, seniority, main_skill, normalized_monthly_usd, inferred_currency, currency_confidence)
        VALUES (200, 'Bob', 'CO', 'Mid', 'Node', 3200.0, 'COP', 'medium')
      `).run()

      const tools = createScout9Tools(tracker, 5000)
      const tool = tools.find(t => t.name === 'get_candidate_salary_info')!
      const result = await tool.execute({ sourceType: 'employees', upstreamId: 200 })
      const parsed = JSON.parse(result)

      expect(parsed.full_name).toBe('Bob')
      expect(parsed.normalized_monthly_usd).toBe(3200.0)
    })

    it('filter_candidates_by_salary_range should filter by min/max', async () => {
      nexusDb.prepare(`
        INSERT INTO synced_candidates (upstream_id, full_name, country, seniority, main_skill, normalized_monthly_usd, inferred_currency, currency_confidence)
        VALUES (100, 'Alice', 'MX', 'Senior', 'React', 4500.0, 'MXN', 'high'),
               (101, 'Bob', 'MX', 'Mid', 'React', 2000.0, 'MXN', 'high'),
               (102, 'Carol', 'CO', 'Senior', 'Node', 6000.0, 'COP', 'medium')
      `).run()

      const tools = createScout9Tools(tracker, 5000)
      const tool = tools.find(t => t.name === 'filter_candidates_by_salary_range')!
      const result = await tool.execute({ minMonthlyUsd: 3000, maxMonthlyUsd: 5000, sourceType: 'candidates' })
      const parsed = JSON.parse(result)

      expect(parsed).toHaveLength(1)
      expect(parsed[0].full_name).toBe('Alice')
    })

    it('filter_candidates_by_salary_range should filter by country', async () => {
      nexusDb.prepare(`
        INSERT INTO synced_candidates (upstream_id, full_name, country, seniority, main_skill, normalized_monthly_usd, inferred_currency, currency_confidence)
        VALUES (100, 'Alice', 'MX', 'Senior', 'React', 4500.0, 'MXN', 'high'),
               (101, 'Bob', 'CO', 'Mid', 'React', 3500.0, 'COP', 'high')
      `).run()

      const tools = createScout9Tools(tracker, 5000)
      const tool = tools.find(t => t.name === 'filter_candidates_by_salary_range')!
      const result = await tool.execute({ country: 'MX', sourceType: 'candidates' })
      const parsed = JSON.parse(result)

      expect(parsed).toHaveLength(1)
      expect(parsed[0].country).toBe('MX')
    })

    it('evaluate_salary_feasibility should delegate to batchEvaluateFeasibility', async () => {
      vi.mocked(batchEvaluateFeasibility).mockReturnValue([
        { candidateUpstreamId: 100, candidateName: 'Alice', verdict: 'feasible' } as ReturnType<typeof batchEvaluateFeasibility>[0],
      ])

      const tools = createScout9Tools(tracker, 5000)
      const tool = tools.find(t => t.name === 'evaluate_salary_feasibility')!
      const result = await tool.execute({
        positionUpstreamId: 1,
        candidates: [{ upstreamId: 100, fullName: 'Alice', sourceType: 'candidates', country: 'MX', seniority: 'Senior', normalizedMonthlyUsd: 4000, currencyConfidence: 'high' }],
      })

      expect(batchEvaluateFeasibility).toHaveBeenCalledWith(1, expect.any(Array))
      const parsed = JSON.parse(result)
      expect(parsed[0].verdict).toBe('feasible')
    })

    it('get_country_salary_matrix should delegate to buildCountrySalaryMatrix', async () => {
      vi.mocked(buildCountrySalaryMatrix).mockReturnValue([
        { country: 'MX', seniority: 'Senior', verdict: 'feasible' } as ReturnType<typeof buildCountrySalaryMatrix>[0],
      ])

      const tools = createScout9Tools(tracker, 5000)
      const tool = tools.find(t => t.name === 'get_country_salary_matrix')!
      const result = await tool.execute({ positionUpstreamId: 1 })

      expect(buildCountrySalaryMatrix).toHaveBeenCalledWith(1)
      const parsed = JSON.parse(result)
      expect(parsed[0].country).toBe('MX')
    })

    it('compare_employment_costs should delegate to compareEmploymentCosts', async () => {
      const tools = createScout9Tools(tracker, 5000)
      const tool = tools.find(t => t.name === 'compare_employment_costs')!
      const result = await tool.execute({ normalizedMonthlyUsd: 3000, country: 'BOL', candidateName: 'Test' })

      expect(compareEmploymentCosts).toHaveBeenCalledWith(3000, 'BOL', 'Test')
      const parsed = JSON.parse(result)
      expect(parsed.recommendation).toBe('contractor')
    })

    it('get_stakeholder_profile should query agents DB', async () => {
      agentsDb.prepare(`
        INSERT INTO stakeholder_profiles (id, stakeholder_name, account, accepted_countries, rejected_countries, top_rejection_reasons, preference_summary, data_points_count, confidence_score)
        VALUES ('sp1', 'JSmith', 'Axos', 'MX,CO', 'US', 'Too expensive', 'Prefers MX devs', 15, 0.85)
      `).run()

      const tools = createScout9Tools(tracker, 5000)
      const tool = tools.find(t => t.name === 'get_stakeholder_profile')!
      const result = await tool.execute({ account: 'Axos', stakeholder: 'JSmith' })
      const parsed = JSON.parse(result)

      expect(parsed.stakeholder_name).toBe('JSmith')
      expect(parsed.accepted_countries).toBe('MX,CO')
    })

    it('get_client_rule_overrides should query agents DB', async () => {
      agentsDb.prepare(`
        INSERT INTO client_rule_overrides (id, client_id, override_text, is_active)
        VALUES ('o1', 'Axos', 'Allow seniority -1', 1)
      `).run()

      const tools = createScout9Tools(tracker, 5000)
      const tool = tools.find(t => t.name === 'get_client_rule_overrides')!
      const result = await tool.execute({ clientId: 'Axos' })
      const parsed = JSON.parse(result)

      expect(parsed).toHaveLength(1)
      expect(parsed[0].override_text).toBe('Allow seniority -1')
    })
  })
})
