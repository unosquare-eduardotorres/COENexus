import { syncRepository } from '../db/repositories/syncRepository'
import { fillRateGoalFor } from '../../shared/fillRateTaxonomy'
import type {
  ReportFillRateFilters,
  ReportFillRateResult,
  ReportFillRateCoeRow,
  ReportFillRateMonthPoint,
} from '../../shared/ipc-types'
import { createLogger } from './logger'

const log = createLogger('FillRateService')

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Parse 'YYYY-MM-DD' as local date parts (avoids UTC timezone shift). */
function parseLocalDate(iso: string): { year: number; month: number } {
  const [y, m] = iso.split('-').map(Number)
  return { year: y, month: m - 1 }
}

export const fillRateService = {
  evaluate(filters: ReportFillRateFilters): ReportFillRateResult {
    const coe = filters.coe !== 'all' ? filters.coe : null
    const rows = syncRepository.getFillRateData({
      startDate: filters.startDate,
      endDate: filters.endDate,
      coe,
      includeActive: filters.includeActive,
    })

    log.info('Fill rate evaluation', {
      rows: rows.length,
      startDate: filters.startDate,
      endDate: filters.endDate,
      coe: filters.coe,
      includeActive: filters.includeActive,
    })

    // --- Per-COE aggregation ---
    const coeMap = new Map<string, { closedWon: number; closedOther: number; activeCount: number }>()
    for (const row of rows) {
      const key = row.coe || 'Unassigned'
      const entry = coeMap.get(key) ?? { closedWon: 0, closedOther: 0, activeCount: 0 }
      if (row.position_status === 'ClosedWon') {
        entry.closedWon++
      } else if (row.position_status === 'Active' || row.position_status === 'Draft') {
        entry.activeCount++
      } else {
        // ClosedLost*, ClosedModified*, etc.
        entry.closedOther++
      }
      coeMap.set(key, entry)
    }

    const coes: ReportFillRateCoeRow[] = Array.from(coeMap.entries())
      .map(([coeName, stats]) => {
        const totalDenominator = stats.closedWon + stats.closedOther + stats.activeCount
        return {
          coe: coeName,
          closedWon: stats.closedWon,
          closedOther: stats.closedOther,
          activeCount: stats.activeCount,
          totalDenominator,
          fillRate: totalDenominator > 0
            ? Math.round((stats.closedWon / totalDenominator) * 1000) / 10
            : 0,
          goal: fillRateGoalFor(coeName),
        }
      })
      .sort((a, b) => a.coe.localeCompare(b.coe))

    // --- Monthly trend ---
    const trend = buildMonthlyTrend(rows, filters)

    // --- Overall ---
    const overallClosedWon = coes.reduce((s, c) => s + c.closedWon, 0)
    const overallDenominator = coes.reduce((s, c) => s + c.totalDenominator, 0)

    const syncStatus = syncRepository.getOpenPositionSyncStatus()

    return {
      coes,
      trend,
      overallFillRate: overallDenominator > 0
        ? Math.round((overallClosedWon / overallDenominator) * 1000) / 10
        : 0,
      overallClosedWon,
      overallDenominator,
      filters,
      lastSyncedAt: syncStatus.lastSyncedAt,
    }
  },
}

function buildMonthlyTrend(
  rows: Array<{ position_status: string; closed_date: string | null; created: string | null }>,
  filters: ReportFillRateFilters,
): ReportFillRateMonthPoint[] {
  // Generate list of months from startDate to endDate
  const start = parseLocalDate(filters.startDate)
  const end = parseLocalDate(filters.endDate)

  const months: { year: number; month: number }[] = []
  const cur = new Date(start.year, start.month, 1)
  const endBound = new Date(end.year, end.month, 1)
  while (cur <= endBound) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() })
    cur.setMonth(cur.getMonth() + 1)
  }

  // Bucket each row into its month
  const buckets = new Map<string, { closedWon: number; total: number }>()
  for (const m of months) {
    const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`
    buckets.set(key, { closedWon: 0, total: 0 })
  }

  for (const row of rows) {
    // Determine which date to use for bucketing
    let dateStr: string | null = null
    if (row.position_status.startsWith('Closed')) {
      dateStr = row.closed_date
    } else {
      // Active/Draft — use created date
      dateStr = row.created
    }
    if (!dateStr) continue

    // Extract YYYY-MM from the date string
    const monthKey = dateStr.slice(0, 7) // 'YYYY-MM'
    const bucket = buckets.get(monthKey)
    if (!bucket) continue

    bucket.total++
    if (row.position_status === 'ClosedWon') {
      bucket.closedWon++
    }
  }

  // Convert to output points
  return months.map(m => {
    const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`
    const bucket = buckets.get(key)!
    return {
      month: key,
      label: `${MONTH_LABELS[m.month]} ${m.year}`,
      closedWon: bucket.closedWon,
      totalDenominator: bucket.total,
      fillRate: bucket.total > 0
        ? Math.round((bucket.closedWon / bucket.total) * 1000) / 10
        : 0,
    }
  })
}
