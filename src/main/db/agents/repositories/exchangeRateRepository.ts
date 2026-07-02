// Stub — exchange rate data not yet seeded. Returns empty rates so
// salaryNormalizationService can load without crashing.

/** Returns a map of currency code → USD multiplier. */
export function getAllExchangeRates(): Record<string, number> {
  return { USD: 1 }
}
