import { useState, useEffect, useCallback, useRef } from 'react'
import { coeBonusService } from '../services/coeBonusService'
import type { PlacementMarginReportResult, PlacementMarginSyncStatus } from '../types/coeBonus'

interface PlacementMarginSyncState {
  /** Report data from local DB (null when not yet synced). */
  data: PlacementMarginReportResult | null
  /** Sync metadata (entry count, timestamp). */
  syncStatus: PlacementMarginSyncStatus | null
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
 * Encapsulates all placement-margin data loading, sync triggering,
 * and polling-based completion tracking.
 *
 * Sync is now year-level (YTD). The `quarter` param only controls which
 * quarter slice of entries the report service returns.
 *
 * Uses polling (`getPlacementMarginSyncStatus` every 2 s) instead of the
 * shared `SYNC_PROGRESS_EVENT` channel to avoid cross-talk with employee /
 * candidate / position syncs (see BUG-1 in audit).
 */
export function usePlacementMarginSync(
  year: number,
  quarter: string,
  token: string | null,
  isTokenValid: boolean = false,
): PlacementMarginSyncState {
  const hasUsableToken = isTokenValid && Boolean(token)
  const [data, setData] = useState<PlacementMarginReportResult | null>(null)
  const [syncStatus, setSyncStatus] = useState<PlacementMarginSyncStatus | null>(null)
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
      const result = await coeBonusService.getPlacementMargin({ year, quarter: 'ALL' } as any)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [year])

  // ── Load sync status (year-level) ───────────────────────────────
  const loadSyncStatus = useCallback(async () => {
    try {
      // Check year-level first (quarter=0), then fall back to each quarter
      let status = await coeBonusService.getPlacementMarginSyncStatus(year, 0)
      if (!status.hasSyncedData) {
        for (let q = 4; q >= 1; q--) {
          const qs = await coeBonusService.getPlacementMarginSyncStatus(year, q)
          if (qs.hasSyncedData) {
            status = qs
            break
          }
        }
      }
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
        // Check all possible quarter keys for updated sync status
        for (let q = 4; q >= 0; q--) {
          const status = await coeBonusService.getPlacementMarginSyncStatus(year, q)
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
        }
      } catch {
        // keep polling — transient errors are fine
      }
    }, POLL_INTERVAL_MS)
  }, [year, loadData])

  // ── Trigger sync (year-only, no quarter) ────────────────────────
  const handleSync = useCallback(async () => {
    if (!token || !hasUsableToken) return
    setSyncing(true)
    setSyncError(null)
    try {
      const result = await coeBonusService.syncPlacementMargin(token, year)
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
