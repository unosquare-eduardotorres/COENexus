import { describe, it, expect } from 'vitest'
import { fetchPaged, type PagedResponse } from '../upstream/upstreamApiClient'
import { buildPrrColumns, buildPrrPresentationColumns } from '../upstream/upstreamColumnDefs'
import { getString, getInt, getDateTime } from '../upstream/upstreamRowParsers'

const TOKEN = process.env.PRR_SYNC_TOKEN ?? ''
const API_BASE = 'https://internal-api.unosquare.com/elp/'

const describeIfToken = TOKEN ? describe : describe.skip

describeIfToken('PRR Sync — Live API Tests', () => {
  it('should fetch PRRs paged from the real API', async () => {
    const paged: PagedResponse = await fetchPaged(
      `${API_BASE}ProjectTransition/paged?ProjectTransitionType=3&active=true`,
      TOKEN,
      { skip: 0, take: 10, columns: buildPrrColumns() }
    )

    expect(paged.payload).toBeDefined()
    expect(Array.isArray(paged.payload)).toBe(true)
    expect(paged.filteredRecordCount).toBeGreaterThan(0)
    expect(paged.payload.length).toBeGreaterThan(0)
    expect(paged.payload.length).toBeLessThanOrEqual(10)

    const row = paged.payload[0]
    expect(row.length).toBeGreaterThanOrEqual(14)

    const id = getInt(row, 0)
    const employee = getString(row, 1)
    const account = getString(row, 2)
    const mainSkill = getString(row, 4)
    const transitionStatus = getString(row, 6)

    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)
    expect(employee.length).toBeGreaterThan(0)
    expect(account.length).toBeGreaterThan(0)
    expect(mainSkill.length).toBeGreaterThan(0)
    expect(transitionStatus.length).toBeGreaterThan(0)

    console.log(`✓ Fetched ${paged.payload.length} of ${paged.filteredRecordCount} PRRs`)
    console.log(`  First: ${employee} @ ${account} (${mainSkill}) — ${transitionStatus}`)
  })

  it('should map all PRR fields correctly from the response', async () => {
    const paged = await fetchPaged(
      `${API_BASE}ProjectTransition/paged?ProjectTransitionType=3&active=true`,
      TOKEN,
      { skip: 0, take: 5, columns: buildPrrColumns() }
    )

    for (const row of paged.payload) {
      const mapped = {
        id: getInt(row, 0),
        employee: getString(row, 1),
        account: getString(row, 2),
        team: getString(row, 3),
        mainSkill: getString(row, 4),
        seniority: getString(row, 5),
        transitionStatus: getString(row, 6),
        transitionSubType: getString(row, 7),
        location: getString(row, 8),
        requestDate: getDateTime(row, 9),
        daysSinceLastInterview: getString(row, 10),
        impact: getString(row, 11),
        attritionRisk: getString(row, 12),
        comments: getString(row, 13),
      }

      expect(mapped.id).toBeGreaterThan(0)
      expect(mapped.employee).toBeTruthy()
      expect(mapped.transitionSubType).toBe('Project Reallocation Request')
      expect(['Low', 'Medium', 'High', '']).toContain(mapped.impact)
      expect(['Low', 'Medium', 'High', '']).toContain(mapped.attritionRisk)
    }
  })

  it('should fetch presentations for a known PRR', async () => {
    const paged = await fetchPaged(
      `${API_BASE}ProjectTransition/paged?ProjectTransitionType=3&active=true`,
      TOKEN,
      { skip: 0, take: 1, columns: buildPrrColumns() }
    )
    expect(paged.payload.length).toBeGreaterThan(0)
    const prrId = getInt(paged.payload[0], 0)

    const presPaged = await fetchPaged(
      `${API_BASE}projectTransition/presentations/${prrId}`,
      TOKEN,
      { skip: 0, take: 100, columns: buildPrrPresentationColumns(), counter: 1 }
    )

    expect(presPaged.payload).toBeDefined()
    expect(Array.isArray(presPaged.payload)).toBe(true)

    console.log(`✓ PRR ${prrId} has ${presPaged.payload.length} presentations`)

    if (presPaged.payload.length > 0) {
      const presRow = presPaged.payload[0]
      expect(presRow.length).toBeGreaterThanOrEqual(6)

      const openPositionId = getInt(presRow, 0)
      const presAccount = getString(presRow, 1)
      const candidateStatus = getString(presRow, 5)

      expect(openPositionId).toBeGreaterThan(0)
      expect(presAccount.length).toBeGreaterThan(0)
      expect(candidateStatus.length).toBeGreaterThan(0)

      console.log(`  First presentation: OP ${openPositionId} @ ${presAccount} — ${candidateStatus}`)
    }
  })

  it('should handle pagination correctly', async () => {
    const page1 = await fetchPaged(
      `${API_BASE}ProjectTransition/paged?ProjectTransitionType=3&active=true`,
      TOKEN,
      { skip: 0, take: 3, columns: buildPrrColumns() }
    )
    const page2 = await fetchPaged(
      `${API_BASE}ProjectTransition/paged?ProjectTransitionType=3&active=true`,
      TOKEN,
      { skip: 3, take: 3, columns: buildPrrColumns() }
    )

    expect(page1.filteredRecordCount).toBe(page2.filteredRecordCount)

    if (page1.filteredRecordCount > 3) {
      const page1Ids = page1.payload.map(r => getInt(r, 0))
      const page2Ids = page2.payload.map(r => getInt(r, 0))
      const overlap = page1Ids.filter(id => page2Ids.includes(id))
      expect(overlap).toHaveLength(0)
    }
  })

  it('should reject with invalid token', async () => {
    await expect(
      fetchPaged(
        `${API_BASE}ProjectTransition/paged?ProjectTransitionType=3&active=true`,
        'invalid-token-abc123',
        { skip: 0, take: 1, columns: buildPrrColumns() }
      )
    ).rejects.toThrow()
  })
})
