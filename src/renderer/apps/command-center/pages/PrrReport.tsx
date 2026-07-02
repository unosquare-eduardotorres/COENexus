import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrrReport } from '../hooks/usePrrReport'
import PrrDetailDrawer from '../components/PrrDetailDrawer'
import MultiSelect from '../components/MultiSelect'
import PrrReportTable from '../components/report/PrrReportTable'
import { type PrrCoeStatus } from '../types'
import { useToast } from '../../../shared/components/ToastContext'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import { SearchIcon, XIcon, DatabaseIcon, DownloadIcon } from '../components/Icons'

const log = createRendererLogger('PrrReport')

export default function PrrReport() {
  const navigate = useNavigate()
  const report = usePrrReport()
  const [selectedUpstreamId, setSelectedUpstreamId] = useState<number | null>(null)
  const [savingStatusIds, setSavingStatusIds] = useState<number[]>([])
  const [deletingIds, setDeletingIds] = useState<number[]>([])
  const { showToast } = useToast()

  useEffect(() => { log.info('PRR report page viewed') }, [])

  const summary = useMemo(() => {
    const total = report.filteredResults.length
    const pendingEval = report.filteredResults.filter(item => item.coeStatus === 'Pending Evaluation').length
    const readyToPresent = report.filteredResults.filter(item => item.coeStatus === 'Ready to Present').length
    const presented = report.filteredResults.filter(item => item.coeStatus === 'Presented').length
    const needsAttention = report.filteredResults.filter(item => item.coeStatus === 'Needs Attention').length
    const closed = report.filteredResults.filter(item => item.coeStatus === 'Closed').length
    return { total, pendingEval, readyToPresent, presented, needsAttention, closed }
  }, [report.filteredResults])

  const hasClosedItems = useMemo(() =>
    report.filteredResults.some(item => item.coeStatus === 'Closed'),
    [report.filteredResults]
  )

  const handleStatusChange = useCallback(async (upstreamId: number, nextStatus: PrrCoeStatus) => {
    log.info('PRR status change requested', { upstreamId, nextStatus })
    setSavingStatusIds(prev => (prev.includes(upstreamId) ? prev : [...prev, upstreamId]))
    try {
      await report.updateCoeStatus(upstreamId, nextStatus)
    } catch (error) {
      log.error('PRR status change failed', error)
    } finally {
      setSavingStatusIds(prev => prev.filter(id => id !== upstreamId))
    }
  }, [report])

  const handleDelete = useCallback(async (upstreamId: number) => {
    log.info('PRR delete requested from report page', { upstreamId })
    setDeletingIds(prev => (prev.includes(upstreamId) ? prev : [...prev, upstreamId]))
    try {
      await report.deleteRecord(upstreamId)
      if (selectedUpstreamId === upstreamId) setSelectedUpstreamId(null)
    } catch (error) {
      log.error('PRR delete failed', error)
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== upstreamId))
    }
  }, [report, selectedUpstreamId])

  const exportToExcel = useCallback(async () => {
    log.info('PRR Excel export requested', { rowCount: report.filteredResults.length })
    const result = await window.api.prr.exportXlsx(report.filteredResults)
    if (result.saved) {
      showToast(
        `Excel exported to ${result.filePath?.split('/').pop() ?? 'file'}`,
        'success', 8000,
        result.filePath ? [
          { label: 'Open File', icon: 'file' as const, onClick: () => window.api.app.openPath(result.filePath!) },
          { label: 'Show in Folder', icon: 'folder' as const, onClick: () => window.api.app.showItemInFolder(result.filePath!) },
        ] : undefined,
      )
    }
  }, [report.filteredResults, showToast])

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
          <button type="button" onClick={() => navigate('/datasync')} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: 'Total', value: summary.total, color: 'text-primary' },
            { label: 'Pending Eval', value: summary.pendingEval, color: 'text-amber-400' },
            { label: 'Ready to Present', value: summary.readyToPresent, color: 'text-emerald-400' },
            { label: 'Presented', value: summary.presented, color: 'text-teal-400' },
            { label: 'Needs Attention', value: summary.needsAttention, color: 'text-rose-400' },
            { label: 'Closed', value: summary.closed, color: 'text-red-400' },
          ].map(card => (
            <div key={card.label} className="glass-panel-subtle rounded-xl px-3 py-2">
              <p className="text-[11px] text-muted uppercase tracking-wide">{card.label}</p>
              <p className={`text-lg font-bold ${card.color} font-mono`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel-subtle rounded-xl p-3 space-y-3 relative z-10 print-filters">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"><SearchIcon /></span>
            <input type="text" value={report.searchText} onChange={e => report.setSearchText(e.target.value)} placeholder="Search employee or client..." className="glass-input pl-8 pr-8 py-2 w-full text-sm" />
            {report.searchText && (
              <button type="button" onClick={() => report.setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"><XIcon /></button>
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
          <div className="ml-auto flex items-center gap-2">
            {report.activeFilterCount > 0 && (
              <span className="px-2 py-1 rounded-full text-[10px] bg-emerald-500/25 text-emerald-400 font-medium uppercase tracking-wider">{report.activeFilterCount} active</span>
            )}
            <button type="button" onClick={report.clearAllFilters} disabled={!report.hasActiveFilters} className="px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/35 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Clear All</button>
            <button type="button" onClick={exportToExcel} disabled={report.filteredResults.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed no-print">
              <DownloadIcon /> Export Excel
            </button>
            <button
              type="button"
              onClick={async () => {
                const result = await window.api.report.exportPdf()
                if (result.saved) {
                  showToast(`PDF exported to ${result.filePath?.split('/').pop() ?? 'file'}`, 'success', 8000,
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
      </div>

      {report.isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted font-mono">Loading project reallocations...</p>
        </div>
      )}

      {report.error && <div className="glass-panel p-6 text-center"><p className="text-sm text-red-400">{report.error}</p></div>}

      {!report.isLoading && !report.error && report.filteredResults.length > 0 && (
        <PrrReportTable
          sortedResults={report.filteredResults}
          sortKey={report.sortKey}
          sortDirection={report.sortDirection}
          hasClosedItems={hasClosedItems}
          savingStatusIds={savingStatusIds}
          deletingIds={deletingIds}
          onSort={(key, dir) => { report.setSortKey(key); report.setSortDirection(dir) }}
          onSelectPosition={setSelectedUpstreamId}
          onCoeStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      {!report.isLoading && !report.error && report.filteredResults.length === 0 && report.results.length > 0 && (
        <div className="glass-panel p-6 text-center text-sm text-muted">No project reallocations match the selected filters.</div>
      )}

      {!report.isLoading && !report.error && report.results.length === 0 && (
        <div className="glass-panel p-8 text-center">
          <h2 className="text-lg font-semibold text-primary mb-1">No Project Reallocations</h2>
          <p className="text-sm text-secondary">No records are available for the selected period.</p>
        </div>
      )}

      <PrrDetailDrawer upstreamId={selectedUpstreamId} onClose={() => setSelectedUpstreamId(null)} onDataChanged={report.loadData} />
    </div>
  )
}
