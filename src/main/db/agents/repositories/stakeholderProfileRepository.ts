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
  total_candidates_presented: number
  total_candidates_accepted: number
  success_rate: number | null
  avg_published_rate: number | null
  avg_days_to_close: number | null
  total_closed_positions: number
  total_won_positions: number
  win_rate: number | null
  actual_accepted_tech_stacks_json: string | null
  actual_rejected_tech_stacks_json: string | null
  tech_stack_flexibility: string | null
  tag_vs_resume_divergence_rate: number | null
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
  total_candidates_presented?: number
  total_candidates_accepted?: number
  success_rate?: number | null
  avg_published_rate?: number | null
  avg_days_to_close?: number | null
  total_closed_positions?: number
  total_won_positions?: number
  win_rate?: number | null
  actual_accepted_tech_stacks_json?: string | null
  actual_rejected_tech_stacks_json?: string | null
  tech_stack_flexibility?: string | null
  tag_vs_resume_divergence_rate?: number | null
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
  total_candidates_presented?: number
  total_candidates_accepted?: number
  success_rate?: number | null
  avg_published_rate?: number | null
  avg_days_to_close?: number | null
  total_closed_positions?: number
  total_won_positions?: number
  win_rate?: number | null
  actual_accepted_tech_stacks_json?: string | null
  actual_rejected_tech_stacks_json?: string | null
  tech_stack_flexibility?: string | null
  tag_vs_resume_divergence_rate?: number | null
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
        preference_summary,
        actual_accepted_tech_stacks_json, actual_rejected_tech_stacks_json,
        tech_stack_flexibility, tag_vs_resume_divergence_rate,
        total_candidates_presented, total_candidates_accepted,
        success_rate, avg_published_rate, avg_days_to_close,
        total_closed_positions, total_won_positions, win_rate,
        data_points_count, confidence_score, last_inference_job_id,
        updated_at
      ) VALUES (
        @stakeholder_name, @account, @observed_rate_floor, @observed_rate_ceiling,
        @avg_accepted_rate, @accepted_countries, @rejected_countries, @untested_countries,
        @seniority_flexibility, @posted_seniorities, @accepted_seniorities,
        @avg_time_to_decision_days, @top_rejection_reasons, @top_acceptance_signals,
        @preference_summary,
        @actual_accepted_tech_stacks_json, @actual_rejected_tech_stacks_json,
        @tech_stack_flexibility, @tag_vs_resume_divergence_rate,
        @total_candidates_presented, @total_candidates_accepted,
        @success_rate, @avg_published_rate, @avg_days_to_close,
        @total_closed_positions, @total_won_positions, @win_rate,
        @data_points_count, @confidence_score, @last_inference_job_id,
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
        actual_accepted_tech_stacks_json = excluded.actual_accepted_tech_stacks_json,
        actual_rejected_tech_stacks_json = excluded.actual_rejected_tech_stacks_json,
        tech_stack_flexibility = excluded.tech_stack_flexibility,
        tag_vs_resume_divergence_rate = excluded.tag_vs_resume_divergence_rate,
        total_candidates_presented = excluded.total_candidates_presented,
        total_candidates_accepted = excluded.total_candidates_accepted,
        success_rate = excluded.success_rate,
        avg_published_rate = excluded.avg_published_rate,
        avg_days_to_close = excluded.avg_days_to_close,
        total_closed_positions = excluded.total_closed_positions,
        total_won_positions = excluded.total_won_positions,
        win_rate = excluded.win_rate,
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
      actual_accepted_tech_stacks_json: input.actual_accepted_tech_stacks_json ?? null,
      actual_rejected_tech_stacks_json: input.actual_rejected_tech_stacks_json ?? null,
      tech_stack_flexibility: input.tech_stack_flexibility ?? null,
      tag_vs_resume_divergence_rate: input.tag_vs_resume_divergence_rate ?? null,
      total_candidates_presented: input.total_candidates_presented ?? 0,
      total_candidates_accepted: input.total_candidates_accepted ?? 0,
      success_rate: input.success_rate ?? null,
      avg_published_rate: input.avg_published_rate ?? null,
      avg_days_to_close: input.avg_days_to_close ?? null,
      total_closed_positions: input.total_closed_positions ?? 0,
      total_won_positions: input.total_won_positions ?? 0,
      win_rate: input.win_rate ?? null,
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

  deleteByStakeholderAndAccount(stakeholder: string, account: string): boolean {
    const db = getAgentsDatabase()
    const result = db.prepare(
      'DELETE FROM stakeholder_profiles WHERE stakeholder_name = ? AND account = ?',
    ).run(stakeholder, account)
    return result.changes > 0
  },

  deleteByAccount(account: string): number {
    const db = getAgentsDatabase()
    const result = db.prepare('DELETE FROM stakeholder_profiles WHERE account = ?').run(account)
    return result.changes
  },
}
