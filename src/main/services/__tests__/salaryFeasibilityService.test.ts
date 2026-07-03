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

import {
  evaluateSalaryFeasibility,
  compareEmploymentCosts,
  buildCountrySalaryMatrix,
  batchEvaluateFeasibility,
} from '../salaryFeasibilityService'

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
  `)
}

function setupAgentsDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE client_rule_overrides (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      override_text TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

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

describe('salaryFeasibilityService', () => {
  beforeEach(() => {
    nexusDb = new Database(':memory:')
    agentsDb = new Database(':memory:')
    setupNexusDb(nexusDb)
    setupAgentsDb(agentsDb)
  })

  describe('evaluateSalaryFeasibility', () => {
    it('should return "feasible" when salary is well within budget (≥15% margin)', () => {
      const result = evaluateSalaryFeasibility(
        4000, 'high',
        { minimum_rate: 30, maximum_rate: 40 },
        'Senior', 'Senior', 'MX', 'TestClient'
      )
      expect(result.verdict).toBe('feasible')
      expect(result.reason).toContain('within budget')
    })

    it('should return "marginal" when salary is within budget but tight margin (<15%)', () => {
      const result = evaluateSalaryFeasibility(
        5600, 'high',
        { minimum_rate: 35, maximum_rate: 40 },
        'Senior', 'Senior', 'MX', 'TestClient'
      )
      expect(result.verdict).toBe('marginal')
      expect(result.reason).toContain('tight margin')
    })

    it('should return "not-feasible" when salary exceeds budget', () => {
      const result = evaluateSalaryFeasibility(
        8000, 'high',
        { minimum_rate: 30, maximum_rate: 40 },
        'Senior', 'Senior', 'MX', 'TestClient'
      )
      expect(result.verdict).toBe('not-feasible')
      expect(result.reason).toContain('exceeds')
    })

    it('should return "unknown" when candidate has no salary data', () => {
      const result = evaluateSalaryFeasibility(
        null, null,
        { minimum_rate: 30, maximum_rate: 40 },
        'Senior', 'Senior', 'MX', 'TestClient'
      )
      expect(result.verdict).toBe('unknown')
      expect(result.reason).toContain('No normalized salary data')
    })

    it('should return "unknown" when position has no rate data', () => {
      const result = evaluateSalaryFeasibility(
        4000, 'high',
        { minimum_rate: null, maximum_rate: null },
        'Senior', 'Senior', 'MX', 'TestClient'
      )
      expect(result.verdict).toBe('unknown')
      expect(result.reason).toContain('no rate information')
    })

    it('should return "marginal" with seniority flexibility when client override allows -1', () => {
      agentsDb.prepare(
        "INSERT INTO client_rule_overrides (id, client_id, override_text, is_active) VALUES ('o1', 'Axos', 'Allow seniority -1 for cost savings', 1)"
      ).run()

      const result = evaluateSalaryFeasibility(
        7000, 'high',
        { minimum_rate: 30, maximum_rate: 40 },
        'Intermediate', 'Senior', 'MX', 'Axos'
      )
      expect(result.verdict).toBe('marginal')
      expect(result.seniorityAdjusted).toBe(true)
      expect(result.reason).toContain('seniority -1')
    })

    it('should handle low currency confidence with warning note', () => {
      const result = evaluateSalaryFeasibility(
        4000, 'low',
        { minimum_rate: 30, maximum_rate: 40 },
        'Senior', 'Senior', 'MX', 'TestClient'
      )
      expect(result.verdict).toBe('feasible')
      expect(result.reason).toContain('salary confidence is low')
    })
  })

  describe('compareEmploymentCosts', () => {
    it('should calculate FTE cost with 35% overhead', () => {
      const result = compareEmploymentCosts(4000, 'MX', 'Alice')
      expect(result.fteEstimatedCost).toBeCloseTo(4000 * 1.35)
    })

    it('should calculate contractor cost with 10% overhead', () => {
      const result = compareEmploymentCosts(4000, 'BOL', 'Bob')
      expect(result.contractorEstimatedCost).toBeCloseTo(4000 * 1.1)
    })

    it('should recommend "contractor" for BOL when significantly cheaper', () => {
      const result = compareEmploymentCosts(3000, 'BOL', 'Carlos')
      expect(result.isContractorHeavyCountry).toBe(true)
      expect(result.recommendation).toBe('contractor')
    })

    it('should recommend "fte" for non-contractor-heavy countries (MX, CO)', () => {
      const result = compareEmploymentCosts(4000, 'MX', 'Diana')
      expect(result.isContractorHeavyCountry).toBe(false)
      expect(result.recommendation).toBe('fte')
    })

    it('should recommend "either" when costs are similar in contractor country', () => {
      const result = compareEmploymentCosts(100, 'PRY', 'Eve')
      expect(result.isContractorHeavyCountry).toBe(true)
      expect(result.recommendation).toBe('either')
    })
  })

  describe('buildCountrySalaryMatrix', () => {
    it('should return entries for all countries × seniorities', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, seniorities, countries, maximum_rate, minimum_rate)
        VALUES (1, 'Acme', 'Senior,Mid', 'MX,CO', 50, 30)
      `).run()

      const matrix = buildCountrySalaryMatrix(1)
      const mxEntries = matrix.filter(e => e.country === 'MX')
      expect(mxEntries.length).toBeGreaterThanOrEqual(2)
    })

    it('should mark country as "feasible" when band max is within budget', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, seniorities, countries, maximum_rate)
        VALUES (1, 'Acme', 'Senior', 'MX', 60)
      `).run()

      agentsDb.prepare(`
        INSERT INTO salary_bands (id, country_code, band, level, min_monthly, max_monthly)
        VALUES ('sb1', 'MX', 'B', 3, 3000, 5000)
      `).run()

      const matrix = buildCountrySalaryMatrix(1)
      const mxSenior = matrix.find(e => e.country === 'MX' && e.seniority === 'Senior')
      expect(mxSenior?.verdict).toBe('feasible')
    })

    it('should mark country as "not-feasible" when band min exceeds budget', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, seniorities, countries, maximum_rate)
        VALUES (1, 'Acme', 'Senior', 'US', 30)
      `).run()

      agentsDb.prepare(`
        INSERT INTO salary_bands (id, country_code, band, level, min_monthly, max_monthly)
        VALUES ('sb1', 'US', 'B', 3, 8000, 12000)
      `).run()

      const matrix = buildCountrySalaryMatrix(1)
      const usSenior = matrix.find(e => e.country === 'US' && e.seniority === 'Senior')
      expect(usSenior?.verdict).toBe('not-feasible')
    })

    it('should mark country as "marginal" when band overlaps budget', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, seniorities, countries, maximum_rate)
        VALUES (1, 'Acme', 'Senior', 'CO', 40)
      `).run()

      agentsDb.prepare(`
        INSERT INTO salary_bands (id, country_code, band, level, min_monthly, max_monthly)
        VALUES ('sb1', 'CO', 'B', 3, 4000, 7000)
      `).run()

      const matrix = buildCountrySalaryMatrix(1)
      const coSenior = matrix.find(e => e.country === 'CO' && e.seniority === 'Senior')
      expect(coSenior?.verdict).toBe('marginal')
    })

    it('should return "unknown" when no salary band data exists', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, seniorities, countries, maximum_rate)
        VALUES (1, 'Acme', 'Senior', 'AR', 50)
      `).run()

      const matrix = buildCountrySalaryMatrix(1)
      const arSenior = matrix.find(e => e.country === 'AR' && e.seniority === 'Senior')
      expect(arSenior?.verdict).toBe('unknown')
      expect(arSenior?.reason).toContain('No salary band data')
    })

    it('should include employment type notes for BOL/PRY', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, seniorities, countries, maximum_rate)
        VALUES (1, 'Acme', 'Mid', 'BOL', 50)
      `).run()

      const matrix = buildCountrySalaryMatrix(1)
      const bolEntry = matrix.find(e => e.country === 'BOL')
      expect(bolEntry?.employmentTypeNote).toContain('contractor-heavy')
    })
  })

  describe('batchEvaluateFeasibility', () => {
    it('should evaluate multiple candidates against a position', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, seniorities, maximum_rate, minimum_rate)
        VALUES (1, 'Acme', 'Senior', 40, 30)
      `).run()

      const results = batchEvaluateFeasibility(1, [
        { upstreamId: 100, fullName: 'Alice', sourceType: 'candidates', country: 'MX', seniority: 'Senior', normalizedMonthlyUsd: 4000, currencyConfidence: 'high' },
        { upstreamId: 200, fullName: 'Bob', sourceType: 'employees', country: 'CO', seniority: 'Mid', normalizedMonthlyUsd: 7000, currencyConfidence: 'medium' },
      ])

      expect(results).toHaveLength(2)
      expect(results[0].candidateName).toBe('Alice')
      expect(results[0].verdict).toBe('feasible')
      expect(results[1].candidateName).toBe('Bob')
    })

    it('should return "unknown" when position not found', () => {
      const results = batchEvaluateFeasibility(999, [
        { upstreamId: 100, fullName: 'Alice', sourceType: 'candidates', country: 'MX', seniority: 'Senior', normalizedMonthlyUsd: 4000, currencyConfidence: 'high' },
      ])

      expect(results).toHaveLength(1)
      expect(results[0].verdict).toBe('unknown')
      expect(results[0].reason).toBe('Position not found')
    })

    it('should use position\'s actual rate columns', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, seniorities, maximum_rate, minimum_rate)
        VALUES (1, 'Acme', 'Senior', 50, 40)
      `).run()

      const results = batchEvaluateFeasibility(1, [
        { upstreamId: 100, fullName: 'Alice', sourceType: 'candidates', country: 'MX', seniority: 'Senior', normalizedMonthlyUsd: 5000, currencyConfidence: 'high' },
      ])

      expect(results[0].positionMonthlyBudget).toBe(50 * 160)
    })

    it('should check client rule overrides for seniority flexibility', () => {
      nexusDb.prepare(`
        INSERT INTO synced_open_positions (upstream_id, account, seniorities, maximum_rate)
        VALUES (1, 'Axos', 'Senior', 40)
      `).run()

      agentsDb.prepare(
        "INSERT INTO client_rule_overrides (id, client_id, override_text, is_active) VALUES ('o1', 'Axos', 'Allow seniority -1', 1)"
      ).run()

      const results = batchEvaluateFeasibility(1, [
        { upstreamId: 100, fullName: 'Carlos', sourceType: 'candidates', country: 'MX', seniority: 'Intermediate', normalizedMonthlyUsd: 7000, currencyConfidence: 'high' },
      ])

      expect(results[0].seniorityAdjusted).toBe(true)
    })
  })
})
