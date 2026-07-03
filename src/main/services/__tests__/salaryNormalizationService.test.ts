import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

let mockExchangeRates: Record<string, number> = {}
let mockSalaryBands: { band: string; min_monthly: number; max_monthly: number; country_code: string }[] = []
let mockCountryRow: { code: string; default_currency: string } | undefined

vi.mock('../../db/agents/repositories/exchangeRateRepository', () => ({
  getAllExchangeRates: () => mockExchangeRates,
  getExchangeRate: (currency: string) => mockExchangeRates[currency],
}))

vi.mock('../../db/agents/repositories/salaryBandRepository', () => ({
  getSalaryBandsByCountry: () => mockSalaryBands,
  getCountryByUpstreamName: () => mockCountryRow,
}))

vi.mock('../../db/connection', () => ({
  getDatabase: () => ({
    prepare: () => ({
      all: () => [],
      run: vi.fn(),
    }),
    transaction: (fn: () => void) => fn,
  }),
}))

import { salaryNormalizationService } from '../salaryNormalizationService'

beforeEach(() => {
  mockExchangeRates = {
    USD: 1.0,
    MXN: 0.058,
    COP: 0.000235,
    BOB: 0.145,
    GBP: 1.26,
    PYG: 0.000131,
  }
  mockSalaryBands = []
  mockCountryRow = undefined
})

describe('inferCurrency', () => {
  it('should infer COP for CO with amount > 100,000', () => {
    const result = salaryNormalizationService.inferCurrency(7_500_000, 'CO')
    expect(result.currency).toBe('COP')
    expect(result.confidence).toBe('high')
  })

  it('should infer USD for CO with amount < 10,000', () => {
    const result = salaryNormalizationService.inferCurrency(5_000, 'CO')
    expect(result.currency).toBe('USD')
    expect(result.confidence).toBe('high')
  })

  it('should infer PYG for PRY with amount > 50,000', () => {
    const result = salaryNormalizationService.inferCurrency(3_000_000, 'PRY')
    expect(result.currency).toBe('PYG')
    expect(result.confidence).toBe('high')
  })

  it('should infer USD for PRY with amount < 10,000', () => {
    const result = salaryNormalizationService.inferCurrency(4_000, 'PRY')
    expect(result.currency).toBe('USD')
    expect(result.confidence).toBe('high')
  })

  it('should infer MXN for MX with amount > 8,000', () => {
    const result = salaryNormalizationService.inferCurrency(60_000, 'MX')
    expect(result.currency).toBe('MXN')
    expect(result.confidence).toBe('high')
  })

  it('should infer USD for MX with amount < 1,000', () => {
    const result = salaryNormalizationService.inferCurrency(500, 'MX')
    expect(result.currency).toBe('USD')
    expect(result.confidence).toBe('high')
  })

  it('should infer GBP for UK', () => {
    const result = salaryNormalizationService.inferCurrency(45_000, 'UK')
    expect(result.currency).toBe('GBP')
    expect(result.confidence).toBe('high')
  })

  it('should infer USD for US', () => {
    const result = salaryNormalizationService.inferCurrency(8_000, 'US')
    expect(result.currency).toBe('USD')
    expect(result.confidence).toBe('high')
  })

  it('should infer USD for BOL Senior with 3,000 (does not fit BOB Senior band)', () => {
    mockSalaryBands = [
      { band: 'Senior', min_monthly: 16_501, max_monthly: 21_500, country_code: 'BOL' },
    ]
    const result = salaryNormalizationService.inferCurrency(3_000, 'BOL', 'Senior')
    expect(result.currency).toBe('USD')
    expect(result.confidence).toBe('medium')
  })

  it('should infer BOB for BOL Trainee with 3,000 (fits BOB Trainee band)', () => {
    mockSalaryBands = [
      { band: 'Trainee', min_monthly: 2_500, max_monthly: 5_000, country_code: 'BOL' },
    ]
    mockCountryRow = { code: 'BOL', default_currency: 'BOB' }
    const result = salaryNormalizationService.inferCurrency(3_000, 'BOL', 'Trainee')
    expect(result.currency).toBe('BOB')
    expect(result.confidence).toBe('medium')
  })

  it('should infer BOB for BOL Intermediate with 12,000 (fits BOB Intermediate band)', () => {
    mockSalaryBands = [
      { band: 'Intermediate', min_monthly: 10_000, max_monthly: 16_500, country_code: 'BOL' },
    ]
    mockCountryRow = { code: 'BOL', default_currency: 'BOB' }
    const result = salaryNormalizationService.inferCurrency(12_000, 'BOL', 'Intermediate')
    expect(result.currency).toBe('BOB')
    expect(result.confidence).toBe('medium')
  })

  it('should return low confidence for unknown country', () => {
    const result = salaryNormalizationService.inferCurrency(5_000, 'ZZ')
    expect(result.confidence).toBe('low')
  })
})

describe('normalizeToUsdMonthly', () => {
  it('should convert 60,000 MXN monthly to ~3,480 USD/mo', () => {
    const result = salaryNormalizationService.normalizeToUsdMonthly(60_000, 'MXN')
    expect(result).toBeCloseTo(3_480, 0)
  })

  it('should convert 36 USD hourly to 5,760 USD/mo', () => {
    const result = salaryNormalizationService.normalizeToUsdMonthly(36, 'USD', 'hourly')
    expect(result).toBe(5_760)
  })

  it('should convert 7,500,000 COP monthly to ~1,762 USD/mo', () => {
    const result = salaryNormalizationService.normalizeToUsdMonthly(7_500_000, 'COP')
    expect(result).toBeCloseTo(1_762.5, 0)
  })

  it('should convert 45,000 GBP monthly to ~56,700 USD/mo', () => {
    const result = salaryNormalizationService.normalizeToUsdMonthly(45_000, 'GBP')
    expect(result).toBeCloseTo(56_700, 0)
  })

  it('should return null for unknown currency', () => {
    const result = salaryNormalizationService.normalizeToUsdMonthly(5_000, 'XYZ')
    expect(result).toBeNull()
  })
})

describe('normalizeSalary', () => {
  it('should return all nulls for null amount', () => {
    const result = salaryNormalizationService.normalizeSalary({
      amount: null,
      currency: 'USD',
      country: 'US',
    })
    expect(result.normalizedMonthlyUsd).toBeNull()
    expect(result.inferredCurrency).toBeNull()
    expect(result.currencyConfidence).toBeNull()
  })

  it('should return all nulls for zero amount', () => {
    const result = salaryNormalizationService.normalizeSalary({
      amount: 0,
      currency: 'USD',
      country: 'US',
    })
    expect(result.normalizedMonthlyUsd).toBeNull()
  })

  it('should use exact confidence when currency is provided', () => {
    const result = salaryNormalizationService.normalizeSalary({
      amount: 60_000,
      currency: 'MXN',
      country: 'MX',
    })
    expect(result.currencyConfidence).toBe('exact')
    expect(result.inferredCurrency).toBe('MXN')
    expect(result.normalizedMonthlyUsd).toBeCloseTo(3_480, 0)
  })

  it('should infer COP for null currency + CO + 9,000,000', () => {
    const result = salaryNormalizationService.normalizeSalary({
      amount: 9_000_000,
      currency: null,
      country: 'CO',
    })
    expect(result.inferredCurrency).toBe('COP')
    expect(result.currencyConfidence).toBe('high')
    expect(result.normalizedMonthlyUsd).toBeCloseTo(2_115, 0)
  })

  it('should infer USD for null currency + BOL + Senior + 3,000', () => {
    mockSalaryBands = [
      { band: 'Senior', min_monthly: 16_501, max_monthly: 21_500, country_code: 'BOL' },
    ]
    const result = salaryNormalizationService.normalizeSalary({
      amount: 3_000,
      currency: null,
      country: 'BOL',
      seniority: 'Senior',
    })
    expect(result.inferredCurrency).toBe('USD')
    expect(result.normalizedMonthlyUsd).toBe(3_000)
  })

  it('should resolve country name to code via getCountryByUpstreamName', () => {
    mockCountryRow = { code: 'MX', default_currency: 'MXN' }
    const result = salaryNormalizationService.normalizeSalary({
      amount: 60_000,
      currency: null,
      country: 'Mexico',
    })
    expect(result.inferredCurrency).toBe('MXN')
    expect(result.currencyConfidence).toBe('high')
  })

  it('should handle hourly period correctly', () => {
    const result = salaryNormalizationService.normalizeSalary({
      amount: 36,
      currency: 'USD',
      country: 'US',
      period: 'hourly',
    })
    expect(result.normalizedMonthlyUsd).toBe(5_760)
    expect(result.currencyConfidence).toBe('exact')
  })
})

describe('resolveCountryCode', () => {
  it('should return null for null input', () => {
    expect(salaryNormalizationService.resolveCountryCode(null)).toBeNull()
  })

  it('should return short codes as-is (uppercased)', () => {
    expect(salaryNormalizationService.resolveCountryCode('co')).toBe('CO')
    expect(salaryNormalizationService.resolveCountryCode('MX')).toBe('MX')
  })

  it('should resolve known country names from built-in map', () => {
    expect(salaryNormalizationService.resolveCountryCode('colombia')).toBe('CO')
    expect(salaryNormalizationService.resolveCountryCode('United States')).toBe('US')
    expect(salaryNormalizationService.resolveCountryCode('Bolivia')).toBe('BOL')
  })

  it('should use getCountryByUpstreamName when available', () => {
    mockCountryRow = { code: 'PRY', default_currency: 'PYG' }
    expect(salaryNormalizationService.resolveCountryCode('Paraguay')).toBe('PRY')
  })
})
