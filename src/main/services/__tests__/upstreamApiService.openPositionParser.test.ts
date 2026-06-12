import { describe, expect, it, vi, beforeEach } from 'vitest'

const fetchPaged = vi.fn()

vi.mock('../upstream/upstreamApiClient', () => ({
  fetchPaged: (...args: unknown[]) => fetchPaged(...args),
  fetchAuthorized: vi.fn(),
}))

vi.mock('../../config', () => ({
  getConfig: () => ({ upstream: { apiUrl: 'https://upstream.example/' } }),
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { upstreamApiService } from '../upstreamApiService'

/**
 * The paged list returns each row as a positional array ordered by the columns
 * we request in buildOpenPositionColumns(). In that order the `Closed` date is
 * at index 21 (idx 22 is IsFromAssignments). These tests lock that mapping so a
 * future column reorder can't silently drop the close date again.
 */
function makeRow(overrides: Partial<{ id: number; closedIdx21: string | null }>): unknown[] {
  const row: unknown[] = new Array(23).fill(null)
  row[1] = overrides.id ?? 1            // Id
  row[2] = 'Acme'                        // Account
  row[4] = 'Software Engineering'        // CoE
  row[8] = 'ClosedWon'                   // Status
  row[20] = false                        // Replacement
  row[21] = overrides.closedIdx21 ?? null // Closed (date) — the column under test
  row[22] = false                        // IsFromAssignments
  return row
}

beforeEach(() => {
  fetchPaged.mockReset()
})

describe('getOpenPositionsPaged — dateClosed mapping', () => {
  it('reads dateClosed from index 21 for a closed row', async () => {
    fetchPaged.mockResolvedValue({
      payload: [makeRow({ id: 10, closedIdx21: '2026-02-15T00:00:00' })],
      filteredRecordCount: 1,
    })

    const { items } = await upstreamApiService.getOpenPositionsPaged('token', 0, 100)

    expect(items[0].dateClosed).toBe('2026-02-15T00:00:00')
  })

  it('returns null dateClosed for an open row (idx 21 null)', async () => {
    fetchPaged.mockResolvedValue({
      payload: [makeRow({ id: 11, closedIdx21: null })],
      filteredRecordCount: 1,
    })

    const { items } = await upstreamApiService.getOpenPositionsPaged('token', 0, 100)

    expect(items[0].dateClosed).toBeNull()
  })
})

describe('getAllOpenPositionsPaged — dateClosed mapping', () => {
  it('reads dateClosed from index 21 for a closed row', async () => {
    fetchPaged.mockResolvedValue({
      payload: [makeRow({ id: 20, closedIdx21: '2026-03-31T12:00:00' })],
      filteredRecordCount: 1,
    })

    const { items } = await upstreamApiService.getAllOpenPositionsPaged('token', 0, 100)

    expect(items[0].dateClosed).toBe('2026-03-31T12:00:00')
  })

  it('returns null dateClosed for an open row (idx 21 null)', async () => {
    fetchPaged.mockResolvedValue({
      payload: [makeRow({ id: 21, closedIdx21: null })],
      filteredRecordCount: 1,
    })

    const { items } = await upstreamApiService.getAllOpenPositionsPaged('token', 0, 100)

    expect(items[0].dateClosed).toBeNull()
  })
})
