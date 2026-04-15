import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../shared/utils/rendererLogger', () => ({
  createRendererLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

describe('useTransformWizard integration', () => {
  it('should export useTransformWizard function', async () => {
    const mod = await import('./useTransformWizard')
    expect(typeof mod.useTransformWizard).toBe('function')
  })

  it('should have the expected module structure', async () => {
    const mod = await import('./useTransformWizard')
    expect(mod).toHaveProperty('useTransformWizard')
  })
})
