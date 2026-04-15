import type { SyncEvent } from './sync/syncTypes'
import type { VigilActivityEvent, VigilSource } from '../../shared/ipc-types'

export function toVigilActivityEvent(event: SyncEvent): VigilActivityEvent {
  const timestamp = new Date().toISOString()

  if (event.type === 'record') {
    return {
      run_id: null,
      event_type: event.record.status === 'sync_failed' ? 'run_failed' : 'run_progress',
      source: event.record.source as VigilSource,
      severity: event.record.status === 'sync_failed' ? 'error' : 'info',
      message: `${event.record.name || event.record.source}: ${event.record.status}`,
      details_json: JSON.stringify({ upstreamId: event.record.upstreamId }),
      timestamp,
    }
  }

  if (event.type === 'error') {
    return {
      run_id: null,
      event_type: 'run_failed',
      source: 'system',
      severity: 'error',
      message: event.message,
      details_json: null,
      timestamp,
    }
  }

  return {
    run_id: null,
    event_type: event.type === 'complete' ? 'run_completed' : 'run_progress',
    source: 'system',
    severity: 'info',
    message: `Vigil scheduled sync ${event.type}`,
    details_json: JSON.stringify(event.progress),
    timestamp,
  }
}
