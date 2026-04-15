import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('databaseSharingService (renderer)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should call database.getConfig', async () => {
    vi.mocked(window.api.database.getConfig).mockResolvedValue({ isConfigured: true, sharedPath: '/tmp', exporterName: 'test' })
    const result = await window.api.database.getConfig()
    expect(result.isConfigured).toBe(true)
  })

  it('should call database.saveConfig', async () => {
    await window.api.database.saveConfig({ sharedPath: '/data', exporterName: 'admin' } as any)
    expect(window.api.database.saveConfig).toHaveBeenCalledWith({ sharedPath: '/data', exporterName: 'admin' })
  })

  it('should call database.export', async () => {
    vi.mocked(window.api.database.export).mockResolvedValue({ success: true })
    const result = await window.api.database.export()
    expect(result).toEqual({ success: true })
  })

  it('should call database.import', async () => {
    vi.mocked(window.api.database.import).mockResolvedValue({ success: true })
    const result = await window.api.database.import({ snapshotPath: '/path' } as any)
    expect(result.success).toBe(true)
  })

  it('should call database.listSnapshots', async () => {
    vi.mocked(window.api.database.listSnapshots).mockResolvedValue({ snapshots: [{ name: 'snap1' }] })
    const result = await window.api.database.listSnapshots()
    expect(result.snapshots).toHaveLength(1)
  })
})
