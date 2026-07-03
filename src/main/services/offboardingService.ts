import { syncRepository } from '../db/repositories/syncRepository'
import { createLogger } from './logger'
import { quarterToNumber } from '../../shared/utils/quarterUtils'
import type {
  OffboardingReportResult,
  OffboardingEntryDto,
} from '../../shared/ipc-types'

const log = createLogger('OffboardingService')

export const offboardingService = {
  evaluate(year: number, quarter: string): OffboardingReportResult | null {
    const allRows = syncRepository.getOffboardingsForYear(year)
    if (allRows.length === 0) {
      log.debug('No offboarding data found', { year, quarter })
      return null
    }

    const isAll = quarter === 'ALL'
    const qNum = isAll ? 0 : quarterToNumber(quarter)

    // Filter by quarter using offboarding_date
    const filtered = isAll
      ? allRows
      : allRows.filter(r => {
          if (!r.offboarding_date) return false
          const month = new Date(r.offboarding_date).getMonth() + 1
          const qStart = (qNum - 1) * 3 + 1
          const qEnd = qNum * 3
          return month >= qStart && month <= qEnd
        })

    // Transform entries
    const entries: OffboardingEntryDto[] = filtered.map(r => ({
      employee: r.employee,
      account: r.account ?? '',
      location: r.location ?? '',
      seniority: r.seniority ?? '',
      mainSkill: r.main_skill ?? '',
      unosquareTenure: r.unosquare_tenure ?? 0,
      monthlyGrossSalary: r.monthly_gross_salary ?? 0,
      monthlyTac: r.monthly_tac ?? 0,
      rate: r.rate ?? 0,
      gm: r.gm ?? 0,
      offboardingDate: r.offboarding_date,
      offboardingStatus: r.offboarding_status ?? '',
      leaveReasonType: r.leave_reason_type ?? '',
      leaveReasonDetails: r.leave_reason_details ?? '',
      leaveReason: r.leave_reason ?? '',
    }))

    // Aggregate by reason type
    const byReasonType: Record<string, number> = {}
    for (const e of entries) {
      const key = e.leaveReasonType || 'Unknown'
      byReasonType[key] = (byReasonType[key] ?? 0) + 1
    }

    // Aggregate by account
    const byAccount: Record<string, number> = {}
    for (const e of entries) {
      const key = e.account || 'Unknown'
      byAccount[key] = (byAccount[key] ?? 0) + 1
    }

    // Average tenure
    const totalTenure = entries.reduce((sum, e) => sum + e.unosquareTenure, 0)
    const avgTenure = entries.length > 0 ? Math.round((totalTenure / entries.length) * 10) / 10 : 0

    // Find latest synced_at
    const syncedAt = allRows.reduce(
      (latest, r) => (r.synced_at > latest ? r.synced_at : latest),
      allRows[0].synced_at
    )

    return {
      totalOffboardings: entries.length,
      avgTenure,
      byReasonType,
      byAccount,
      entries,
      syncedAt,
    }
  },
}
