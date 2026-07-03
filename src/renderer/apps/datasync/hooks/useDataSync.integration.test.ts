import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../shared/utils/rendererLogger', () => ({
  createRendererLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

describe('useDataSync integration', () => {
  it('should export useDataSync function', async () => {
    const mod = await import('./useDataSync')
    expect(typeof mod.useDataSync).toBe('function')
  })

  it('should have the expected module structure', async () => {
    const mod = await import('./useDataSync')
    expect(mod).toHaveProperty('useDataSync')
    expect(Object.keys(mod)).toContain('useDataSync')
  })
})
