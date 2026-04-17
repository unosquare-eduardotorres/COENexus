import { getAgentsDatabase } from '../agentsConnection'

export interface StakeholderProfileRow {
  id: string
  stakeholder_name: string
  account: string
  observed_rate_floor: number | null
  observed_rate_ceiling: number | null
  avg_accepted_rate: number | null
  accepted_countries: string
  rejected_countries: string
  untested_countries: string
  seniority_flexibility: number
  posted_seniorities: string
  accepted_seniorities: string
  avg_time_to_decision_days: number | null
  top_rejection_reasons: string
  top_acceptance_signals: string
  preference_summary: string
  data_points_count: number
  confidence_score: number
  last_inference_job_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateStakeholderProfileInput {
  stakeholder_name: string
  account: string
  observed_rate_floor?: number | null
  observed_rate_ceiling?: number | null
  avg_accepted_rate?: number | null
  accepted_countries?: string
  rejected_countries?: string
  untested_countries?: string
  seniority_flexibility?: number
  posted_seniorities?: string
  accepted_seniorities?: string
  avg_time_to_decision_days?: number | null
  top_rejection_reasons?: string
  top_acceptance_signals?: string
  preference_summary?: string
  data_points_count?: number
  confidence_score?: number
  last_inference_job_id?: string | null
}

export interface UpdateStakeholderProfileInput {
  observed_rate_floor?: number | null
  observed_rate_ceiling?: number | null
  avg_accepted_rate?: number | null
  accepted_countries?: string
  rejected_countries?: string
  untested_countries?: string
  seniority_flexibility?: number
  posted_seniorities?: string
  accepted_seniorities?: string
  avg_time_to_decision_days?: number | null
  top_rejection_reasons?: string
  top_acceptance_signals?: string
  preference_summary?: string
  data_points_count?: number
  confidence_score?: number
  last_inference_job_id?: string | null
}

export const stakeholderProfileRepository = {
  getByStakeholderAndAccount(stakeholder: string, account: string): StakeholderProfileRow | undefined {
    const db = getAgentsDatabase()
    return db.prepare(
      'SELECT * FROM stakeholder_profiles WHERE stakeholder_name = ? AND account = ?'
    ).get(stakeholder, account) as StakeholderProfileRow | undefined
  },

  listByAccount(account: string): StakeholderProfileRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM stakeholder_profiles
      WHERE account = ?
      ORDER BY confidence_score DESC, stakeholder_name ASC
    `).all(account) as StakeholderProfileRow[]
  },

  listAll(limit = 100, offset = 0): StakeholderProfileRow[] {
    const db = getAgentsDatabase()
    return db.prepare(`
      SELECT * FROM stakeholder_profiles
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as StakeholderProfileRow[]
  },

  upsert(input: CreateStakeholderProfileInput): StakeholderProfileRow {
    const db = getAgentsDatabase()
    const row = db.prepare(`
      INSERT INTO stakeholder_profiles (
        stakeholder_name, account, observed_rate_floor, observed_rate_ceiling,
        avg_accepted_rate, accepted_countries, rejected_countries, untested_countries,
        seniority_flexibility, posted_seniorities, accepted_seniorities,
        avg_time_to_decision_days, top_rejection_reasons, top_acceptance_signals,
        preference_summary, data_points_count, confidence_score, last_inference_job_id,
        updated_at
      ) VALUES (
        @stakeholder_name, @account, @observed_rate_floor, @observed_rate_ceiling,
        @avg_accepted_rate, @accepted_countries, @rejected_countries, @untested_countries,
        @seniority_flexibility, @posted_seniorities, @accepted_seniorities,
        @avg_time_to_decision_days, @top_rejection_reasons, @top_acceptance_signals,
        @preference_summary, @data_points_count, @confidence_score, @last_inference_job_id,
        datetime('now')
      )
      ON CONFLICT (stakeholder_name, account) DO UPDATE SET
        observed_rate_floor = excluded.observed_rate_floor,
        observed_rate_ceiling = excluded.observed_rate_ceiling,
        avg_accepted_rate = excluded.avg_accepted_rate,
        accepted_countries = excluded.accepted_countries,
        rejected_countries = excluded.rejected_countries,
        untested_countries = excluded.untested_countries,
        seniority_flexibility = excluded.seniority_flexibility,
        posted_seniorities = excluded.posted_seniorities,
        accepted_seniorities = excluded.accepted_seniorities,
        avg_time_to_decision_days = excluded.avg_time_to_decision_days,
        top_rejection_reasons = excluded.top_rejection_reasons,
        top_acceptance_signals = excluded.top_acceptance_signals,
        preference_summary = excluded.preference_summary,
        data_points_count = excluded.data_points_count,
        confidence_score = excluded.confidence_score,
        last_inference_job_id = excluded.last_inference_job_id,
        updated_at = datetime('now')
      RETURNING *
    `).get({
      stakeholder_name: input.stakeholder_name,
      account: input.account,
      observed_rate_floor: input.observed_rate_floor ?? null,
      observed_rate_ceiling: input.observed_rate_ceiling ?? null,
      avg_accepted_rate: input.avg_accepted_rate ?? null,
      accepted_countries: input.accepted_countries ?? '[]',
      rejected_countries: input.rejected_countries ?? '[]',
      untested_countries: input.untested_countries ?? '[]',
      seniority_flexibility: input.seniority_flexibility ?? 0,
      posted_seniorities: input.posted_seniorities ?? '[]',
      accepted_seniorities: input.accepted_seniorities ?? '[]',
      avg_time_to_decision_days: input.avg_time_to_decision_days ?? null,
      top_rejection_reasons: input.top_rejection_reasons ?? '[]',
      top_acceptance_signals: input.top_acceptance_signals ?? '[]',
      preference_summary: input.preference_summary ?? '',
      data_points_count: input.data_points_count ?? 0,
      confidence_score: input.confidence_score ?? 0,
      last_inference_job_id: input.last_inference_job_id ?? null,
    }) as StakeholderProfileRow
    return row
  },

  update(id: string, input: UpdateStakeholderProfileInput): boolean {
    const db = getAgentsDatabase()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: unknown[] = []

    for (const [key, value] of Object.entries(input)) {
      updates.push(`${key} = ?`)
      values.push(value)
    }

    values.push(id)
    const result = db.prepare(`
      UPDATE stakeholder_profiles
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)

    return result.changes > 0
  },

  delete(id: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM stakeholder_profiles WHERE id = ?').run(id)
    return result.changes > 0
  },
}
