import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePLBConfig } from '../../contexts/PracticeLeadBonusConfigContext'
import { useNexusStatus } from '../../../../contexts/NexusStatusContext'
import { useOffboardingSync } from '../../hooks/useOffboardingSync'
import { practiceLeadBonusRendererService } from '../../services/practiceLeadBonusService'
import { SectionCard, KpiStat, TabLoading, TabError } from '../../components/coe-bonus/BonusUi'
import { CascadingFilters } from '../../components/practice-lead-bonus/CascadingFilters'
import { BonusTierPill } from '../../components/practice-lead-bonus/BonusTierPill'
import EChart from '../../../../components/charts/EChart'
import type { PLBOffboardingEntry } from '../../../../../shared/ipc-types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const STALE_THRESHOLD_DAYS = 7

const QUARTER_MONTH_RANGES: Record<string, [number, number]> = {
  Q1: [1, 3], Q2: [4, 6], Q3: [7, 9], Q4: [10, 12],
}

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getMonthFromDate(d: string | null): number | null {
  if (!d) return null
  return new Date(d).getMonth() + 1
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function marginColor(m: number): string {
  if (m >= 55) return 'text-emerald-400'
  if (m >= 50) return 'text-blue-400'
  if (m >= 45) return 'text-amber-400'
  if (m >= 40) return 'text-orange-300'
  return 'text-slate-400'
}

// ── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function OffboardingsTab() {
  const { activePeriod, config, sharedFilters, setSharedFilters, setActivePeriod } = usePLBConfig()
  const { apiTokens } = useNexusStatus()

  // Sync hook for inline re-sync controls
  const {
    syncStatus,
    syncing,
    syncError,
    handleSync,
    hasUsableToken,
  } = useOffboardingSync(
    activePeriod.year,
    apiTokens.exec.token,
    apiTokens.exec.isValid,
  )

  // Enriched PLB offboarding data
  const [entries, setEntries] = useState<PLBOffboardingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEnrichedData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await practiceLeadBonusRendererService.getOffboardings(
        activePeriod.year, 'ALL', config.tiers,
      )
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [activePeriod.year, config.tiers])

  useEffect(() => { loadEnrichedData() }, [loadEnrichedData])

  // Reload enriched data after sync completes
  useEffect(() => {
    if (syncStatus?.syncedAt) loadEnrichedData()
  }, [syncStatus?.syncedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter state (local only — shared filters come from context) ──
  const [month, setMonth] = useState<number | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<string>('offboardingDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editingGmKey, setEditingGmKey] = useState<string | null>(null)
  const [savedGmKey, setSavedGmKey] = useState<string | null>(null)

  const handleGmSave = async (entry: PLBOffboardingEntry, rawValue: string) => {
    const newGm = parseFloat(rawValue)
    setEditingGmKey(null)
    if (isNaN(newGm) || newGm < 0 || newGm > 100) return
    if (newGm === entry.gm) return
    await practiceLeadBonusRendererService.saveGmOverride(
      activePeriod.year, entry.employee, entry.offboardingDate ?? null, entry.account, newGm
    )
    const key = `${entry.employee}|${entry.offboardingDate ?? ''}|${entry.account}`
    setSavedGmKey(key)
    setTimeout(() => setSavedGmKey(null), 1500)
    loadEnrichedData()
  }

  // Reset month when quarter changes
  useEffect(() => {
    setMonth(null)
  }, [activePeriod.quarter])

  // ── Derived: filtered entries ─────────────────────────────────────
  const filteredEntries = useMemo(() => {
    let result = entries

    // Shared filters (from context)
    if (sharedFilters.coe) result = result.filter(e => e.coeName === sharedFilters.coe)
    if (sharedFilters.practice) result = result.filter(e => e.practiceName === sharedFilters.practice)
    if (sharedFilters.mainSkill) result = result.filter(e => e.mainSkill === sharedFilters.mainSkill)
    // Quarter filter (from activePeriod in context)
    if (activePeriod.quarter !== 'ALL') {
      const [qStart, qEnd] = QUARTER_MONTH_RANGES[activePeriod.quarter]
      result = result.filter(e => {
        const m = getMonthFromDate(e.offboardingDate)
        return m !== null && m >= qStart && m <= qEnd
      })
    }
    // Local filters
    if (month !== null) {
      result = result.filter(e => getMonthFromDate(e.offboardingDate) === month)
    }
    if (account) result = result.filter(e => e.account === account)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(e =>
        e.employee.toLowerCase().includes(s) ||
        e.account.toLowerCase().includes(s) ||
        e.mainSkill.toLowerCase().includes(s) ||
        e.practiceName.toLowerCase().includes(s)
      )
    }

    return result
  }, [entries, sharedFilters, activePeriod.quarter, month, account, search])

  // ── Sorting ──────────────────────────────────────────────────────
  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries]
    sorted.sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? ''
      const bVal = (b as any)[sortKey] ?? ''
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
    return sorted
  }, [filteredEntries, sortKey, sortDir])

  const pagedEntries = useMemo(() => {
    const start = page * PAGE_SIZE
    return sortedEntries.slice(start, start + PAGE_SIZE)
  }, [sortedEntries, page])

  const totalPages = Math.ceil(sortedEntries.length / PAGE_SIZE)

  useEffect(() => { setPage(0) }, [sharedFilters, activePeriod.quarter, month, account, search])

  // ── Derived: KPIs ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const avgGm = filteredEntries.length > 0
      ? filteredEntries.reduce((s, e) => s + e.gm, 0) / filteredEntries.length
      : 0
    const avgTenure = filteredEntries.length > 0
      ? filteredEntries.reduce((s, e) => s + e.unosquareTenure, 0) / filteredEntries.length
      : 0
    const totalPenalty = filteredEntries.reduce((s, e) => s + e.penaltyAmount, 0)

    // YTD: count all entries for the year (unfiltered by quarter)
    const ytdCount = entries.length

    return {
      offboardings: filteredEntries.length,
      totalPenalty,
      avgGm,
      avgTenure,
      ytdCount,
    }
  }, [filteredEntries, entries])

  // ── Derived: accounts for filter dropdown ───────────────────────
  const accounts = useMemo(() => {
    const set = new Set(entries.map(e => e.account).filter(Boolean))
    return Array.from(set).sort()
  }, [entries])

  // ── Derived: monthly trend chart ────────────────────────────────
  const trendOption = useMemo(() => {
    const monthData = new Map<number, { count: number; penalty: number }>()
    for (const e of filteredEntries) {
      const m = getMonthFromDate(e.offboardingDate)
      if (m === null) continue
      const existing = monthData.get(m) ?? { count: 0, penalty: 0 }
      existing.count++
      existing.penalty += e.penaltyAmount
      monthData.set(m, existing)
    }

    const months = Array.from(monthData.keys()).sort((a, b) => a - b)
    if (months.length === 0) return null

    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: '3%', right: '4%', bottom: '10%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category' as const,
        data: months.map(m => MONTH_LABELS[m]),
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: [
        { type: 'value' as const, name: 'Count', axisLabel: { color: '#94a3b8', fontSize: 11 }, splitLine: { lineStyle: { color: '#1e293b' } } },
        { type: 'value' as const, name: 'Penalty $', axisLabel: { color: '#94a3b8', fontSize: 11 }, splitLine: { show: false } },
      ],
      series: [
        {
          name: 'Offboardings',
          type: 'bar' as const,
          data: months.map(m => monthData.get(m)!.count),
          itemStyle: { color: 'rgba(239, 68, 68, 0.6)' },
          yAxisIndex: 0,
          barMaxWidth: 30,
        },
        {
          name: 'Penalty $',
          type: 'line' as const,
          data: months.map(m => monthData.get(m)!.penalty),
          itemStyle: { color: '#ef4444' },
          smooth: true,
          yAxisIndex: 1,
        },
      ],
    }
  }, [filteredEntries])

  // ── Sort handler ────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIndicator = ({ field }: { field: string }) => {
    if (sortKey !== field) return null
    return <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  if (loading && entries.length === 0) return <TabLoading label="Loading offboardings…" />
  if (error) return <TabError message={error} />

  // Empty state for offboardings (this is actually a GOOD thing!)
  const isEmpty = entries.length === 0 && !loading

  return (
    <div className="space-y-4">
      {/* Sync Panel */}
      <div className="glass-panel-subtle rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-muted">
          {syncStatus?.syncedAt && (
            <>
              <span>Last synced: {fmtDate(syncStatus.syncedAt)}</span>
              {daysSince(syncStatus.syncedAt) > STALE_THRESHOLD_DAYS && (
                <span className="text-amber-400 font-medium">⚠ Stale data ({daysSince(syncStatus.syncedAt)}d old)</span>
              )}
            </>
          )}
          {!syncStatus?.hasSyncedData && <span>No offboarding data synced yet</span>}
          {syncError && <span className="text-red-400">{syncError}</span>}
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || !hasUsableToken}
          className="px-3 py-1 text-xs font-medium rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? 'Syncing…' : 'Re-sync'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiStat
          label={`${activePeriod.quarter} Performance Offboardings`}
          value={String(kpis.offboardings)}
          accentClass={kpis.offboardings === 0 ? 'text-slate-400' : 'text-primary'}
        />
        <KpiStat
          label="Total Penalty"
          value={kpis.totalPenalty > 0 ? `-$${kpis.totalPenalty.toLocaleString()}` : '$0'}
          accentClass={kpis.totalPenalty > 0 ? 'text-red-400' : 'text-slate-400'}
        />
        <KpiStat
          label="Avg GM %"
          value={kpis.offboardings > 0 ? `${kpis.avgGm.toFixed(1)}%` : '—'}
          accentClass={kpis.offboardings > 0 ? marginColor(kpis.avgGm) : 'text-slate-400'}
        />
        <KpiStat
          label="Avg Tenure"
          value={kpis.offboardings > 0 ? `${kpis.avgTenure.toFixed(0)} mo` : '—'}
          accentClass="text-slate-300"
        />
        <KpiStat
          label="YTD Performance Offboardings"
          value={String(kpis.ytdCount)}
          accentClass={kpis.ytdCount === 0 ? 'text-slate-400' : 'text-primary'}
        />
      </div>

      {/* Empty state */}
      {isEmpty && (
        <SectionCard>
          <div className="py-12 text-center">
            <p className="text-lg text-slate-300 mb-1">
              No performance offboardings in {activePeriod.quarter} {activePeriod.year}
            </p>
            <p className="text-sm text-muted">This is a good thing! 🎉</p>
          </div>
        </SectionCard>
      )}

      {/* Trend Chart */}
      {trendOption && (
        <SectionCard title="Monthly Trend">
          <EChart option={trendOption} style={{ height: 250 }} />
        </SectionCard>
      )}

      {!trendOption && !isEmpty && (
        <div className="glass-panel-subtle rounded-xl p-6 text-center">
          <p className="text-sm text-muted">No performance offboardings to chart</p>
        </div>
      )}

      {/* Filters */}
      {!isEmpty && (
        <div className="flex flex-wrap items-center gap-3">
          <CascadingFilters
            sharedFilters={sharedFilters}
            onSharedChange={setSharedFilters}
            quarter={activePeriod.quarter}
            month={month}
            account={account}
            onLocalChange={patch => {
              if (patch.quarter !== undefined) setActivePeriod({ ...activePeriod, quarter: patch.quarter as any })
              if (patch.month !== undefined) setMonth(patch.month)
              if (patch.account !== undefined) setAccount(patch.account)
            }}
            accounts={accounts}
          />
          <input
            type="text"
            placeholder="Search employee, account, skill…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-primary placeholder:text-muted w-48"
          />
        </div>
      )}

      {/* Records Table */}
      {!isEmpty && (
        <SectionCard title={`Performance Offboardings (${filteredEntries.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {[
                    { key: 'employee', label: 'Employee', align: 'left' },
                    { key: 'account', label: 'Account', align: 'left' },
                    { key: 'mainSkill', label: 'Skill', align: 'left' },
                    { key: 'practiceName', label: 'Practice', align: 'left' },
                    { key: 'coeName', label: 'COE', align: 'left' },
                    { key: 'offboardingDate', label: 'Date', align: 'left' },
                    { key: 'seniority', label: 'Seniority', align: 'left' },
                    { key: 'gm', label: 'GM %', align: 'right' },
                    { key: 'penaltyAmount', label: 'Penalty', align: 'right' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`${col.align === 'right' ? 'text-right' : 'text-left'} px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-primary`}
                    >
                      {col.label}<SortIndicator field={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedEntries.map((e) => (
                  <tr key={`${e.employee}|${e.offboardingDate ?? ''}|${e.account}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-primary">{e.employee}</td>
                    <td className="px-3 py-2 text-secondary">{e.account}</td>
                    <td className="px-3 py-2 text-secondary">{e.mainSkill}</td>
                    <td className="px-3 py-2 text-secondary">{e.practiceName}</td>
                    <td className="px-3 py-2 text-secondary">{e.coeName}</td>
                    <td className="px-3 py-2 text-secondary">{fmtDate(e.offboardingDate)}</td>
                    <td className="px-3 py-2 text-secondary">{e.seniority}</td>
                    <td className="px-3 py-2 text-right">
                      {editingGmKey === `${e.employee}|${e.offboardingDate ?? ''}|${e.account}` ? (
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
                          onClick={() => setEditingGmKey(`${e.employee}|${e.offboardingDate ?? ''}|${e.account}`)}
                          className={`cursor-pointer hover:underline font-medium ${marginColor(e.gm)}`}
                        >
                          {e.gm.toFixed(1)}%
                          {e.gmOriginal !== e.gm && <span className="ml-1 text-[9px] text-amber-400">✎</span>}
                          {savedGmKey === `${e.employee}|${e.offboardingDate ?? ''}|${e.account}` && <span className="ml-1 text-[9px] text-emerald-400">✓ saved</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <BonusTierPill tierLabel={e.penaltyTierLabel} amount={e.penaltyAmount} type="penalty" />
                    </td>
                  </tr>
                ))}
                {pagedEntries.length === 0 && filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted">
                      No performance offboardings match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 px-2">
              <span className="text-xs text-muted">
                Page {page + 1} of {totalPages} ({sortedEntries.length} results)
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-2 py-1 text-xs rounded bg-white/5 text-muted hover:text-primary disabled:opacity-30"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-2 py-1 text-xs rounded bg-white/5 text-muted hover:text-primary disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}
