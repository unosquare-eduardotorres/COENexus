import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePLBConfig } from '../../contexts/PracticeLeadBonusConfigContext'
import { practiceLeadBonusRendererService } from '../../services/practiceLeadBonusService'
import { SectionCard, KpiStat, TabLoading, TabError } from '../../components/coe-bonus/BonusUi'
import { TierConfigTable } from '../../components/practice-lead-bonus/TierConfigTable'
import { PracticeLeadScorecard } from '../../components/practice-lead-bonus/PracticeLeadScorecard'
import { TierDistributionChart } from '../../components/practice-lead-bonus/TierDistributionChart'
import { UnassignedPracticesBanner } from '../../components/practice-lead-bonus/UnassignedPracticesBanner'
import { CascadingFilters } from '../../components/practice-lead-bonus/CascadingFilters'
import { OverviewDetailView } from '../../components/practice-lead-bonus/OverviewDetailView'
import type { PLBOverview, PLBPracticeLeadRow, PLBPlacementEntry, PLBOffboardingEntry } from '../../../../../shared/ipc-types'

function fmtCurrency(v: number): string {
  return `$${v.toLocaleString()}`
}

export default function OverviewTab() {
  const { activePeriod, config, updateTier, resetTiers, setActivePeriod, sharedFilters, setSharedFilters } = usePLBConfig()
  const [overview, setOverview] = useState<PLBOverview | null>(null)
  const [practiceLeads, setPracticeLeads] = useState<PLBPracticeLeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewData, leads] = await Promise.all([
        practiceLeadBonusRendererService.getOverview(activePeriod.year, activePeriod.quarter, config.tiers),
        practiceLeadBonusRendererService.getPracticeLeads(),
      ])
      setOverview(overviewData)
      setPracticeLeads(leads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview')
    } finally {
      setLoading(false)
    }
  }, [activePeriod.year, activePeriod.quarter, config.tiers])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Count practices from catalog that have no lead assigned
  const [allPractices, setAllPractices] = useState<{ id: number; name: string }[]>([])
  useEffect(() => {
    window.api.catalog.getPractices()
      .then(p => setAllPractices(p.map(pr => ({ id: pr.id, name: pr.name }))))
      .catch(() => {})
  }, [])

  const unassignedCount = useMemo(() => {
    const assignedPracticeIds = new Set(practiceLeads.map(l => l.practice_id).filter(Boolean))
    return allPractices.filter(p => !assignedPracticeIds.has(p.id)).length
  }, [allPractices, practiceLeads])

  // Year/Quarter selectors
  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 1, y, y + 1]
  }, [])

  // ── Detail view: does filter warrant dual-panel? ──────────────────
  const hasDetailFilter = !!(sharedFilters.coe || sharedFilters.practice)

  // Fetch individual entries only when a filter is active
  const [placements, setPlacements] = useState<PLBPlacementEntry[]>([])
  const [offboardings, setOffboardings] = useState<PLBOffboardingEntry[]>([])

  const reloadDetailEntries = useCallback(() => {
    if (!hasDetailFilter) return
    Promise.all([
      practiceLeadBonusRendererService.getPlacements(activePeriod.year, activePeriod.quarter, config.tiers),
      practiceLeadBonusRendererService.getOffboardings(activePeriod.year, activePeriod.quarter, config.tiers),
      practiceLeadBonusRendererService.getOverview(activePeriod.year, activePeriod.quarter, config.tiers),
    ]).then(([p, o, ov]) => {
      setPlacements(p)
      setOffboardings(o)
      setOverview(ov)
    }).catch(() => {})
  }, [hasDetailFilter, activePeriod.year, activePeriod.quarter, config.tiers])

  useEffect(() => {
    if (!hasDetailFilter) {
      setPlacements([])
      setOffboardings([])
      return
    }
    reloadDetailEntries()
  }, [hasDetailFilter, reloadDetailEntries])

  // Client-side filter for detail entries
  const filteredPlacements = useMemo(() => {
    let result = placements
    if (sharedFilters.coe) result = result.filter(e => e.coeName === sharedFilters.coe)
    if (sharedFilters.practice) result = result.filter(e => e.practiceName === sharedFilters.practice)
    if (sharedFilters.mainSkill) result = result.filter(e => e.mainSkill === sharedFilters.mainSkill)
    return result
  }, [placements, sharedFilters])

  const filteredOffboardings = useMemo(() => {
    let result = offboardings
    if (sharedFilters.coe) result = result.filter(e => e.coeName === sharedFilters.coe)
    if (sharedFilters.practice) result = result.filter(e => e.practiceName === sharedFilters.practice)
    if (sharedFilters.mainSkill) result = result.filter(e => e.mainSkill === sharedFilters.mainSkill)
    return result
  }, [offboardings, sharedFilters])

  // Filtered overview rows for detail view + KPIs
  const filteredOverview = useMemo((): PLBOverview | null => {
    if (!overview) return null
    if (!hasDetailFilter) return overview
    const matchingRows = overview.rows.filter(r => {
      if (sharedFilters.practice) return r.practiceName === sharedFilters.practice
      if (sharedFilters.coe) return r.coeName === sharedFilters.coe
      return true
    })
    return {
      rows: matchingRows,
      totals: {
        placements: matchingRows.reduce((s, r) => s + r.placementCount, 0),
        offboardings: matchingRows.reduce((s, r) => s + r.offboardingCount, 0),
        grossBonus: matchingRows.reduce((s, r) => s + r.grossBonus, 0),
        penalties: matchingRows.reduce((s, r) => s + r.penalties, 0),
        netBonus: matchingRows.reduce((s, r) => s + r.netBonus, 0),
      },
    }
  }, [overview, hasDetailFilter, sharedFilters])

  // Display totals — filtered when detail active, global otherwise
  const displayTotals = filteredOverview?.totals ?? null

  if (loading) return <TabLoading label="Loading overview…" />
  if (error) return <TabError message={error} />

  return (
    <div className="space-y-4">
      {/* Period Configuration + COE/Practice filters */}
      <SectionCard title="Period Configuration">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={activePeriod.year}
              onChange={e => setActivePeriod({ ...activePeriod, year: parseInt(e.target.value) })}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-primary"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="flex gap-1 rounded-lg bg-white/5 p-0.5">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setActivePeriod({ ...activePeriod, quarter: q })}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activePeriod.quarter === q
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          {/* COE / Practice / Skill cascading filters */}
          <CascadingFilters
            sharedFilters={sharedFilters}
            onSharedChange={setSharedFilters}
            quarter={activePeriod.quarter}
            month={null}
            account={null}
            onLocalChange={() => {}}
            accounts={[]}
            hideLocalFilters
          />
        </div>
      </SectionCard>

      {/* Tier Configuration */}
      <TierConfigTable
        tiers={config.tiers}
        onUpdateTier={updateTier}
        onReset={resetTiers}
      />

      {/* Unassigned Practices Banner */}
      <UnassignedPracticesBanner count={unassignedCount} />

      {/* KPI Strip — uses filtered or global totals */}
      {displayTotals && !hasDetailFilter && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiStat label="Placements" value={String(displayTotals.placements)} />
          <KpiStat label="Offboardings" value={String(displayTotals.offboardings)} />
          <KpiStat label="Gross Bonus" value={fmtCurrency(displayTotals.grossBonus)} accentClass="text-emerald-400" />
          <KpiStat label="Penalties" value={displayTotals.penalties > 0 ? `-${fmtCurrency(displayTotals.penalties)}` : '$0'} accentClass="text-red-400" />
          <KpiStat label="Net Bonus" value={fmtCurrency(displayTotals.netBonus)} accentClass={displayTotals.netBonus >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>
      )}

      {/* Conditional: detail view vs scorecard */}
      {hasDetailFilter && filteredOverview ? (
        <OverviewDetailView
          placements={filteredPlacements}
          offboardings={filteredOffboardings}
          overview={filteredOverview}
          filterLabel={sharedFilters.practice ?? sharedFilters.coe ?? ''}
          year={activePeriod.year}
          quarter={activePeriod.quarter}
          practice={sharedFilters.practice}
          onReload={reloadDetailEntries}
        />
      ) : (
        <>
          {/* Practice Lead Scorecard */}
          {overview && (
            <SectionCard title="Practice Lead Scorecard">
              <PracticeLeadScorecard overview={overview} />
            </SectionCard>
          )}

          {/* Tier Distribution Chart */}
          {overview && (
            <SectionCard title="Margin Tier Distribution">
              <TierDistributionChart overview={overview} />
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
