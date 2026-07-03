// Pure functions for PLB exclusion localStorage read/write. No React dependencies.
// Key format: plb-exclusions:{year}:{quarter}:{practice}

export interface PLBExclusionData {
  placements: string[]    // keys like "Adam Daly|2026-03-15|Harvard Business School"
  offboardings: string[]  // keys like "John Smith|2026-05-01|Acme Corp"
}

function buildKey(year: number, quarter: string, practice: string): string {
  return `plb-exclusions:${year}:${quarter}:${practice}`
}

export function loadExclusions(year: number, quarter: string, practice: string): PLBExclusionData {
  try {
    const raw = localStorage.getItem(buildKey(year, quarter, practice))
    if (raw) {
      const parsed = JSON.parse(raw) as PLBExclusionData
      if (parsed && Array.isArray(parsed.placements) && Array.isArray(parsed.offboardings)) {
        return parsed
      }
    }
  } catch {
    // corrupted — return empty
  }
  return { placements: [], offboardings: [] }
}

export function saveExclusions(year: number, quarter: string, practice: string, data: PLBExclusionData): void {
  localStorage.setItem(buildKey(year, quarter, practice), JSON.stringify(data))
}

export function clearExclusions(year: number, quarter: string, practice: string): void {
  localStorage.removeItem(buildKey(year, quarter, practice))
}

export function hasStoredExclusions(year: number, quarter: string, practice: string): boolean {
  return localStorage.getItem(buildKey(year, quarter, practice)) !== null
}
