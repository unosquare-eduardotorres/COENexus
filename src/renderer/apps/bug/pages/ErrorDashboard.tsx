import { useState, useEffect, useCallback, useMemo } from 'react'

interface ErrorEntry {
  id: string
  timestamp: string
  scope: string
  message: string
  stack?: string
  componentStack?: string
  platform: string
  version: string
  severity: 'warning' | 'error' | 'critical'
  fingerprint: string
  occurrences: number
  lastOccurrence: string
  status: 'new' | 'reported'
  source?: string
  aiDescription?: string
  url?: string
  userAgent?: string
}

interface ErrorListResponse {
  errors: ErrorEntry[]
  totalCount: number
  fileSize: number
}

const SCOPES = ['All', 'IPC', 'Main', 'DB', 'Agent', 'Renderer', 'ErrorBoundary', 'Preload', 'Unknown'] as const
const SEVERITIES = ['All', 'warning', 'error', 'critical'] as const
const STATUSES = ['All', 'new', 'reported'] as const

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function SeverityBadge({ severity }: { severity: string }) {
  const colorMap: Record<string, string> = {
    warning: 'bg-amber-500/15 text-amber-500 dark:text-amber-400',
    error: 'bg-red-500/15 text-red-500 dark:text-red-400',
    critical: 'bg-purple-500/15 text-purple-500 dark:text-purple-400',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${colorMap[severity] ?? colorMap.error}`}>
      {severity}
    </span>
  )
}

function ScopeBadge({ scope }: { scope: string }) {
  const colorMap: Record<string, string> = {
    IPC: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    DB: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    Agent: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    Renderer: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    ErrorBoundary: 'bg-red-500/10 text-red-600 dark:text-red-400',
    Preload: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${colorMap[scope] ?? 'bg-gray-500/10 text-gray-500 dark:text-gray-400'}`}>
      {scope}
    </span>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function ErrorDashboard() {
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [fileSize, setFileSize] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [scopeFilter, setScopeFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const loadErrors = useCallback(async () => {
    try {
      const result = await window.api?.bug?.list() as ErrorListResponse | undefined
      if (result) {
        setErrors(result.errors)
        setFileSize(result.fileSize)
      }
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadErrors()
  }, [loadErrors])

  useEffect(() => {
    const unsubscribe = window.api?.bug?.onNewError?.(() => {
      loadErrors()
    })
    return () => { unsubscribe?.() }
  }, [loadErrors])

  const filteredErrors = useMemo(() => {
    return errors.filter(e => {
      if (scopeFilter !== 'All' && e.scope !== scopeFilter) return false
      if (severityFilter !== 'All' && e.severity !== severityFilter) return false
      if (statusFilter !== 'All' && e.status !== statusFilter) return false
      if (searchQuery && !e.message.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [errors, scopeFilter, severityFilter, statusFilter, searchQuery])

  const stats = useMemo(() => ({
    total: errors.length,
    new: errors.filter(e => e.status === 'new').length,
    reported: errors.filter(e => e.status === 'reported').length,
  }), [errors])

  const handleClearAll = async () => {
    try {
      await window.api?.bug?.clear()
      setErrors([])
      setFileSize(0)
    } catch { /* */ }
  }

  const handleShowLogFile = async () => {
    try {
      const logPath = await window.api?.bug?.getLogPath()
      if (logPath) {
        await window.api?.app?.showItemInFolder(logPath)
      }
    } catch { /* */ }
  }

  const handleMarkReported = async (id: string) => {
    try {
      await window.api?.bug?.markReported(id)
      setErrors(prev => prev.map(e => e.id === id ? { ...e, status: 'reported' as const } : e))
    } catch { /* */ }
  }

  const handleGenerateDescription = async (id: string) => {
    setGeneratingId(id)
    try {
      const result = await window.api?.bug?.generateDescription({ errorId: id })
      if (result?.description) {
        setErrors(prev => prev.map(e => e.id === id ? { ...e, aiDescription: result.description } : e))
      }
    } catch { /* */ }
    setGeneratingId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api?.bug?.clear()
      loadErrors()
    } catch { /* */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SpinnerIcon />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐛</span>
            <div>
              <h1 className="text-xl font-bold text-primary">Error Dashboard</h1>
              <p className="text-xs text-muted">Track, triage, and resolve application errors</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShowLogFile}
              className="glass-button px-3 py-1.5 text-xs font-medium text-primary rounded-lg"
            >
              Show Log File
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={errors.length === 0}
              className="glass-button px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="glass-card rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Total</p>
          </div>
          <div className="glass-card rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-500">🐛 {stats.new}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">New</p>
          </div>
          <div className="glass-card rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">✅ {stats.reported}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Reported</p>
          </div>
          <div className="glass-card rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{formatFileSize(fileSize)}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">File Size</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted font-semibold">Scope</label>
            <select
              value={scopeFilter}
              onChange={e => setScopeFilter(e.target.value)}
              className="glass-select text-xs py-1 pl-2 pr-7 rounded-md"
            >
              {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted font-semibold">Severity</label>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="glass-select text-xs py-1 pl-2 pr-7 rounded-md"
            >
              {SEVERITIES.map(s => <option key={s} value={s}>{s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted font-semibold">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="glass-select text-xs py-1 pl-2 pr-7 rounded-md"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search errors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="glass-input w-full text-xs py-1.5 px-3 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        {filteredErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">🎉</span>
            <p className="text-sm font-medium text-primary">No errors found</p>
            <p className="text-xs text-muted mt-1">
              {errors.length === 0 ? 'Your application is running smoothly!' : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200/20 dark:divide-dark-border/20">
            {filteredErrors.map(error => (
              <div key={error.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100/30 dark:hover:bg-dark-hover/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base flex-shrink-0" title={error.status === 'new' ? 'New' : 'Reported'}>
                      {error.status === 'new' ? '🐛' : '✅'}
                    </span>
                    <SeverityBadge severity={error.severity} />
                    <ScopeBadge scope={error.scope} />
                    <span className="text-xs text-primary truncate flex-1 font-mono">
                      {error.message.length > 100 ? error.message.slice(0, 100) + '…' : error.message}
                    </span>
                    {error.occurrences > 1 && (
                      <span className="flex-shrink-0 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold">
                        {error.occurrences}×
                      </span>
                    )}
                    <span className="text-[10px] text-muted flex-shrink-0 w-16 text-right">
                      {relativeTime(error.lastOccurrence)}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-muted flex-shrink-0 transition-transform ${expandedId === error.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedId === error.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-200/10 dark:border-dark-border/10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">Platform</p>
                        <p className="text-xs text-primary font-mono">{error.platform}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">Version</p>
                        <p className="text-xs text-primary font-mono">{error.version}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">Source</p>
                        <p className="text-xs text-primary font-mono">{error.source ?? 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">Fingerprint</p>
                        <p className="text-xs text-primary font-mono">{error.fingerprint}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Full Message</p>
                      <p className="text-xs text-primary font-mono bg-black/5 dark:bg-white/5 rounded-lg p-3 break-all">
                        {error.message}
                      </p>
                    </div>

                    {error.stack && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Stack Trace</p>
                        <pre className="text-[11px] text-secondary font-mono bg-black/5 dark:bg-white/5 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {error.componentStack && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Component Stack</p>
                        <pre className="text-[11px] text-secondary font-mono bg-black/5 dark:bg-white/5 rounded-lg p-3 overflow-x-auto max-h-32 whitespace-pre-wrap">
                          {error.componentStack}
                        </pre>
                      </div>
                    )}

                    {error.url && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-0.5">URL</p>
                        <p className="text-xs text-primary font-mono">{error.url}</p>
                      </div>
                    )}

                    {error.aiDescription && (
                      <div className="glass-card rounded-lg p-3 border-l-2 border-purple-500">
                        <p className="text-[10px] uppercase tracking-wider text-purple-500 font-semibold mb-1">🤖 AI Analysis</p>
                        <p className="text-xs text-primary whitespace-pre-wrap">{error.aiDescription}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleGenerateDescription(error.id)}
                        disabled={generatingId === error.id}
                        className="glass-button px-3 py-1.5 text-xs font-medium text-purple-500 dark:text-purple-400 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {generatingId === error.id ? (
                          <>
                            <SpinnerIcon />
                            Generating...
                          </>
                        ) : (
                          <>🤖 AI Describe</>
                        )}
                      </button>
                      {error.status === 'new' && (
                        <button
                          type="button"
                          onClick={() => handleMarkReported(error.id)}
                          className="glass-button px-3 py-1.5 text-xs font-medium text-emerald-500 dark:text-emerald-400 rounded-lg"
                        >
                          ✅ Mark Reported
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(error.id)}
                        className="glass-button px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 rounded-lg"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
