import { getConfig } from '../config'

interface KeyTextItem {
  key: number
  text: string
}

interface ValueLabelItem {
  value: number
  label: string
}

let senioritiesCache: Map<number, string> | null = null
let mainSkillsCache: Map<number, string> | null = null
let countriesCache: Map<number, string> | null = null

async function fetchAuthorized<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { 'x-sharepoint-token': token },
  })
  if (!response.ok) throw new Error(`Catalog API ${response.status}: ${response.statusText}`)
  return response.json() as Promise<T>
}

export const catalogService = {
  async getSeniorities(token: string): Promise<Map<number, string>> {
    if (senioritiesCache) return senioritiesCache
    const { catalog } = getConfig()
    const items = await fetchAuthorized<KeyTextItem[]>(`${catalog.apiUrl}seniorities`, token)
    senioritiesCache = new Map(items.map(i => [i.key, i.text]))
    return senioritiesCache
  },

  async getMainSkills(token: string): Promise<Map<number, string>> {
    if (mainSkillsCache) return mainSkillsCache
    const { catalog } = getConfig()
    const items = await fetchAuthorized<ValueLabelItem[]>(`${catalog.apiUrl}main-skills`, token)
    mainSkillsCache = new Map(items.map(i => [i.value, i.label]))
    return mainSkillsCache
  },

  async getCountries(token: string): Promise<Map<number, string>> {
    if (countriesCache) return countriesCache
    const { catalog } = getConfig()
    const items = await fetchAuthorized<ValueLabelItem[]>(`${catalog.apiUrl}locations/countries/true`, token)
    countriesCache = new Map(items.map(i => [i.value, i.label]))
    return countriesCache
  },

  clearCache(): void {
    senioritiesCache = null
    mainSkillsCache = null
    countriesCache = null
  },
}
