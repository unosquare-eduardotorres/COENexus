import { catalogRepository } from '../db/repositories/catalogRepository'
import { createLogger } from './logger'

const log = createLogger('CatalogResolution')

export interface ResolvedSkill {
  skillName: string
  practiceId: number | null
  practiceName: string
  coeId: number | null
  coeName: string
}

// Fallback determined from catalog at build time, not hardcoded
let nicheFallback: ResolvedSkill | null = null

function buildNicheFallback(): ResolvedSkill {
  if (nicheFallback) return nicheFallback
  const practices = catalogRepository.getAllPractices()
  const niche = practices.find(p => p.name === 'Niche')
  const coeName = niche?.coes?.[0]?.name ?? 'Software Engineering'
  const coeId = niche?.coes?.[0]?.id ?? null
  nicheFallback = {
    skillName: '',
    practiceId: niche?.id ?? null,
    practiceName: 'Niche',
    coeId,
    coeName,
  }
  return nicheFallback
}

export const catalogResolutionService = {
  /**
   * Build a lookup map: lowercase skill/practice name → ResolvedSkill.
   * Mirrors useCoeSkillMapping.ts logic exactly:
   *   1. Map each skill name (lowercase) → its practice + COE
   *   2. Map each practice name (lowercase) → itself + COE (lower priority)
   */
  buildSkillMap(): Map<string, ResolvedSkill> {
    const practices = catalogRepository.getAllPractices()
    const map = new Map<string, ResolvedSkill>()

    for (const practice of practices) {
      const coe = practice.coes[0]
      if (!coe) continue

      const mapping: ResolvedSkill = {
        skillName: '',
        practiceId: practice.id,
        practiceName: practice.name,
        coeId: coe.id,
        coeName: coe.name,
      }

      // 1. Map each skill name
      for (const skill of practice.skills) {
        const key = skill.name.toLowerCase()
        if (!map.has(key)) {
          map.set(key, { ...mapping, skillName: skill.name })
        }
      }

      // 2. Map practice name itself (lower priority)
      const practiceKey = practice.name.toLowerCase()
      if (!map.has(practiceKey)) {
        map.set(practiceKey, { ...mapping, skillName: practice.name })
      }
    }

    return map
  },

  /**
   * Resolve a mainSkill string → { practice, COE }.
   * 3-level fuzzy matching (mirrors useCoeSkillMapping.mapSkillToCoe):
   *   1. Exact match (case-insensitive)
   *   2. Contains match (input contained in key, or key contained in input)
   *   3. Prefix match (key starts with input, or input starts with key)
   *   4. Fallback → Niche practice, its actual COE from catalog
   */
  resolve(mainSkill: string, skillMap: Map<string, ResolvedSkill>): ResolvedSkill {
    const fallback = buildNicheFallback()

    if (!mainSkill?.trim()) return { ...fallback, skillName: '' }

    const key = mainSkill.toLowerCase().trim()

    // 1. Exact match
    const exact = skillMap.get(key)
    if (exact) return { ...exact, skillName: mainSkill }

    // 2. Contains match
    for (const [mapKey, mapping] of skillMap) {
      if (mapKey.includes(key)) return { ...mapping, skillName: mainSkill }
    }

    // 3. Prefix match
    for (const [mapKey, mapping] of skillMap) {
      if (mapKey.startsWith(key) || key.startsWith(mapKey)) {
        return { ...mapping, skillName: mainSkill }
      }
    }

    // 4. Fallback: Niche practice with real COE from catalog
    log.debug('Unresolved skill, falling back to Niche', { mainSkill })
    return { ...fallback, skillName: mainSkill }
  },

  /** Invalidate cached fallback (call after catalog changes) */
  invalidateCache(): void {
    nicheFallback = null
  },
}
