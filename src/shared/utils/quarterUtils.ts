/**
 * Shared quarter utilities used across sync, report, and renderer layers.
 */

/** Convert quarter label (e.g. "Q2") to its ordinal number (2). */
export function quarterToNumber(q: string): number {
  return parseInt(q.replace('Q', ''), 10)
}

/** Build a dynamic 3-year window: [currentYear - 1, currentYear, currentYear + 1]. */
export function buildYearOptions(): number[] {
  const now = new Date().getFullYear()
  return [now - 1, now, now + 1]
}
