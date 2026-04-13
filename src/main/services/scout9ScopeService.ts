import { getDatabase } from '../db/connection'
import { createLogger } from './logger'

const log = createLogger('Scout9Scope')

interface ScopePreset {
  name: string
  label: string
  count: number
}

interface Scout9ScopeOptions {
  coes: string[]
  verticals: string[]
  clients: string[]
  presets: ScopePreset[]
}

let cache: { data: Scout9ScopeOptions; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60_000

export function getScopeOptions(): Scout9ScopeOptions {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data
  }

  const db = getDatabase()

  const coeRows = db.prepare(
    "SELECT DISTINCT coe FROM synced_open_positions WHERE position_status = 'Active' AND coe != '' ORDER BY coe"
  ).all() as { coe: string }[]

  const verticalRows = db.prepare(
    "SELECT DISTINCT vertical_industry FROM synced_open_positions WHERE position_status = 'Active' AND vertical_industry != '' ORDER BY vertical_industry"
  ).all() as { vertical_industry: string }[]

  const clientRows = db.prepare(
    "SELECT DISTINCT account FROM synced_open_positions WHERE position_status = 'Active' AND account != '' ORDER BY account"
  ).all() as { account: string }[]

  const allActiveCount = (db.prepare(
    "SELECT COUNT(*) as c FROM synced_open_positions WHERE position_status = 'Active'"
  ).get() as { c: number }).c

  const noCandidatesCount = (db.prepare(
    "SELECT COUNT(*) as c FROM synced_open_positions WHERE position_status = 'Active' AND candidates_presented = 0"
  ).get() as { c: number }).c

  const stalledCount = (db.prepare(
    "SELECT COUNT(*) as c FROM synced_open_positions WHERE position_status = 'Active' AND aging >= 30"
  ).get() as { c: number }).c

  const highPriorityCount = (db.prepare(
    "SELECT COUNT(*) as c FROM synced_open_positions WHERE position_status = 'Active' AND aging >= 14 AND candidates_presented = 0"
  ).get() as { c: number }).c

  const data: Scout9ScopeOptions = {
    coes: coeRows.map(r => r.coe),
    verticals: verticalRows.map(r => r.vertical_industry),
    clients: clientRows.map(r => r.account),
    presets: [
      { name: 'all-active', label: 'All Active', count: allActiveCount },
      { name: 'no-candidates', label: 'No Candidates', count: noCandidatesCount },
      { name: 'stalled-30d', label: 'Stalled 30d+', count: stalledCount },
      { name: 'high-priority', label: 'High Priority', count: highPriorityCount },
    ],
  }

  cache = { data, fetchedAt: Date.now() }
  log.info('Scope options refreshed', { coes: data.coes.length, verticals: data.verticals.length, clients: data.clients.length })
  return data
}

export function invalidateScopeCache(): void {
  cache = null
}
