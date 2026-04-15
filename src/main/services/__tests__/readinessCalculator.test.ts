import { describe, expect, it, vi } from 'vitest'
import { calculateReadiness } from '../readinessCalculator'
import type { SkillProgressInput, GateStatusInput } from '../readinessCalculator'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

describe('calculateReadiness', () => {
  it('should return zero score when no skills or gates', () => {
    const result = calculateReadiness([], [])
    expect(result.score).toBe(0)
    expect(result.coreGatesBlocking).toBe(false)
    expect(result.nonGateProgress).toBe(0)
    expect(result.blockingMessage).toBeUndefined()
  })

  it('should calculate weighted score from core and non-gate skills', () => {
    const skills: SkillProgressInput[] = [
      { domainId: 'react', progress: 80, isCoreGate: true },
      { domainId: 'css', progress: 60, isCoreGate: false },
    ]
    const gates: GateStatusInput[] = [
      { gateId: 'react-cert', status: 'met' },
    ]

    const result = calculateReadiness(skills, gates)
    expect(result.score).toBe(Math.round(80 * 0.6 + 60 * 0.4))
    expect(result.coreGatesBlocking).toBe(false)
  })

  it('should cap score at 60 when core gates are blocking', () => {
    const skills: SkillProgressInput[] = [
      { domainId: 'react', progress: 100, isCoreGate: true },
      { domainId: 'css', progress: 100, isCoreGate: false },
    ]
    const gates: GateStatusInput[] = [
      { gateId: 'react-cert', status: 'in-progress' },
    ]

    const result = calculateReadiness(skills, gates)
    expect(result.score).toBeLessThanOrEqual(60)
    expect(result.coreGatesBlocking).toBe(true)
    expect(result.blockingMessage).toBe('1 core gate is blocking')
  })

  it('should use plural form when multiple gates blocking', () => {
    const skills: SkillProgressInput[] = [
      { domainId: 'a', progress: 50, isCoreGate: true },
    ]
    const gates: GateStatusInput[] = [
      { gateId: 'g1', status: 'not-started' },
      { gateId: 'g2', status: 'blocked' },
    ]

    const result = calculateReadiness(skills, gates)
    expect(result.blockingMessage).toBe('2 core gates are blocking')
  })

  it('should return all core gate statuses', () => {
    const gates: GateStatusInput[] = [
      { gateId: 'g1', status: 'met' },
      { gateId: 'g2', status: 'in-progress' },
    ]

    const result = calculateReadiness([], gates)
    expect(result.coreGateStatuses).toHaveLength(2)
    expect(result.coreGateStatuses[0]).toEqual({ name: 'g1', status: 'met' })
    expect(result.coreGateStatuses[1]).toEqual({ name: 'g2', status: 'in-progress' })
  })

  it('should calculate nonGateProgress as average of non-gate skills', () => {
    const skills: SkillProgressInput[] = [
      { domainId: 'core', progress: 100, isCoreGate: true },
      { domainId: 'a', progress: 40, isCoreGate: false },
      { domainId: 'b', progress: 80, isCoreGate: false },
    ]

    const result = calculateReadiness(skills, [])
    expect(result.nonGateProgress).toBe(60)
  })
})
