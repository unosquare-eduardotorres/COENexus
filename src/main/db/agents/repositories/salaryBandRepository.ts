import { getAgentsDatabase } from '../agentsConnection'

export interface SalaryBandRow {
  id: string
  country_code: string
  country_name: string
  currency: string
  pay_period: string
  job_family_group: string
  band: string
  level: number
  min_salary: number
  max_salary: number
  gross_margin_usd: number | null
  source: string
  is_active: number
  created_at: string
  updated_at: string
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
  country_name: string
  currency: string
  pay_period: string
  job_family_group: string
  band: string
  level: number
  min_salary: number
  max_salary: number
  gross_margin_usd?: number | null
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
    INSERT INTO salary_bands (country_code, country_name, currency, pay_period, job_family_group, band, level, min_salary, max_salary, gross_margin_usd, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (country_code, job_family_group, band, level)
    DO UPDATE SET
      country_name = excluded.country_name,
      currency = excluded.currency,
      pay_period = excluded.pay_period,
      min_salary = excluded.min_salary,
      max_salary = excluded.max_salary,
      gross_margin_usd = excluded.gross_margin_usd,
      source = excluded.source,
      updated_at = datetime('now')
  `).run(
    data.country_code,
    data.country_name,
    data.currency,
    data.pay_period,
    data.job_family_group,
    data.band,
    data.level,
    data.min_salary,
    data.max_salary,
    data.gross_margin_usd ?? null,
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
