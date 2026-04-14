import { describe, it, expect } from 'vitest'
import { validatePayload, syncStartSchema, matchSearchSchema, benchBurnSchema } from './schemas'

describe('IPC Schemas (Zod 4 migration telemetry)', () => {
  it('should validate syncStartSchema with valid data', () => {
    const result = validatePayload(syncStartSchema, {
      source: 'employees',
      token: 'test-token',
      limit: 100,
    }, 'sync:start')
    expect(result.source).toBe('employees')
    expect(result.token).toBe('test-token')
  })

  it('should reject syncStartSchema with invalid data', () => {
    expect(() => validatePayload(syncStartSchema, { source: '', token: '' }, 'sync:start'))
      .toThrow('[sync:start] Invalid payload')
  })

  it('should validate matchSearchSchema with required fields', () => {
    const result = validatePayload(matchSearchSchema, {
      name: 'Test Search',
      matchFlowType: 'find-for-position',
      jdSource: 'custom',
      jobDescription: 'Need a React developer',
      dataSource: 'candidates',
      topN: 10,
      searchMode: 'vector',
    }, 'match:search')
    expect(result.name).toBe('Test Search')
  })

  it('should validate benchBurnSchema', () => {
    const result = validatePayload(benchBurnSchema, {
      name: 'Bench Test',
      employeeUpstreamIds: [1, 2, 3],
      positionUpstreamIds: [10, 20],
      searchMode: 'opus',
      topNPerEmployee: 3,
      topNPerPosition: 5,
    }, 'match:benchBurn')
    expect(result.employeeUpstreamIds).toHaveLength(3)
  })
})
