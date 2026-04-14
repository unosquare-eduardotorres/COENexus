import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrrReport } from '../hooks/usePrrReport'
import PrrDetailDrawer from '../components/PrrDetailDrawer'
import { PRR_COE_STATUSES, type PrrCoeStatus } from '../types'

type SortKey = 'employee' | 'account' | 'team' | 'mainSkill' | 'seniority' | 'transitionStatus' | 'coeStatus' | 'location' | 'daysOpened'

interface SortOption {
  key: SortKey
  label: string
}

interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" />
    </svg>
  )
}

function DatabaseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 mx-auto">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const toggle = useCallback((value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }, [onChange, selected])

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) setFilterText('')
  }, [open])

  const filtered = options.filter(option => option.toLowerCase().includes(filterText.toLowerCase()))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all border ${
          selected.length > 0
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
            : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
        }`}
      >
        {label}{selected.length > 0 && ` (${selected.length})`}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 glass-panel border border-white/10 rounded-lg shadow-xl overflow-hidden">
          <div className="p-1.5 border-b border-white/5">
            <input
              type="text"
              value={filterText}
              onChange={event => setFilterText(event.target.value)}
              placeholder="Search..."
              className="glass-input w-full text-xs py-1.5 px-2"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 && <p className="text-xs text-muted px-2 py-1">No matches</p>}
            {filtered.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                  selected.includes(option) ? 'bg-emerald-500/15 text-emerald-400' : 'text-secondary hover:bg-white/5'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getCoeStatusSelectStyle(status: PrrCoeStatus): string {
  const styleMap: Record<PrrCoeStatus, string> = {
    Active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 focus:ring-emerald-500/30',
    Idle: 'bg-amber-500/15 text-amber-400 border-amber-500/30 focus:ring-amber-500/30',
    Closed: 'bg-red-500/15 text-red-400 border-red-500/30 focus:ring-red-500/30',
    Undefined: 'bg-gray-500/10 text-gray-400 border-gray-500/20 focus:ring-gray-500/20',
    'Not Apply': 'bg-slate-500/10 text-slate-400 border-slate-500/20 focus:ring-slate-500/20',
  }

  return styleMap[status] ?? styleMap.Undefined
}

function getDaysOpenedStyle(daysOpened: number): string {
  if (daysOpened >= 45) return 'text-red-400'
  if (daysOpened >= 21) return 'text-amber-400'
  if (daysOpened >= 7) return 'text-yellow-400'
  return 'text-emerald-400'
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'daysOpened', label: 'Days Opened' },
  { key: 'employee', label: 'Employee' },
  { key: 'account', label: 'Client' },
  { key: 'team', label: 'Team' },
  { key: 'mainSkill', label: 'Main Skill' },
  { key: 'seniority', label: 'Seniority' },
  { key: 'transitionStatus', label: 'PRR Status' },
  { key: 'coeStatus', label: 'CoE Status' },
  { key: 'location', label: 'Location' },
]

export default function PrrReport() {
  const navigate = useNavigate()
  const report = usePrrReport()
  const [selectedUpstreamId, setSelectedUpstreamId] = useState<number | null>(null)
  const [savingStatusIds, setSavingStatusIds] = useState<number[]>([])
  const [deletingIds, setDeletingIds] = useState<number[]>([])

  const summary = useMemo(() => {
    const total = report.filteredResults.length
    const active = report.filteredResults.filter(item => item.coeStatus === 'Active').length
    const idle = report.filteredResults.filter(item => item.coeStatus === 'Idle').length
    const closed = report.filteredResults.filter(item => item.coeStatus === 'Closed').length

    return { total, active, idle, closed }
  }, [report.filteredResults])

  const sortLabel = useMemo(() => {
    return SORT_OPTIONS.find(option => option.key === report.sortKey)?.label ?? 'Days Opened'
  }, [report.sortKey])

  const handleStatusChange = useCallback(async (upstreamId: number, nextStatus: PrrCoeStatus) => {
    setSavingStatusIds(prev => (prev.includes(upstreamId) ? prev : [...prev, upstreamId]))
    try {
      await report.updateCoeStatus(upstreamId, nextStatus)
    } catch {
      return
    } finally {
      setSavingStatusIds(prev => prev.filter(id => id !== upstreamId))
    }
  }, [report])

  const handleDelete = useCallback(async (upstreamId: number) => {
    setDeletingIds(prev => (prev.includes(upstreamId) ? prev : [...prev, upstreamId]))
    try {
      await report.deleteRecord(upstreamId)
      if (selectedUpstreamId === upstreamId) {
        setSelectedUpstreamId(null)
      }
    } catch {
      return
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== upstreamId))
    }
  }, [report, selectedUpstreamId])

  const exportToExcel = useCallback(() => {
    const headers = ['Employee', 'Client', 'Team', 'Main Skill', 'Seniority', 'PRR Status', 'Sub Type', 'CoE Status', 'Location', 'Request Date', 'Days Opened', 'Days Since Last Interview', 'Impact', 'Attrition Risk', 'Presentations', 'Comments']
    const rows = report.filteredResults.map(item => [
      item.employee, item.account, item.team, item.mainSkill, item.seniority,
      item.transitionStatus, item.transitionSubType, item.coeStatus, item.location,
      item.requestDate ?? '', String(item.daysOpened), item.daysSinceLastInterview,
      item.impact, item.attritionRisk, String(item.presentationsCount), item.comments,
    ])

    const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v)
    const csv = [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `project-reallocations-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [report.filteredResults])

  if (report.hasData === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (report.hasData === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="glass-panel p-10 max-w-md">
          <DatabaseIcon />
          <h2 className="text-lg font-semibold text-primary mb-2 mt-4">No Synced Data</h2>
          <p className="text-sm text-secondary mb-6">
            Project reallocation data needs to be synced before this report can be generated. Go to D.A.T.A. to sync PRR records.
          </p>
          <button
            type="button"
            onClick={() => navigate('/datasync')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to D.A.T.A.
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold text-primary">Project Reallocations</h1>

      {!report.isLoading && report.results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold text-primary font-mono">{summary.total}</p>
          </div>
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Active</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">{summary.active}</p>
          </div>
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Idle</p>
            <p className="text-lg font-bold text-amber-400 font-mono">{summary.idle}</p>
          </div>
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Closed</p>
            <p className="text-lg font-bold text-red-400 font-mono">{summary.closed}</p>
          </div>
        </div>
      )}

      <div className="glass-panel-subtle rounded-xl p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
            <input
              type="text"
              value={report.searchText}
              onChange={event => report.setSearchText(event.target.value)}
              placeholder="Search employee or client..."
              className="glass-input pl-8 pr-8 py-2 w-full text-sm"
            />
            {report.searchText && (
              <button
                type="button"
                onClick={() => report.setSearchText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <XIcon />
              </button>
            )}
          </div>

          <MultiSelect label="Team" options={report.availableTeams} selected={report.filterTeams} onChange={report.setFilterTeams} />
          <MultiSelect label="Main Skill" options={report.availableSkills} selected={report.filterSkills} onChange={report.setFilterSkills} />
          <MultiSelect label="Seniority" options={report.availableSeniorities} selected={report.filterSeniorities} onChange={report.setFilterSeniorities} />
          <MultiSelect label="PRR Status" options={report.availablePrrStatuses} selected={report.filterPrrStatuses} onChange={report.setFilterPrrStatuses} />
          <MultiSelect label="CoE Status" options={report.availableCoeStatuses} selected={report.filterCoeStatuses} onChange={values => report.setFilterCoeStatuses(values as PrrCoeStatus[])} />
          <MultiSelect label="Location" options={report.availableLocations} selected={report.filterLocations} onChange={report.setFilterLocations} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted uppercase tracking-wider">Sort</span>
            <select
              value={report.sortKey}
              onChange={event => report.setSortKey(event.target.value as SortKey)}
              className="glass-input h-8 text-xs min-w-[140px]"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => report.setSortDirection(report.sortDirection === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-secondary hover:text-primary hover:bg-white/5 border border-white/5 transition-all"
            >
              <span className={`transition-transform ${report.sortDirection === 'asc' ? 'rotate-180' : ''}`}><SortIcon /></span>
              {sortLabel}
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {report.activeFilterCount > 0 && (
              <span className="px-2 py-1 rounded-full text-[10px] bg-emerald-500/25 text-emerald-400 font-medium uppercase tracking-wider">
                {report.activeFilterCount} active
              </span>
            )}
            <button
              type="button"
              onClick={report.clearAllFilters}
              disabled={!report.hasActiveFilters}
              className="px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/35 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={exportToExcel}
              disabled={report.filteredResults.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <DownloadIcon /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {report.isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted font-mono">Loading project reallocations...</p>
        </div>
      )}

      {report.error && (
        <div className="glass-panel p-6 text-center">
          <p className="text-sm text-red-400">{report.error}</p>
        </div>
      )}

      {!report.isLoading && !report.error && report.filteredResults.length > 0 && (
        <div className="glass-panel overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur">
              <tr className="border-b border-white/10">
                {['Employee', 'Client', 'Team', 'Main Skill', 'Seniority', 'PRR Status', 'CoE Status', 'Location', 'Days Opened', 'Actions'].map(column => (
                  <th key={column} className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted px-3 py-3 first:pl-4 last:pr-4">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.filteredResults.map((item, index) => {
                const isSavingStatus = savingStatusIds.includes(item.upstreamId)
                const isDeleting = deletingIds.includes(item.upstreamId)

                return (
                  <tr
                    key={item.upstreamId}
                    className={`border-b border-white/5 hover:bg-white/[0.04] cursor-pointer transition-colors ${index % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                    onClick={() => setSelectedUpstreamId(item.upstreamId)}
                  >
                    <td className="px-3 py-2.5 first:pl-4 text-primary font-medium">{item.employee || '—'}</td>
                    <td className="px-3 py-2.5 text-secondary">{item.account || '—'}</td>
                    <td className="px-3 py-2.5 text-secondary">{item.team || '—'}</td>
                    <td className="px-3 py-2.5 text-secondary">{item.mainSkill || '—'}</td>
                    <td className="px-3 py-2.5 text-secondary">{item.seniority || '—'}</td>
                    <td className="px-3 py-2.5 text-secondary">{item.transitionStatus || '—'}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={item.coeStatus}
                        disabled={isSavingStatus}
                        onClick={event => event.stopPropagation()}
                        onChange={event => {
                          event.stopPropagation()
                          void handleStatusChange(item.upstreamId, event.target.value as PrrCoeStatus)
                        }}
                        className={`h-7 px-2 pr-7 rounded-md text-xs font-medium border appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-1 ${getCoeStatusSelectStyle(item.coeStatus)}`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                      >
                        {PRR_COE_STATUSES.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-secondary">{item.location || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-mono font-bold ${getDaysOpenedStyle(item.daysOpened)}`}>
                        {item.daysOpened}d
                      </span>
                    </td>
                    <td className="px-3 py-2.5 last:pr-4">
                      {item.coeStatus === 'Closed' ? (
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation()
                            void handleDelete(item.upstreamId)
                          }}
                          disabled={isDeleting}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted uppercase tracking-wider">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!report.isLoading && !report.error && report.filteredResults.length === 0 && report.results.length > 0 && (
        <div className="glass-panel p-6 text-center text-sm text-muted">
          No project reallocations match the selected filters.
        </div>
      )}

      {!report.isLoading && !report.error && report.results.length === 0 && (
        <div className="glass-panel p-8 text-center">
          <h2 className="text-lg font-semibold text-primary mb-1">No Project Reallocations</h2>
          <p className="text-sm text-secondary">No records are available for the selected period.</p>
        </div>
      )}

      <PrrDetailDrawer upstreamId={selectedUpstreamId} onClose={() => setSelectedUpstreamId(null)} />
    </div>
  )
}
