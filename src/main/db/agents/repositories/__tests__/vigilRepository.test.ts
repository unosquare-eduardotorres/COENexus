import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import { vigilRepository } from '../vigilRepository'

describe('vigilRepository', () => {
  beforeEach(() => {
    db = createAgentsDb()
  })

  describe('runs', () => {
    it('should createRun and return row with generated id', () => {
      const run = vigilRepository.createRun({
        trigger_type: 'manual',
        status: 'running',
        sources_json: '["employees"]',
        started_at: '2026-01-01T00:00:00.000Z',
      })

      expect(run.id).toBeDefined()
      expect(run.trigger_type).toBe('manual')
      expect(run.status).toBe('running')
    })

    it('should getRunById', () => {
      const created = vigilRepository.createRun({
        trigger_type: 'scheduled',
        sources_json: '["candidates"]',
      })

      const fetched = vigilRepository.getRunById(created.id)
      expect(fetched).toBeDefined()
      expect(fetched!.trigger_type).toBe('scheduled')
    })

    it('should updateRun fields', () => {
      const run = vigilRepository.createRun({
        trigger_type: 'manual',
        sources_json: '["employees"]',
      })

      const updated = vigilRepository.updateRun(run.id, {
        status: 'completed',
        completed_at: '2026-01-01T01:00:00.000Z',
      })

      expect(updated).toBe(true)
      const fetched = vigilRepository.getRunById(run.id)
      expect(fetched!.status).toBe('completed')
      expect(fetched!.completed_at).toBe('2026-01-01T01:00:00.000Z')
    })

    it('should listRuns ordered by started_at DESC', () => {
      vigilRepository.createRun({ trigger_type: 'manual', sources_json: '[]', started_at: '2026-01-01T00:00:00Z' })
      vigilRepository.createRun({ trigger_type: 'scheduled', sources_json: '[]', started_at: '2026-01-02T00:00:00Z' })

      const runs = vigilRepository.listRuns()
      expect(runs).toHaveLength(2)
      expect(runs[0].started_at).toBe('2026-01-02T00:00:00Z')
    })
  })

  describe('activityLog', () => {
    it('should createActivityLog and return row', () => {
      const log = vigilRepository.createActivityLog({
        event_type: 'run_started',
        source: 'system',
        severity: 'info',
        message: 'Test event',
      })

      expect(log.id).toBeDefined()
      expect(log.event_type).toBe('run_started')
      expect(log.severity).toBe('info')
    })

    it('should listActivityLog with filters', () => {
      vigilRepository.createActivityLog({ event_type: 'run_started', source: 'system', severity: 'info', message: 'Info event' })
      vigilRepository.createActivityLog({ event_type: 'run_failed', source: 'employees', severity: 'error', message: 'Error event' })

      const errors = vigilRepository.listActivityLog({ severity: 'error' })
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Error event')

      const bySource = vigilRepository.listActivityLog({ source: 'employees' })
      expect(bySource).toHaveLength(1)
    })
  })

  describe('config', () => {
    it('should getConfig with seeded defaults', () => {
      const config = vigilRepository.getConfig()

      expect(config.id).toBe(1)
      expect(config.schedule_enabled).toBeDefined()
      expect(typeof config.schedule_hour).toBe('number')
    })

    it('should updateConfig fields', () => {
      vigilRepository.updateConfig({ schedule_enabled: 1, schedule_hour: 8, schedule_minute: 30 })

      const config = vigilRepository.getConfig()
      expect(config.schedule_enabled).toBe(1)
      expect(config.schedule_hour).toBe(8)
      expect(config.schedule_minute).toBe(30)
    })
  })
})
