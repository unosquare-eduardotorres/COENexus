import type { SyncEvent } from './syncTypes'

export interface SyncCounters {
  totalRecords: number
  fetchedRecords: number
  syncedCount: number
  incompleteCount: number
  notProcessedCount: number
  updatedCount: number
  unchangedCount: number
  skippedCount: number
}

export function emitSyncProgress(
  emitEvent: (event: SyncEvent) => void,
  source: string,
  counters: SyncCounters,
  currentRecord?: string,
  status: 'syncing' | 'paused' | 'completed' = 'syncing',
): void {
  emitEvent({
    type: 'progress',
    progress: {
      source,
      totalRecords: counters.totalRecords,
      fetchedRecords: counters.fetchedRecords,
      syncedCount: counters.syncedCount,
      incompleteCount: counters.incompleteCount,
      notProcessedCount: counters.notProcessedCount,
      updatedCount: counters.updatedCount,
      unchangedCount: counters.unchangedCount,
      skippedCount: counters.skippedCount,
      currentRecord,
      status,
    },
  })
}

export function emitSyncComplete(
  emitEvent: (event: SyncEvent) => void,
  source: string,
  counters: SyncCounters,
  aborted: boolean,
): void {
  emitSyncProgress(emitEvent, source, counters, undefined, aborted ? 'paused' : 'completed')
}

export function createSyncCounters(skip = 0): SyncCounters {
  return {
    totalRecords: 0,
    fetchedRecords: skip,
    syncedCount: 0,
    incompleteCount: 0,
    notProcessedCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    skippedCount: 0,
  }
}
