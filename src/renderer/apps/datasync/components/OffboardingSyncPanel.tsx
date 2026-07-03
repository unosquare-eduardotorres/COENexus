import { useState, useEffect, useCallback, useRef } from 'react'
import type { OffboardingSyncStatus } from '../../../../shared/ipc-types'
import { buildYearOptions } from '../../../../shared/utils/quarterUtils'

interface OffboardingSyncPanelProps {
  token: string
  isTokenValid: boolean
}

const YEARS = buildYearOptions()

export default function OffboardingSyncPanel({ token, isTokenValid }: OffboardingSyncPanelProps) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<OffboardingSyncStatus | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const status = await window.api.report.getOffboardingSyncStatus(year)
      setSyncStatus(status)
    } catch {
      // non-critical
    }
  }, [year])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Poll for sync completion
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const baselineRef = useRef<string | null>(syncStatus?.syncedAt ?? null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    baselineRef.current = syncStatus?.syncedAt ?? null
    pollRef.current = setInterval(async () => {
      try {
        const status = await window.api.report.getOffboardingSyncStatus(year)
        if (
          status.hasSyncedData &&
          status.syncedAt &&
          status.syncedAt !== baselineRef.current
        ) {
          setSyncStatus(status)
          setSyncing(false)
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch {
        // keep polling — transient errors are fine
      }
    }, 2000)
  }, [year, syncStatus?.syncedAt])

  const handleSync = async () => {
    if (!token) return
    setSyncing(true)
    setSyncError(null)
    try {
      const result = await window.api.report.syncOffboarding({ token, year })
      if (result.started) {
        startPolling()
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex-shrink-0 flex items-center justify-center text-rose-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Offboarding Sync</h2>
          <p className="text-xs text-slate-400">Fetch year-to-date professional offboarding data from the Exec API</p>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm border border-slate-700 focus:border-rose-500 focus:outline-none"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || !isTokenValid}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                Sync {year} YTD
              </>
            )}
          </button>
        </div>
        {!isTokenValid && (
          <p className="text-amber-400 text-xs mt-2">Connect to the Exec API via the API Connections modal to sync offboarding data.</p>
        )}
        {syncError && <p className="text-red-400 text-xs mt-2">{syncError}</p>}
      </div>

      {/* Status */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Sync Status</h3>
        {syncStatus?.hasSyncedData ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-sm text-slate-200">
                {syncStatus.entryCount} entries synced for {year} YTD
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Last synced: {syncStatus.syncedAt ? new Date(syncStatus.syncedAt).toLocaleString() : 'Unknown'}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-sm text-slate-400">
              No data synced for {year} YTD
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
