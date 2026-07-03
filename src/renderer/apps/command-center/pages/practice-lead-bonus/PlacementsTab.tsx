import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePLBConfig } from '../../contexts/PracticeLeadBonusConfigContext'
import { useNexusStatus } from '../../../../contexts/NexusStatusContext'
import { usePlacementMarginSync } from '../../hooks/usePlacementMarginSync'
import { practiceLeadBonusRendererService } from '../../services/practiceLeadBonusService'
import { SectionCard, KpiStat, TabLoading, TabError } from '../../components/coe-bonus/BonusUi'
import { CascadingFilters } from '../../components/practice-lead-bonus/CascadingFilters'
import { BonusTierPill } from '../../components/practice-lead-bonus/BonusTierPill'
import EChart from '../../../../components/charts/EChart'
import type { PLBPlacementEntry } from '../../../../../shared/ipc-types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const STALE_THRESHOLD_DAYS = 7

const QUARTER_MONTH_RANGES: Record<string, [number, number]> = {
  Q1: [1, 3], Q2: [4, 6], Q3: [7, 9], Q4: [10, 12],
}

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function avg(entries: PLBPlacementEntry[], field: 'placementMargin' | 'placementRate' | 'kickoffDelay'): number {
  if (entries.length === 0) return 0
  const sum = entries.reduce((s, e) => {
    const v = e[field]
    return s + (typeof v === 'number' ? v : 0)
  }, 0)
  return sum / entries.length
}

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

export default function PlacementsTab() {
  const { activePeriod, config, sharedFilters, setSharedFilters, setActivePeriod } = usePLBConfig()
  const { apiTokens } = useNexusStatus()

  // Sync hook for inline re-sync controls
  const {
    syncStatus,
    syncing,
    syncError,
    handleSync,
    hasUsableToken,
  } = usePlacementMarginSync(
    activePeriod.year,
    apiTokens.exec.token,
    apiTokens.exec.isValid,
  )

  // Enriched PLB data
  const [entries, setEntries] = useState<PLBPlacementEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEnrichedData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await practiceLeadBonusRendererService.getPlacements(
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
  const [sortKey, setSortKey] = useState<string>('placementDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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
        const m = getMonthFromDate(e.placementDate)
        return m !== null && m >= qStart && m <= qEnd
      })
    }
    // Local filters
    if (month !== null) {
      result = result.filter(e => getMonthFromDate(e.placementDate) === month)
    }
    if (account) result = result.filter(e => e.account === account)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(e =>
        e.name.toLowerCase().includes(s) ||
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

  // Paginated entries
  const pagedEntries = useMemo(() => {
    const start = page * PAGE_SIZE
    return sortedEntries.slice(start, start + PAGE_SIZE)
  }, [sortedEntries, page])

  const totalPages = Math.ceil(sortedEntries.length / PAGE_SIZE)

  // Reset page on filter change
  useEffect(() => { setPage(0) }, [sharedFilters, activePeriod.quarter, month, account, search])

  // ── Derived: KPIs ──────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    avgMargin: avg(filteredEntries, 'placementMargin'),
    avgRate: avg(filteredEntries, 'placementRate'),
    placements: filteredEntries.length,
    uniquePeople: new Set(filteredEntries.map(e => e.name)).size,
    avgKickoff: avg(filteredEntries, 'kickoffDelay'),
    totalBonus: filteredEntries.reduce((s, e) => s + e.bonusAmount, 0),
  }), [filteredEntries])

  // ── Derived: accounts for filter dropdown ───────────────────────
  const accounts = useMemo(() => {
    const set = new Set(entries.map(e => e.account).filter(Boolean))
    return Array.from(set).sort()
  }, [entries])

  // ── Derived: monthly trend ────────────────────────────────────────
  const trendOption = useMemo(() => {
    const monthData = new Map<number, { count: number; marginSum: number }>()
    for (const e of filteredEntries) {
      const m = getMonthFromDate(e.placementDate)
      if (m === null) continue
      const existing = monthData.get(m) ?? { count: 0, marginSum: 0 }
      existing.count++
      existing.marginSum += e.placementMargin
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
        { type: 'value' as const, name: 'Margin %', axisLabel: { color: '#94a3b8', fontSize: 11 }, splitLine: { lineStyle: { color: '#1e293b' } } },
        { type: 'value' as const, name: 'Count', axisLabel: { color: '#94a3b8', fontSize: 11 }, splitLine: { show: false } },
      ],
      series: [
        {
          name: 'Avg Margin %',
          type: 'line' as const,
          data: months.map(m => {
            const d = monthData.get(m)!
            return Math.round((d.marginSum / d.count) * 100) / 100
          }),
          itemStyle: { color: '#10b981' },
          areaStyle: { color: 'rgba(16, 185, 129, 0.1)' },
          smooth: true,
          yAxisIndex: 0,
        },
        {
          name: 'Placements',
          type: 'bar' as const,
          data: months.map(m => monthData.get(m)!.count),
          itemStyle: { color: 'rgba(59, 130, 246, 0.5)' },
          yAxisIndex: 1,
          barMaxWidth: 30,
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

  if (loading && entries.length === 0) return <TabLoading label="Loading placements…" />
  if (error) return <TabError message={error} />

  return (
    <div className="space-y-4">
      {/* Sync Panel */}
      <div className="glass-panel-subtle rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-muted">
          {syncStatus?.syncedAt && (
            <>
              <span>Last synced: {fmtDate(syncStatus.syncedAt)}</span>
              <span>•</span>
              <span>{syncStatus.entryCount} entries</span>
              {daysSince(syncStatus.syncedAt) > STALE_THRESHOLD_DAYS && (
                <span className="text-amber-400 font-medium">⚠ Stale data ({daysSince(syncStatus.syncedAt)}d old)</span>
              )}
            </>
          )}
          {!syncStatus?.hasSyncedData && <span>No data synced yet</span>}
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiStat
          label={`${activePeriod.quarter} Margin`}
          value={`${kpis.avgMargin.toFixed(1)}%`}
          accentClass={marginColor(kpis.avgMargin)}
        />
        <KpiStat label="Avg Rate" value={`$${kpis.avgRate.toFixed(0)}/hr`} />
        <KpiStat label="Placements" value={String(kpis.placements)} hint={`${kpis.uniquePeople} unique people`} />
        <KpiStat label="Avg Kickoff" value={`${kpis.avgKickoff.toFixed(0)}d`} />
        <KpiStat label="Total Bonus" value={`$${kpis.totalBonus.toLocaleString()}`} accentClass="text-emerald-400" />
      </div>

      {/* Trend Chart */}
      {trendOption && (
        <SectionCard title="Monthly Trend">
          <EChart option={trendOption} style={{ height: 250 }} />
        </SectionCard>
      )}

      {/* Filters */}
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
          placeholder="Search name, account, skill…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-primary placeholder:text-muted w-48"
        />
      </div>

      {/* Records Table */}
      <SectionCard title={`Placements (${filteredEntries.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {[
                  { key: 'name', label: 'Name', align: 'left' },
                  { key: 'account', label: 'Account', align: 'left' },
                  { key: 'mainSkill', label: 'Skill', align: 'left' },
                  { key: 'practiceName', label: 'Practice', align: 'left' },
                  { key: 'coeName', label: 'COE', align: 'left' },
                  { key: 'placementDate', label: 'Date', align: 'left' },
                  { key: 'placementRate', label: 'Rate', align: 'right' },
                  { key: 'placementMargin', label: 'Margin@', align: 'right' },
                  { key: 'currentMargin', label: 'Current', align: 'right' },
                  { key: 'bonusAmount', label: 'Bonus', align: 'right' },
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
                <tr key={`${e.name}|${e.placementDate ?? ''}|${e.account}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-primary">{e.name}</td>
                  <td className="px-3 py-2 text-secondary">{e.account}</td>
                  <td className="px-3 py-2 text-secondary">{e.mainSkill}</td>
                  <td className="px-3 py-2 text-secondary">{e.practiceName}</td>
                  <td className="px-3 py-2 text-secondary">{e.coeName}</td>
                  <td className="px-3 py-2 text-secondary">{fmtDate(e.placementDate)}</td>
                  <td className="px-3 py-2 text-right text-primary">${e.placementRate.toFixed(0)}/hr</td>
                  <td className={`px-3 py-2 text-right font-medium ${marginColor(e.placementMargin)}`}>
                    {e.placementMargin.toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-right ${marginColor(e.currentMargin)}`}>
                    {e.currentMargin.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right">
                    <BonusTierPill tierLabel={e.bonusTierLabel} amount={e.bonusAmount} type="bonus" />
                  </td>
                </tr>
              ))}
              {pagedEntries.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-muted">
                    No placements match the current filters.
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
    </div>
  )
}
