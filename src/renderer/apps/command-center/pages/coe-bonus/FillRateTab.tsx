import { useState, useEffect, useMemo, useCallback } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import { COE_BONUS_PALETTE } from '../../../../components/charts/coeBonusEchartsTheme'
import { useBonusConfig } from '../../contexts/BonusConfigContext'
import { coeBonusService } from '../../services/coeBonusService'
import { SectionCard, KpiStat, TabError, TabLoading } from '../../components/coe-bonus/BonusUi'
import MeasureGauge from '../../components/coe-bonus/MeasureGauge'
import StatusPill from '../../components/coe-bonus/StatusPill'
import LockToOverviewButton from '../../components/coe-bonus/LockToOverviewButton'
import { QUARTER_END_MONTH } from '../../types/bonusConfig'
import type { FillRateLocalFilters, ReportFillRateResult, MeasureStatus } from '../../types/coeBonus'

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Parse 'YYYY-MM-DD' by splitting — avoids UTC-vs-local timezone shift. */
function parseDateParts(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format { year, month (0-based), day } as 'YYYY-MM-DD'. */
function toISODate(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function lastDay(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function monthCount(startDate: string, endDate: string): number {
  const s = parseDateParts(startDate)
  const e = parseDateParts(endDate)
  return (e.year - s.year) * 12 + (e.month - s.month) + 1
}

function formatDateRange(startDate: string, endDate: string): string {
  const s = parseDateParts(startDate)
  const e = parseDateParts(endDate)
  return `${SHORT_MONTHS[s.month]} ${s.day}, ${s.year} → ${SHORT_MONTHS[e.month]} ${e.day}, ${e.year}`
}

function statusForRate(fillRate: number, goal: number): MeasureStatus {
  if (fillRate >= goal) return 'on-track'
  if (fillRate >= goal * 0.85) return 'at-risk'
  return 'missed'
}

/**
 * Compute TTM date range aligned to the active quarter end.
 * E.g. Q2 2026 → Jul 1, 2025 to Jun 30, 2026.
 */
function computeQuarterAlignedTTM(
  year: number,
  quarter: string,
  coe: string,
): FillRateLocalFilters {
  const endMonth = QUARTER_END_MONTH[quarter] ?? new Date().getMonth()
  const endDate = toISODate(year, endMonth, lastDay(year, endMonth))

  // 12 months back: start at the month after endMonth, one year prior
  const startMonth = (endMonth + 1) % 12
  const startYear = endMonth === 11 ? year : year - 1
  const startDate = toISODate(startYear, startMonth, 1)

  return {
    startDate,
    endDate,
    coe: coe === 'All COEs' ? 'all' : coe,
    includeActive: false,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FillRateTab() {
  const { activePeriod } = useBonusConfig()

  // Initialize filters from active period's quarter-aligned TTM
  const [filters, setFilters] = useState<FillRateLocalFilters>(() =>
    computeQuarterAlignedTTM(activePeriod.year, activePeriod.quarter, activePeriod.coeName),
  )

  // Re-initialize when active period changes
  useEffect(() => {
    setFilters(computeQuarterAlignedTTM(activePeriod.year, activePeriod.quarter, activePeriod.coeName))
  }, [activePeriod.year, activePeriod.quarter, activePeriod.coeName])

  const [data, setData] = useState<ReportFillRateResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data when filters change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    coeBonusService.getFillRate(filters)
      .then(result => { if (!cancelled) { setData(result); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err instanceof Error ? err.message : String(err)); setLoading(false) } })
    return () => { cancelled = true }
  }, [filters.startDate, filters.endDate, filters.coe, filters.includeActive])

  // Derive start/end month+year from filter string (manual parse — no TZ shift)
  const startParts = useMemo(() => parseDateParts(filters.startDate), [filters.startDate])
  const endParts = useMemo(() => parseDateParts(filters.endDate), [filters.endDate])

  const years = useMemo(() => {
    const cur = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => cur - 5 + i)
  }, [])

  const updateStart = useCallback((month: number, year: number) => {
    setFilters(f => ({ ...f, startDate: toISODate(year, month, 1) }))
  }, [])

  const updateEnd = useCallback((month: number, year: number) => {
    setFilters(f => ({ ...f, endDate: toISODate(year, month, lastDay(year, month)) }))
  }, [])

  // ── Lock: determine which fill rate value to lock ───────────────────────
  const lockAchievement = useMemo(() => {
    if (!data) return 0
    if (filters.coe && filters.coe !== 'all') {
      const coeRow = data.coes.find(c => c.coe === filters.coe)
      if (coeRow) return coeRow.fillRate
    }
    return data.overallFillRate
  }, [data, filters.coe])

  const lockPeriodLabel = useMemo(() => {
    const e = parseDateParts(filters.endDate)
    return `TTM ${SHORT_MONTHS[e.month]} ${e.year}`
  }, [filters.endDate])

  // ── Charts ─────────────────────────────────────────────────────────────────

  const barOption = useMemo<EChartsOption>(() => {
    if (!data) return {}
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
      legend: { bottom: 0, data: ['Fill Rate', 'Goal'] },
      grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
      xAxis: { type: 'category', data: data.coes.map(c => c.coe), axisLabel: { rotate: data.coes.length > 6 ? 30 : 0 } },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: 'Fill Rate',
          type: 'bar',
          barWidth: 42,
          itemStyle: { borderRadius: [6, 6, 0, 0], color: COE_BONUS_PALETTE[0] },
          label: { show: true, position: 'top', formatter: '{c}%', color: 'inherit' },
          data: data.coes.map(c => c.fillRate),
        },
        {
          name: 'Goal',
          type: 'bar',
          barWidth: 42,
          itemStyle: { borderRadius: [6, 6, 0, 0], color: 'rgba(148,163,184,0.35)' },
          label: { show: true, position: 'top', formatter: '{c}%', color: 'inherit' },
          data: data.coes.map(c => c.goal),
        },
      ],
    }
  }, [data])

  const trendOption = useMemo<EChartsOption>(() => {
    if (!data) return {}
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
      legend: { bottom: 0 },
      grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: data.trend.map(t => t.label) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: 'Fill Rate',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: COE_BONUS_PALETTE[0] },
          areaStyle: { color: 'rgba(16,185,129,0.08)' },
          data: data.trend.map(t => t.fillRate),
        },
      ],
    }
  }, [data])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && !data) return <TabLoading label="Loading fill rate…" />
  if (error) return <TabError message={error} />
  if (!data) return null

  const months = monthCount(filters.startDate, filters.endDate)

  return (
    <div className="space-y-4">
      {/* COE scope chip */}
      {filters.coe && filters.coe !== 'all' && (
        <div className="flex items-center gap-2 px-3 py-1.5 glass-panel-subtle rounded-lg w-fit text-xs">
          <span className="text-muted">COE:</span>
          <span className="text-emerald-400 font-medium">{filters.coe}</span>
        </div>
      )}

      {/* Filter bar */}
      <SectionCard>
        <div className="flex flex-wrap items-center gap-4">
          {/* Start month/year */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-secondary">Start</span>
            <select
              className="glass-input px-2 py-1 text-sm rounded"
              value={startParts.month}
              onChange={e => updateStart(Number(e.target.value), startParts.year)}
            >
              {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              className="glass-input px-2 py-1 text-sm rounded"
              value={startParts.year}
              onChange={e => updateStart(startParts.month, Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* End month/year */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-secondary">End</span>
            <select
              className="glass-input px-2 py-1 text-sm rounded"
              value={endParts.month}
              onChange={e => updateEnd(Number(e.target.value), endParts.year)}
            >
              {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              className="glass-input px-2 py-1 text-sm rounded"
              value={endParts.year}
              onChange={e => updateEnd(endParts.month, Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-emerald-500"
              checked={filters.includeActive}
              onChange={e => setFilters(f => ({ ...f, includeActive: e.target.checked }))}
            />
            Include active positions
          </label>

          {/* Date range summary */}
          <div className="ml-auto text-xs text-muted">
            {formatDateRange(filters.startDate, filters.endDate)} ({months} month{months !== 1 ? 's' : ''})
          </div>
        </div>
      </SectionCard>

      {/* Lock button + KPI summary */}
      <div className="flex items-center justify-between">
        <div className="grid gap-4 sm:grid-cols-3 flex-1">
          <KpiStat label="Overall Fill Rate" value={`${data.overallFillRate}%`} accentClass="text-emerald-500" />
          <KpiStat label="Closed Won" value={String(data.overallClosedWon)} hint={`of ${data.overallDenominator} total`} />
          <KpiStat
            label="Last Synced"
            value={data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleDateString() : 'Never'}
          />
        </div>
        <div className="ml-4 flex-shrink-0">
          <LockToOverviewButton
            measureKey="fillRate"
            currentAchievement={lockAchievement}
            periodLabel={lockPeriodLabel}
            filters={{
              startDate: filters.startDate,
              endDate: filters.endDate,
              coe: filters.coe,
              includeActive: filters.includeActive,
            }}
          />
        </div>
      </div>

      {/* Per-COE gauge cards */}
      {data.coes.length > 0 && (
        <div className={`grid gap-4 ${data.coes.length === 1 ? 'md:grid-cols-1 max-w-md' : data.coes.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {data.coes.map(c => {
            const status = statusForRate(c.fillRate, c.goal)
            return (
              <SectionCard
                key={c.coe}
                title={c.coe}
                subtitle={`${c.closedWon} won of ${c.totalDenominator} total`}
                action={<StatusPill status={status} />}
              >
                <MeasureGauge
                  value={c.fillRate}
                  goal={c.goal}
                  min={Math.max(0, c.goal - 30)}
                  max={Math.min(100, c.goal + 25)}
                  status={status}
                  height={190}
                />
                <p className="text-center text-xs text-secondary -mt-2">Goal {c.goal}%</p>
              </SectionCard>
            )
          })}
        </div>
      )}

      {/* Grouped bar chart */}
      {data.coes.length > 0 && (
        <SectionCard title="Fill Rate vs. Goal by COE" subtitle="Achievement against COE-specific goals">
          <EChart option={barOption} height={280} />
        </SectionCard>
      )}

      {/* Monthly trend line chart */}
      {data.trend.length > 0 && (
        <SectionCard title="Monthly Trend" subtitle="Fill rate across the selected window">
          <EChart option={trendOption} height={280} />
        </SectionCard>
      )}

      {/* COE breakdown table */}
      {data.coes.length > 0 && (
        <SectionCard title="COE Breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b minimal-divider">
                  <th className="py-2 pr-4 font-semibold">COE</th>
                  <th className="py-2 pr-4 font-semibold text-right">Closed Won</th>
                  <th className="py-2 pr-4 font-semibold text-right">Closed Other</th>
                  {filters.includeActive && <th className="py-2 pr-4 font-semibold text-right">Active</th>}
                  <th className="py-2 pr-4 font-semibold text-right">Total</th>
                  <th className="py-2 pr-4 font-semibold text-right">Fill Rate</th>
                  <th className="py-2 pr-4 font-semibold text-right">Goal</th>
                  <th className="py-2 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.coes.map(c => {
                  const status = statusForRate(c.fillRate, c.goal)
                  return (
                    <tr key={c.coe} className="border-b minimal-divider last:border-0">
                      <td className="py-2 pr-4 text-primary">{c.coe}</td>
                      <td className="py-2 pr-4 text-right text-secondary">{c.closedWon}</td>
                      <td className="py-2 pr-4 text-right text-secondary">{c.closedOther}</td>
                      {filters.includeActive && <td className="py-2 pr-4 text-right text-secondary">{c.activeCount}</td>}
                      <td className="py-2 pr-4 text-right text-secondary">{c.totalDenominator}</td>
                      <td className={`py-2 pr-4 text-right font-semibold ${c.fillRate >= c.goal ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {c.fillRate}%
                      </td>
                      <td className="py-2 pr-4 text-right text-secondary">{c.goal}%</td>
                      <td className="py-2 text-right"><StatusPill status={status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Empty state */}
      {data.coes.length === 0 && (
        <SectionCard>
          <div className="text-center py-12">
            <p className="text-muted text-sm">No positions found for the selected date range.</p>
            <p className="text-muted text-xs mt-1">Try adjusting the start/end dates or syncing open positions.</p>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
