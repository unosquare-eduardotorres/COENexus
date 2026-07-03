import { placementMarginService } from './placementMarginService'
import { offboardingService } from './offboardingService'
import { catalogResolutionService } from './catalogResolutionService'
import type { ResolvedSkill } from './catalogResolutionService'
import { syncRepository } from '../db/repositories/syncRepository'
import { createLogger } from './logger'
import type {
  PLBPlacementEntry,
  PLBOffboardingEntry,
  PLBOverviewRow,
  PLBOverview,
  BonusTier,
} from '../../shared/ipc-types'

const log = createLogger('PracticeLeadBonusService')

export const DEFAULT_TIERS: BonusTier[] = [
  { min: 55,    max: 100,   label: '≥55%',       amount: 350 },
  { min: 50,    max: 54.99, label: '50%–54.99%',  amount: 250 },
  { min: 45,    max: 49.99, label: '45%–49.99%',  amount: 150 },
  { min: 40,    max: 44.99, label: '40%–44.99%',  amount: 50  },
  { min: 0,     max: 39.99, label: '<40%',         amount: 0   },
]

function resolveTier(margin: number, tiers: BonusTier[]): BonusTier {
  for (const tier of tiers) {
    if (margin >= tier.min && margin <= tier.max) return tier
  }
  return tiers[tiers.length - 1] // <40% fallback
}

export const practiceLeadBonusService = {
  getPlacements(year: number, quarter: string, tiers?: BonusTier[]): PLBPlacementEntry[] {
    const t = tiers ?? DEFAULT_TIERS
    const result = placementMarginService.evaluate(year, quarter)
    if (!result) return []

    const skillMap = catalogResolutionService.buildSkillMap()

    return result.entries.map(e => {
      const resolved = catalogResolutionService.resolve(e.mainSkill, skillMap)
      const tier = resolveTier(e.placementMargin, t)
      return {
        name: e.name,
        email: e.email,
        account: e.account,
        mainSkill: e.mainSkill,
        country: e.country,
        placementDate: e.placementDate,
        placementMargin: e.placementMargin,
        placementRate: e.placementRate,
        currentMargin: e.currentMargin,
        kickoffDelay: e.kickoffDelay,
        isPromotion: e.isPromotion,
        companyTenure: e.companyTenure,
        practiceName: resolved.practiceName,
        coeName: resolved.coeName,
        bonusTierLabel: tier.label,
        bonusAmount: tier.amount,
      }
    })
  },

  getOffboardings(year: number, quarter: string, tiers?: BonusTier[]): PLBOffboardingEntry[] {
    const t = tiers ?? DEFAULT_TIERS
    const result = offboardingService.evaluate(year, quarter)
    if (!result) return []

    const skillMap = catalogResolutionService.buildSkillMap()
    const gmOverrides = syncRepository.getGmOverrides(year)

    // Filter to ONLY performance offboardings
    return result.entries
      .filter(e => e.leaveReasonType === 'Offboarded for Performance')
      .map(e => {
        const resolved = catalogResolutionService.resolve(e.mainSkill, skillMap)
        const overrideKey = `${e.employee}|${e.offboardingDate ?? ''}|${e.account}`
        const effectiveGm = gmOverrides.get(overrideKey) ?? e.gm
        const tier = resolveTier(effectiveGm, t)
        return {
          employee: e.employee,
          account: e.account,
          mainSkill: e.mainSkill,
          offboardingDate: e.offboardingDate,
          gm: effectiveGm,
          gmOriginal: e.gm,
          seniority: e.seniority,
          location: e.location,
          leaveReasonType: e.leaveReasonType,
          unosquareTenure: e.unosquareTenure,
          practiceName: resolved.practiceName,
          coeName: resolved.coeName,
          penaltyTierLabel: tier.label,
          penaltyAmount: tier.amount,
        }
      })
  },

  saveGmOverride(year: number, employee: string, offboardingDate: string | null, account: string, gmOverride: number): void {
    syncRepository.upsertGmOverride(year, employee, offboardingDate, account, gmOverride)
  },

  getOverview(year: number, quarter: string, tiers?: BonusTier[]): PLBOverview {
    const placements = this.getPlacements(year, quarter, tiers)
    const offboardings = this.getOffboardings(year, quarter, tiers)
    const leads = syncRepository.getLeadsWithPractices()

    // Build practice → lead map
    const practiceToLead = new Map<string, { name: string; email: string; coeName: string }>()
    for (const lead of leads) {
      if (lead.practice_name) {
        practiceToLead.set(lead.practice_name, {
          name: lead.display_name,
          email: lead.email,
          coeName: lead.coe_name ?? '',
        })
      }
    }

    // Group by practice
    const practiceMap = new Map<string, PLBOverviewRow>()
    const effectiveTiers = tiers ?? DEFAULT_TIERS

    // Process placements
    for (const p of placements) {
      const key = p.practiceName
      if (!practiceMap.has(key)) {
        const lead = practiceToLead.get(key)
        practiceMap.set(key, {
          practiceLeadName: lead?.name ?? 'Unassigned',
          practiceLeadEmail: lead?.email ?? '',
          practiceName: key,
          coeName: lead?.coeName ?? p.coeName,
          placementCount: 0,
          offboardingCount: 0,
          grossBonus: 0,
          penalties: 0,
          netBonus: 0,
          tierBreakdown: effectiveTiers.map(t => ({
            tier: t.label,
            placements: 0,
            offboardings: 0,
          })),
        })
      }
      const row = practiceMap.get(key)!
      row.placementCount++
      row.grossBonus += p.bonusAmount

      // Update tier breakdown
      const tierIdx = effectiveTiers.findIndex(t => p.bonusTierLabel === t.label)
      if (tierIdx >= 0) row.tierBreakdown[tierIdx].placements++
    }

    // Process offboardings (penalties)
    for (const o of offboardings) {
      const key = o.practiceName
      if (!practiceMap.has(key)) {
        const lead = practiceToLead.get(key)
        practiceMap.set(key, {
          practiceLeadName: lead?.name ?? 'Unassigned',
          practiceLeadEmail: lead?.email ?? '',
          practiceName: key,
          coeName: lead?.coeName ?? o.coeName,
          placementCount: 0,
          offboardingCount: 0,
          grossBonus: 0,
          penalties: 0,
          netBonus: 0,
          tierBreakdown: effectiveTiers.map(t => ({
            tier: t.label,
            placements: 0,
            offboardings: 0,
          })),
        })
      }
      const row = practiceMap.get(key)!
      row.offboardingCount++
      row.penalties += o.penaltyAmount

      // Update tier breakdown
      const tierIdx = effectiveTiers.findIndex(t => o.penaltyTierLabel === t.label)
      if (tierIdx >= 0) row.tierBreakdown[tierIdx].offboardings++
    }

    // Calculate net bonus and build rows
    const rows: PLBOverviewRow[] = []
    for (const row of practiceMap.values()) {
      row.netBonus = row.grossBonus - row.penalties
      rows.push(row)
    }

    // Sort by COE, then practice
    rows.sort((a, b) => a.coeName.localeCompare(b.coeName) || a.practiceName.localeCompare(b.practiceName))

    const totals = {
      placements: rows.reduce((s, r) => s + r.placementCount, 0),
      offboardings: rows.reduce((s, r) => s + r.offboardingCount, 0),
      grossBonus: rows.reduce((s, r) => s + r.grossBonus, 0),
      penalties: rows.reduce((s, r) => s + r.penalties, 0),
      netBonus: rows.reduce((s, r) => s + r.netBonus, 0),
    }

    return { rows, totals }
  },

  getPracticeLeads() {
    return syncRepository.getLeadsWithPractices()
  },
}
