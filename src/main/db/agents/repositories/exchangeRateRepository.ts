import { getAgentsDatabase } from '../agentsConnection'

interface ExchangeRateRow {
  currency: string
  rate_to_usd: number
  source: string
  updated_at: string
}

export function getAllExchangeRates(): Record<string, number> {
  const db = getAgentsDatabase()
  const rows = db.prepare('SELECT currency, rate_to_usd FROM exchange_rates').all() as ExchangeRateRow[]
  const result: Record<string, number> = {}
  for (const row of rows) result[row.currency] = row.rate_to_usd
  return result
}

export function getExchangeRate(currency: string): number | undefined {
  const db = getAgentsDatabase()
  const row = db.prepare('SELECT rate_to_usd FROM exchange_rates WHERE currency = ?').get(currency) as { rate_to_usd: number } | undefined
  return row?.rate_to_usd
}

export function upsertExchangeRate(currency: string, rateToUsd: number, source = 'manual'): void {
  const db = getAgentsDatabase()
  db.prepare(`
    INSERT INTO exchange_rates (currency, rate_to_usd, source, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT (currency) DO UPDATE SET
      rate_to_usd = excluded.rate_to_usd,
      source = excluded.source,
      updated_at = excluded.updated_at
  `).run(currency, rateToUsd, source)
}
