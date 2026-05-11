import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
}))

vi.mock('../envUtils', () => ({
  buildEnvWithPath: () => ({ ...process.env }),
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { subscriptionService } from '../subscriptionService'

function mockExecFileSuccess(stdout: string, stderr = '') {
  mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
    cb(null, stdout, stderr)
    return {}
  })
}

function mockExecFileError(message: string) {
  mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
    cb(new Error(message), '', '')
    return {}
  })
}

describe('subscriptionService', () => {
  beforeEach(() => {
    mockExecFile.mockReset()
  })

  describe('checkClaudeCli', () => {
    it('should return installed: true with version on success', async () => {
      mockExecFileSuccess('1.2.3')

      const result = await subscriptionService.checkClaudeCli()

      expect(result.installed).toBe(true)
      expect(result.version).toBe('1.2.3')
      expect(result.error).toBeNull()
    })

    it('should return installed: false when claude --version fails', async () => {
      mockExecFileError('ENOENT: command not found')

      const result = await subscriptionService.checkClaudeCli()

      expect(result.installed).toBe(false)
      expect(result.version).toBeNull()
      expect(result.error).toContain('ENOENT')
    })
  })

  describe('checkClaudeAuth', () => {
    it('should return authenticated for JSON response with loggedIn: true', async () => {
      mockExecFileSuccess(JSON.stringify({ loggedIn: true, email: 'user@test.com', subscriptionType: 'max' }))

      const result = await subscriptionService.checkClaudeAuth()

      expect(result.authenticated).toBe(true)
      expect(result.accountEmail).toBe('user@test.com')
      expect(result.plan).toBe('max')
    })

    it('should return authenticated for non-JSON "logged in" text', async () => {
      mockExecFileSuccess('You are logged in as user@test.com')

      const result = await subscriptionService.checkClaudeAuth()

      expect(result.authenticated).toBe(true)
    })

    it('should fall back to prompt check when auth status fails', async () => {
      let callIdx = 0
      mockExecFile.mockImplementation((_cmd: string, args: string[], _opts: unknown, cb: Function) => {
        callIdx++
        if (callIdx === 1) {
          cb(new Error('auth status not available'), '', '')
        } else {
          cb(null, 'OK', '')
        }
        return {}
      })

      const result = await subscriptionService.checkClaudeAuth()

      expect(result.authenticated).toBe(true)
    })

    it('should return not authenticated on all failures', async () => {
      mockExecFileError('Everything failed')

      const result = await subscriptionService.checkClaudeAuth()

      expect(result.authenticated).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('validateAll', () => {
    it('should short-circuit when CLI not installed', async () => {
      mockExecFileError('ENOENT')

      const result = await subscriptionService.validateAll()

      expect(result.claudeCli.installed).toBe(false)
      expect(result.claudeAuth.authenticated).toBe(false)
      expect(result.claudeAuth.error).toBe('CLI not installed')
      expect(result.claudeMax.active).toBe(false)
    })

    it('should short-circuit when auth fails', async () => {
      let callIdx = 0
      mockExecFile.mockImplementation((_cmd: string, args: string[], _opts: unknown, cb: Function) => {
        callIdx++
        if (callIdx === 1) {
          cb(null, '1.2.3', '')
        } else {
          cb(new Error('Auth failed'), '', '')
        }
        return {}
      })

      const result = await subscriptionService.validateAll()

      expect(result.claudeCli.installed).toBe(true)
      expect(result.claudeMax.active).toBe(false)
      expect(result.claudeMax.error).toBe('Not authenticated')
    })
  })
})
