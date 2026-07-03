// Overview Tab — Bonus calculator.
//
// Reads all data from BonusConfigContext. No service calls needed.
// Displays period configuration, measures calculator table, and summary.

import { useMemo } from 'react'
import { useBonusConfig } from '../../contexts/BonusConfigContext'
import { computeBonusRow, computeBonusTotal } from '../../services/bonusConfigStorage'
import { SectionCard } from '../../components/coe-bonus/BonusUi'
import OverviewMeasureRow from '../../components/coe-bonus/OverviewMeasureRow'
import StatusPill from '../../components/coe-bonus/StatusPill'
import { buildYearOptions } from '../../../../../shared/utils/quarterUtils'
import { ALL_MEASURE_KEYS, MEASURE_LABELS } from '../../types/bonusConfig'
import type { ActivePeriod } from '../../types/bonusConfig'
import type { MeasureStatus } from '../../types/coeBonus'

const QUARTERS: ActivePeriod['quarter'][] = ['Q1', 'Q2', 'Q3', 'Q4']

export default function OverviewTab() {
  const {
    activePeriod,
    setActivePeriod,
    config,
    updateMeasure,
    updateBonusPool,
    catalogCoes,
    coeNames,
  } = useBonusConfig()

  // ── Dropdown options ───────────────────────────────────────────────────
  const yearOptions = useMemo(() => buildYearOptions(), [])

  const coeOptions = useMemo(() => {
    const nameSet = new Set<string>()
    for (const c of catalogCoes) nameSet.add(c.name)
    for (const n of coeNames) nameSet.add(n)
    const sorted = [...nameSet].sort((a, b) => a.localeCompare(b))
    return ['All COEs', ...sorted]
  }, [catalogCoes, coeNames])

  // ── Totals ─────────────────────────────────────────────────────────────
  const totals = useMemo(() => computeBonusTotal(config), [config])

  const overallStatus: MeasureStatus =
    totals.totalAttainment >= 0.9 ? 'on-track' : totals.totalAttainment >= 0.5 ? 'at-risk' : 'missed'

  const unlockedMeasures = ALL_MEASURE_KEYS.filter(k => {
    if (k === 'grossMargin') return config.measures.grossMargin.achievement === undefined
    return !config.locks[k]
  })

  // ── Handlers ───────────────────────────────────────────────────────────
  const handlePeriodChange = (patch: Partial<ActivePeriod>) => {
    const coe = patch.coeName ?? activePeriod.coeName
    const matchCoe = catalogCoes.find(c => c.name === coe)
    setActivePeriod({
      ...activePeriod,
      ...patch,
      coeId: matchCoe?.id ?? null,
    })
  }

  return (
    <div className="space-y-4">
      {/* A. Period Configuration */}
      <SectionCard title="Bonus Period">
        <div className="flex flex-wrap items-end gap-4">
          {/* Year */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Year</span>
            <select
              className="glass-select text-sm py-1.5 pl-3 min-w-[96px]"
              value={activePeriod.year}
              onChange={e => handlePeriodChange({ year: Number(e.target.value) })}
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>

          {/* Quarter */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Quarter</span>
            <select
              className="glass-select text-sm py-1.5 pl-3 min-w-[96px]"
              value={activePeriod.quarter}
              onChange={e => handlePeriodChange({ quarter: e.target.value as ActivePeriod['quarter'] })}
            >
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </label>

          {/* COE */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">C.O.E.</span>
            <select
              className="glass-select text-sm py-1.5 pl-3 min-w-[200px]"
              value={activePeriod.coeName}
              onChange={e => handlePeriodChange({ coeName: e.target.value })}
            >
              {coeOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {/* Bonus Pool */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Bonus Pool</span>
            <div className="inline-flex items-center gap-1">
              <span className="text-sm text-muted">$</span>
              <input
                type="number"
                value={config.bonusPool}
                onChange={e => updateBonusPool(Number(e.target.value))}
                className="glass-input text-sm py-1.5 px-3 w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="10,000"
              />
            </div>
          </label>
        </div>
      </SectionCard>

      {/* B. Measures Calculator Table */}
      <SectionCard title="Measures Calculator" subtitle="Lock values from each tab, or enter manually for Gross Margin">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b minimal-divider">
                <th className="py-2 pr-4 font-semibold">Measure</th>
                <th className="py-2 pr-4 font-semibold text-right">Weight</th>
                <th className="py-2 pr-4 font-semibold text-right">Goal</th>
                <th className="py-2 pr-4 font-semibold text-right">Floor</th>
                <th className="py-2 pr-4 font-semibold text-right">Current</th>
                <th className="py-2 pr-4 font-semibold text-right">Attain.</th>
                <th className="py-2 pr-4 font-semibold text-right">Status</th>
                <th className="py-2 font-semibold text-right">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {ALL_MEASURE_KEYS.map(key => (
                <OverviewMeasureRow
                  key={key}
                  measureKey={key}
                  label={MEASURE_LABELS[key]}
                  config={config.measures[key]}
                  lock={config.locks[key]}
                  bonusPool={config.bonusPool}
                  isManual={key === 'grossMargin'}
                  onConfigChange={patch => updateMeasure(key, patch)}
                />
              ))}

              {/* Total row */}
              <tr className="border-t-2 border-slate-600">
                <td className="py-3 pr-4">
                  <div className="text-sm font-bold text-primary">TOTAL</div>
                </td>
                <td className="py-3 pr-4 text-right">
                  <div className="text-sm font-bold text-primary">{totals.weightSum}%</div>
                  {totals.weightSum !== 100 && (
                    <div className="text-[10px] text-red-400 font-medium">
                      Must equal 100%
                    </div>
                  )}
                  {totals.weightSum === 100 && (
                    <div className="text-[10px] text-emerald-500">✓ ok</div>
                  )}
                </td>
                <td className="py-3 pr-4" />
                <td className="py-3 pr-4" />
                <td className="py-3 pr-4" />
                <td className="py-3 pr-4 text-right">
                  <span className="text-sm font-bold text-primary">
                    {Math.round(totals.totalAttainment * 100)}%
                  </span>
                </td>
                <td className="py-3 pr-4 text-right">
                  <StatusPill status={overallStatus} className="text-[9px]" />
                </td>
                <td className="py-3 text-right">
                  <div className="text-sm font-bold text-primary">
                    ${Math.round(totals.totalEarned).toLocaleString()}
                  </div>
                  {config.bonusPool > 0 && (
                    <div className="text-[10px] text-slate-500">
                      of ${config.bonusPool.toLocaleString()}
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* C. Summary Card */}
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-primary font-semibold">
              Overall: {Math.round(totals.totalAttainment * 100)}% attainment
            </span>
            {config.bonusPool > 0 && (
              <span className="text-secondary">
                → ${Math.round(totals.totalEarned).toLocaleString()} of ${config.bonusPool.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-muted text-xs">
            {totals.lockedCount} of {ALL_MEASURE_KEYS.length} measures locked
            {unlockedMeasures.length > 0 && (
              <span> · {unlockedMeasures.map(k => MEASURE_LABELS[k]).join(', ')} pending</span>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
