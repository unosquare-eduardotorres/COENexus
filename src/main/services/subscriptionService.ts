import { execFile } from 'node:child_process'
import { buildEnvWithPath } from './envUtils'
import { createLogger } from './logger'

const log = createLogger('Subscription')

interface CliCheckResult {
  installed: boolean
  version: string | null
  error: string | null
}

interface AuthCheckResult {
  authenticated: boolean
  accountEmail: string | null
  error: string | null
}

interface MaxCheckResult {
  active: boolean
  plan: string | null
  error: string | null
}

export interface SubscriptionCheckResult {
  claudeCli: CliCheckResult
  claudeAuth: AuthCheckResult
  claudeMax: MaxCheckResult
}

function runCommand(command: string, args: string[], timeoutMs = 15_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, {
      env: buildEnvWithPath(),
      timeout: timeoutMs,
      encoding: 'utf-8',
    }, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({ stdout: stdout ?? '', stderr: stderr ?? '' })
      }
    })
    void child
  })
}

export const subscriptionService = {
  async checkClaudeCli(): Promise<CliCheckResult> {
    try {
      const { stdout } = await runCommand('claude', ['--version'], 5_000)
      const version = stdout.trim() || null
      log.info('Claude CLI found', { version })
      return { installed: true, version, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('Claude CLI not found', { error: message })
      return { installed: false, version: null, error: message }
    }
  },

  async checkClaudeAuth(): Promise<AuthCheckResult & { plan?: string }> {
    try {
      const { stdout } = await runCommand('claude', ['auth', 'status'], 10_000)
      const trimmed = stdout.trim()

      try {
        const status = JSON.parse(trimmed) as {
          loggedIn?: boolean
          email?: string
          subscriptionType?: string
        }
        if (status.loggedIn) {
          log.info('Claude authentication verified', { email: status.email, plan: status.subscriptionType })
          return {
            authenticated: true,
            accountEmail: status.email ?? null,
            error: null,
            plan: status.subscriptionType ?? null,
          }
        }
        return { authenticated: false, accountEmail: null, error: 'Not logged in' }
      } catch {
        if (trimmed.toLowerCase().includes('logged in') || trimmed.toLowerCase().includes('authenticated')) {
          log.info('Claude authentication verified (non-JSON)')
          return { authenticated: true, accountEmail: null, error: null }
        }
        return { authenticated: false, accountEmail: null, error: `Unexpected response: ${trimmed.slice(0, 100)}` }
      }
    } catch (authStatusErr) {
      log.info('claude auth status not available, falling back to prompt check')
    }

    try {
      const { stdout } = await runCommand('claude', ['-p', 'reply with exactly OK'], 15_000)
      const trimmed = stdout.trim()
      if (trimmed.includes('OK')) {
        log.info('Claude authentication verified via prompt fallback')
        return { authenticated: true, accountEmail: null, error: null }
      }
      return { authenticated: false, accountEmail: null, error: `Unexpected response: ${trimmed.slice(0, 100)}` }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('Claude authentication check failed', { error: message })
      return { authenticated: false, accountEmail: null, error: message }
    }
  },

  async validateAll(): Promise<SubscriptionCheckResult> {
    const claudeCli = await subscriptionService.checkClaudeCli()

    if (!claudeCli.installed) {
      return {
        claudeCli,
        claudeAuth: { authenticated: false, accountEmail: null, error: 'CLI not installed' },
        claudeMax: { active: false, plan: null, error: 'CLI not installed' },
      }
    }

    const authResult = await subscriptionService.checkClaudeAuth()

    if (!authResult.authenticated) {
      return {
        claudeCli,
        claudeAuth: { authenticated: authResult.authenticated, accountEmail: authResult.accountEmail, error: authResult.error },
        claudeMax: { active: false, plan: null, error: 'Not authenticated' },
      }
    }

    const plan = authResult.plan ?? null
    const isMax = plan?.toLowerCase() === 'max'

    return {
      claudeCli,
      claudeAuth: { authenticated: true, accountEmail: authResult.accountEmail, error: null },
      claudeMax: { active: isMax, plan, error: isMax ? null : 'No Max subscription detected' },
    }
  },
}
