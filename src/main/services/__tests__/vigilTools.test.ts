import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockAgentsDb, mockNexusDb } = vi.hoisted(() => {
  const mockPrepare = vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue({}), all: vi.fn().mockReturnValue([]) })
  return {
    mockAgentsDb: { prepare: mockPrepare },
    mockNexusDb: { prepare: mockPrepare },
  }
})

vi.mock('../../db/agents/agentsConnection', () => ({
  getAgentsDatabase: () => mockAgentsDb,
}))

vi.mock('../../db/connection', () => ({
  getDatabase: () => mockNexusDb,
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { withTimeout, ToolCallTracker, createVigilTools } from '../vigilTools'

describe('vigilTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('withTimeout', () => {
    it('should resolve when fn completes within timeout', async () => {
      const result = await withTimeout(async () => 'done', 1000, 'test_tool')
      expect(result).toBe('done')
    })

    it('should reject with timeout error when fn exceeds timeout', async () => {
      const slowFn = () => new Promise<string>(resolve => setTimeout(() => resolve('late'), 5000))
      await expect(withTimeout(slowFn, 10, 'slow_tool')).rejects.toThrow(
        'Tool slow_tool timed out after 10ms'
      )
    })
  })

  describe('ToolCallTracker', () => {
    it('should allow call under limits', () => {
      const tracker = new ToolCallTracker({ maxPerRun: 10, maxPerTool: 5 })
      const result = tracker.check('some_tool')
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should reject at maxPerRun limit', () => {
      const tracker = new ToolCallTracker({ maxPerRun: 2, maxPerTool: 10 })
      tracker.record('tool_a')
      tracker.record('tool_b')

      const result = tracker.check('tool_c')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Run budget exhausted')
    })

    it('should reject at maxPerTool limit', () => {
      const tracker = new ToolCallTracker({ maxPerRun: 100, maxPerTool: 2 })
      tracker.record('tool_a')
      tracker.record('tool_a')

      const result = tracker.check('tool_a')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Tool budget exhausted')
    })

    it('should increment total and byTool counters on record', () => {
      const tracker = new ToolCallTracker({ maxPerRun: 100, maxPerTool: 100 })
      tracker.record('tool_a')
      tracker.record('tool_a')
      tracker.record('tool_b')

      expect(tracker.total).toBe(3)
      expect(tracker.byTool['tool_a']).toBe(2)
      expect(tracker.byTool['tool_b']).toBe(1)
    })
  })

  describe('createVigilTools', () => {
    it('should return all 5 expected tool names', () => {
      const tracker = new ToolCallTracker({ maxPerRun: 100, maxPerTool: 50 })
      const tools = createVigilTools(tracker, 5000)

      const names = tools.map(t => t.name)
      expect(names).toEqual([
        'get_vigil_config',
        'get_recent_vigil_activity',
        'get_recent_vigil_runs',
        'get_sync_snapshot',
        'get_vigil_chat_context',
      ])
      expect(tools).toHaveLength(5)
    })

    it('should respect tracker budget checks in tools', async () => {
      const tracker = new ToolCallTracker({ maxPerRun: 1, maxPerTool: 1 })
      const tools = createVigilTools(tracker, 5000)

      const configTool = tools.find(t => t.name === 'get_vigil_config')!
      const firstResult = await configTool.execute({})
      expect(firstResult).toBeTruthy()

      const secondResult = await configTool.execute({})
      expect(secondResult).toContain('budget exhausted')
    })
  })
})
