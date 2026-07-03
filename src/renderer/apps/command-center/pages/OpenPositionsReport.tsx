import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOpenPositionReport } from '../hooks/useOpenPositionReport'
import { CRITERIA_CONFIG, type StalledPositionResult } from '../types'
import { useColumnConfig } from '../hooks/useColumnConfig'
import PositionDetailDrawer from '../components/PositionDetailDrawer'
import ColumnConfigPanel from '../components/report/ColumnConfigPanel'
import FiltersPanel from '../components/report/FiltersPanel'
import PositionsGridView from '../components/report/PositionsGridView'
import PositionsTableView from '../components/report/PositionsTableView'
import ReportToolbar from '../components/report/ReportToolbar'
import { useToast } from '../../../shared/components/ToastContext'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import { SettingsIcon, XIcon, InfoIcon, DatabaseIcon } from '../components/Icons'

const log = createRendererLogger('OpenPositionsReport')

// ─── Modals ──────────────────────────────────────────────────────────────

function ThresholdsModal({ report, onClose }: {
  report: ReturnType<typeof useOpenPositionReport>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { report.resetDraftThresholds(); onClose() }}>
      <div className="glass-panel border border-white/10 rounded-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <SettingsIcon />
            <h2 className="text-sm font-semibold text-primary">Staleness Thresholds</h2>
          </div>
          <button onClick={() => { report.resetDraftThresholds(); onClose() }} className="p-1.5 rounded-lg hover:bg-white/5 text-secondary">
            <XIcon />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {CRITERIA_CONFIG.map(config => (
            <div key={config.key} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.colorClass}`}>
                    {config.label}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    config.actor === 'COE'
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                      : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                  }`}>{config.actor}</span>
                </div>
                <p className="text-xs text-muted leading-snug">{config.description.replace(/\bX\b/, String(report.draftThresholds[config.key]))}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => report.setDraftThreshold(config.key, Math.max(1, report.draftThresholds[config.key] - 1))}
                  className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-secondary hover:text-primary flex items-center justify-center transition-colors border border-white/5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
                <span className="w-10 text-center text-sm font-mono font-bold text-primary">{report.draftThresholds[config.key]}d</span>
                <button
                  onClick={() => report.setDraftThreshold(config.key, report.draftThresholds[config.key] + 1)}
                  className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-secondary hover:text-primary flex items-center justify-center transition-colors border border-white/5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/5">
          <button onClick={() => { report.resetDraftThresholds(); onClose() }} className="px-3 py-1.5 text-xs text-secondary hover:text-primary transition-colors">Cancel</button>
          <button onClick={() => { report.applyThresholds(); onClose() }} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">Apply</button>
        </div>
      </div>
    </div>
  )
}

function LegendModal({ thresholds, onClose }: {
  thresholds: Record<string, number>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel border border-white/10 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <InfoIcon />
            <h2 className="text-sm font-semibold text-primary">Criteria Legend</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-secondary">
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
                {config.description.replace(/\bX\b/, String(thresholds[config.key]))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Column Definitions ──────────────────────────────────────────────────

function getAgingDotColor(aging: number): string {
  if (aging >= 45) return 'bg-red-500'
  if (aging >= 21) return 'bg-amber-500'
  if (aging >= 7) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

function getStatusBadgeStyle(status: string): string {
  if (status === 'Active') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
  if (status === 'Draft') return 'bg-slate-500/15 text-slate-400 border-slate-500/25'
  return 'bg-gray-500/10 text-gray-400/70 border-gray-500/15'
}

interface ColumnDef {
  key: string
  label: string
  defaultVisible: boolean
  render: (r: StalledPositionResult) => ReactNode
}

const COLUMN_DEFINITIONS: ColumnDef[] = [
  { key: 'id', label: 'ID', defaultVisible: true, render: r => <span className="font-mono text-muted">#{r.position.upstream_id}</span> },
  { key: 'account', label: 'Account', defaultVisible: true, render: r => <span className="text-primary font-medium">{r.position.account}</span> },
  { key: 'status', label: 'Status', defaultVisible: true, render: r => <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusBadgeStyle(r.position.position_status)}`}>{r.position.position_status}</span> },
  { key: 'stakeholder', label: 'Stakeholder', defaultVisible: true, render: r => <span className="text-secondary">{r.position.stakeholder || '—'}</span> },
  { key: 'coe', label: 'COE', defaultVisible: true, render: r => <span className="text-secondary">{r.position.coe || '—'}</span> },
  { key: 'practice', label: 'Practice', defaultVisible: true, render: r => <span className="text-secondary">{r.position.practice || '—'}</span> },
  { key: 'main_skill', label: 'Main Skill', defaultVisible: true, render: r => <span className="text-secondary">{r.position.main_skill || '—'}</span> },
  { key: 'vertical', label: 'Vertical', defaultVisible: true, render: r => <span className="text-secondary">{r.position.vertical_industry || '—'}</span> },
  { key: 'aging', label: 'Aging', defaultVisible: true, render: r => (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${getAgingDotColor(r.position.aging)}`} />
      <span className="font-mono font-bold text-primary">{r.position.aging}d</span>
    </div>
  )},
  { key: 'action_needed', label: 'Action Needed', defaultVisible: true, render: r => (
    <div className="flex flex-wrap gap-1">
      {r.actors.map(actor => (
        <span key={actor} className={`px-1.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
          actor === 'COE' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
        }`}>{actor}</span>
      ))}
    </div>
  )},
  { key: 'criteria', label: 'Criteria', defaultVisible: true, render: r => (
    <div className="flex flex-wrap gap-1">
      {r.matchingCriteria.length === 0 && <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/25">Healthy</span>}
      {r.matchingCriteria.map(key => {
        const config = CRITERIA_CONFIG.find(c => c.key === key)
        if (!config) return null
        return <span key={key} className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${config.colorClass}`}>{config.label}</span>
      })}
    </div>
  )},
  { key: 'job_title', label: 'Job Title', defaultVisible: false, render: r => <span className="text-secondary">{r.position.job_title || '—'}</span> },
  { key: 'countries', label: 'Countries', defaultVisible: false, render: r => <span className="text-secondary">{r.position.countries || '—'}</span> },
  { key: 'seniorities', label: 'Seniorities', defaultVisible: false, render: r => <span className="text-secondary">{r.position.seniorities || '—'}</span> },
  { key: 'sourcing', label: 'Sourcing', defaultVisible: false, render: r => <span className="text-secondary">{r.position.sourcing || '—'}</span> },
  { key: 'csu_cs', label: 'CSU / CS', defaultVisible: false, render: r => <span className="text-secondary">{`${r.position.csu || '—'} / ${r.position.cs || '—'}`}</span> },
  { key: 'candidates_presented', label: 'Candidates', defaultVisible: false, render: r => <span className="font-mono text-secondary">{r.position.candidates_presented}</span> },
  { key: 'rate_range', label: 'Rate Range', defaultVisible: false, render: r => {
    if (r.position.minimum_rate == null && r.position.maximum_rate == null) return <span className="text-muted">—</span>
    return <span className="font-mono text-secondary">${r.position.minimum_rate ?? 0}–${r.position.maximum_rate ?? 0}</span>
  }},
]

const COLUMNS_STORAGE_KEY = 'core-op-list-columns'

// ─── Main Component ──────────────────────────────────────────────────────

export default function OpenPositionsReport() {
  const navigate = useNavigate()
  const report = useOpenPositionReport()
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null)
  const [showThresholds, setShowThresholds] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [summaryCollapsed, setSummaryCollapsed] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const {
    columnConfig, visibleColumns, toggleColumn, moveColumn, resetColumns,
    showColumnConfig, setShowColumnConfig, columnConfigRef,
  } = useColumnConfig(COLUMN_DEFINITIONS, COLUMNS_STORAGE_KEY)

  const { showToast } = useToast()

  useEffect(() => { log.info('Open positions report viewed') }, [])

  const flaggedResults = report.filteredResults.filter(r => r.matchingCriteria.length > 0)
  const healthyResults = report.filteredResults.filter(r => r.matchingCriteria.length === 0)

  const handleExportExcel = useCallback(async () => {
    const result = await report.exportCsv()
    if (result?.saved) {
      showToast(
        `Excel exported to ${result.filePath?.split('/').pop() ?? 'file'}`,
        'success', 8000,
        result.filePath ? [
          { label: 'Open File', icon: 'file' as const, onClick: () => window.api.app.openPath(result.filePath!) },
          { label: 'Show in Folder', icon: 'folder' as const, onClick: () => window.api.app.showItemInFolder(result.filePath!) },
        ] : undefined,
      )
    }
  }, [report, showToast])

  const handleExportPdf = useCallback(async () => {
    const result = await window.api.report.exportPdf()
    if (result.saved) {
      showToast(
        `PDF exported to ${result.filePath?.split('/').pop() ?? 'file'}`,
        'success', 8000,
        result.filePath ? [
          { label: 'Open File', icon: 'file' as const, onClick: () => window.api.app.openPath(result.filePath!) },
          { label: 'Show in Folder', icon: 'folder' as const, onClick: () => window.api.app.showItemInFolder(result.filePath!) },
        ] : undefined,
      )
    }
  }, [showToast])

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
            onClick={() => { log.info('Open positions report redirected to Data Sync'); navigate('/datasync') }}
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
        <div>
          <button
            onClick={() => setSummaryCollapsed(!summaryCollapsed)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors mb-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${summaryCollapsed ? '-rotate-90' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Summary
          </button>
          {!summaryCollapsed && (
            <div className="grid grid-cols-4 gap-2">
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
                <p className="text-[11px] text-muted uppercase tracking-wide">Avg. Aging</p>
                <p className="text-lg font-bold text-primary font-mono">
                  {Math.round(report.filteredResults.reduce((s, r) => s + r.position.aging, 0) / (report.filteredResults.length || 1))}d
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <ReportToolbar
        searchText={report.searchText}
        onSearchChange={report.setSearchText}
        filterHealthStatus={report.filterHealthStatus}
        onFilterHealthStatusChange={report.setFilterHealthStatus}
        resultsCounts={{ total: report.results.length, flagged: report.healthCounts.flagged, healthy: report.healthCounts.healthy, external: report.healthCounts.external }}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={report.hasActiveFilters}
        activeFilterCount={report.activeFilterCount}
        sortOrder={report.sortOrder}
        onToggleSortOrder={() => report.setSortOrder(report.sortOrder === 'aging-desc' ? 'aging-asc' : 'aging-desc')}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showColumnConfig={showColumnConfig}
        onToggleColumnConfig={() => setShowColumnConfig(!showColumnConfig)}
        columnConfigRef={columnConfigRef}
        columnConfigPanel={<ColumnConfigPanel columnConfig={columnConfig} columnDefs={COLUMN_DEFINITIONS} onToggle={toggleColumn} onMove={moveColumn} onReset={resetColumns} />}
        onShowLegend={() => setShowLegend(true)}
        onShowThresholds={() => setShowThresholds(true)}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        exportDisabled={report.filteredResults.length === 0}
      />

      {showFilters && (
        <FiltersPanel
          criteriaFilter={report.criteriaFilter}
          criteriaFilterCounts={report.criteriaFilterCounts}
          filterActors={report.filterActors}
          columnFilters={report.columnFilters}
          hasActiveFilters={report.hasActiveFilters}
          onCriteriaFilterChange={report.setCriteriaFilter}
          onActorsChange={report.setFilterActors}
          onClearAllFilters={report.clearAllFilters}
          onClearColumnFilter={report.clearColumnFilter}
        />
      )}

      {report.isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted font-mono">Evaluating positions...</p>
        </div>
      )}

      {report.error && <div className="glass-panel p-6 text-center"><p className="text-sm text-red-400">{report.error}</p></div>}

      {!report.isLoading && !report.error && report.results.length === 0 && (
        <div className="glass-panel p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-emerald-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2 className="text-lg font-semibold text-primary mb-1">No Evaluated Positions</h2>
          <p className="text-sm text-secondary">No open positions matched the evaluation criteria.</p>
        </div>
      )}

      {!report.isLoading && !report.error && report.results.length > 0 && viewMode === 'grid' && (
        <PositionsGridView
          flaggedResults={flaggedResults}
          healthyResults={healthyResults}
          filteredResults={report.filteredResults}
          filterHealthStatus={report.filterHealthStatus}
          columnFilters={report.columnFilters}
          onSelectPosition={setSelectedPositionId}
          onClearColumnFilter={report.clearColumnFilter}
        />
      )}

      {!report.isLoading && !report.error && report.results.length > 0 && viewMode === 'list' && (
        <PositionsTableView
          visibleColumns={visibleColumns as ColumnDef[]}
          filteredResults={report.filteredResults}
          availableColumnValues={report.availableColumnValues}
          columnFilters={report.columnFilters}
          onSetColumnFilter={report.setColumnFilter}
          onClearColumnFilter={report.clearColumnFilter}
          onSelectPosition={setSelectedPositionId}
        />
      )}

      {showThresholds && <ThresholdsModal report={report} onClose={() => setShowThresholds(false)} />}
      {showLegend && <LegendModal thresholds={report.thresholds} onClose={() => setShowLegend(false)} />}
      <PositionDetailDrawer upstreamId={selectedPositionId} onClose={() => setSelectedPositionId(null)} />
    </div>
  )
}
