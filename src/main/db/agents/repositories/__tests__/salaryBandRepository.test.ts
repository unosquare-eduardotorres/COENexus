import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import {
  getAllSalaryBands,
  upsertSalaryBand,
  getAllCountries,
  upsertCountry,
  getAllJobFamilies,
} from '../salaryBandRepository'

describe('salaryBandRepository', () => {
  beforeEach(() => {
    db = createAgentsDb()
  })

  it('should return salary bands from getAllSalaryBands', () => {
    const bands = getAllSalaryBands()
    expect(Array.isArray(bands)).toBe(true)
  })

  it('should upsertSalaryBand for new entry', () => {
    upsertSalaryBand({
      country_code: 'MX',
      job_family_group: 'Engineering',
      band: 'B3',
      level: 3,
      min_monthly: 3000,
      max_monthly: 5000,
      source: 'test',
    })

    const bands = getAllSalaryBands()
    const mx = bands.find(b => b.country_code === 'MX' && b.band === 'B3')
    expect(mx).toBeDefined()
    expect(mx!.min_monthly).toBe(3000)
  })

  it('should upsertSalaryBand to update existing', () => {
    upsertSalaryBand({ country_code: 'US', job_family_group: 'Eng', band: 'B1', level: 1, min_monthly: 1000, max_monthly: 2000 })
    upsertSalaryBand({ country_code: 'US', job_family_group: 'Eng', band: 'B1', level: 1, min_monthly: 1500, max_monthly: 2500 })

    const bands = getAllSalaryBands()
    const us = bands.find(b => b.country_code === 'US' && b.band === 'B1')
    expect(us!.min_monthly).toBe(1500)
  })

  it('should return countries from getAllCountries', () => {
    const countries = getAllCountries()
    expect(Array.isArray(countries)).toBe(true)
  })

  it('should upsertCountry', () => {
    upsertCountry({
      code: 'JP',
      name: 'Japan',
      default_currency: 'JPY',
      upstream_catalog_name: 'Japan',
    })

    const countries = getAllCountries()
    const jp = countries.find(c => c.code === 'JP')
    expect(jp).toBeDefined()
    expect(jp!.default_currency).toBe('JPY')
  })

  it('should return job families from getAllJobFamilies', () => {
    const families = getAllJobFamilies()
    expect(Array.isArray(families)).toBe(true)
  })
})
