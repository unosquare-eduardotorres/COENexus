import { describe, expect, it, vi } from 'vitest'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

vi.mock('../catalogService', () => ({
  catalogService: {},
}))

import { isClosedInfoStale } from '../sync/syncUtils'
import type { SyncedOpenPositionRow } from '../../db/repositories/syncRepository'
import type { OpenPositionListItem } from '../upstreamApiService'

/**
 * isClosedInfoStale forces a re-upsert when upstream now carries close info the
 * stored row is missing/stale (a real close date we don't have, or a granular
 * Closed* status we haven't captured). These tests lock the truth table so the
 * self-healing close-date backfill keeps converging to false once corrected.
 */
function makeRow(overrides: Partial<SyncedOpenPositionRow> = {}): SyncedOpenPositionRow {
  return {
    id: 1,
    upstream_id: 100,
    account: 'Acme',
    coe: 'Software Engineering',
    practice: '',
    stakeholder: '',
    main_skill: '',
    countries: '',
    seniorities: '',
    available_range: '',
    account_overview: '',
    job_description: '',
    job_title: '',
    position_status: 'Active',
    aging: 0,
    created: null,
    ready_date: null,
    last_modification: null,
    sourcing: '',
    replacement: 0,
    vertical_industry: '',
    in_office: 0,
    csu: '',
    cs: '',
    closed_date: null,
    closed_reason: null,
    is_ready: 0,
    is_promotion: 0,
    maximum_rate: null,
    minimum_rate: null,
    additional_skills: '[]',
    created_with_assignments_tool: null,
    candidates_presented: 0,
    last_discussion_date: null,
    status: 'synced',
    status_reason: null,
    synced_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makePos(overrides: Partial<OpenPositionListItem> = {}): OpenPositionListItem {
  return {
    id: 100,
    account: 'Acme',
    coe: 'Software Engineering',
    practice: '',
    stakeholder: '',
    mainSkill: '',
    countries: '',
    seniorities: '',
    availableRange: '',
    status: 'Active',
    aging: 0,
    created: '',
    readyDate: '',
    lastModification: '',
    sourcing: '',
    replacement: false,
    candidatesPresented: 0,
    lastDiscussionDate: '',
    closedReason: '',
    dateClosed: null,
    ...overrides,
  } as OpenPositionListItem
}

describe('isClosedInfoStale', () => {
  it('returns false when there is no existing row', () => {
    expect(isClosedInfoStale(undefined, makePos())).toBe(false)
  })

  it('returns false for an active position (no close date, not Closed)', () => {
    const existing = makeRow({ position_status: 'Active', closed_date: null })
    const pos = makePos({ status: 'Active', dateClosed: null })
    expect(isClosedInfoStale(existing, pos)).toBe(false)
  })

  it('returns true when upstream has a real close date the stored row lacks (date stale)', () => {
    const existing = makeRow({ position_status: 'Closed', closed_date: null })
    const pos = makePos({ status: 'ClosedWon', dateClosed: '2026-03-15' })
    expect(isClosedInfoStale(existing, pos)).toBe(true)
  })

  it('returns true when only the granular status differs and dates match (status stale)', () => {
    const existing = makeRow({ position_status: 'Closed', closed_date: '2026-03-15' })
    const pos = makePos({ status: 'ClosedWon', dateClosed: '2026-03-15' })
    expect(isClosedInfoStale(existing, pos)).toBe(true)
  })

  it('returns false once the row has converged to upstream close info', () => {
    const existing = makeRow({ position_status: 'ClosedWon', closed_date: '2026-03-15' })
    const pos = makePos({ status: 'ClosedWon', dateClosed: '2026-03-15' })
    expect(isClosedInfoStale(existing, pos)).toBe(false)
  })
})
