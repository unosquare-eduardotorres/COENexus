import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

let setVigilToken: (token: string) => void
let getVigilToken: () => string

describe('vigilTokenStore', () => {
  const originalEnv = process.env

  beforeEach(async () => {
    vi.resetModules()
    process.env = { ...originalEnv }
    const mod = await import('../vigilTokenStore')
    setVigilToken = mod.setVigilToken
    getVigilToken = mod.getVigilToken
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should store a trimmed token via setVigilToken', () => {
    setVigilToken('  my-secret-token  ')
    expect(getVigilToken()).toBe('my-secret-token')
  })

  it('should ignore empty/whitespace-only token', () => {
    setVigilToken('   ')
    expect(getVigilToken()).toBe('')
  })

  it('should return cached token from getVigilToken', () => {
    setVigilToken('cached-token')
    expect(getVigilToken()).toBe('cached-token')
  })

  it('should fall back to process.env.VIGIL_SYNC_TOKEN when no cache', () => {
    process.env.VIGIL_SYNC_TOKEN = '  env-token  '
    expect(getVigilToken()).toBe('env-token')
  })

  it('should return empty string when no cache and no env var', () => {
    delete process.env.VIGIL_SYNC_TOKEN
    expect(getVigilToken()).toBe('')
  })
})
