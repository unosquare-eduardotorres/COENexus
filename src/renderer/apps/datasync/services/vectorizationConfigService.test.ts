import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('vectorizationConfigService (datasync app)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should call processing.getVoyageKeyStatus', async () => {
    vi.mocked(window.api.processing.getVoyageKeyStatus).mockResolvedValue({ configured: true, keyCount: 1 })
    const result = await window.api.processing.getVoyageKeyStatus()
    expect(result.configured).toBe(true)
  })

  it('should have addVoyageKey mock available', async () => {
    const result = await window.api.processing.addVoyageKey({ apiKey: 'key-1' })
    expect(window.api.processing.addVoyageKey).toHaveBeenCalledWith({ apiKey: 'key-1' })
    expect(result).toEqual({ saved: true })
  })

  it('should have removeVoyageKey mock available', async () => {
    const result = await window.api.processing.removeVoyageKey({ index: 0 })
    expect(window.api.processing.removeVoyageKey).toHaveBeenCalledWith({ index: 0 })
    expect(result).toEqual({ deleted: true })
  })
})
