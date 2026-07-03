import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('databaseSharingService (datasync app)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should call database.getConfig', async () => {
    vi.mocked(window.api.database.getConfig).mockResolvedValue({ isConfigured: false, sharedPath: '', exporterName: '' })
    const result = await window.api.database.getConfig()
    expect(result.isConfigured).toBe(false)
  })

  it('should call database.getStatus', async () => {
    vi.mocked(window.api.database.getStatus).mockResolvedValue({ ready: true })
    const result = await window.api.database.getStatus()
    expect(result).toEqual({ ready: true })
  })

  it('should call database.importFile', async () => {
    vi.mocked(window.api.database.importFile).mockResolvedValue({ success: true })
    const result = await window.api.database.importFile()
    expect(result).toEqual({ success: true })
  })
})
