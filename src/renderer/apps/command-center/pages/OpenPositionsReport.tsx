import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOpenPositionReport, COLUMN_VALUE_EXTRACTORS } from '../hooks/useOpenPositionReport'
import { reportService } from '../services/reportService'
import { CRITERIA_CONFIG, type CriterionActor, type StalledPositionResult } from '../types'
import PositionDetailDrawer from '../components/PositionDetailDrawer'
import { useToast } from '../../../shared/components/ToastContext'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('OpenPositionsReport')

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
    </svg>
  )
}

function DatabaseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function ColumnsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function SmallFilterIcon({ active }: { active?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

interface ColumnDef {
  key: string
  label: string
  defaultVisible: boolean
  render: (r: StalledPositionResult) => ReactNode
}

interface ExcelFilterDropdownProps {
  columnKey: string
  allValues: string[]
  selectedValues: string[]
  isFiltered: boolean
  onChangeFilter: (colKey: string, values: string[]) => void
  onClearFilter: (colKey: string) => void
}

function ExcelFilterDropdown({ columnKey, allValues, selectedValues, isFiltered, onChangeFilter, onClearFilter }: ExcelFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const effectiveSelected = !isFiltered ? allValues : selectedValues
  const isAllSelected = effectiveSelected.length === allValues.length
  const isActive = isFiltered && !isAllSelected
  const filtered = allValues.filter(v => v.toLowerCase().includes(searchText.toLowerCase()))

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) setSearchText('')
  }, [open])

  const toggleAll = () => {
    if (isAllSelected) {
      onChangeFilter(columnKey, [])
    } else {
      onClearFilter(columnKey)
    }
  }

  const toggleValue = (value: string) => {
    const current = new Set(effectiveSelected)
    if (current.has(value)) {
      current.delete(value)
    } else {
      current.add(value)
    }
    const arr = [...current]
    if (arr.length === allValues.length) {
      onClearFilter(columnKey)
    } else {
      onChangeFilter(columnKey, arr)
    }
  }

  if (allValues.length === 0) return null

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open) }}
        className={`p-0.5 rounded transition-colors ${
          isActive
            ? 'text-emerald-400 hover:text-emerald-300'
            : 'text-muted/50 hover:text-muted'
        }`}
        title={`Filter ${columnKey}`}
      >
        <SmallFilterIcon active={isActive} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 w-60 glass-panel border border-white/10 rounded-lg shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-1.5 border-b border-white/5">
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search..."
              className="glass-input w-full text-xs py-1.5 px-2"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            <button
              onClick={toggleAll}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-white/5"
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                isAllSelected
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'border-white/15 text-transparent'
              }`}>
                {isAllSelected && <CheckIcon />}
              </span>
              <span className="text-primary font-medium">Select All ({allValues.length})</span>
            </button>
            <div className="my-0.5 border-b border-white/5" />
            {filtered.length === 0 && <p className="text-xs text-muted px-2 py-1">No matches</p>}
            {filtered.map(value => {
              const checked = effectiveSelected.includes(value)
              return (
                <button
                  key={value}
                  onClick={() => toggleValue(value)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors hover:bg-white/5"
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                    checked
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'border-white/15 text-transparent'
                  }`}>
                    {checked && <CheckIcon />}
                  </span>
                  <span className={`truncate ${checked ? 'text-secondary' : 'text-muted'}`}>{value}</span>
                </button>
              )
            })}
          </div>
          {isActive && (
            <div className="border-t border-white/5 p-1.5">
              <button
                onClick={() => { onClearFilter(columnKey); setOpen(false) }}
                className="w-full text-center text-[10px] text-red-400 hover:text-red-300 py-1 transition-colors"
              >
                Clear Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getAgingColor(aging: number): string {
  if (aging >= 45) return 'border-l-red-500'
  if (aging >= 21) return 'border-l-amber-500'
  if (aging >= 7) return 'border-l-yellow-500'
  return 'border-l-emerald-500'
}

function getAgingDotColor(aging: number): string {
  if (aging >= 45) return 'bg-red-500'
  if (aging >= 21) return 'bg-amber-500'
  if (aging >= 7) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

function isInactiveStatus(status: string): boolean {
  return status !== 'Active' && status !== 'Draft'
}

function getStatusBadgeStyle(status: string): string {
  if (status === 'Active') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
  if (status === 'Draft') return 'bg-slate-500/15 text-slate-400 border-slate-500/25'
  if (status === 'Closed') return 'bg-red-500/10 text-red-400/70 border-red-500/15'
  if (status === 'On Hold') return 'bg-amber-500/10 text-amber-400/70 border-amber-500/15'
  return 'bg-gray-500/10 text-gray-400/70 border-gray-500/15'
}

const COLUMN_DEFINITIONS: ColumnDef[] = [
  {
    key: 'id',
    label: 'ID',
    defaultVisible: true,
    render: r => <span className="font-mono text-muted">#{r.position.upstream_id}</span>,
  },
  {
    key: 'account',
    label: 'Account',
    defaultVisible: true,
    render: (r) => {
      const inactive = isInactiveStatus(r.position.position_status)
      return (
        <div className="flex items-center gap-2">
          <span className={inactive ? 'text-muted' : 'text-primary font-medium'}>{r.position.account}</span>
          {inactive && (
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusBadgeStyle(r.position.position_status)}`}>
              {r.position.position_status}
            </span>
          )}
        </div>
      )
    },
  },
  {
    key: 'status',
    label: 'Status',
    defaultVisible: true,
    render: r => (
      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusBadgeStyle(r.position.position_status)}`}>
        {r.position.position_status}
      </span>
    ),
  },
  {
    key: 'stakeholder',
    label: 'Stakeholder',
    defaultVisible: true,
    render: r => <span className="text-secondary">{r.position.stakeholder || '—'}</span>,
  },
  {
    key: 'coe',
    label: 'COE',
    defaultVisible: true,
    render: r => <span className="text-secondary">{r.position.coe || '—'}</span>,
  },
  {
    key: 'practice',
    label: 'Practice',
    defaultVisible: true,
    render: r => <span className="text-secondary">{r.position.practice || '—'}</span>,
  },
  {
    key: 'main_skill',
    label: 'Main Skill',
    defaultVisible: true,
    render: r => <span className="text-secondary">{r.position.main_skill || '—'}</span>,
  },
  {
    key: 'vertical',
    label: 'Vertical',
    defaultVisible: true,
    render: r => <span className="text-secondary">{r.position.vertical_industry || '—'}</span>,
  },
  {
    key: 'aging',
    label: 'Aging',
    defaultVisible: true,
    render: r => {
      const inactive = isInactiveStatus(r.position.position_status)
      return (
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${inactive ? 'bg-gray-500/50' : getAgingDotColor(r.position.aging)}`} />
          <span className={`font-mono font-bold ${inactive ? 'text-muted' : 'text-primary'}`}>{r.position.aging}d</span>
        </div>
      )
    },
  },
  {
    key: 'action_needed',
    label: 'Action Needed',
    defaultVisible: true,
    render: r => (
      <div className="flex flex-wrap gap-1">
        {r.actors.map(actor => (
          <span key={actor} className={`px-1.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
            actor === 'COE'
              ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
              : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
          }`}>{actor}</span>
        ))}
      </div>
    ),
  },
  {
    key: 'criteria',
    label: 'Criteria',
    defaultVisible: true,
    render: r => {
      const inactive = isInactiveStatus(r.position.position_status)
      return (
        <div className="flex flex-wrap gap-1">
          {inactive && (
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusBadgeStyle(r.position.position_status)}`}>
              {r.position.position_status}
            </span>
          )}
          {!inactive && r.matchingCriteria.length === 0 && (
            <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/25">Healthy</span>
          )}
          {r.matchingCriteria.map(key => {
            const config = CRITERIA_CONFIG.find(c => c.key === key)
            if (!config) return null
            return <span key={key} className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${config.colorClass}`}>{config.label}</span>
          })}
        </div>
      )
    },
  },
  {
    key: 'job_title',
    label: 'Job Title',
    defaultVisible: false,
    render: r => <span className="text-secondary">{r.position.job_title || '—'}</span>,
  },
  {
    key: 'countries',
    label: 'Countries',
    defaultVisible: false,
    render: r => <span className="text-secondary">{r.position.countries || '—'}</span>,
  },
  {
    key: 'seniorities',
    label: 'Seniorities',
    defaultVisible: false,
    render: r => <span className="text-secondary">{r.position.seniorities || '—'}</span>,
  },
  {
    key: 'sourcing',
    label: 'Sourcing',
    defaultVisible: false,
    render: r => <span className="text-secondary">{r.position.sourcing || '—'}</span>,
  },
  {
    key: 'csu_cs',
    label: 'CSU / CS',
    defaultVisible: false,
    render: r => <span className="text-secondary">{`${r.position.csu || '—'} / ${r.position.cs || '—'}`}</span>,
  },
  {
    key: 'candidates_presented',
    label: 'Candidates',
    defaultVisible: false,
    render: r => <span className="font-mono text-secondary">{r.position.candidates_presented}</span>,
  },
  {
    key: 'rate_range',
    label: 'Rate Range',
    defaultVisible: false,
    render: r => {
      if (r.position.minimum_rate == null && r.position.maximum_rate == null) return <span className="text-muted">—</span>
      return <span className="font-mono text-secondary">${r.position.minimum_rate ?? 0}–${r.position.maximum_rate ?? 0}</span>
    },
  },
]

const COLUMN_FILTER_LABELS: Record<string, string> = {
  account: 'Account',
  status: 'Status',
  stakeholder: 'Stakeholder',
  coe: 'COE',
  practice: 'Practice',
  main_skill: 'Main Skill',
  vertical: 'Vertical',
  action_needed: 'Action Needed',
  criteria: 'Criteria',
  job_title: 'Job Title',
  countries: 'Countries',
  seniorities: 'Seniorities',
  sourcing: 'Sourcing',
}

const COLUMNS_STORAGE_KEY = 'core-op-list-columns'

export default function OpenPositionsReport() {
  const navigate = useNavigate()
  const report = useOpenPositionReport()
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null)
  const [showThresholds, setShowThresholds] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const columnConfigRef = useRef<HTMLDivElement>(null)

  const [columnConfig, setColumnConfig] = useState<{ visible: string[]; order: string[] }>(() => {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch { /* use defaults */ }
    const defaultVisible = COLUMN_DEFINITIONS.filter(c => c.defaultVisible).map(c => c.key)
    return { visible: defaultVisible, order: COLUMN_DEFINITIONS.map(c => c.key) }
  })

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columnConfig))
  }, [columnConfig])

  useEffect(() => {
    if (!showColumnConfig) return
    const handler = (e: MouseEvent) => {
      if (columnConfigRef.current && !columnConfigRef.current.contains(e.target as Node)) setShowColumnConfig(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColumnConfig])

  const visibleColumns = useMemo(() => {
    return columnConfig.order
      .filter(key => columnConfig.visible.includes(key))
      .map(key => COLUMN_DEFINITIONS.find(c => c.key === key)!)
      .filter(Boolean)
  }, [columnConfig])

  const toggleColumn = useCallback((key: string) => {
    setColumnConfig(prev => ({
      ...prev,
      visible: prev.visible.includes(key)
        ? prev.visible.filter(k => k !== key)
        : [...prev.visible, key],
    }))
  }, [])

  const moveColumn = useCallback((key: string, direction: 'up' | 'down') => {
    setColumnConfig(prev => {
      const order = [...prev.order]
      const idx = order.indexOf(key)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= order.length) return prev
      ;[order[idx], order[target]] = [order[target], order[idx]]
      return { ...prev, order }
    })
  }, [])

  const resetColumns = useCallback(() => {
    const defaultVisible = COLUMN_DEFINITIONS.filter(c => c.defaultVisible).map(c => c.key)
    setColumnConfig({ visible: defaultVisible, order: COLUMN_DEFINITIONS.map(c => c.key) })
  }, [])

  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    log.info('Open positions report viewed')
  }, [])

  const handleDeletePosition = useCallback(async (upstreamId: number) => {
    log.info('Open position delete requested', { upstreamId })
    setDeletingId(upstreamId)
    try {
      await reportService.deletePosition(upstreamId)
      report.evaluate()
    } catch (err) {
      log.error('Open position delete failed', err)
      console.error('Failed to delete position:', err)
    } finally {
      setDeletingId(null)
    }
  }, [report])

  const activeResults = report.filteredResults.filter(r => !isInactiveStatus(r.position.position_status))
  const inactiveResults = report.filteredResults.filter(r => isInactiveStatus(r.position.position_status))
  const flaggedResults = activeResults.filter(r => r.matchingCriteria.length > 0)
  const healthyResults = activeResults.filter(r => r.matchingCriteria.length === 0)

  if (report.hasData === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="glass-panel p-10 max-w-md">
          <DatabaseIcon />
          <h2 className="text-lg font-semibold text-primary mb-2 mt-4">No Synced Data</h2>
          <p className="text-sm text-secondary mb-6">
            Open position data needs to be synced before this report can be generated. Go to D.A.T.A. to sync open positions.
          </p>
          <button
            onClick={() => {
              log.info('Open positions report redirected to Data Sync')
              navigate('/datasync')
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to D.A.T.A.
          </button>
        </div>
      </div>
    )
  }

  if (report.hasData === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold text-primary">Open Positions</h1>

      {!report.isLoading && report.results.length > 0 && (
        <div className="grid grid-cols-6 gap-2">
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold text-primary font-mono">{report.results.length}</p>
          </div>
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Flagged</p>
            <p className="text-lg font-bold text-red-400 font-mono">{report.healthCounts.flagged}</p>
          </div>
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Healthy</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">{report.healthCounts.healthy}</p>
          </div>
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Inactive</p>
            <p className="text-lg font-bold text-gray-400 font-mono">{report.results.filter(r => isInactiveStatus(r.position.position_status)).length}</p>
          </div>
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Closed</p>
            <p className="text-lg font-bold text-red-400 font-mono">
              {report.results.filter(r => r.position.position_status === 'Closed').length}
            </p>
          </div>
          <div className="glass-panel-subtle rounded-xl px-3 py-2">
            <p className="text-[11px] text-muted uppercase tracking-wide">Avg. Aging</p>
            <p className="text-lg font-bold text-primary font-mono">
              {Math.round(report.filteredResults.reduce((s, r) => s + r.position.aging, 0) / (report.filteredResults.length || 1))}d
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
            <input
              type="text"
              value={report.searchText}
              onChange={e => report.setSearchText(e.target.value)}
              placeholder="Search positions..."
              className="glass-input pl-8 pr-8 py-2 w-full text-sm"
            />
            {report.searchText && (
              <button onClick={() => report.setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
                <XIcon />
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border border-white/5 p-0.5">
            {(['all', 'flagged', 'healthy'] as const).map(status => (
              <button
                key={status}
                onClick={() => report.setFilterHealthStatus(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wider transition-all ${
                  report.filterHealthStatus === status
                    ? status === 'healthy' ? 'bg-emerald-500/15 text-emerald-400'
                      : status === 'flagged' ? 'bg-red-500/15 text-red-400'
                      : 'bg-white/10 text-primary'
                    : 'text-muted hover:text-secondary'
                }`}
              >
                {status === 'all' ? `All (${report.results.length})`
                 : status === 'flagged' ? `Flagged (${report.healthCounts.flagged})`
                 : `Healthy (${report.healthCounts.healthy})`}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              report.hasActiveFilters
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
            }`}
          >
            <FilterIcon />
            Filters
            {report.activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/25 text-emerald-400">
                {report.activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => report.setSortOrder(report.sortOrder === 'aging-desc' ? 'aging-asc' : 'aging-desc')}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-secondary hover:text-primary hover:bg-white/5 border border-white/5 transition-all"
          >
            <span className={`transition-transform ${report.sortOrder === 'aging-asc' ? 'rotate-180' : ''}`}><SortIcon /></span>
            Aging
          </button>

          <div className="flex items-center rounded-lg border border-white/5 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted hover:text-primary hover:bg-white/5'}`}
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted hover:text-primary hover:bg-white/5'}`}
            >
              <ListIcon />
            </button>
          </div>

          {viewMode === 'list' && (
            <div className="relative" ref={columnConfigRef}>
              <button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  showColumnConfig
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                    : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
                }`}
              >
                <ColumnsIcon />
                Columns
              </button>

              {showColumnConfig && (
                <div className="absolute top-full right-0 mt-1 z-40 w-72 glass-panel border border-white/10 rounded-xl shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                    <p className="text-xs font-medium text-primary uppercase tracking-wider">Configure Columns</p>
                    <button onClick={resetColumns} className="text-[10px] text-red-400 hover:text-red-300">
                      Reset
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
                    {columnConfig.order.map((key, idx) => {
                      const def = COLUMN_DEFINITIONS.find(c => c.key === key)
                      if (!def) return null
                      const isVisible = columnConfig.visible.includes(key)
                      return (
                        <div key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isVisible ? 'bg-white/[0.03]' : ''}`}>
                          <button
                            onClick={() => toggleColumn(key)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isVisible
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : 'border-white/10 text-transparent hover:border-white/20'
                            }`}
                          >
                            {isVisible && <CheckIcon />}
                          </button>
                          <span className={`flex-1 text-xs ${isVisible ? 'text-primary' : 'text-muted'}`}>
                            {def.label}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => moveColumn(key, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 rounded text-muted hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <polyline points="18 15 12 9 6 15" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveColumn(key, 'down')}
                              disabled={idx === columnConfig.order.length - 1}
                              className="p-0.5 rounded text-muted hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setShowLegend(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-secondary hover:text-primary hover:bg-white/5 border border-white/10 transition-all"
            >
              <InfoIcon /> Legend
            </button>
            <button
              onClick={() => setShowThresholds(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-secondary hover:text-primary hover:bg-white/5 border border-white/10 transition-all"
            >
              <SettingsIcon /> Thresholds
            </button>
            <button
              onClick={async () => {
                const result = await report.exportCsv()
                if (result?.saved) {
                  showToast(
                    `Excel exported to ${result.filePath?.split('/').pop() ?? 'file'}`,
                    'success',
                    8000,
                    result.filePath ? [
                      { label: 'Open File', icon: 'file' as const, onClick: () => window.api.app.openPath(result.filePath!) },
                      { label: 'Show in Folder', icon: 'folder' as const, onClick: () => window.api.app.showItemInFolder(result.filePath!) },
                    ] : undefined,
                  )
                }
              }}
              disabled={report.filteredResults.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed no-print"
            >
              <DownloadIcon /> Export Excel
            </button>
            <button
              onClick={async () => {
                const result = await window.api.report.exportPdf()
                if (result.saved) {
                  showToast(
                    `PDF exported to ${result.filePath?.split('/').pop() ?? 'file'}`,
                    'success',
                    8000,
                    result.filePath ? [
                      { label: 'Open File', icon: 'file' as const, onClick: () => window.api.app.openPath(result.filePath!) },
                      { label: 'Show in Folder', icon: 'folder' as const, onClick: () => window.api.app.showItemInFolder(result.filePath!) },
                    ] : undefined,
                  )
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-blue-600/80 hover:bg-blue-500 text-white transition-all no-print"
            >
              <DownloadIcon /> Export PDF
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="glass-panel-subtle rounded-xl p-3 space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-primary uppercase tracking-wider">Criteria</p>
              {report.hasActiveFilters && (
                <button onClick={report.clearAllFilters} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CRITERIA_CONFIG.map(config => {
                const isActive = report.criteriaFilter.includes(config.key)
                const count = report.criteriaFilterCounts[config.key] ?? 0
                return (
                  <button
                    key={config.key}
                    onClick={() => report.setCriteriaFilter(
                      isActive
                        ? report.criteriaFilter.filter(k => k !== config.key)
                        : [...report.criteriaFilter, config.key]
                    )}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isActive ? config.colorClass : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
                    }`}
                  >
                    {config.label} ({count})
                  </button>
                )
              })}
            </div>

            <div className="minimal-divider" />

            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs font-medium text-primary uppercase tracking-wider shrink-0">Actors</p>
              <div className="flex items-center gap-1.5">
                {(['COE', 'CGX'] as CriterionActor[]).map(actor => {
                  const isActive = report.filterActors.includes(actor)
                  return (
                    <button
                      key={actor}
                      onClick={() => report.setFilterActors(
                        isActive
                          ? report.filterActors.filter(a => a !== actor)
                          : [...report.filterActors, actor]
                      )}
                      className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all ${
                        isActive
                          ? actor === 'COE' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                          : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
                      }`}
                    >
                      {actor}
                    </button>
                  )
                })}
              </div>
            </div>

            {Object.keys(report.columnFilters).length > 0 && (
              <>
                <div className="minimal-divider" />
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-medium text-primary uppercase tracking-wider shrink-0">Active Column Filters</p>
                  {Object.entries(report.columnFilters).map(([key, values]) => (
                    <span key={key} className="px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                      {COLUMN_FILTER_LABELS[key] ?? key}: {values.length} selected
                      <button onClick={() => report.clearColumnFilter(key)} className="hover:text-emerald-200 transition-colors">×</button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {report.isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted font-mono">Evaluating positions...</p>
        </div>
      )}

      {report.error && (
        <div className="glass-panel p-6 text-center">
          <p className="text-sm text-red-400">{report.error}</p>
        </div>
      )}

      {!report.isLoading && !report.error && report.results.length === 0 && (
        <div className="glass-panel p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-emerald-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2 className="text-lg font-semibold text-primary mb-1">No Evaluated Positions</h2>
          <p className="text-sm text-secondary">No open positions matched the evaluation criteria.</p>
        </div>
      )}

      {!report.isLoading && !report.error && report.filteredResults.length > 0 && viewMode === 'grid' && (
        <div className="space-y-4">
          {Object.keys(report.columnFilters).length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-muted uppercase tracking-wider font-medium">Column Filters:</span>
              {Object.entries(report.columnFilters).map(([key, values]) => (
                <span key={key} className="px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  {COLUMN_FILTER_LABELS[key] ?? key}: {values.length} selected
                  <button onClick={() => report.clearColumnFilter(key)} className="hover:text-emerald-200 transition-colors ml-0.5">×</button>
                </span>
              ))}
              <button
                onClick={() => {
                  for (const key of Object.keys(report.columnFilters)) {
                    report.clearColumnFilter(key)
                  }
                }}
                className="text-[10px] text-red-400 hover:text-red-300 ml-1 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {flaggedResults.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Flagged Positions ({flaggedResults.length})
              </p>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {flaggedResults.map(r => (
                  <button
                    key={r.position.upstream_id}
                    onClick={() => setSelectedPositionId(r.position.upstream_id)}
                    className={`glass-card-hover p-3 text-left transition-all border-l-[3px] ${getAgingColor(r.position.aging)}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{r.position.account}</p>
                        <p className="text-xs text-muted truncate">{r.position.main_skill} · {r.position.stakeholder}</p>
                      </div>
                      <span className="shrink-0 text-sm font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-white/5">
                        {r.position.aging}d
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs text-muted font-mono">#{r.position.upstream_id}</span>
                      <span className="text-xs text-muted">·</span>
                      <span className="text-xs text-muted">{r.position.coe}</span>
                      <span className="text-xs text-muted">·</span>
                      <span className="text-xs text-muted">{r.position.practice}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {r.matchingCriteria.map(key => {
                        const config = CRITERIA_CONFIG.find(c => c.key === key)
                        if (!config) return null
                        return (
                          <span key={key} className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${config.colorClass}`}>
                            {config.label}
                          </span>
                        )
                      })}
                      {r.actors.map(actor => (
                        <span key={actor} className={`px-1.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          actor === 'COE'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                            : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                        }`}>
                          {actor}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {healthyResults.length > 0 && report.filterHealthStatus !== 'flagged' && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mt-4">
                Healthy Positions ({healthyResults.length})
              </p>
              <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                {healthyResults.map(r => (
                  <button
                    key={r.position.upstream_id}
                    onClick={() => setSelectedPositionId(r.position.upstream_id)}
                    className="glass-card-hover p-2.5 text-left transition-all border-l-[3px] border-l-emerald-500 opacity-75 hover:opacity-100"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          Healthy
                        </span>
                        <p className="text-sm font-medium text-primary truncate">{r.position.account}</p>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-muted truncate">{r.position.main_skill}</span>
                      </div>
                      <span className="shrink-0 text-xs font-mono text-muted">{r.position.aging}d</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {inactiveResults.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mt-4">
                Inactive Positions ({inactiveResults.length})
              </p>
              <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                {inactiveResults.map(r => (
                  <div
                    key={r.position.upstream_id}
                    className="glass-card-hover p-2.5 text-left transition-all border-l-[3px] border-l-gray-500/40 opacity-40 hover:opacity-70 flex items-center justify-between"
                  >
                    <button
                      onClick={() => setSelectedPositionId(r.position.upstream_id)}
                      className="flex-1 min-w-0 flex items-center gap-2"
                    >
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusBadgeStyle(r.position.position_status)}`}>
                        {r.position.position_status}
                      </span>
                      <p className="text-sm font-medium text-primary truncate">{r.position.account}</p>
                      <span className="text-xs text-muted">·</span>
                      <span className="text-xs text-muted truncate">{r.position.main_skill}</span>
                      <span className="shrink-0 text-xs font-mono text-muted">{r.position.aging}d</span>
                    </button>
                    {r.position.position_status === 'Closed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePosition(r.position.upstream_id) }}
                        disabled={deletingId === r.position.upstream_id}
                        title="Remove closed position from database"
                        className="ml-2 shrink-0 p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!report.isLoading && !report.error && report.filteredResults.length > 0 && viewMode === 'list' && (
        <div className="glass-panel overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur">
              <tr className="border-b border-white/10">
                {visibleColumns.map(col => (
                  <th key={col.key} className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted px-3 py-3 first:pl-4 last:pr-4">
                    <div className="flex items-center gap-1">
                      {col.label}
                      {COLUMN_VALUE_EXTRACTORS[col.key] && (
                        <ExcelFilterDropdown
                          columnKey={col.key}
                          allValues={report.availableColumnValues[col.key] ?? []}
                          selectedValues={report.columnFilters[col.key] ?? []}
                          isFiltered={report.columnFilters[col.key] !== undefined}
                          onChangeFilter={report.setColumnFilter}
                          onClearFilter={report.clearColumnFilter}
                        />
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {report.filteredResults.map((r, i) => {
                const inactive = isInactiveStatus(r.position.position_status)
                return (
                  <tr
                    key={r.position.upstream_id}
                    className={`border-b border-white/5 hover:bg-white/[0.04] cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'} ${inactive ? 'opacity-40 hover:opacity-70' : ''}`}
                    onClick={() => setSelectedPositionId(r.position.upstream_id)}
                  >
                    {visibleColumns.map(col => (
                      <td key={col.key} className="px-3 py-2.5 first:pl-4 last:pr-4">
                        {col.render(r)}
                      </td>
                    ))}
                    <td className="px-2 py-2.5">
                      {r.position.position_status === 'Closed' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePosition(r.position.upstream_id) }}
                          disabled={deletingId === r.position.upstream_id}
                          title="Remove closed position from database"
                          className="p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                        >
                          <TrashIcon />
                        </button>
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
          No positions match the selected filters.
        </div>
      )}

      {showThresholds && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => { report.resetDraftThresholds(); setShowThresholds(false) }} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-dark-bg border-l border-white/5 z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <SettingsIcon />
                  <h2 className="text-sm font-semibold text-primary">Staleness Thresholds</h2>
                </div>
                <button onClick={() => { report.resetDraftThresholds(); setShowThresholds(false) }} className="p-1.5 rounded-lg hover:bg-white/5 text-secondary">
                  <XIcon />
                </button>
              </div>
              <div className="space-y-4">
                {CRITERIA_CONFIG.map(config => (
                  <div key={config.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-primary">{config.label}</label>
                      <span className="text-xs text-muted font-mono">Current: {report.thresholds[config.key]}d</span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={report.draftThresholds[config.key]}
                      onChange={e => report.setDraftThreshold(config.key, Number(e.target.value))}
                      className="glass-input w-full text-sm font-mono"
                    />
                    <p className="text-xs text-muted">{config.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="sticky bottom-0 bg-dark-bg border-t border-white/5 p-4 flex justify-end gap-2">
              <button onClick={() => { report.resetDraftThresholds(); setShowThresholds(false) }} className="px-3 py-1.5 text-xs text-secondary hover:text-primary transition-colors">
                Cancel
              </button>
              <button onClick={() => { report.applyThresholds(); setShowThresholds(false) }} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      {showLegend && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLegend(false)}>
          <div className="glass-panel border border-white/10 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <InfoIcon />
                <h2 className="text-sm font-semibold text-primary">Criteria Legend</h2>
              </div>
              <button onClick={() => setShowLegend(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-secondary">
                <XIcon />
              </button>
            </div>
            <div className="space-y-3">
              {CRITERIA_CONFIG.map(config => (
                <div key={config.key} className="flex items-start gap-3">
                  <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${config.colorClass}`}>
                    {config.label}
                  </span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    config.actor === 'COE'
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                      : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                  }`}>
                    {config.actor}
                  </span>
                  <p className="text-xs text-secondary leading-relaxed">
                    {config.description.replace(/\bX\b/, String(report.thresholds[config.key]))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <PositionDetailDrawer
        upstreamId={selectedPositionId}
        onClose={() => setSelectedPositionId(null)}
      />

    </div>
  )
}
