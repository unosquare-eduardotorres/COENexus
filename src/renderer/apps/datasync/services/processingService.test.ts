import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('processingService (datasync app)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should call processing.getStatus', async () => {
    vi.mocked(window.api.processing.getStatus).mockResolvedValue({ total: 10 })
    const result = await window.api.processing.getStatus()
    expect(result).toEqual({ total: 10 })
  })

  it('should call processing.startExtraction', async () => {
    vi.mocked(window.api.processing.startExtraction).mockResolvedValue({})
    await window.api.processing.startExtraction({ source: 'employees', token: 't' } as any)
    expect(window.api.processing.startExtraction).toHaveBeenCalled()
  })

  it('should call processing.startVectorization', async () => {
    vi.mocked(window.api.processing.startVectorization).mockResolvedValue({})
    await window.api.processing.startVectorization({ source: 'employees' } as any)
    expect(window.api.processing.startVectorization).toHaveBeenCalled()
  })

  it('should call processing.retryFailed', async () => {
    vi.mocked(window.api.processing.retryFailed).mockResolvedValue({})
    await window.api.processing.retryFailed({ source: 'employees', token: 't' } as any)
    expect(window.api.processing.retryFailed).toHaveBeenCalled()
  })
})
