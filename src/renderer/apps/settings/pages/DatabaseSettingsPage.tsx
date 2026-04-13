import { useState, useEffect, useCallback } from 'react'
import type { DatabaseHealthResult } from '../../../../shared/ipc-types'
import DatabaseSharingPanel from '../../resume/components/settings/DatabaseSharingPanel'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatTableName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function HealthBadge({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      ok
        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
    }`}>
      {ok ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      {ok ? 'Healthy' : 'Issues Detected'}
    </span>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100/50 dark:border-dark-border/20 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-xs text-primary ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
    </div>
  )
}

export default function DatabaseSettingsPage() {
  const [health, setHealth] = useState<DatabaseHealthResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const fetchHealth = useCallback(() => {
    setChecking(true)
    setError(null)
    window.api.database.getHealth()
      .then(setHealth)
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        setLoading(false)
        setChecking(false)
      })
  }, [])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold text-primary">Database</h1>
        <p className="text-xs text-muted mt-0.5">Connection info, health checks, and data sharing</p>
      </div>

      {error && (
        <div className="glass-card p-4 border-l-2 border-red-400">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass-card p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted">Loading database info...</span>
          </div>
        </div>
      ) : health && (
        <>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-primary">Connection Info</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100/80 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      {health.engine}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">Local embedded database</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HealthBadge ok={health.integrityOk} />
                <button
                  type="button"
                  onClick={fetchHealth}
                  disabled={checking}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary bg-white/50 dark:bg-dark-hover/30 hover:bg-white/80 dark:hover:bg-dark-hover/50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {checking ? 'Checking...' : 'Run Health Check'}
                </button>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-dark-hover/20 rounded-xl p-4">
              <InfoRow label="File Path" value={health.filePath} mono />
              <InfoRow label="Database Size" value={formatBytes(health.fileSizeBytes)} />
              <InfoRow label="WAL Size" value={formatBytes(health.walSizeBytes)} />
              <InfoRow label="SQLite Version" value={health.sqliteVersion} mono />
              <InfoRow label="Journal Mode" value={health.journalMode.toUpperCase()} />
              <InfoRow label="Foreign Keys" value={health.foreignKeys ? 'Enabled' : 'Disabled'} />
              <InfoRow label="Tables" value={`${health.tableCount} tables`} />
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-primary mb-1">Record Counts</h2>
            <p className="text-xs text-muted mb-4">Row counts for each synced data table</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(health.recordCounts).map(([table, count]) => (
                <div key={table} className="bg-white/40 dark:bg-dark-hover/20 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-primary">{count.toLocaleString()}</p>
                  <p className="text-[10px] text-muted mt-0.5 leading-tight">{formatTableName(table)}</p>
                </div>
              ))}
            </div>
          </div>

          <DatabaseSharingPanel />
        </>
      )}
    </div>
  )
}
