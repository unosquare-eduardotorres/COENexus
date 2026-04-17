import { syncEmployeeOrchestrator } from './sync/syncEmployeeOrchestrator'
import { syncCandidateOrchestrator } from './sync/syncCandidateOrchestrator'
import { syncOpenPositionOrchestrator } from './sync/syncOpenPositionOrchestrator'
import { syncPrrOrchestrator } from './sync/syncPrrOrchestrator'
import type { SyncRecordDto, SyncEvent, SyncOptions } from './sync/syncTypes'
import { createLogger } from './logger'

export type { SyncRecordDto, SyncProgressDto, SyncEvent, SyncOptions } from './sync/syncTypes'

const log = createLogger('SyncOrchestrator')

let activeController: AbortController | null = null

export const syncOrchestrator = {
  requestPause(): void {
    activeController?.abort()
  },

  async syncAsync(
    source: string,
    token: string,
    options: SyncOptions,
    emitEvent: (event: SyncEvent) => void
  ): Promise<void> {
    activeController = new AbortController()
    const { signal } = activeController
    log.info('Sync started', { source, limit: options.limit, skip: options.skip, activeOnly: options.activeOnly })
    try {
      if (source === 'employees') {
        await syncEmployeeOrchestrator.sync(token, options, emitEvent, signal)
      } else if (source === 'candidates') {
        await syncCandidateOrchestrator.sync(token, options, emitEvent, signal)
      } else if (source === 'open-positions') {
        await syncOpenPositionOrchestrator.sync(token, options, emitEvent, signal)
      } else if (source === 'project-reallocations') {
        await syncPrrOrchestrator.sync(token, options, emitEvent, signal)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        log.info('Sync aborted by user', { source })
        return
      }
      log.error(`Sync failed for source=${source}`, err instanceof Error ? err : new Error(String(err)))
      emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Unknown sync error' })
    } finally {
      log.info('Sync dispatcher finished', { source, aborted: activeController?.signal.aborted ?? false })
      activeController = null
    }
  },

  async syncSingle(source: string, token: string, upstreamId: number): Promise<SyncRecordDto> {
    log.info('Single record sync requested', { source, upstreamId })
    if (source === 'employees') return syncEmployeeOrchestrator.syncSingle(token, upstreamId)
    if (source === 'candidates') return syncCandidateOrchestrator.syncSingle(token, upstreamId)
    throw new Error(`Unsupported source for single sync: ${source}`)
  },
}
