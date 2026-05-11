import { createLogger } from './logger'

const log = createLogger('TokenWatchdog')

const PAUSE_BEFORE_EXPIRY_MS = 60_000

interface WatchedPipeline {
  label: string
  abort: () => void
}

let watchedPipelines: WatchedPipeline[] = []
let tokenExpiresAt: number | null = null
let intervalId: ReturnType<typeof setInterval> | null = null

function decodeExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch { return null }
}

function check(): void {
  if (!tokenExpiresAt || watchedPipelines.length === 0) return
  const remainingMs = tokenExpiresAt - Date.now()
  if (remainingMs <= PAUSE_BEFORE_EXPIRY_MS) {
    log.warn('Token expiring soon — auto-pausing pipelines', {
      remainingMs,
      pipelines: watchedPipelines.map(p => p.label),
    })
    for (const p of watchedPipelines) {
      p.abort()
    }
    watchedPipelines = []
  }
}

export function isTokenExpiringSoon(): boolean {
  if (!tokenExpiresAt) return false
  return (tokenExpiresAt - Date.now()) <= PAUSE_BEFORE_EXPIRY_MS
}

export const tokenWatchdog = {
  updateToken(token: string): void {
    tokenExpiresAt = decodeExp(token)
    if (tokenExpiresAt) {
      log.info('Token watchdog updated', {
        expiresAt: new Date(tokenExpiresAt).toISOString(),
        remainingMs: tokenExpiresAt - Date.now(),
      })
    }
    if (!intervalId) {
      intervalId = setInterval(check, 10_000)
    }
  },

  register(label: string, abort: () => void): void {
    watchedPipelines.push({ label, abort })
  },

  unregister(label: string): void {
    watchedPipelines = watchedPipelines.filter(p => p.label !== label)
  },

  stop(): void {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    watchedPipelines = []
  },
}
