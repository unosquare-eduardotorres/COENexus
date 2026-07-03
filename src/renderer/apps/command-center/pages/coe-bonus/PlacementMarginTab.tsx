import { useState, useEffect, useMemo, useCallback } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from '../../../../components/charts/EChart'
import { STATUS_COLORS } from '../../../../components/charts/coeBonusEchartsTheme'
import { useBonusConfig } from '../../contexts/BonusConfigContext'
import { useNexusStatus } from '../../../../contexts/NexusStatusContext'
import { usePlacementMarginSync } from '../../hooks/usePlacementMarginSync'
import { useCoeSkillMapping } from '../../hooks/useCoeSkillMapping'
import { KpiStat, SectionCard, TabError, TabLoading } from '../../components/coe-bonus/BonusUi'
import StatusPill from '../../components/coe-bonus/StatusPill'
import LockToOverviewButton from '../../components/coe-bonus/LockToOverviewButton'
import PlacementMarginFilters from '../../components/coe-bonus/PlacementMarginFilters'
import PlacementMarginTable from '../../components/coe-bonus/PlacementMarginTable'
import type { PlacementMarginEntryDto } from '../../types/coeBonus'
import type { MeasureStatus } from '../../types/coeBonus'

// ── Constants ────────────────────────────────────────────────────────────────

/** Number of days before showing a "stale data" warning. */
const STALE_THRESHOLD_DAYS = 7

type QuarterKey = 'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

const QUARTER_MONTH_RANGES: Record<Exclude<QuarterKey, 'ALL'>, [number, number]> = {
  Q1: [1, 3],
  Q2: [4, 6],
  Q3: [7, 9],
  Q4: [10, 12],
}

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Helpers ──────────────────────────────────────────────────────────────────

function avg(entries: PlacementMarginEntryDto[], field: 'placementMargin' | 'placementRate' | 'kickoffDelay'): number {
  if (entries.length === 0) return 0
  const sum = entries.reduce((s, e) => {
    const v = e[field]
    return s + (typeof v === 'number' ? v : 0)
  }, 0)
  return sum / entries.length
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function getMonthFromDate(d: string | null): number | null {
  if (!d) return null
  return new Date(d).getMonth() + 1
}

function quarterForMonth(month: number): QuarterKey {
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PlacementMarginTab() {
  const { activePeriod, config, catalogCoes } = useBonusConfig()
  const { apiTokens } = useNexusStatus()
  const { mapSkillToCoe } = useCoeSkillMapping(catalogCoes)

  const pmConfig = config.measures.placementMargin
  const FLOOR = pmConfig.floor
  const TARGET = pmConfig.goal

  const {
    data,
    loading,
    error,
    syncing,
    syncError,
    handleSync,
    hasUsableToken,
  } = usePlacementMarginSync(
    activePeriod.year,
    apiTokens.exec.token,
    apiTokens.exec.isValid,
  )

  // ── COE-filtered entries ───────────────────────────────────────────────
  const coeFilteredEntries = useMemo(() => {
    const allEntries = data?.entries ?? []
    if (!activePeriod.coeName || activePeriod.coeName === 'All COEs') return allEntries
    return allEntries.filter(e => {
      const mapped = mapSkillToCoe(e.mainSkill ?? '')
      return mapped.coeName === activePeriod.coeName
    })
  }, [data, activePeriod.coeName, mapSkillToCoe])

  // ── Filter state ────────────────────────────────────────────────────────
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterKey>(activePeriod.quarter)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  // Sync quarter when active period changes
  useEffect(() => {
    setSelectedQuarter(activePeriod.quarter)
    setSelectedMonth(null)
  }, [activePeriod.quarter])

  // ── Derived: filter entries ─────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    let result = coeFilteredEntries
    if (selectedQuarter !== 'ALL') {
      const [qStart, qEnd] = QUARTER_MONTH_RANGES[selectedQuarter]
      result = result.filter(e => {
        const m = getMonthFromDate(e.placementDate)
        return m !== null && m >= qStart && m <= qEnd
      })
    }
    if (selectedMonth !== null) {
      result = result.filter(e => getMonthFromDate(e.placementDate) === selectedMonth)
    }
    if (selectedAccount) {
      result = result.filter(e => e.account === selectedAccount)
    }
    return result
  }, [coeFilteredEntries, selectedQuarter, selectedMonth, selectedAccount])

  // ── Derived: KPIs ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const isYtd = selectedQuarter === 'ALL' && selectedMonth === null && selectedAccount === null
    // When COE-filtered, we can't use the pre-aggregated ytdMargin since it spans all COEs
    const usePreaggregated = isYtd && data && activePeriod.coeName === 'All COEs'
    return {
      avgMargin: usePreaggregated ? data.ytdMargin : avg(filteredEntries, 'placementMargin'),
      avgRate: usePreaggregated ? data.ytdAvgRate : avg(filteredEntries, 'placementRate'),
      placements: filteredEntries.length,
      uniquePeople: new Set(filteredEntries.map(e => e.name)).size,
      avgKickoff: avg(filteredEntries, 'kickoffDelay'),
    }
  }, [filteredEntries, selectedQuarter, selectedMonth, selectedAccount, data, activePeriod.coeName])

  // ── Derived: bonus status ──────────────────────────────────────────────
  const bonusStatus: MeasureStatus = kpis.avgMargin >= TARGET ? 'on-track' : kpis.avgMargin >= FLOOR ? 'at-risk' : 'missed'

  // ── Derived: KPI label ─────────────────────────────────────────────────
  const kpiLabel = useMemo(() => {
    if (selectedMonth !== null) return `${MONTH_LABELS[selectedMonth]} Margin`
    return `${activePeriod.quarter} Margin`
  }, [selectedMonth, activePeriod.quarter])

  // ── Derived: account list for dropdown ─────────────────────────────────
  const accounts = useMemo(() => {
    let base = coeFilteredEntries
    if (selectedQuarter !== 'ALL') {
      const [qStart, qEnd] = QUARTER_MONTH_RANGES[selectedQuarter]
      base = base.filter(e => {
        const m = getMonthFromDate(e.placementDate)
        return m !== null && m >= qStart && m <= qEnd
      })
    }
    if (selectedMonth !== null) {
      base = base.filter(e => getMonthFromDate(e.placementDate) === selectedMonth)
    }
    const map = new Map<string, number>()
    for (const e of base) {
      map.set(e.account, (map.get(e.account) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [coeFilteredEntries, selectedQuarter, selectedMonth])

  // ── Chart: trend ───────────────────────────────────────────────────────
  const trendOption = useMemo<EChartsOption>(() => {
    if (!data?.monthlyTrend?.length) return {}
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v: number) => `${v.toFixed(1)}%`,
      },
      legend: {
        data: ['Placement Margin', 'Current Margin'],
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 10 },
      },
      grid: { left: 8, right: 16, top: 28, bottom: 20, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.monthlyTrend.map(t => t.label),
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%', fontSize: 10 },
        scale: true,
      },
      series: [
        {
          name: 'Placement Margin',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          areaStyle: { opacity: 0.10 },
          data: data.monthlyTrend.map(t => t.placementMargin),
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: STATUS_COLORS['at-risk'], type: 'dashed' },
            data: [{ yAxis: TARGET, label: { formatter: `Target ${TARGET}%`, fontSize: 9 } }],
          },
        },
        {
          name: 'Current Margin',
          type: 'line',
          smooth: true,
          symbolSize: 4,
          lineStyle: { type: 'dashed', opacity: 0.7 },
          data: data.monthlyTrend.map(t => t.currentMargin),
        },
      ],
    }
  }, [data, TARGET])

  // Chart click handler: select month
  const handleChartClick = useCallback((params: { dataIndex?: number }) => {
    if (!data?.monthlyTrend?.length || params.dataIndex == null) return
    const point = data.monthlyTrend[params.dataIndex]
    if (!point) return
    const month = point.month
    setSelectedQuarter(quarterForMonth(month))
    setSelectedMonth(month)
  }, [data])

  // ── Account filter from table click ────────────────────────────────────
  const handleAccountFilterFromTable = useCallback((account: string) => {
    setSelectedAccount(prev => prev === account ? null : account)
  }, [])

  // ── Lock period label ─────────────────────────────────────────────────
  const lockPeriodLabel = `${activePeriod.quarter} ${activePeriod.year}`

  // ── Loading / error states ─────────────────────────────────────────────
  if (loading && !data) return <TabLoading label="Loading placement margin…" />
  if (error && !data) return <TabError message={error} />

  // ── No data → sync prompt ──────────────────────────────────────────────
  if (!data) {
    return (
      <SectionCard title="Placement Margin" subtitle="No data synced for this period">
        <div className="text-center py-8">
          <p className="text-slate-300 mb-4">
            Sync placement margin data for {activePeriod.year} from the Exec API.
          </p>
          <button
            onClick={handleSync}
            disabled={syncing || !hasUsableToken}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Sync Now
              </>
            )}
          </button>
          {syncError && <p className="text-red-400 text-sm mt-3">{syncError}</p>}
          {!hasUsableToken && (
            <p className="text-amber-400 text-xs mt-2">Paste a valid token from reports.unosquare.com</p>
          )}
        </div>
      </SectionCard>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const staleDays = data.syncedAt ? daysSince(data.syncedAt) : null

  return (
    <div className="space-y-3">
      {/* COE scope chip */}
      {activePeriod.coeName && activePeriod.coeName !== 'All COEs' && (
        <div className="flex items-center gap-2 px-3 py-1.5 glass-panel-subtle rounded-lg w-fit text-xs">
          <span className="text-muted">COE:</span>
          <span className="text-emerald-400 font-medium">{activePeriod.coeName}</span>
          <span className="text-slate-600">·</span>
          <span className="text-muted">{coeFilteredEntries.length} of {data.entries.length} entries</span>
        </div>
      )}

      {/* Stale data warning */}
      {staleDays !== null && staleDays > STALE_THRESHOLD_DAYS && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-400">
            This data was synced {staleDays} days ago. Consider re-syncing for up-to-date figures.
          </p>
        </div>
      )}

      {/* Sync controls + Lock button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Last synced: {new Date(data.syncedAt).toLocaleString()} · {coeFilteredEntries.length} entries
        </p>
        <div className="flex items-center gap-2">
          <LockToOverviewButton
            measureKey="placementMargin"
            currentAchievement={kpis.avgMargin}
            periodLabel={lockPeriodLabel}
            filters={{
              quarter: selectedQuarter,
              month: selectedMonth,
              account: selectedAccount,
            }}
          />
          <button
            onClick={handleSync}
            disabled={syncing || !hasUsableToken}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing…
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Re-sync
              </>
            )}
          </button>
        </div>
      </div>
      {syncError && <p className="text-red-400 text-xs">{syncError}</p>}

      {/* KPI strip */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
        <div className="glass-panel-subtle rounded-xl px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{kpiLabel}</div>
          <div className={`text-2xl font-bold mt-1 ${bonusStatus === 'on-track' ? 'text-emerald-400' : bonusStatus === 'at-risk' ? 'text-amber-400' : 'text-red-400'}`}>
            {kpis.avgMargin.toFixed(1)}%
          </div>
          <div className="mt-1">
            <StatusPill status={bonusStatus} className="text-[9px] px-2 py-0.5" />
          </div>
        </div>
        <KpiStat label="Avg Rate" value={`$${kpis.avgRate.toFixed(0)}/hr`} hint="per hour" />
        <KpiStat label="Placements" value={String(kpis.placements)} hint={`${kpis.uniquePeople} unique people`} />
        <KpiStat label="Avg Kickoff" value={kpis.avgKickoff > 0 ? `${kpis.avgKickoff.toFixed(1)}d` : '—'} hint="days to first entry" accentClass={kpis.avgKickoff <= 7 ? 'text-emerald-400' : kpis.avgKickoff <= 14 ? 'text-amber-400' : 'text-red-400'} />
        <KpiStat label="Target" value={`${TARGET}%`} hint={`Floor ${FLOOR}% → Target ${TARGET}%`} />
      </div>

      {/* Trend chart (compact) */}
      {data.monthlyTrend?.length > 0 ? (
        <SectionCard>
          <EChart
            option={trendOption}
            height={150}
            onEvents={{ click: handleChartClick }}
          />
        </SectionCard>
      ) : (
        <SectionCard>
          <div className="flex items-center justify-center h-[100px] text-slate-400 text-sm">
            No monthly trend data available.
          </div>
        </SectionCard>
      )}

      {/* Filter bar */}
      <PlacementMarginFilters
        hideQuarterTabs
        selectedQuarter={selectedQuarter}
        selectedMonth={selectedMonth}
        selectedAccount={selectedAccount}
        accounts={accounts}
        onQuarterChange={q => { setSelectedQuarter(q); setSelectedMonth(null) }}
        onMonthChange={setSelectedMonth}
        onAccountChange={setSelectedAccount}
      />

      {/* Records table (hero) */}
      <PlacementMarginTable
        entries={filteredEntries}
        onAccountFilter={handleAccountFilterFromTable}
      />
    </div>
  )
}
