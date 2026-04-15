import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scout9Service } from './scout9Service'

describe('scout9Service', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should call scout9.run with params', async () => {
    vi.mocked(window.api.scout9.run).mockResolvedValue({ jobId: 'j1' })
    await scout9Service.run({ preset: 'all-active' })
    expect(window.api.scout9.run).toHaveBeenCalledWith({ preset: 'all-active' })
  })

  it('should call scout9.cancel', async () => {
    await scout9Service.cancel()
    expect(window.api.scout9.cancel).toHaveBeenCalledOnce()
  })

  it('should call scout9.getStatus', async () => {
    vi.mocked(window.api.scout9.getStatus).mockResolvedValue({ running: false })
    await scout9Service.getStatus()
    expect(window.api.scout9.getStatus).toHaveBeenCalledOnce()
  })

  it('should call scout9.getScopeOptions', async () => {
    vi.mocked(window.api.scout9.getScopeOptions).mockResolvedValue({ presets: [] })
    await scout9Service.getScopeOptions()
    expect(window.api.scout9.getScopeOptions).toHaveBeenCalledOnce()
  })

  it('should call scout9.listReports', async () => {
    vi.mocked(window.api.scout9.listReports).mockResolvedValue([])
    await scout9Service.listReports()
    expect(window.api.scout9.listReports).toHaveBeenCalledOnce()
  })

  it('should call scout9.getReport', async () => {
    vi.mocked(window.api.scout9.getReport).mockResolvedValue(null)
    await scout9Service.getReport('report-1')
    expect(window.api.scout9.getReport).toHaveBeenCalledWith('report-1')
  })

  it('should call scout9.listRules', async () => {
    vi.mocked(window.api.scout9.listRules).mockResolvedValue([])
    await scout9Service.listRules()
    expect(window.api.scout9.listRules).toHaveBeenCalledOnce()
  })

  it('should call scout9.createRule', async () => {
    const params = { ruleName: 'R1', ruleText: 'text' } as any
    vi.mocked(window.api.scout9.createRule).mockResolvedValue({ id: 'rule-1' })
    await scout9Service.createRule(params)
    expect(window.api.scout9.createRule).toHaveBeenCalledWith(params)
  })

  it('should call scout9.deleteRule', async () => {
    await scout9Service.deleteRule('rule-1')
    expect(window.api.scout9.deleteRule).toHaveBeenCalledWith('rule-1')
  })

  it('should call scout9.getTokenBudget', async () => {
    vi.mocked(window.api.scout9.getTokenBudget).mockResolvedValue({ total: 0, used: 0 })
    await scout9Service.getTokenBudget()
    expect(window.api.scout9.getTokenBudget).toHaveBeenCalledOnce()
  })

  it('should call scout9.getBrainSnapshot', async () => {
    vi.mocked(window.api.scout9.getBrainSnapshot).mockResolvedValue(null)
    await scout9Service.getBrainSnapshot()
    expect(window.api.scout9.getBrainSnapshot).toHaveBeenCalledOnce()
  })

  it('should register pipeline event listener', () => {
    const callback = vi.fn()
    scout9Service.onPipelineEvent(callback)
    expect(window.api.scout9.onPipelineEvent).toHaveBeenCalledWith(callback)
  })

  it('should register status event listener', () => {
    const callback = vi.fn()
    scout9Service.onStatusEvent(callback)
    expect(window.api.scout9.onStatusEvent).toHaveBeenCalledWith(callback)
  })
})
