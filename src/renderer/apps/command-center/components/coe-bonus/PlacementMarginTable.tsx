// Placement Margin records table with search, sort, pagination, column toggle, and Excel export.

import { useState, useMemo, useCallback } from 'react'
import type { PlacementMarginEntryDto } from '../../types/coeBonus'
import { exportToExcel, ColumnDef } from '../../../../apps/resume/utils/exportToExcel'

// ── Column definitions ───────────────────────────────────────────────────────

interface ColDef {
  key: string
  label: string
  defaultVisible: boolean
  align?: 'left' | 'right'
  render: (e: PlacementMarginEntryDto) => React.ReactNode
  sortValue?: (e: PlacementMarginEntryDto) => number | string
}

const TARGET = 55
const FLOOR = 50

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function marginColor(v: number): string {
  if (v >= TARGET) return 'text-emerald-400'
  if (v >= FLOOR) return 'text-amber-400'
  return 'text-red-400'
}

function delayColor(d: number | null): string {
  if (d === null) return 'text-slate-400'
  if (d <= 7) return 'text-emerald-400'
  if (d <= 14) return 'text-amber-400'
  return 'text-red-400'
}

function deltaIndicator(current: number, placement: number): string {
  const diff = current - placement
  if (Math.abs(diff) < 0.05) return ''
  return diff > 0 ? ' ↑' : ' ↓'
}

const COLUMNS: ColDef[] = [
  {
    key: 'name', label: 'Name', defaultVisible: true,
    render: e => <span className="text-slate-200 font-medium">{e.name}</span>,
    sortValue: e => e.name.toLowerCase(),
  },
  {
    key: 'account', label: 'Account', defaultVisible: true,
    render: () => null, // rendered with onClick in table body
    sortValue: e => e.account.toLowerCase(),
  },
  {
    key: 'mainSkill', label: 'Main Skill', defaultVisible: true,
    render: e => <span className="text-slate-300">{e.mainSkill}</span>,
    sortValue: e => e.mainSkill.toLowerCase(),
  },
  {
    key: 'placementDate', label: 'Placement Date', defaultVisible: true,
    render: e => <span className="text-slate-300">{fmtDate(e.placementDate)}</span>,
    sortValue: e => e.placementDate ?? '',
  },
  {
    key: 'placementRate', label: 'Rate', defaultVisible: true, align: 'right',
    render: e => <span className="text-slate-200">${e.placementRate}/hr</span>,
    sortValue: e => e.placementRate,
  },
  {
    key: 'placementMargin', label: 'Margin@', defaultVisible: true, align: 'right',
    render: e => <span className={`font-semibold ${marginColor(e.placementMargin)}`}>{e.placementMargin.toFixed(1)}%</span>,
    sortValue: e => e.placementMargin,
  },
  {
    key: 'currentMargin', label: 'Current', defaultVisible: true, align: 'right',
    render: e => (
      <span className={`font-semibold ${marginColor(e.currentMargin)}`}>
        {e.currentMargin.toFixed(1)}%
        <span className="text-[10px] ml-0.5">{deltaIndicator(e.currentMargin, e.placementMargin)}</span>
      </span>
    ),
    sortValue: e => e.currentMargin,
  },
  {
    key: 'kickoffDelay', label: 'Kickoff', defaultVisible: true, align: 'right',
    render: e => <span className={delayColor(e.kickoffDelay)}>{e.kickoffDelay !== null ? `${e.kickoffDelay}d` : '—'}</span>,
    sortValue: e => e.kickoffDelay ?? 999,
  },
  // ── Hidden by default ──
  {
    key: 'country', label: 'Country', defaultVisible: false,
    render: e => <span className="text-slate-300">{e.country}</span>,
    sortValue: e => e.country.toLowerCase(),
  },
  {
    key: 'companyTenure', label: 'Tenure', defaultVisible: false, align: 'right',
    render: e => <span className="text-slate-300">{e.companyTenure} mo</span>,
    sortValue: e => e.companyTenure,
  },
  {
    key: 'tacAtPlacement', label: 'TAC@', defaultVisible: false, align: 'right',
    render: e => <span className="text-slate-300">{e.tacAtPlacement != null ? `$${e.tacAtPlacement.toLocaleString()}` : '—'}</span>,
    sortValue: e => e.tacAtPlacement ?? 0,
  },
  {
    key: 'currentTac', label: 'Curr TAC', defaultVisible: false, align: 'right',
    render: e => <span className="text-slate-300">{e.currentTac != null ? `$${e.currentTac.toLocaleString()}` : '—'}</span>,
    sortValue: e => e.currentTac ?? 0,
  },
  {
    key: 'firstTimeEntryDate', label: '1st Entry', defaultVisible: false,
    render: e => <span className="text-slate-300">{fmtDate(e.firstTimeEntryDate)}</span>,
    sortValue: e => e.firstTimeEntryDate ?? '',
  },
]

const PAGE_SIZE = 50

// ── Component ────────────────────────────────────────────────────────────────

interface PlacementMarginTableProps {
  entries: PlacementMarginEntryDto[]
  onAccountFilter: (account: string) => void
}

type SortDir = 'asc' | 'desc' | null

export default function PlacementMarginTable({ entries, onAccountFilter }: PlacementMarginTableProps) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [page, setPage] = useState(0)
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () => new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key)),
  )
  const [colMenuOpen, setColMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filtered
  const searchLower = search.toLowerCase()
  const filtered = useMemo(() => {
    if (!searchLower) return entries
    return entries.filter(e =>
      e.name.toLowerCase().includes(searchLower)
      || e.account.toLowerCase().includes(searchLower)
      || e.mainSkill.toLowerCase().includes(searchLower),
    )
  }, [entries, searchLower])

  // Sorted
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    const col = COLUMNS.find(c => c.key === sortKey)
    if (!col?.sortValue) return filtered
    const sv = col.sortValue
    const mult = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = sv(a)
      const vb = sv(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult
      return String(va).localeCompare(String(vb)) * mult
    })
  }, [filtered, sortKey, sortDir])

  // Paginated
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageEntries = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  // Reset page when filters change
  useMemo(() => setPage(0), [entries, search])

  const activeCols = COLUMNS.filter(c => visibleCols.has(c.key))

  // Sort handler
  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null) }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }, [sortKey, sortDir])

  // Column toggle
  const toggleCol = useCallback((key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // Excel export
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const cols: ColumnDef[] = activeCols.map(c => ({
        header: c.label,
        key: c.key,
        type: ['placementRate', 'placementMargin', 'currentMargin', 'companyTenure', 'kickoffDelay', 'tacAtPlacement', 'currentTac'].includes(c.key) ? 'number' : 'string',
      }))
      const data = sorted.map(e => ({
        name: e.name,
        account: e.account,
        mainSkill: e.mainSkill,
        placementDate: e.placementDate ? fmtDate(e.placementDate) : '',
        placementRate: e.placementRate,
        placementMargin: e.placementMargin,
        currentMargin: e.currentMargin,
        kickoffDelay: e.kickoffDelay ?? '',
        country: e.country,
        companyTenure: e.companyTenure,
        tacAtPlacement: e.tacAtPlacement ?? '',
        currentTac: e.currentTac ?? '',
        firstTimeEntryDate: e.firstTimeEntryDate ? fmtDate(e.firstTimeEntryDate) : '',
      })) as unknown as Record<string, unknown>[]
      await exportToExcel(data, cols, `placement-margin-${new Date().toISOString().slice(0, 10)}`)
    } finally {
      setExporting(false)
    }
  }, [sorted, activeCols])

  return (
    <div className="glass-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, account, skill…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <span className="text-xs text-slate-400">{sorted.length} results</span>

        {/* Column toggle */}
        <div className="relative">
          <button
            onClick={() => setColMenuOpen(o => !o)}
            className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
            title="Toggle columns"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {colMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
              {COLUMNS.map(c => (
                <label key={c.key} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCols.has(c.key)}
                    onChange={() => toggleCol(c.key)}
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={exporting || sorted.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600/80 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          )}
          Export
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700/50">
              {activeCols.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortValue && handleSort(col.key)}
                  className={`py-2.5 px-3 font-semibold select-none ${
                    col.sortValue ? 'cursor-pointer hover:text-white' : ''
                  } ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-emerald-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageEntries.map((entry, i) => (
              <tr key={`${entry.email}-${entry.placementDate}-${i}`} className="border-b border-slate-700/30 last:border-0 hover:bg-slate-800/40 transition-colors">
                {activeCols.map(col => (
                  <td
                    key={col.key}
                    className={`py-2 px-3 ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.key === 'account' ? (
                      <button
                        onClick={() => onAccountFilter(entry.account)}
                        className="text-blue-400 hover:text-blue-300 hover:underline text-left"
                      >
                        {entry.account}
                      </button>
                    ) : (
                      col.render(entry)
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {pageEntries.length === 0 && (
              <tr>
                <td colSpan={activeCols.length} className="py-8 text-center text-slate-400 text-sm">
                  No entries match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-700/50 text-xs text-slate-400">
          <span>
            Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              ◀ Prev
            </button>
            <span className="text-slate-300">{safePage + 1}/{totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              Next ▶
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
