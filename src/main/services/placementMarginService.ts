import { syncRepository } from '../db/repositories/syncRepository'
import { createLogger } from './logger'
import { quarterToNumber } from '../../shared/utils/quarterUtils'
import type {
  PlacementMarginReportResult,
  PlacementMarginAccountRow,
  PlacementMarginEntryDto,
} from '../../shared/ipc-types'

const log = createLogger('PlacementMarginService')

export const placementMarginService = {
  evaluate(year: number, quarter: string): PlacementMarginReportResult | null {
    const isAll = quarter === 'ALL'
    const qNum = isAll ? 0 : quarterToNumber(quarter)

    // Summary stats come from the summary table (populated by YtdTotals)
    const summary = syncRepository.getPlacementMarginSummary(year, qNum)
      // Fall back: if synced quarter doesn't match (YTD stores with the quarter used at sync time),
      // try to find any summary for this year
      ?? syncRepository.getPlacementMarginSummary(year, 0)
      ?? (() => {
        // Search all quarters for any summary for this year
        for (let q = 4; q >= 1; q--) {
          const s = syncRepository.getPlacementMarginSummary(year, q)
          if (s) return s
        }
        return undefined
      })()

    if (!summary) {
      log.debug('No placement margin summary found', { year, quarter })
      return null
    }

    // Fetch ALL entries for the year (YTD data stored with quarter=0)
    const allRows = syncRepository.getPlacementMarginsForYear(year)

    // When quarter is 'ALL', return all entries unfiltered; otherwise filter by quarter
    const filtered = isAll
      ? allRows.filter(r => !!r.placement_date)
      : (() => {
          const qStart = (qNum - 1) * 3 + 1  // Q1=1, Q2=4, Q3=7, Q4=10
          const qEnd = qNum * 3              // Q1=3, Q2=6, Q3=9, Q4=12
          return allRows.filter(r => {
            if (!r.placement_date) return false
            const month = new Date(r.placement_date).getMonth() + 1
            return month >= qStart && month <= qEnd
          })
        })()

    // Transform entries
    const entries: PlacementMarginEntryDto[] = filtered.map(r => ({
      name: r.name ?? '',
      email: r.email,
      account: r.account ?? '',
      mainSkill: r.main_skill ?? '',
      country: r.country ?? '',
      openPositionId: r.open_position_id ?? 0,
      placementDate: r.placement_date,
      leaveDate: r.leave_date,
      placementRate: r.placement_rate ?? 0,
      placementMargin: r.placement_margin ?? 0,
      currentMargin: r.current_margin ?? 0,
      placementRevenue: r.placement_revenue ?? 0,
      currentRevenue: r.current_revenue ?? 0,
      monthlySalary: r.placement_monthly_salary ?? 0,
      currentMonthlySalary: r.current_monthly_salary ?? 0,
      companyTenure: r.company_tenure ?? 0,
      isPromotion: r.is_promotion === 1,
      firstTimeEntryDate: r.first_time_entry_date,
      kickoffDelay: r.kickoff_delay,
      tacAtPlacement: r.tac_at_placement ?? undefined,
      currentTac: r.current_tac ?? undefined,
    }))

    // Aggregate by account
    const byAccount = new Map<string, { count: number; totalMargin: number; totalRate: number }>()
    for (const e of entries) {
      const agg = byAccount.get(e.account) ?? { count: 0, totalMargin: 0, totalRate: 0 }
      agg.count++
      agg.totalMargin += e.placementMargin
      agg.totalRate += e.placementRate
      byAccount.set(e.account, agg)
    }

    const accountBreakdown: PlacementMarginAccountRow[] = [...byAccount.entries()]
      .map(([account, agg]) => ({
        account,
        placements: agg.count,
        totalRevenue: agg.totalRate * agg.count, // approximate revenue from rate
        totalCost: 0,
        weightedMarginPct:
          agg.count > 0
            ? Math.round((agg.totalMargin / agg.count) * 10) / 10
            : 0,
      }))
      .sort((a, b) => b.placements - a.placements)

    // Parse monthly trend from JSON
    const monthlyTrend = summary.monthly_trend_json
      ? JSON.parse(summary.monthly_trend_json)
      : []

    return {
      ytdMargin: summary.ytd_margin ?? 0,
      ytdAvgRate: summary.ytd_avg_rate ?? 0,
      periodMargin: summary.period_margin ?? 0,
      periodAvgRate: summary.period_avg_rate ?? 0,
      monthlyTrend,
      accountBreakdown,
      entries,
      syncedAt: summary.synced_at,
    }
  },
}
