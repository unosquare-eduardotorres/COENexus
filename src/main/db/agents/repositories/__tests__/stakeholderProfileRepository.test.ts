import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import { stakeholderProfileRepository } from '../stakeholderProfileRepository'

function setupDb(database: Database.Database): void {
  database.exec(`
    CREATE TABLE agent_jobs (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      status TEXT NOT NULL DEFAULT 'queued',
      scope_type TEXT NOT NULL DEFAULT 'org',
      scope_value TEXT,
      initiated_by TEXT NOT NULL DEFAULT 'system',
      run_reason TEXT NOT NULL DEFAULT '',
      pipeline_phase TEXT NOT NULL DEFAULT 'idle',
      started_at TEXT,
      completed_at TEXT,
      canceled_at TEXT,
      error_message TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      agent_type TEXT NOT NULL DEFAULT 'scout9',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE stakeholder_profiles (
      id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
      stakeholder_name TEXT NOT NULL,
      account TEXT NOT NULL,
      observed_rate_floor REAL,
      observed_rate_ceiling REAL,
      avg_accepted_rate REAL,
      accepted_countries TEXT NOT NULL DEFAULT '[]',
      rejected_countries TEXT NOT NULL DEFAULT '[]',
      untested_countries TEXT NOT NULL DEFAULT '[]',
      seniority_flexibility INTEGER NOT NULL DEFAULT 0,
      posted_seniorities TEXT NOT NULL DEFAULT '[]',
      accepted_seniorities TEXT NOT NULL DEFAULT '[]',
      avg_time_to_decision_days REAL,
      top_rejection_reasons TEXT NOT NULL DEFAULT '[]',
      top_acceptance_signals TEXT NOT NULL DEFAULT '[]',
      preference_summary TEXT NOT NULL DEFAULT '',
      data_points_count INTEGER NOT NULL DEFAULT 0,
      confidence_score REAL NOT NULL DEFAULT 0,
      last_inference_job_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (stakeholder_name, account),
      FOREIGN KEY (last_inference_job_id) REFERENCES agent_jobs(id) ON DELETE SET NULL
    );
  `)
}

describe('StakeholderProfileRepository', () => {
  beforeEach(() => {
    db = new Database(':memory:')
    setupDb(db)
  })

  describe('upsert', () => {
    it('should insert a new profile', () => {
      const profile = stakeholderProfileRepository.upsert({
        stakeholder_name: 'John Doe',
        account: 'Acme Corp',
        observed_rate_floor: 50,
        observed_rate_ceiling: 120,
        avg_accepted_rate: 85,
        preference_summary: 'Prefers senior React devs',
        data_points_count: 10,
        confidence_score: 0.75,
      })

      expect(profile.id).toBeDefined()
      expect(profile.stakeholder_name).toBe('John Doe')
      expect(profile.account).toBe('Acme Corp')
      expect(profile.observed_rate_floor).toBe(50)
      expect(profile.preference_summary).toBe('Prefers senior React devs')
    })

    it('should update existing profile on conflict', () => {
      stakeholderProfileRepository.upsert({
        stakeholder_name: 'John Doe',
        account: 'Acme Corp',
        preference_summary: 'Initial summary',
        confidence_score: 0.5,
      })

      const updated = stakeholderProfileRepository.upsert({
        stakeholder_name: 'John Doe',
        account: 'Acme Corp',
        preference_summary: 'Updated summary',
        confidence_score: 0.9,
      })

      expect(updated.preference_summary).toBe('Updated summary')
      expect(updated.confidence_score).toBe(0.9)

      const all = stakeholderProfileRepository.listByAccount('Acme Corp')
      expect(all).toHaveLength(1)
    })
  })

  describe('getByStakeholderAndAccount', () => {
    it('should return undefined for non-existent profile', () => {
      const result = stakeholderProfileRepository.getByStakeholderAndAccount('Nobody', 'NoCo')
      expect(result).toBeUndefined()
    })

    it('should return the matching profile', () => {
      stakeholderProfileRepository.upsert({
        stakeholder_name: 'Jane',
        account: 'TestCo',
        confidence_score: 0.8,
      })

      const result = stakeholderProfileRepository.getByStakeholderAndAccount('Jane', 'TestCo')
      expect(result).toBeDefined()
      expect(result!.stakeholder_name).toBe('Jane')
    })
  })

  describe('listByAccount', () => {
    it('should return profiles sorted by confidence', () => {
      stakeholderProfileRepository.upsert({ stakeholder_name: 'A', account: 'Co', confidence_score: 0.3 })
      stakeholderProfileRepository.upsert({ stakeholder_name: 'B', account: 'Co', confidence_score: 0.9 })
      stakeholderProfileRepository.upsert({ stakeholder_name: 'C', account: 'Other', confidence_score: 0.5 })

      const results = stakeholderProfileRepository.listByAccount('Co')
      expect(results).toHaveLength(2)
      expect(results[0].stakeholder_name).toBe('B')
      expect(results[1].stakeholder_name).toBe('A')
    })
  })

  describe('delete', () => {
    it('should delete a profile by id', () => {
      const profile = stakeholderProfileRepository.upsert({
        stakeholder_name: 'ToDelete',
        account: 'Co',
      })

      expect(stakeholderProfileRepository.delete(profile.id)).toBe(true)
      expect(stakeholderProfileRepository.getByStakeholderAndAccount('ToDelete', 'Co')).toBeUndefined()
    })

    it('should return false for non-existent id', () => {
      expect(stakeholderProfileRepository.delete('nonexistent')).toBe(false)
    })
  })

  describe('update', () => {
    it('should update specific fields', () => {
      const profile = stakeholderProfileRepository.upsert({
        stakeholder_name: 'Updatable',
        account: 'Co',
        confidence_score: 0.5,
      })

      const updated = stakeholderProfileRepository.update(profile.id, {
        confidence_score: 0.95,
        preference_summary: 'New summary',
      })

      expect(updated).toBe(true)
      const fetched = stakeholderProfileRepository.getByStakeholderAndAccount('Updatable', 'Co')
      expect(fetched!.confidence_score).toBe(0.95)
      expect(fetched!.preference_summary).toBe('New summary')
    })
  })
})
