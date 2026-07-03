// Hook that builds a mainSkill → { practice, coeName, coeId } lookup from the catalog.

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CatalogCoe } from '../../../../shared/ipc-types'

interface SkillMapping {
  practice: string
  coeName: string
  coeId: number
}

const FALLBACK_COE_NAME = 'Unmapped'

export function useCoeSkillMapping(catalogCoes: CatalogCoe[]) {
  const [skillMap, setSkillMap] = useState<Map<string, SkillMapping>>(new Map())
  const [loading, setLoading] = useState(true)
  const prevCoeRef = useRef<CatalogCoe[]>([])

  useEffect(() => {
    // Don't rebuild if same reference
    if (prevCoeRef.current === catalogCoes) return
    prevCoeRef.current = catalogCoes

    if (catalogCoes.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    window.api.catalog.getPractices()
      .then(practices => {
        if (cancelled) return

        const map = new Map<string, SkillMapping>()

        for (const practice of practices) {
          // Each practice has skills[] and coes[]
          const coe = practice.coes[0] // first associated COE
          if (!coe) continue

          const mapping: SkillMapping = {
            practice: practice.name,
            coeName: coe.name,
            coeId: coe.id,
          }

          // 1. Map each skill name
          for (const skill of practice.skills) {
            const key = skill.name.toLowerCase()
            if (!map.has(key)) map.set(key, mapping)
          }

          // 2. Map the practice name itself (lower priority — only if no skill claimed the key)
          const practiceKey = practice.name.toLowerCase()
          if (!map.has(practiceKey)) map.set(practiceKey, mapping)
        }

        setSkillMap(map)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [catalogCoes])

  const mapSkillToCoe = useCallback((mainSkill: string): SkillMapping => {
    if (!mainSkill) {
      return { practice: 'Niche', coeName: FALLBACK_COE_NAME, coeId: 0 }
    }

    const key = mainSkill.toLowerCase()

    // 1. Exact match (skill name or practice name)
    const exact = skillMap.get(key)
    if (exact) return exact

    // 2. Check if input is contained in any map key (e.g., "c#" in "c# / .net")
    for (const [mapKey, mapping] of skillMap) {
      if (mapKey.includes(key)) return mapping
    }

    // 3. Prefix match: map key starts with input (e.g., "qa" → "qa sdet")
    //    or input starts with map key (e.g., "design generalist" starts with "design")
    for (const [mapKey, mapping] of skillMap) {
      if (mapKey.startsWith(key) || key.startsWith(mapKey)) return mapping
    }

    // Fallback: unmapped skills get their own bucket so they don't pollute real COE filters
    return { practice: 'Niche', coeName: FALLBACK_COE_NAME, coeId: 0 }
  }, [skillMap])

  return { mapSkillToCoe, loading }
}
