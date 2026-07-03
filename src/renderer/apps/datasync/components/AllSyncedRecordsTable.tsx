import { useState, useMemo, useEffect, useCallback, memo } from 'react'
import type { SyncRecord } from '../types'
import { exportToExcel, ColumnDef } from '../../resume/utils/exportToExcel'
import { SearchIcon, SpinnerIcon, ChevronIcon } from '../../../shared/components/icons'
import { useToast } from '../../../shared/components/ToastContext'

const PAGE_SIZE = 50

const NON_DEVELOPER_PATTERNS = [
  'human resources', 'hr ', 'recruiter', 'recruiting',
  'information technology', 'it support', 'it operations',
  'sys admin', 'system admin', 'helpdesk', 'help desk',
  'finance', 'accounting', 'payroll',
  'legal', 'compliance',
  'marketing', 'sales',
  'administrative', 'office manager', 'receptionist',
  'facilities', 'procurement',
  'talent acquisition',
]

function isDeveloperRole(record: SyncRecord): boolean {
  const jobTitle = (record.jobTitle ?? '').toLowerCase()
  const funcUnit = (record.functionalUnit ?? '').toLowerCase()
  const busUnit = (record.businessUnit ?? '').toLowerCase()

  return !NON_DEVELOPER_PATTERNS.some(pattern =>
    jobTitle.includes(pattern) || funcUnit.includes(pattern) || busUnit.includes(pattern)
  )
}

const PIPELINE_LABELS: Record<string, string> = {
  'not-processed': 'Not Processed',
  incomplete: 'Incomplete',
  synced: 'Synced',
  extracted: 'Extracted',
  vectorized: 'Vectorized',
  sync_failed: 'Sync Failed',
  extract_failed: 'Extract Failed',
  vectorize_failed: 'Vectorize Failed',
}

const PIPELINE_CLASSES: Record<string, string> = {
  'not-processed': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  incomplete: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  synced: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  extracted: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  vectorized: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
  sync_failed: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
  extract_failed: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
  vectorize_failed: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
}

type SortKey = 'pipelineStatus' | 'name' | 'mainSkill' | 'functionalUnit' | 'businessUnit' | 'jobTitle' | 'seniority' | 'officeLocation' | 'hasResume' | 'syncedAt' | 'country'
type SortDirection = 'asc' | 'desc'

function SortIcon({ direction }: { direction?: SortDirection }) {
  if (!direction) {
    return (
      <svg className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  return (
    <ChevronIcon
      size="sm"
      direction={direction === 'asc' ? 'up' : 'down'}
      className="w-3 h-3 text-accent-500"
    />
  )
}

function compareValues(a: string | number | boolean | null | undefined, b: string | number | boolean | null | undefined): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? -1 : 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
}

interface AllSyncedRecordsTableProps {
  records: SyncRecord[]
  isLoading: boolean
}

export default memo(function AllSyncedRecordsTable({ records, isLoading }: AllSyncedRecordsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [exporting, setExporting] = useState(false)
  const [exportingGap, setExportingGap] = useState(false)
  const { showToast } = useToast()

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        if (sortDirection === 'asc') {
          setSortDirection('desc')
          return key
        }
        setSortDirection('asc')
        return null
      }
      setSortDirection('asc')
      return key
    })
    setPage(0)
  }, [sortDirection])

  useEffect(() => {
    setPage(0)
  }, [searchQuery, records])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const base = records.filter((r) => {
      if (!q) return true
      return (
        (r.name ?? '').toLowerCase().includes(q)
        || (r.email ?? '').toLowerCase().includes(q)
        || (r.mainSkill ?? '').toLowerCase().includes(q)
        || (r.functionalUnit ?? '').toLowerCase().includes(q)
        || (r.businessUnit ?? '').toLowerCase().includes(q)
        || (r.jobTitle ?? '').toLowerCase().includes(q)
        || (r.officeLocation ?? '').toLowerCase().includes(q)
      )
    })

    if (!sortKey) return base

    return [...base].sort((a, b) => {
      let valA: string | number | boolean | null | undefined
      let valB: string | number | boolean | null | undefined

      switch (sortKey) {
        case 'pipelineStatus': valA = a.pipelineStatus; valB = b.pipelineStatus; break
        case 'name': valA = a.name; valB = b.name; break
        case 'mainSkill': valA = a.mainSkill; valB = b.mainSkill; break
        case 'functionalUnit': valA = a.functionalUnit; valB = b.functionalUnit; break
        case 'businessUnit': valA = a.businessUnit; valB = b.businessUnit; break
        case 'jobTitle': valA = a.jobTitle; valB = b.jobTitle; break
        case 'seniority': valA = a.seniority; valB = b.seniority; break
        case 'officeLocation': valA = a.officeLocation; valB = b.officeLocation; break
        case 'hasResume': valA = a.hasResume; valB = b.hasResume; break
        case 'syncedAt': valA = a.syncedAt; valB = b.syncedAt; break
        case 'country': valA = a.country; valB = b.country; break
        default: valA = null; valB = null
      }

      const cmp = compareValues(valA, valB)
      return sortDirection === 'desc' ? -cmp : cmp
    })
  }, [records, searchQuery, sortKey, sortDirection])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const devStats = useMemo(() => {
    const developers = records.filter(isDeveloperRole)
    const devsWithResume = developers.filter(r => r.hasResume)
    const devsMissingResume = developers.filter(r => !r.hasResume)
    return {
      total: records.length,
      developers: developers.length,
      withResume: devsWithResume.length,
      missingResume: devsMissingResume.length,
    }
  }, [records])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const columns: ColumnDef[] = [
        { header: 'Status', key: 'pipelineStatus', width: 14 },
        { header: 'Name', key: 'name', width: 24 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Main Skill', key: 'mainSkill', width: 18 },
        { header: 'Functional Unit', key: 'functionalUnit', width: 18 },
        { header: 'Business Unit', key: 'businessUnit', width: 18 },
        { header: 'Job Title', key: 'jobTitle', width: 22 },
        { header: 'Seniority', key: 'seniority', width: 12 },
        { header: 'Office Location', key: 'officeLocation', width: 16 },
        { header: 'Country', key: 'country', width: 14 },
        { header: 'Has Resume', accessor: (r) => (r.hasResume ? 'Yes' : 'No'), width: 12 },
        { header: 'Synced At', key: 'syncedAt', width: 18 },
      ]
      const data = filtered.map(r => ({ ...r } as unknown as Record<string, unknown>))
      const dateStr = new Date().toISOString().slice(0, 10)
      await exportToExcel(data, columns, `synced-employees-${dateStr}.xlsx`)
      showToast('Exported successfully', 'success')
    } catch (err) {
      showToast(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    } finally {
      setExporting(false)
    }
  }, [filtered, showToast])

  const handleResumeGapExport = useCallback(async () => {
    setExportingGap(true)
    try {
      const developers = records.filter(isDeveloperRole)
      const missingResume = developers.filter(r => !r.hasResume)

      if (missingResume.length === 0) {
        showToast('No developers missing resume found', 'info')
        setExportingGap(false)
        return
      }

      const columns: ColumnDef[] = [
        { header: 'Name', key: 'name', width: 24 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Main Skill', key: 'mainSkill', width: 18 },
        { header: 'Seniority', key: 'seniority', width: 12 },
        { header: 'Job Title', key: 'jobTitle', width: 22 },
        { header: 'Functional Unit', key: 'functionalUnit', width: 18 },
        { header: 'Business Unit', key: 'businessUnit', width: 18 },
        { header: 'Office Location', key: 'officeLocation', width: 16 },
        { header: 'Country', key: 'country', width: 14 },
        { header: 'Synced At', key: 'syncedAt', width: 18 },
      ]
      const data = missingResume.map(r => ({ ...r } as unknown as Record<string, unknown>))
      const dateStr = new Date().toISOString().slice(0, 10)
      await exportToExcel(data, columns, `developer-resume-gap-report-${dateStr}.xlsx`)
      showToast(`Exported ${missingResume.length} developers missing resume`, 'success')
    } catch (err) {
      showToast(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    } finally {
      setExportingGap(false)
    }
  }, [records, showToast])

  const renderSortableHeader = (label: string, key: SortKey) => (
    <th
      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer select-none group"
      onClick={() => handleSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon direction={sortKey === key ? sortDirection : undefined} />
      </span>
    </th>
  )

  if (isLoading) {
    return (
      <div className="glass-panel-subtle rounded-xl p-12 text-center">
        <SpinnerIcon className="w-6 h-6 mx-auto mb-3 text-accent-500 animate-spin" />
        <p className="text-sm text-muted">Loading synced records…</p>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="glass-panel-subtle rounded-xl p-12 text-center">
        <svg className="w-10 h-10 mx-auto mb-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
        </svg>
        <p className="text-sm text-muted">No synced employee records yet</p>
        <p className="text-xs text-muted mt-1">Run a pipeline sync to populate this view</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Developer Resume Gap Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel-subtle rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{devStats.total.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Total Employees</p>
        </div>
        <div className="glass-panel-subtle rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">{devStats.developers.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Developers</p>
        </div>
        <div className="glass-panel-subtle rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{devStats.withResume.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">With Resume</p>
        </div>
        <div className="glass-panel-subtle rounded-xl p-4 text-center border border-red-200/50 dark:border-red-500/20">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{devStats.missingResume.toLocaleString()}</p>
          <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1 font-medium">Missing Resume</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, skill, unit…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-9 pr-3 py-2 text-sm rounded-lg"
          />
        </div>
        <span className="text-xs text-muted">
          {filtered.length.toLocaleString()} record{filtered.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg glass-button transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            Export All
          </button>
          <button
            onClick={handleResumeGapExport}
            disabled={exportingGap || devStats.missingResume === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingGap ? (
              <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            )}
            Resume Gap Report ({devStats.missingResume})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel-subtle rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
                {renderSortableHeader('Status', 'pipelineStatus')}
                {renderSortableHeader('Name', 'name')}
                {renderSortableHeader('Main Skill', 'mainSkill')}
                {renderSortableHeader('Functional Unit', 'functionalUnit')}
                {renderSortableHeader('Business Unit', 'businessUnit')}
                {renderSortableHeader('Job Title', 'jobTitle')}
                {renderSortableHeader('Seniority', 'seniority')}
                {renderSortableHeader('Office', 'officeLocation')}
                {renderSortableHeader('Country', 'country')}
                {renderSortableHeader('Resume', 'hasResume')}
                {renderSortableHeader('Synced At', 'syncedAt')}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/20 dark:divide-dark-border/20">
              {paged.map(record => (
                <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-hover/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${PIPELINE_CLASSES[record.pipelineStatus] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'}`}>
                      {PIPELINE_LABELS[record.pipelineStatus] ?? record.pipelineStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-primary font-medium truncate max-w-[200px]" title={record.name}>
                    {record.name || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-secondary truncate max-w-[140px]" title={record.mainSkill ?? ''}>
                    {record.mainSkill || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-secondary truncate max-w-[140px]" title={record.functionalUnit ?? ''}>
                    {record.functionalUnit || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-secondary truncate max-w-[140px]" title={record.businessUnit ?? ''}>
                    {record.businessUnit || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-secondary truncate max-w-[160px]" title={record.jobTitle ?? ''}>
                    {record.jobTitle || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-secondary">
                    {record.seniority || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-secondary truncate max-w-[120px]" title={record.officeLocation ?? ''}>
                    {record.officeLocation || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-secondary">
                    {record.country || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {record.hasResume ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs">Yes</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs">No</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted whitespace-nowrap">
                    {record.syncedAt ? new Date(record.syncedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted">
            Showing {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="px-2 py-1 text-xs rounded glass-button disabled:opacity-30 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs rounded glass-button disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-xs font-medium text-secondary">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs rounded glass-button disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs rounded glass-button disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
