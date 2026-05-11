import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import { getAllExchangeRates, getExchangeRate, upsertExchangeRate } from '../exchangeRateRepository'

describe('exchangeRateRepository', () => {
  beforeEach(() => {
    db = createAgentsDb()
  })

  it('should return seeded exchange rates from getAllExchangeRates', () => {
    const rates = getAllExchangeRates()

    expect(rates).toBeDefined()
    expect(typeof rates).toBe('object')
    expect(rates['USD']).toBe(1.0)
  })

  it('should getExchangeRate for a specific currency', () => {
    const usdRate = getExchangeRate('USD')
    expect(usdRate).toBe(1.0)

    const unknown = getExchangeRate('ZZZ')
    expect(unknown).toBeUndefined()
  })

  it('should upsertExchangeRate for new currency', () => {
    upsertExchangeRate('JPY', 0.0067, 'api')

    const rate = getExchangeRate('JPY')
    expect(rate).toBe(0.0067)
  })

  it('should upsertExchangeRate to update existing currency', () => {
    upsertExchangeRate('EUR', 999)
    const rate = getExchangeRate('EUR')
    expect(rate).toBe(999)

    upsertExchangeRate('EUR', 1.08)
    const updated = getExchangeRate('EUR')
    expect(updated).toBe(1.08)
  })
})
