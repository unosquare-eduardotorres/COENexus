import { describe, expect, it } from 'vitest'
import { toVigilActivityEvent } from '../vigilEventMapper'
import type { SyncEvent } from '../sync/syncTypes'

describe('vigilEventMapper', () => {
  describe('toVigilActivityEvent', () => {
    it('should map record event with sync_failed status to run_failed with error severity', () => {
      const event: SyncEvent = {
        type: 'record',
        record: {
          id: 'rec-1',
          source: 'employees',
          status: 'sync_failed',
          name: 'John Doe',
          email: 'john@example.com',
          hasResume: true,
          isBench: false,
          resumeChanged: false,
          upstreamId: 42,
          syncedAt: '2026-01-01T00:00:00.000Z',
          seniority: 'Senior',
          mainSkill: 'React',
          country: 'US',
        },
      }

      const result = toVigilActivityEvent(event)

      expect(result.event_type).toBe('run_failed')
      expect(result.severity).toBe('error')
      expect(result.source).toBe('employees')
      expect(result.message).toContain('John Doe')
      expect(result.message).toContain('sync_failed')
      expect(result.run_id).toBeNull()
      expect(result.timestamp).toBeDefined()
    })

    it('should map record event with success status to run_progress with info severity', () => {
      const event: SyncEvent = {
        type: 'record',
        record: {
          id: 'rec-2',
          source: 'candidates',
          status: 'synced',
          name: 'Jane Smith',
          email: 'jane@example.com',
          hasResume: true,
          isBench: false,
          resumeChanged: true,
          upstreamId: 99,
          syncedAt: '2026-01-01T00:00:00.000Z',
        },
      }

      const result = toVigilActivityEvent(event)

      expect(result.event_type).toBe('run_progress')
      expect(result.severity).toBe('info')
      expect(result.source).toBe('candidates')
    })

    it('should map error event to run_failed with error severity and message passthrough', () => {
      const event: SyncEvent = {
        type: 'error',
        message: 'Network timeout connecting to upstream API',
      }

      const result = toVigilActivityEvent(event)

      expect(result.event_type).toBe('run_failed')
      expect(result.severity).toBe('error')
      expect(result.source).toBe('system')
      expect(result.message).toBe('Network timeout connecting to upstream API')
      expect(result.details_json).toBeNull()
    })

    it('should map complete event to run_completed with info severity and progress in details_json', () => {
      const event: SyncEvent = {
        type: 'complete',
        progress: {
          totalRecords: 100,
          fetchedRecords: 100,
          syncedCount: 95,
          incompleteCount: 2,
          notProcessedCount: 0,
          updatedCount: 10,
          unchangedCount: 85,
          skippedCount: 3,
          status: 'completed',
        },
      }

      const result = toVigilActivityEvent(event)

      expect(result.event_type).toBe('run_completed')
      expect(result.severity).toBe('info')
      expect(result.source).toBe('system')

      const details = JSON.parse(result.details_json!)
      expect(details.totalRecords).toBe(100)
      expect(details.syncedCount).toBe(95)
    })
  })
})
