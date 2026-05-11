import type { PersonaNote, TeamCompositionEntry } from '../upstreamApiService'
import { catalogService } from '../catalogService'
import { createLogger } from '../logger'

const log = createLogger('SyncUtils')

export const SUPPORTED_RESUME_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png'])

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

export function findResumeNote(notes: PersonaNote[]): PersonaNote | null {
  return notes
    .filter(n => n.noteTypeName === 'Resume' && n.filename && SUPPORTED_RESUME_EXTENSIONS.has(getExtension(n.filename)))
    .sort((a, b) => (b.dateCreated || '').localeCompare(a.dateCreated || ''))
    [0] ?? null
}

export async function loadCatalogOrEmpty(name: string, getter: () => Promise<Map<number, string>>): Promise<Map<number, string>> {
  try {
    return await getter()
  } catch {
    log.warn(`Failed to load ${name} catalog — using fallback`)
    return new Map()
  }
}

export async function loadOrEmpty<T>(name: string, getter: () => Promise<T[]>): Promise<T[]> {
  try {
    return await getter()
  } catch {
    log.warn(`Failed to load ${name} — continuing with empty list`)
    return []
  }
}

export function isBenchFromComposition(
  compositions: TeamCompositionEntry[]
): { isBench: boolean; benchTeam: string | null } {
  if (compositions.length === 0) return { isBench: false, benchTeam: null }

  const activeEntries = compositions.filter(c => !c.endDate)
  const pool = activeEntries.length > 0 ? activeEntries : compositions

  const maxStart = Math.max(...pool.map(c => Date.parse(c.startDate) || 0))
  const ONE_DAY = 86_400_000
  const currentEntries = pool.filter(c => {
    const d = Date.parse(c.startDate) || 0
    return (maxStart - d) < ONE_DAY
  })

  const benchEntry = currentEntries.find(c =>
    c.team.toLowerCase().includes('bench') || c.project.toLowerCase().includes('bench')
  )

  if (benchEntry) {
    return { isBench: true, benchTeam: `${benchEntry.account} - ${benchEntry.team} - ${benchEntry.project}` }
  }

  return { isBench: false, benchTeam: null }
}

export async function loadCatalogs(token: string) {
  const seniorities = await catalogService.getSeniorities(token)
  const mainSkills = await loadCatalogOrEmpty('MainSkill', () => catalogService.getMainSkills(token))
  const countries = await loadCatalogOrEmpty('Country', () => catalogService.getCountries(token))
  return { seniorities, mainSkills, countries }
}
