// Dual-panel detail view: placements vs performance offboardings
// Shown in OverviewTab when a COE or Practice filter is active.
// Supports exclusion management (toggle/save/clear), duplicate warnings, and Excel export.

import { useState, useEffect, useMemo } from 'react'
import { SectionCard, KpiStat } from '../coe-bonus/BonusUi'
import { BonusTierPill } from './BonusTierPill'
import { loadExclusions, saveExclusions, clearExclusions } from '../../services/plbExclusionStorage'
import type { PLBExclusionData } from '../../services/plbExclusionStorage'
import { exportToExcel } from '../../../../apps/resume/utils/exportToExcel'
import type { ColumnDef } from '../../../../apps/resume/utils/exportToExcel'
import type { PLBPlacementEntry, PLBOffboardingEntry, PLBOverview } from '../../../../../shared/ipc-types'
import { practiceLeadBonusRendererService } from '../../services/practiceLeadBonusService'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(v: number): string {
  return `$${v.toLocaleString()}`
}

function marginColor(m: number): string {
  if (m >= 55) return 'text-emerald-400'
  if (m >= 50) return 'text-blue-400'
  if (m >= 45) return 'text-amber-400'
  if (m >= 40) return 'text-orange-300'
  return 'text-slate-400'
}

// ── Stable row keys (match DB unique constraint) ────────────────────────────

function placementKey(e: PLBPlacementEntry): string {
  return `${e.name}|${e.placementDate ?? ''}|${e.account}`
}

function offboardingKey(e: PLBOffboardingEntry): string {
  return `${e.employee}|${e.offboardingDate ?? ''}|${e.account}`
}

// ── Component ────────────────────────────────────────────────────────────────

interface OverviewDetailViewProps {
  placements: PLBPlacementEntry[]
  offboardings: PLBOffboardingEntry[]
  overview: PLBOverview
  filterLabel: string
  year: number
  quarter: string
  practice: string | null
  onReload?: () => void
}

export function OverviewDetailView({
  placements,
  offboardings,
  overview,
  filterLabel,
  year,
  quarter,
  practice,
  onReload,
}: OverviewDetailViewProps) {
  // ── Exclusion state ──────────────────────────────────────────────────
  const [excludedPlacements, setExcludedPlacements] = useState<Set<string>>(new Set())
  const [excludedOffboardings, setExcludedOffboardings] = useState<Set<string>>(new Set())
  const [savedSnapshot, setSavedSnapshot] = useState<PLBExclusionData>({ placements: [], offboardings: [] })
  const [exporting, setExporting] = useState(false)

  // Auto-load saved exclusions when practice/quarter changes
  useEffect(() => {
    if (!practice) {
      setExcludedPlacements(new Set())
      setExcludedOffboardings(new Set())
      setSavedSnapshot({ placements: [], offboardings: [] })
      return
    }
    const stored = loadExclusions(year, quarter, practice)
    setExcludedPlacements(new Set(stored.placements))
    setExcludedOffboardings(new Set(stored.offboardings))
    setSavedSnapshot(stored)
  }, [year, quarter, practice])

  // ── Dirty state detection ────────────────────────────────────────────
  const isDirty = useMemo(() => {
    const currentPl = [...excludedPlacements].sort()
    const currentOb = [...excludedOffboardings].sort()
    const savedPl = [...savedSnapshot.placements].sort()
    const savedOb = [...savedSnapshot.offboardings].sort()
    return JSON.stringify(currentPl) !== JSON.stringify(savedPl) ||
           JSON.stringify(currentOb) !== JSON.stringify(savedOb)
  }, [excludedPlacements, excludedOffboardings, savedSnapshot])

  // ── Duplicate detection ──────────────────────────────────────────────
  const placementNameCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of placements) counts.set(e.name, (counts.get(e.name) ?? 0) + 1)
    return counts
  }, [placements])

  const offboardingNameCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of offboardings) counts.set(e.employee, (counts.get(e.employee) ?? 0) + 1)
    return counts
  }, [offboardings])

  // ── Exclusion-aware KPIs ─────────────────────────────────────────────
  const totals = useMemo(() => {
    const activePl = placements.filter(e => !excludedPlacements.has(placementKey(e)))
    const activeOb = offboardings.filter(e => !excludedOffboardings.has(offboardingKey(e)))
    const grossBonus = activePl.reduce((s, e) => s + e.bonusAmount, 0)
    const penalties = activeOb.reduce((s, e) => s + e.penaltyAmount, 0)
    return {
      placements: activePl.length,
      offboardings: activeOb.length,
      grossBonus,
      penalties,
      netBonus: grossBonus - penalties,
      excludedCount: excludedPlacements.size + excludedOffboardings.size,
    }
  }, [placements, offboardings, excludedPlacements, excludedOffboardings])

  // Try to find the practice lead name from overview rows
  const practiceLeadName = useMemo(() => {
    if (overview.rows.length === 1) return overview.rows[0].practiceLeadName
    const names = new Set(overview.rows.map(r => r.practiceLeadName))
    if (names.size === 1) return overview.rows[0].practiceLeadName
    return null
  }, [overview.rows])

  // ── GM Override editing state ──────────────────────────────────────
  const [editingGmKey, setEditingGmKey] = useState<string | null>(null)
  const [savedGmKey, setSavedGmKey] = useState<string | null>(null)

  const handleGmSave = async (entry: PLBOffboardingEntry, rawValue: string) => {
    const newGm = parseFloat(rawValue)
    setEditingGmKey(null)
    if (isNaN(newGm) || newGm < 0 || newGm > 100) return
    if (newGm === entry.gm) return
    await practiceLeadBonusRendererService.saveGmOverride(
      year, entry.employee, entry.offboardingDate ?? null, entry.account, newGm
    )
    const key = offboardingKey(entry)
    setSavedGmKey(key)
    setTimeout(() => setSavedGmKey(null), 1500)
    onReload?.()
  }

  // ── Toggle handlers ──────────────────────────────────────────────────
  const togglePlacementExclusion = (key: string) => {
    setExcludedPlacements(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleOffboardingExclusion = (key: string) => {
    setExcludedOffboardings(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Action handlers ──────────────────────────────────────────────────
  const handleSave = () => {
    if (!practice) return
    const data: PLBExclusionData = {
      placements: [...excludedPlacements],
      offboardings: [...excludedOffboardings],
    }
    saveExclusions(year, quarter, practice, data)
    setSavedSnapshot(data)
  }

  const handleClear = () => {
    if (!practice) return
    clearExclusions(year, quarter, practice)
    setExcludedPlacements(new Set())
    setExcludedOffboardings(new Set())
    setSavedSnapshot({ placements: [], offboardings: [] })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const placementRows = placements.map(e => {
        const excluded = excludedPlacements.has(placementKey(e))
        return {
          type: 'Placement',
          name: e.name,
          account: e.account,
          skill: e.mainSkill,
          practice: e.practiceName,
          coe: e.coeName,
          margin: e.placementMargin,
          tier: e.bonusTierLabel,
          amount: excluded ? 0 : e.bonusAmount,
          excluded: excluded ? 'Yes' : '',
        }
      })

      const separator = {
        type: '─── OFFBOARDINGS ───',
        name: '', account: '', skill: '', practice: '', coe: '',
        margin: '', tier: '', amount: '', excluded: '',
      }

      const offboardingRows = offboardings.map(e => {
        const excluded = excludedOffboardings.has(offboardingKey(e))
        return {
          type: 'Offboarding',
          name: e.employee,
          account: e.account,
          skill: e.mainSkill,
          practice: e.practiceName,
          coe: e.coeName,
          margin: e.gm,
          tier: e.penaltyTierLabel,
          amount: excluded ? 0 : -e.penaltyAmount,
          excluded: excluded ? 'Yes' : '',
        }
      })

      const allRows = [...placementRows, separator, ...offboardingRows]

      const cols: ColumnDef[] = [
        { header: 'Type', key: 'type' },
        { header: 'Name', key: 'name' },
        { header: 'Account', key: 'account' },
        { header: 'Skill', key: 'skill' },
        { header: 'Practice', key: 'practice' },
        { header: 'COE', key: 'coe' },
        { header: 'Margin/GM %', key: 'margin', type: 'number' },
        { header: 'Tier', key: 'tier' },
        { header: 'Amount ($)', key: 'amount', type: 'number' },
        { header: 'Excluded', key: 'excluded' },
      ]

      const safeName = (practice ?? filterLabel).replace(/[/\\?*[\]]/g, '_')
      await exportToExcel(allRows as Record<string, unknown>[], cols, `PLB-${safeName}-${quarter}-${year}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiStat label="Placements" value={String(totals.placements)} />
        <KpiStat label="Offboardings" value={String(totals.offboardings)} />
        <KpiStat label="Gross Bonus" value={fmtCurrency(totals.grossBonus)} accentClass="text-emerald-400" />
        <KpiStat
          label="Penalties"
          value={totals.penalties > 0 ? `-${fmtCurrency(totals.penalties)}` : '$0'}
          accentClass="text-red-400"
        />
        <KpiStat
          label="Net Bonus"
          value={fmtCurrency(totals.netBonus)}
          accentClass={totals.netBonus >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        {practiceLeadName && (
          <KpiStat
            label="Practice Lead"
            value={practiceLeadName}
            accentClass={practiceLeadName === 'Unassigned' ? 'text-amber-400' : 'text-primary'}
          />
        )}
      </div>

      {/* Toolbar strip — between KPIs and tables */}
      {practice && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            💾 Save changes
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={excludedPlacements.size === 0 && excludedOffboardings.size === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            🗑 Clear saved
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? '⏳ Exporting…' : '📥 Export Excel'}
          </button>
          {totals.excludedCount > 0 && (
            <span className="text-xs text-slate-400">
              {totals.excludedCount} excluded
            </span>
          )}
        </div>
      )}

      {/* Dual-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Placements panel */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              Placements
              <span className="text-xs font-normal text-slate-400">
                ({totals.placements} = {fmtCurrency(totals.grossBonus)} gross)
              </span>
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Name</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Margin@</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tier</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                  {practice && (
                    <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-16" />
                  )}
                </tr>
              </thead>
              <tbody>
                {placements.map((e) => {
                  const key = placementKey(e)
                  const isExcluded = excludedPlacements.has(key)
                  const dupCount = placementNameCounts.get(e.name) ?? 1

                  return (
                    <tr
                      key={key}
                      className={`border-b border-white/5 ${isExcluded ? 'opacity-40' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className={`px-3 py-2 ${isExcluded ? 'line-through text-slate-500' : 'text-primary'}`}>
                        {e.name}
                        {dupCount > 1 && (
                          <span
                            className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/20 text-amber-400"
                            title="Duplicate — consider excluding"
                          >
                            ⚠ x{dupCount}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-secondary">{e.account}</td>
                      <td className={`px-3 py-2 text-right font-medium ${marginColor(e.placementMargin)}`}>
                        {e.placementMargin.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right">
                        <BonusTierPill tierLabel={e.bonusTierLabel} amount={e.bonusAmount} type="bonus" hideAmount />
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-400 font-medium">
                        {isExcluded ? '—' : `$${e.bonusAmount}`}
                      </td>
                      {practice && (
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => togglePlacementExclusion(key)}
                            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                              isExcluded
                                ? 'text-amber-400 hover:text-amber-300'
                                : 'text-slate-500 hover:text-red-400'
                            }`}
                          >
                            {isExcluded ? '↩ Undo' : '✕ Exclude'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {placements.length === 0 && (
                  <tr>
                    <td colSpan={practice ? 6 : 5} className="px-3 py-6 text-center text-slate-500 text-xs">
                      No placements for {filterLabel}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Offboardings panel */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              Performance Offboardings
              <span className="text-xs font-normal text-slate-400">
                ({totals.offboardings} = {totals.penalties > 0 ? `-${fmtCurrency(totals.penalties)}` : '$0'} penalty)
              </span>
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Name</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">GM %</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tier</th>
                  <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Penalty</th>
                  {practice && (
                    <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-16" />
                  )}
                </tr>
              </thead>
              <tbody>
                {offboardings.map((e) => {
                  const key = offboardingKey(e)
                  const isExcluded = excludedOffboardings.has(key)
                  const dupCount = offboardingNameCounts.get(e.employee) ?? 1

                  return (
                    <tr
                      key={key}
                      className={`border-b border-white/5 ${isExcluded ? 'opacity-40' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className={`px-3 py-2 ${isExcluded ? 'line-through text-slate-500' : 'text-primary'}`}>
                        {e.employee}
                        {dupCount > 1 && (
                          <span
                            className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/20 text-amber-400"
                            title="Duplicate — consider excluding"
                          >
                            ⚠ x{dupCount}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-secondary">{e.account}</td>
                      <td className="px-3 py-2 text-right">
                        {editingGmKey === key ? (
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            defaultValue={e.gm}
                            onBlur={(ev) => handleGmSave(e, ev.target.value)}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter') handleGmSave(e, ev.currentTarget.value)
                              if (ev.key === 'Escape') setEditingGmKey(null)
                            }}
                            className="w-16 px-1 py-0.5 text-right rounded bg-white/10 border border-white/20 text-sm text-primary"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingGmKey(key)}
                            className={`cursor-pointer hover:underline font-medium ${marginColor(e.gm)}`}
                          >
                            {e.gm.toFixed(1)}%
                            {e.gmOriginal !== e.gm && <span className="ml-1 text-[9px] text-amber-400">✎</span>}
                            {savedGmKey === key && <span className="ml-1 text-[9px] text-emerald-400">✓ saved</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <BonusTierPill tierLabel={e.penaltyTierLabel} amount={e.penaltyAmount} type="penalty" hideAmount />
                      </td>
                      <td className="px-3 py-2 text-right text-red-400 font-medium">
                        {isExcluded ? '—' : `-$${e.penaltyAmount}`}
                      </td>
                      {practice && (
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleOffboardingExclusion(key)}
                            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                              isExcluded
                                ? 'text-amber-400 hover:text-amber-300'
                                : 'text-slate-500 hover:text-red-400'
                            }`}
                          >
                            {isExcluded ? '↩ Undo' : '✕ Exclude'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {offboardings.length === 0 && (
                  <tr>
                    <td colSpan={practice ? 6 : 5} className="px-3 py-6 text-center text-slate-500 text-xs">
                      No performance offboardings for {filterLabel} 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
