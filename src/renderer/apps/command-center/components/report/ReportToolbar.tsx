import { type ReactNode } from 'react'
import {
  SearchIcon, XIcon, DownloadIcon, SettingsIcon, InfoIcon, SortIcon,
  GridIcon, ListIcon, FilterIcon, ColumnsIcon,
} from '../Icons'

interface ReportToolbarProps {
  // Search
  searchText: string
  onSearchChange: (text: string) => void
  // Health filter
  filterHealthStatus: string
  onFilterHealthStatusChange: (status: 'all' | 'flagged' | 'healthy' | 'external') => void
  resultsCounts: { total: number; flagged: number; healthy: number; external: number }
  // Filters toggle
  showFilters: boolean
  onToggleFilters: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
  // Sort
  sortOrder: string
  onToggleSortOrder: () => void
  // View mode
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  // Columns (list mode)
  showColumnConfig: boolean
  onToggleColumnConfig: () => void
  columnConfigRef: React.RefObject<HTMLDivElement | null>
  columnConfigPanel: ReactNode
  // Actions
  onShowLegend: () => void
  onShowThresholds: () => void
  onExportExcel: () => void
  onExportPdf: () => void
  exportDisabled: boolean
}

export default function ReportToolbar({
  searchText, onSearchChange,
  filterHealthStatus, onFilterHealthStatusChange, resultsCounts,
  showFilters, onToggleFilters, hasActiveFilters, activeFilterCount,
  sortOrder, onToggleSortOrder,
  viewMode, onViewModeChange,
  showColumnConfig, onToggleColumnConfig, columnConfigRef, columnConfigPanel,
  onShowLegend, onShowThresholds, onExportExcel, onExportPdf, exportDisabled,
}: ReportToolbarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
          <input
            type="text"
            value={searchText}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search positions..."
            className="glass-input pl-8 pr-8 py-2 w-full text-sm"
          />
          {searchText && (
            <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
              <XIcon />
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-white/5 p-0.5">
          {(['all', 'flagged', 'healthy', 'external'] as const).map(status => (
            <button
              key={status}
              onClick={() => onFilterHealthStatusChange(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wider transition-all ${
                filterHealthStatus === status
                  ? status === 'healthy' ? 'bg-emerald-500/15 text-emerald-400'
                    : status === 'flagged' ? 'bg-red-500/15 text-red-400'
                    : status === 'external' ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-white/10 text-primary'
                  : 'text-muted hover:text-secondary'
              }`}
              title={status === 'external' ? 'Exclude proactive-hire positions (no vertical / country-based accounts)' : undefined}
            >
              {status === 'all' ? `All (${resultsCounts.total})`
               : status === 'flagged' ? `Flagged (${resultsCounts.flagged})`
               : status === 'healthy' ? `Healthy (${resultsCounts.healthy})`
               : `External (${resultsCounts.external})`}
            </button>
          ))}
        </div>

        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            hasActiveFilters
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
              : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
          }`}
        >
          <FilterIcon />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/25 text-emerald-400">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={onToggleSortOrder}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-secondary hover:text-primary hover:bg-white/5 border border-white/5 transition-all"
        >
          <span className={`transition-transform ${sortOrder === 'aging-asc' ? 'rotate-180' : ''}`}><SortIcon /></span>
          Aging
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-white/5 overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted hover:text-primary hover:bg-white/5'}`}
          >
            <GridIcon />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted hover:text-primary hover:bg-white/5'}`}
          >
            <ListIcon />
          </button>
        </div>

        {viewMode === 'list' && (
          <div className="relative" ref={columnConfigRef}>
            <button
              onClick={onToggleColumnConfig}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                showColumnConfig
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                  : 'bg-white/5 text-muted border-white/5 hover:text-secondary'
              }`}
            >
              <ColumnsIcon />
              Columns
            </button>
            {showColumnConfig && columnConfigPanel}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onShowLegend}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-secondary hover:text-primary hover:bg-white/5 border border-white/10 transition-all"
          >
            <InfoIcon /> Legend
          </button>
          <button
            onClick={onShowThresholds}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-secondary hover:text-primary hover:bg-white/5 border border-white/10 transition-all"
          >
            <SettingsIcon /> Thresholds
          </button>
          <button
            onClick={onExportExcel}
            disabled={exportDisabled}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed no-print"
          >
            <DownloadIcon /> Export Excel
          </button>
          <button
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-blue-600/80 hover:bg-blue-500 text-white transition-all no-print"
          >
            <DownloadIcon /> Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
