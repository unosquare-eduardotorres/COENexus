import { useState, useEffect, useCallback, useRef } from 'react'
import type { PlacementMarginSyncStatus } from '../../../../shared/ipc-types'
import { buildYearOptions } from '../../../../shared/utils/quarterUtils'

interface PlacementMarginSyncPanelProps {
  token: string
  isTokenValid: boolean
}

const YEARS = buildYearOptions()

export default function PlacementMarginSyncPanel({ token, isTokenValid }: PlacementMarginSyncPanelProps) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<PlacementMarginSyncStatus | null>(null)

  // For YTD sync status, query with quarter=0 (year-level)
  const loadStatus = useCallback(async () => {
    try {
      const status = await window.api.report.getPlacementMarginSyncStatus(year, 0)
      // Fall back: check each quarter if no year-level status found
      if (!status.hasSyncedData) {
        for (let q = 4; q >= 1; q--) {
          const qs = await window.api.report.getPlacementMarginSyncStatus(year, q)
          if (qs.hasSyncedData) {
            setSyncStatus(qs)
            return
          }
        }
      }
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
        // Check all possible quarter keys for updated sync status
        for (let q = 4; q >= 0; q--) {
          const status = await window.api.report.getPlacementMarginSyncStatus(year, q)
          if (
            status.hasSyncedData &&
            status.syncedAt &&
            status.syncedAt !== baselineRef.current
          ) {
            setSyncStatus(status)
            setSyncing(false)
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
            return
          }
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
      const result = await window.api.report.syncPlacementMargin({ token, year })
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
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex-shrink-0 flex items-center justify-center text-emerald-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Placement Margin Sync</h2>
          <p className="text-xs text-slate-400">Fetch year-to-date placement margin data from the Exec API</p>
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
              className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm border border-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || !isTokenValid}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-amber-400 text-xs mt-2">Connect to the Exec API via the API Connections modal to sync placement margin data.</p>
        )}
        {syncError && <p className="text-red-400 text-xs mt-2">{syncError}</p>}
      </div>

      {/* Status */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Sync Status</h3>
        {syncStatus?.hasSyncedData ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
