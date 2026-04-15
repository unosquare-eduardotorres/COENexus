import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { runScout9Pipeline } from '../scout9PipelineService'
import type { Scout9PipelineEvent, PipelineContext } from '../scout9PipelineService'

describe('runScout9Pipeline', () => {
  let emittedEvents: Scout9PipelineEvent[]
  let emit: (e: Scout9PipelineEvent) => void

  beforeEach(() => {
    emittedEvents = []
    emit = (e) => emittedEvents.push(e)
  })

  it('should execute all steps in order', async () => {
    const executionOrder: string[] = []
    const steps = [
      { name: 'step-1', fn: async (ctx: PipelineContext) => { executionOrder.push('step-1'); return ctx } },
      { name: 'step-2', fn: async (ctx: PipelineContext) => { executionOrder.push('step-2'); return ctx } },
    ]

    await runScout9Pipeline({}, 'job-1', emit, AbortSignal.timeout(5000), steps)
    expect(executionOrder).toEqual(['step-1', 'step-2'])
  })

  it('should emit step-update and log events for each step', async () => {
    const steps = [
      { name: 'fetch', fn: async (ctx: PipelineContext) => ctx },
    ]

    await runScout9Pipeline({}, 'job-2', emit, AbortSignal.timeout(5000), steps)

    const stepUpdates = emittedEvents.filter(e => e.type === 'step-update')
    expect(stepUpdates).toHaveLength(2)
    expect(stepUpdates[0].status).toBe('running')
    expect(stepUpdates[1].status).toBe('completed')

    const logs = emittedEvents.filter(e => e.type === 'log')
    expect(logs.some(l => l.message?.includes('Starting: fetch'))).toBe(true)
    expect(logs.some(l => l.message?.includes('Completed: fetch'))).toBe(true)
  })

  it('should emit failed status and rethrow when a step throws', async () => {
    const steps = [
      { name: 'explode', fn: async () => { throw new Error('boom') } },
    ]

    await expect(
      runScout9Pipeline({}, 'job-3', emit, AbortSignal.timeout(5000), steps)
    ).rejects.toThrow('boom')

    const failed = emittedEvents.find(e => e.type === 'step-update' && e.status === 'failed')
    expect(failed).toBeDefined()
    expect(failed?.stepName).toBe('explode')
  })

  it('should stop execution when signal is aborted', async () => {
    const controller = new AbortController()
    const executionOrder: string[] = []

    const steps = [
      { name: 'first', fn: async (ctx: PipelineContext) => { executionOrder.push('first'); controller.abort(); return ctx } },
      { name: 'second', fn: async (ctx: PipelineContext) => { executionOrder.push('second'); return ctx } },
    ]

    await runScout9Pipeline({}, 'job-4', emit, controller.signal, steps)
    expect(executionOrder).toEqual(['first'])
  })

  it('should pass context from step to step', async () => {
    const steps = [
      { name: 'set-data', fn: async (ctx: PipelineContext) => ({ ...ctx, positions: [{ id: 1 }] }) },
      {
        name: 'check-data', fn: async (ctx: PipelineContext) => {
          expect(ctx.positions).toHaveLength(1)
          return ctx
        },
      },
    ]

    await runScout9Pipeline({}, 'job-5', emit, AbortSignal.timeout(5000), steps)
  })
})
