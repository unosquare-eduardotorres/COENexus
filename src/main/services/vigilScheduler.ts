import type { VigilSource } from '../../shared/ipc-types'
import { vigilRepository } from '../db/agents/repositories/vigilRepository'
import { createLogger } from './logger'
import { type SyncOptions } from './syncOrchestrator'
import { vigilExecutor } from './vigilExecutor'

const log = createLogger('VigilScheduler')

const DEFAULT_SOURCES: VigilSource[] = ['employees', 'candidates', 'open-positions', 'project-reallocations']

type TokenProvider = () => Promise<string> | string

type RunSchedulerFn = (params: {
  token: string
  sources: VigilSource[]
  options: SyncOptions
}) => Promise<unknown>

let timer: NodeJS.Timeout | null = null
let tokenProvider: TokenProvider | null = null
let runFn: RunSchedulerFn = ({ token, sources, options }) =>
  vigilExecutor.run({
    token,
    triggerType: 'scheduled',
    sources,
    options,
  })
let inFlight = false
let lastTriggeredMinuteKey = ''

function parseSources(value: string): VigilSource[] {
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is VigilSource =>
        item === 'employees' ||
        item === 'candidates' ||
        item === 'open-positions' ||
        item === 'project-reallocations'
      )
    }
  } catch {
    log.warn('Invalid vigil sync_sources_json')
  }
  return DEFAULT_SOURCES
}

function minuteKey(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}-${hh}:${min}`
}

async function tick(): Promise<void> {
  if (inFlight) {
    return
  }

  const config = vigilRepository.getConfig()
  if (config.schedule_enabled !== 1) {
    return
  }

  const now = new Date()
  if (now.getHours() !== config.schedule_hour || now.getMinutes() !== config.schedule_minute) {
    return
  }

  const scheduledDays: number[] = (() => {
    try {
      const parsed = JSON.parse(config.schedule_days_json || '[1,2,3,4,5]')
      return Array.isArray(parsed) ? parsed : [1, 2, 3, 4, 5]
    } catch {
      return [1, 2, 3, 4, 5]
    }
  })()
  if (!scheduledDays.includes(now.getDay())) {
    return
  }

  const currentMinuteKey = minuteKey(now)
  if (currentMinuteKey === lastTriggeredMinuteKey) {
    return
  }

  if (!tokenProvider) {
    log.warn('Skipped scheduled Vigil run: token provider is not configured')
    lastTriggeredMinuteKey = currentMinuteKey
    return
  }

  inFlight = true
  lastTriggeredMinuteKey = currentMinuteKey

  try {
    const token = (await tokenProvider())?.trim()
    if (!token) {
      throw new Error('Empty token from token provider')
    }

    const sources = parseSources(config.sync_sources_json)
    const options: SyncOptions = {
      year: config.candidate_year_filter,
      activeOnly: config.active_positions_only === 1,
    }

    await runFn({
      token,
      sources: sources.length > 0 ? sources : DEFAULT_SOURCES,
      options,
    })

    log.info('Scheduled Vigil run executed', {
      minute: currentMinuteKey,
      sourceCount: sources.length,
      year: config.candidate_year_filter,
    })
  } catch (error) {
    log.error('Scheduled Vigil run failed', error instanceof Error ? error : new Error(String(error)))
  } finally {
    inFlight = false
  }
}

export const vigilScheduler = {
  start(options?: { getToken?: TokenProvider; run?: RunSchedulerFn }): void {
    if (options?.getToken) {
      tokenProvider = options.getToken
    }
    if (options?.run) {
      runFn = options.run
    }

    if (timer) return

    timer = setInterval(() => {
      void tick()
    }, 60_000)

    void tick()
    log.info('Vigil scheduler started')
  },

  stop(): void {
    if (!timer) return
    clearInterval(timer)
    timer = null
    inFlight = false
    log.info('Vigil scheduler stopped')
  },

  setTokenProvider(getToken: TokenProvider): void {
    tokenProvider = getToken
  },

  setRunHandler(run: RunSchedulerFn): void {
    runFn = run
  },
}
