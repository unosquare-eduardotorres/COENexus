import { useState, useEffect, useCallback, useRef } from 'react'
import type { OffboardingReportResult, OffboardingSyncStatus } from '../../../../shared/ipc-types'

interface OffboardingSyncState {
  /** Report data from local DB (null when not yet synced). */
  data: OffboardingReportResult | null
  /** Sync metadata (has data, timestamp). */
  syncStatus: OffboardingSyncStatus | null
  /** True while the initial load is in flight. */
  loading: boolean
  /** Error from loading report data. */
  error: string | null
  /** True while a sync is running and we're polling for completion. */
  syncing: boolean
  /** Error from the sync request itself. */
  syncError: string | null
  /** Kick off a sync. */
  handleSync: () => Promise<void>
  /** True when the token is a structurally valid, non-expired JWT. */
  hasUsableToken: boolean
}

const POLL_INTERVAL_MS = 2000

/**
 * Encapsulates offboarding data loading, sync triggering,
 * and polling-based completion tracking.
 *
 * Mirrors usePlacementMarginSync pattern for consistency.
 * Uses polling (`getOffboardingSyncStatus` every 2 s) to
 * avoid cross-talk with other sync pipelines.
 */
export function useOffboardingSync(
  year: number,
  token: string | null,
  isTokenValid: boolean = false,
): OffboardingSyncState {
  const hasUsableToken = isTokenValid && Boolean(token)
  const [data, setData] = useState<OffboardingReportResult | null>(null)
  const [syncStatus, setSyncStatus] = useState<OffboardingSyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const baselineRef = useRef<string | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── Load ALL entries for the year — UI filters client-side ─────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.report.getOffboarding(year, 'ALL')
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [year])

  // ── Load sync status ────────────────────────────────────────────
  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await window.api.report.getOffboardingSyncStatus(year)
      setSyncStatus(status)
      baselineRef.current = status.syncedAt ?? null
    } catch {
      // non-critical
    }
  }, [year])

  useEffect(() => {
    loadData()
    loadSyncStatus()
  }, [loadData, loadSyncStatus])

  // ── Start polling after sync ─────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const status = await window.api.report.getOffboardingSyncStatus(year)
        if (
          status.hasSyncedData &&
          status.syncedAt &&
          status.syncedAt !== baselineRef.current
        ) {
          setSyncStatus(status)
          baselineRef.current = status.syncedAt
          setSyncing(false)
          loadData()
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
          return
        }
      } catch {
        // keep polling — transient errors are fine
      }
    }, POLL_INTERVAL_MS)
  }, [year, loadData])

  // ── Trigger sync ─────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    if (!token || !hasUsableToken) return
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
  }, [token, hasUsableToken, year, startPolling])

  return { data, syncStatus, loading, error, syncing, syncError, handleSync, hasUsableToken }
}
