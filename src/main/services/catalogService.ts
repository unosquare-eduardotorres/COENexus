import { getConfig } from '../config'
import { createLogger } from './logger'
import { mapKeysToCamelCase } from './upstream/caseMapper'

const log = createLogger('CatalogService')

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
let feedbackCache: Map<number, string> | null = null

async function fetchAuthorized<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { 'x-sharepoint-token': token },
  })
  if (!response.ok) {
    log.error(`Catalog API error: ${url}`, new Error(`${response.status} ${response.statusText}`), { status: response.status, url })
    throw new Error(`Catalog API ${response.status}: ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export const catalogService = {
  async getSeniorities(token: string): Promise<Map<number, string>> {
    if (senioritiesCache) {
      log.debug('Seniorities cache hit')
      return senioritiesCache
    }
    const { catalog } = getConfig()
    log.info('Loading seniorities catalog from API')
    const raw = await fetchAuthorized<Record<string, unknown>[]>(`${catalog.apiUrl}seniorities`, token)
    const items = raw.map(item => mapKeysToCamelCase<KeyTextItem>(item))
    senioritiesCache = new Map(items.map(i => [i.key, i.text]))
    log.info('Seniorities catalog loaded', { count: senioritiesCache.size })
    return senioritiesCache
  },

  async getMainSkills(token: string): Promise<Map<number, string>> {
    if (mainSkillsCache) {
      log.debug('MainSkills cache hit')
      return mainSkillsCache
    }
    const { catalog } = getConfig()
    log.info('Loading main skills catalog from API')
    const raw = await fetchAuthorized<Record<string, unknown>[]>(`${catalog.apiUrl}main-skills`, token)
    const items = raw.map(item => mapKeysToCamelCase<ValueLabelItem>(item))
    mainSkillsCache = new Map(items.map(i => [i.value, i.label]))
    log.info('Main skills catalog loaded', { count: mainSkillsCache.size })
    return mainSkillsCache
  },

  async getCountries(token: string): Promise<Map<number, string>> {
    if (countriesCache) {
      log.debug('Countries cache hit')
      return countriesCache
    }
    const { catalog } = getConfig()
    log.info('Loading countries catalog from API')
    const raw = await fetchAuthorized<Record<string, unknown>[]>(`${catalog.apiUrl}locations/countries/true`, token)
    const items = raw.map(item => mapKeysToCamelCase<ValueLabelItem>(item))
    countriesCache = new Map(items.map(i => [i.value, i.label]))
    log.info('Countries catalog loaded', { count: countriesCache.size })
    return countriesCache
  },

  async getCandidatePositionFeedbacks(token: string): Promise<Map<number, string>> {
    if (feedbackCache) {
      log.debug('Feedback cache hit')
      return feedbackCache
    }
    const { catalog } = getConfig()
    log.info('Loading candidate position feedbacks catalog from API')
    const raw = await fetchAuthorized<Record<string, unknown>[]>(`${catalog.apiUrl}candidate-position-feedbacks`, token)
    const items = raw.map(item => mapKeysToCamelCase<ValueLabelItem>(item))
    feedbackCache = new Map(items.map(i => [i.value, i.label]))
    log.info('Feedback catalog loaded', { count: feedbackCache.size })
    return feedbackCache
  },

  clearCache(): void {
    senioritiesCache = null
    mainSkillsCache = null
    countriesCache = null
    feedbackCache = null
    log.info('Catalog cache cleared')
  },
}
