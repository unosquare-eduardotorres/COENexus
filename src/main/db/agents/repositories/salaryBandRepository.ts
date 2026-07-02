// Stub — salary band data not yet seeded. Returns empty results so
// salaryNormalizationService can load without crashing.

interface SalaryBand {
  band: string
  min_monthly: number
  max_monthly: number
}

interface CountryRow {
  code: string
  default_currency: string
}

/** Returns salary bands for a given country code. */
export function getSalaryBandsByCountry(_countryCode: string): SalaryBand[] {
  return []
}

/** Looks up a country row by its upstream name. */
export function getCountryByUpstreamName(_name: string): CountryRow | null {
  return null
}
