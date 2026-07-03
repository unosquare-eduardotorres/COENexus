/**
 * Shared record-tracking logic for pipeline hooks.
 *
 * Extracted from the duplicated pattern in useUnifiedPipeline and usePositionPipeline.
 * Handles: record accumulation from events, DB failed records loading, retry state,
 * progress tracking, and derived status flags.
 */

import { useState, useCallback, useRef } from 'react'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('usePipelineRecords')

export interface PipelineRecordEvent {
  upstreamId: number
  name: string
  outcome: 'vectorized' | 'skipped' | 'failed'
  failedStep?: 'sync' | 'extract' | 'vectorize' | 'no_resume'
  error?: string
  hasResume?: boolean
  seniority?: string
  mainSkill?: string
  jobTitle?: string
  functionalUnit?: string
  businessUnit?: string
  account?: string
  aging?: number
}

export interface PipelineProgressDto {
  source: string
  status: 'processing' | 'paused' | 'completed'
  totalRecords: number
  processedRecords: number
  succeededCount: number
  failedCount: number
  skippedCount: number
  currentRecord?: string
  pauseReason?: 'user' | 'token-expiring' | 'error'
  errorMessage?: string
}

export interface PipelineProgressEvent {
  type: 'record' | 'progress' | 'complete' | 'error'
  record?: PipelineRecordEvent
  progress?: PipelineProgressDto
  message?: string
}

export interface DbFailedRecord {
  upstream_id: number
  full_name: string
  status: string
  status_reason: string | null
  has_resume?: number
}

export function statusToFailedStep(status: string): 'sync' | 'extract' | 'vectorize' | 'no_resume' {
  if (status === 'sync_failed') return 'sync'
  if (status === 'extract_failed') return 'extract'
  if (status === 'vectorize_failed') return 'vectorize'
  return 'no_resume'
}

export function makeInitialProgress(source: string): PipelineProgressDto {
  return {
    source,
    status: 'completed',
    totalRecords: 0,
    processedRecords: 0,
    succeededCount: 0,
    failedCount: 0,
    skippedCount: 0,
  }
}

/**
 * Map DB failed records to the record event shape used by the UI.
 */
export function mapDbFailedRecords(dbFailed: DbFailedRecord[]): PipelineRecordEvent[] {
  return dbFailed.map(r => ({
    upstreamId: r.upstream_id,
    name: r.full_name,
    outcome: 'failed' as const,
    failedStep: statusToFailedStep(r.status),
    error: r.status_reason ?? undefined,
    hasResume: r.has_resume === 1,
  }))
}

interface UsePipelineRecordsOptions {
  source: string
}

/**
 * Shared state management for pipeline record tracking.
 * Returns state + handlers that both useUnifiedPipeline and usePositionPipeline use.
 */
export function usePipelineRecords({ source }: UsePipelineRecordsOptions) {
  const [progress, setProgress] = useState<PipelineProgressDto>(() => makeInitialProgress(source))
  const [succeededRecords, setSucceededRecords] = useState<PipelineRecordEvent[]>([])
  const [failedRecords, setFailedRecords] = useState<PipelineRecordEvent[]>([])
  const [skippedRecords, setSkippedRecords] = useState<PipelineRecordEvent[]>([])
  const [retryingId, setRetryingId] = useState<number | undefined>()
  const [dbFailedCount, setDbFailedCount] = useState(0)

  const pausedOffsetRef = useRef(0)

  /** Handle a single pipeline event — call from event subscription. */
  const handleEvent = useCallback((event: PipelineProgressEvent, eventSource?: string) => {
    if (event.type === 'record' && event.record) {
      const record = event.record
      if (record.outcome === 'vectorized') {
        setSucceededRecords(prev => {
          const exists = prev.some(r => r.upstreamId === record.upstreamId)
          return exists ? prev.map(r => r.upstreamId === record.upstreamId ? record : r) : [...prev, record]
        })
        setFailedRecords(prev => prev.filter(r => r.upstreamId !== record.upstreamId))
      } else if (record.outcome === 'failed') {
        setFailedRecords(prev => {
          const exists = prev.some(r => r.upstreamId === record.upstreamId)
          return exists ? prev.map(r => r.upstreamId === record.upstreamId ? record : r) : [...prev, record]
        })
      } else if (record.outcome === 'skipped') {
        setSkippedRecords(prev => {
          const exists = prev.some(r => r.upstreamId === record.upstreamId)
          return exists ? prev : [...prev, record]
        })
      }
    }
    if (event.type === 'progress' && event.progress) {
      if (!eventSource || event.progress.source === eventSource) {
        setProgress(event.progress)
      }
    }
    if (event.type === 'complete' && event.progress) {
      if (!eventSource || event.progress.source === eventSource) {
        setProgress(event.progress)
        if (event.progress.status === 'paused') {
          pausedOffsetRef.current = event.progress.processedRecords
        }
      }
    }
    if (event.type === 'error') {
      log.error('Pipeline error', new Error(event.message))
      setProgress(prev => prev.status === 'processing' ? { ...prev, status: 'paused' } : prev)
    }
  }, [])

  /** Load DB failed records (call on mount and after completion). */
  const loadDbFailed = useCallback((dbFailed: DbFailedRecord[]) => {
    setDbFailedCount(dbFailed.length)
    if (dbFailed.length > 0) {
      setFailedRecords(prev => {
        if (prev.length > 0) return prev
        return mapDbFailedRecords(dbFailed)
      })
    }
  }, [])

  /** Refresh failed records (unconditional replace — used after pipeline completion). */
  const refreshDbFailed = useCallback((dbFailed: DbFailedRecord[]) => {
    setDbFailedCount(dbFailed.length)
    setFailedRecords(mapDbFailedRecords(dbFailed))
  }, [])

  /** Restore persisted state from DB. */
  const restoreState = useCallback((saved: {
    source: string; offset: number; totalRecords: number; processedRecords: number
    succeededCount: number; failedCount: number; skippedCount: number
    pauseReason?: string; errorMessage?: string
    succeededRecords?: PipelineRecordEvent[]; failedRecords?: PipelineRecordEvent[]; skippedRecords?: PipelineRecordEvent[]
  }) => {
    setProgress({
      source: saved.source,
      status: 'paused',
      totalRecords: saved.totalRecords,
      processedRecords: saved.processedRecords,
      succeededCount: saved.succeededCount,
      failedCount: saved.failedCount,
      skippedCount: saved.skippedCount,
      pauseReason: saved.pauseReason as PipelineProgressDto['pauseReason'],
      errorMessage: saved.errorMessage,
    })
    setSucceededRecords(saved.succeededRecords ?? [])
    setFailedRecords(saved.failedRecords ?? [])
    setSkippedRecords(saved.skippedRecords ?? [])
    pausedOffsetRef.current = saved.offset
  }, [])

  /** Reset all records and progress (for "start over" / "start fresh"). */
  const resetAll = useCallback(() => {
    setSucceededRecords([])
    setFailedRecords([])
    setSkippedRecords([])
    pausedOffsetRef.current = 0
    setProgress(makeInitialProgress(source))
  }, [source])

  /** Mark the pipeline as processing (for start/resume). */
  const markProcessing = useCallback(() => {
    setProgress(prev => ({ ...prev, status: 'processing', pauseReason: undefined, errorMessage: undefined }))
  }, [])

  /** Apply a retry result to records. */
  const applyRetryResult = useCallback((upstreamId: number, result: PipelineRecordEvent) => {
    if (result.outcome === 'vectorized') {
      setSucceededRecords(prev => [...prev, result])
      setFailedRecords(prev => prev.filter(r => r.upstreamId !== upstreamId))
      setProgress(prev => ({
        ...prev,
        succeededCount: prev.succeededCount + 1,
        failedCount: Math.max(0, prev.failedCount - 1),
      }))
    } else {
      setFailedRecords(prev => prev.map(r => r.upstreamId === upstreamId ? result : r))
    }
  }, [])

  // Derived status flags
  const isRunning = progress.status === 'processing'
  const isPaused = progress.status === 'paused'
  const isCompleted = progress.status === 'completed'
  const progressPercent = progress.totalRecords > 0
    ? Math.round((progress.processedRecords / progress.totalRecords) * 100)
    : 0

  return {
    // State
    progress,
    setProgress,
    succeededRecords,
    failedRecords,
    skippedRecords,
    retryingId,
    setRetryingId,
    dbFailedCount,
    pausedOffsetRef,

    // Handlers
    handleEvent,
    loadDbFailed,
    refreshDbFailed,
    restoreState,
    resetAll,
    markProcessing,
    applyRetryResult,

    // Derived
    isRunning,
    isPaused,
    isCompleted,
    progressPercent,
  }
}
