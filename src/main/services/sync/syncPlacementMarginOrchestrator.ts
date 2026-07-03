import { fetchExecApi } from '../upstream/execApiClient'
import { syncRepository } from '../../db/repositories/syncRepository'
import { createLogger } from '../logger'
import type { SyncEvent, SyncOptions } from './syncTypes'

const log = createLogger('SyncPlacementMargin')

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ---- Raw exec API response types ----

/** Shape returned by GET /api/PlacementMargin/Ytd (flat array) */
interface RawYtdEntry {
  Employee: string
  CompanyTenure: number
  MainSkill: string
  Country: string
  Account: string
  Rate: number
  PlacementDate: string | null
  FirstTimeEntryDate: string | null
  KickoffDelay: number | null
  TacAtPlacement: number
  CurrentTac: number
  MarginAtPlacement: number
  CurrentMargin: number
}

interface RawYtdTotalsResponse {
  PlacementMarginYtd: number
  AvgRateYtd: number
  PlacementVsCurrentMarginByMonth: Record<string, { PlacementMargin: number; CurrentMargin: number }>
}

/** Derive the current quarter from the month (1-based). */
function currentQuarterNumber(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

export const syncPlacementMarginOrchestrator = {
  async sync(
    token: string,
    options: SyncOptions & { year: number; quarter?: string },
    emitEvent: (event: SyncEvent) => void,
    signal: AbortSignal
  ): Promise<void> {
    // Quarter is used only for YtdTotals scope; defaults to current quarter
    const qNum = options.quarter
      ? parseInt(options.quarter.replace(/\D/g, ''), 10) || currentQuarterNumber()
      : currentQuarterNumber()
    const qs = `entity=&year=${options.year}&quarter=${qNum}&vertical=`

    log.info('Placement margin YTD sync started', { year: options.year, quarter: qNum })

    emitEvent({
      type: 'progress',
      progress: {
        totalRecords: 0,
        fetchedRecords: 0,
        syncedCount: 0,
        incompleteCount: 0,
        notProcessedCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        skippedCount: 0,
        currentRecord: 'Fetching placement margin YTD data from API...',
        status: 'processing',
      },
    })

    // Fetch both endpoints in parallel
    const [ytdTotals, ytdEntries] = await Promise.all([
      fetchExecApi<RawYtdTotalsResponse>(`api/PlacementMargin/YtdTotals?${qs}`, token, signal),
      fetchExecApi<RawYtdEntry[]>(`api/PlacementMargin/Ytd?${qs}`, token, signal),
    ])

    if (signal.aborted) return

    // ── Response validation ────────────────────────────────────────────
    if (ytdTotals.PlacementMarginYtd == null) {
      log.warn('API response missing PlacementMarginYtd — will store 0', { year: options.year })
    }
    if (!Array.isArray(ytdEntries)) {
      log.warn('API response is not an array — will store empty list', { year: options.year })
    }

    const entries = Array.isArray(ytdEntries) ? ytdEntries : []

    // Clear existing entries for this year, then insert fresh
    syncRepository.clearPlacementMarginsForYear(options.year)

    const now = new Date().toISOString()

    // Store summary (keyed by year + quarter)
    syncRepository.upsertPlacementMarginSummary({
      year: options.year,
      quarter: qNum,
      ytd_margin: Number(ytdTotals.PlacementMarginYtd) || 0,
      ytd_avg_rate: Number(ytdTotals.AvgRateYtd) || 0,
      period_margin: 0, // Ytd endpoint doesn't provide a separate period margin
      period_avg_rate: 0,
      monthly_trend_json: JSON.stringify(
        Object.entries(ytdTotals.PlacementVsCurrentMarginByMonth ?? {}).map(([m, d]) => ({
          month: parseInt(m, 10),
          label: MONTH_LABELS[parseInt(m, 10) - 1],
          placementMargin: Number(d.PlacementMargin),
          currentMargin: Number(d.CurrentMargin),
        }))
      ),
      synced_at: now,
    })

    // Store individual entries
    const total = entries.length
    for (let i = 0; i < total; i++) {
      if (signal.aborted) break
      const e = entries[i]
      syncRepository.upsertPlacementMargin({
        year: options.year,
        quarter: 0, // YTD scope — quarter filtering happens at report level
        email: '', // Ytd endpoint doesn't provide email
        name: e.Employee,
        account: e.Account,
        main_skill: e.MainSkill,
        country: e.Country,
        open_position_id: null,
        placement_date: e.PlacementDate,
        leave_date: null, // Not available in Ytd
        placement_rate: e.Rate,
        placement_margin: Number(e.MarginAtPlacement),
        current_margin: Number(e.CurrentMargin),
        placement_revenue: null,
        current_revenue: null,
        placement_monthly_salary: null,
        current_monthly_salary: null,
        company_tenure: e.CompanyTenure,
        allocation: 0,
        is_promotion: 0,
        first_time_entry_date: e.FirstTimeEntryDate,
        kickoff_delay: e.KickoffDelay,
        tac_at_placement: e.TacAtPlacement,
        current_tac: e.CurrentTac,
        synced_at: now,
      })
    }

    log.info('Placement margin YTD sync completed', { year: options.year, entries: total })

    emitEvent({
      type: 'complete',
      progress: {
        totalRecords: total,
        fetchedRecords: total,
        syncedCount: total,
        incompleteCount: 0,
        notProcessedCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        skippedCount: 0,
        status: 'completed',
      },
    })
  },
}
