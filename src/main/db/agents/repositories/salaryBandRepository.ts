import { getAgentsDatabase } from '../agentsConnection'

export interface SalaryBandRow {
  id: string
  country_code: string
  job_family_group: string
  band: string
  level: number
  min_monthly: number
  max_monthly: number
  source: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface CountryRow {
  code: string
  name: string
  default_currency: string
  upstream_catalog_name: string | null
  aliases_json: string
  is_active: number
  created_at: string
}

export interface JobFamilyRow {
  id: string
  name: string
  job_family_group: string
  is_active: number
  created_at: string
}

export interface UpsertSalaryBandData {
  country_code: string
  job_family_group: string
  band: string
  level: number
  min_monthly: number
  max_monthly: number
  source?: string
}

export function getAllSalaryBands(): SalaryBandRow[] {
  const db = getAgentsDatabase()
  return db.prepare(
    'SELECT * FROM salary_bands WHERE is_active = 1 ORDER BY country_code, job_family_group, level'
  ).all() as SalaryBandRow[]
}

export function getSalaryBandsByCountry(countryCode: string): SalaryBandRow[] {
  const db = getAgentsDatabase()
  return db.prepare(
    'SELECT * FROM salary_bands WHERE country_code = ? AND is_active = 1 ORDER BY job_family_group, level'
  ).all(countryCode) as SalaryBandRow[]
}

export function getSalaryBandsByGroup(jobFamilyGroup: string): SalaryBandRow[] {
  const db = getAgentsDatabase()
  return db.prepare(
    'SELECT * FROM salary_bands WHERE job_family_group = ? AND is_active = 1 ORDER BY country_code, level'
  ).all(jobFamilyGroup) as SalaryBandRow[]
}

export function getSalaryBand(
  countryCode: string,
  jobFamilyGroup: string,
  band: string,
  level: number
): SalaryBandRow | undefined {
  const db = getAgentsDatabase()
  return db.prepare(
    'SELECT * FROM salary_bands WHERE country_code = ? AND job_family_group = ? AND band = ? AND level = ?'
  ).get(countryCode, jobFamilyGroup, band, level) as SalaryBandRow | undefined
}

export function upsertSalaryBand(data: UpsertSalaryBandData): void {
  const db = getAgentsDatabase()
  db.prepare(`
    INSERT INTO salary_bands (country_code, job_family_group, band, level, min_monthly, max_monthly, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (country_code, job_family_group, band, level)
    DO UPDATE SET
      min_monthly = excluded.min_monthly,
      max_monthly = excluded.max_monthly,
      source = excluded.source,
      updated_at = datetime('now')
  `).run(
    data.country_code,
    data.job_family_group,
    data.band,
    data.level,
    data.min_monthly,
    data.max_monthly,
    data.source ?? 'manual'
  )
}

export function deleteSalaryBand(id: string): void {
  const db = getAgentsDatabase()
  db.prepare('DELETE FROM salary_bands WHERE id = ?').run(id)
}

export function getJobFamilyGroup(jobFamilyName: string): string | undefined {
  const db = getAgentsDatabase()
  const row = db.prepare(
    'SELECT job_family_group FROM job_families WHERE name = ? AND is_active = 1'
  ).get(jobFamilyName) as { job_family_group: string } | undefined
  return row?.job_family_group
}

export function getAllJobFamilies(): JobFamilyRow[] {
  const db = getAgentsDatabase()
  return db.prepare(
    'SELECT * FROM job_families WHERE is_active = 1 ORDER BY job_family_group, name'
  ).all() as JobFamilyRow[]
}

export function upsertJobFamily(name: string, group: string): void {
  const db = getAgentsDatabase()
  db.prepare(`
    INSERT INTO job_families (name, job_family_group)
    VALUES (?, ?)
    ON CONFLICT (name)
    DO UPDATE SET job_family_group = excluded.job_family_group
  `).run(name, group)
}

export function getAllCountries(): CountryRow[] {
  const db = getAgentsDatabase()
  return db.prepare(
    'SELECT * FROM countries WHERE is_active = 1 ORDER BY name'
  ).all() as CountryRow[]
}

export function getCountryByCode(code: string): CountryRow | undefined {
  const db = getAgentsDatabase()
  return db.prepare(
    'SELECT * FROM countries WHERE code = ?'
  ).get(code) as CountryRow | undefined
}

export function getCountryByUpstreamName(name: string): CountryRow | undefined {
  const db = getAgentsDatabase()
  const byExact = db.prepare(
    'SELECT * FROM countries WHERE upstream_catalog_name = ?'
  ).get(name) as CountryRow | undefined
  if (byExact) return byExact

  const all = db.prepare('SELECT * FROM countries WHERE is_active = 1').all() as CountryRow[]
  return all.find(c => {
    try {
      const aliases = JSON.parse(c.aliases_json) as string[]
      return aliases.some(a => a.toLowerCase() === name.toLowerCase())
    } catch {
      return false
    }
  })
}

export function upsertCountry(data: {
  code: string
  name: string
  default_currency: string
  upstream_catalog_name?: string
  aliases_json?: string
}): void {
  const db = getAgentsDatabase()
  db.prepare(`
    INSERT INTO countries (code, name, default_currency, upstream_catalog_name, aliases_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (code)
    DO UPDATE SET
      name = excluded.name,
      default_currency = excluded.default_currency,
      upstream_catalog_name = excluded.upstream_catalog_name,
      aliases_json = excluded.aliases_json
  `).run(
    data.code,
    data.name,
    data.default_currency,
    data.upstream_catalog_name ?? null,
    data.aliases_json ?? '[]'
  )
}
