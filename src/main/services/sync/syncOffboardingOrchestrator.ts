import { fetchExecApiText } from '../upstream/execApiClient'
import { syncRepository } from '../../db/repositories/syncRepository'
import { createLogger } from '../logger'
import Papa from 'papaparse'
import type { SyncEvent, SyncOptions } from './syncTypes'

const log = createLogger('SyncOffboarding')

/** CSV column name → parsed entry */
interface ParsedOffboardingEntry {
  offboardingDate: string | null
  employee: string
  account: string
  location: string
  seniority: string
  mainSkill: string
  unosquareTenure: number
  monthlyGrossSalary: number
  monthlyTac: number
  rate: number
  gm: number
  offboardingStatus: string
  leaveReasonType: string | null
  leaveReasonDetails: string | null
  leaveReason: string | null
}

/** Strip "$" and "," — then parseFloat */
function parseCurrency(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace(/[$,]/g, '')) || 0
}

function parsePercent(val: string): number {
  if (!val) return 0
  return parseFloat(val.replace('%', '')) || 0
}

/** Convert M/D/YYYY → YYYY-MM-DD */
function normalizeDate(val: string): string | null {
  if (!val) return null
  const parts = val.split('/')
  if (parts.length !== 3) return val
  const [m, d, y] = parts
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** Derive the current quarter from the month (1-based). */
function currentQuarterNumber(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

function parseRow(row: Record<string, string>): ParsedOffboardingEntry {
  return {
    offboardingDate: normalizeDate(row['Offboarding Date'] ?? ''),
    employee: row['Employee'] ?? '',
    account: row['Account'] ?? '',
    location: row['Location'] ?? '',
    seniority: row['Seniority'] ?? '',
    mainSkill: row['MainSkill'] ?? '',
    unosquareTenure: parseInt(row['Unosquare Tenure (Months)'] ?? '0', 10) || 0,
    monthlyGrossSalary: parseCurrency(row['Monthly Gross Salary (Local)'] ?? ''),
    monthlyTac: parseCurrency(row['Monthly TAC (USD)'] ?? ''),
    rate: parseCurrency(row['Rate'] ?? ''),
    gm: parsePercent(row['GM'] ?? ''),
    offboardingStatus: row['Offboarding Status'] ?? '',
    leaveReasonType: row['Leave Reason Type'] || null,
    leaveReasonDetails: row['Leave Reason Details'] || null,
    leaveReason: row['Leave Reason'] || null,
  }
}

export const syncOffboardingOrchestrator = {
  async sync(
    token: string,
    options: SyncOptions & { year: number; quarter?: string },
    emitEvent: (event: SyncEvent) => void,
    signal: AbortSignal
  ): Promise<void> {
    const qNum = options.quarter
      ? parseInt(options.quarter.replace(/\D/g, ''), 10) || currentQuarterNumber()
      : currentQuarterNumber()
    const qs = `entity=&year=${options.year}&quarter=${qNum}&vertical=`

    log.info('Offboarding YTD sync started', { year: options.year, quarter: qNum })

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
        currentRecord: 'Fetching offboarding YTD data from API...',
        status: 'processing',
      },
    })

    // Fetch CSV text (not JSON)
    const csvText = await fetchExecApiText(
      `api/DeliveryProfessionalOffboarding/YTD?${qs}`, token, signal
    )

    if (signal.aborted) return

    // Parse CSV with papaparse (handles multiline quoted fields)
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors.length > 0) {
      log.warn('CSV parse warnings', { errors: parsed.errors.slice(0, 5) })
    }

    const entries = parsed.data
      .filter(row => row['Employee']?.trim())
      .map(parseRow)

    // Clear existing entries for this year, then insert fresh
    syncRepository.clearOffboardingsForYear(options.year)

    const now = new Date().toISOString()
    const total = entries.length

    for (let i = 0; i < total; i++) {
      if (signal.aborted) break
      const e = entries[i]
      syncRepository.upsertOffboarding({
        year: options.year,
        employee: e.employee,
        account: e.account,
        location: e.location,
        seniority: e.seniority,
        main_skill: e.mainSkill,
        unosquare_tenure: e.unosquareTenure,
        monthly_gross_salary: e.monthlyGrossSalary,
        monthly_tac: e.monthlyTac,
        rate: e.rate,
        gm: e.gm,
        offboarding_date: e.offboardingDate,
        offboarding_status: e.offboardingStatus,
        leave_reason_type: e.leaveReasonType,
        leave_reason_details: e.leaveReasonDetails,
        leave_reason: e.leaveReason,
        synced_at: now,
      })
    }

    log.info('Offboarding YTD sync completed', { year: options.year, entries: total })

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
