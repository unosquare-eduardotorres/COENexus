import { useState, useCallback, useEffect, useRef } from 'react'
import { pipelineService } from '../services/pipelineService'
import type { PipelineRecordEvent, PipelineProgressDto, PipelineProgressEvent } from '../services/pipelineService'
import { useNexusStatus } from '../../../contexts/NexusStatusContext'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('useUnifiedPipeline')

export type { PipelineRecordEvent, PipelineProgressDto }

const initialProgress = (source: string): PipelineProgressDto => ({
  source,
  status: 'completed',
  totalRecords: 0,
  processedRecords: 0,
  succeededCount: 0,
  failedCount: 0,
  skippedCount: 0,
})

interface UseUnifiedPipelineOptions {
  source: 'employees' | 'candidates'
  selectedYear?: number | null
}

export function useUnifiedPipeline({ source, selectedYear }: UseUnifiedPipelineOptions) {
  const { sharepoint } = useNexusStatus()
  const token = sharepoint.token

  const [progress, setProgress] = useState<PipelineProgressDto>(() => initialProgress(source))
  const [succeededRecords, setSucceededRecords] = useState<PipelineRecordEvent[]>([])
  const [failedRecords, setFailedRecords] = useState<PipelineRecordEvent[]>([])
  const [skippedRecords, setSkippedRecords] = useState<PipelineRecordEvent[]>([])
  const [retryingId, setRetryingId] = useState<number | undefined>()
  const [activeTab, setActiveTab] = useState<'succeeded' | 'failed' | 'skipped'>('succeeded')

  const pausedOffsetRef = useRef(0)
  const prevTokenRef = useRef(token)

  useEffect(() => {
    const unsub = pipelineService.onProgress((event: PipelineProgressEvent) => {
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
        if (event.progress.source === source) {
          setProgress(event.progress)
        }
      }
      if (event.type === 'complete' && event.progress) {
        if (event.progress.source === source) {
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
    })

    return unsub
  }, [source])

  useEffect(() => {
    pipelineService.getState(source).then(saved => {
      if (saved && saved.status === 'paused') {
        log.info('Restoring persisted pipeline state', { source, offset: saved.offset })
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
      }
    }).catch(err => log.error('Failed to load persisted state', err))
  }, [source])

  useEffect(() => {
    if (prevTokenRef.current !== token) {
      prevTokenRef.current = token
      if (
        progress.status === 'paused'
        && (progress.pauseReason === 'token-expiring' || progress.pauseReason === 'error')
        && pausedOffsetRef.current > 0
        && sharepoint.isValid
      ) {
        log.info('Token refreshed — auto-resuming pipeline', { source, skip: pausedOffsetRef.current })
        setProgress(prev => ({ ...prev, status: 'processing', pauseReason: undefined, errorMessage: undefined }))
        pipelineService.startPipeline(source, token, {
          skip: pausedOffsetRef.current,
          year: source === 'candidates' && selectedYear != null ? selectedYear : undefined,
        })
      }
    }
  }, [token, progress.status, progress.pauseReason, source, selectedYear, sharepoint.isValid])

  const handleStartSync = useCallback(async (mode?: 'full' | 'sync-only') => {
    log.info('Unified pipeline start', { source, mode: mode ?? 'full' })
    await pipelineService.clearState(source)
    setSucceededRecords([])
    setFailedRecords([])
    setSkippedRecords([])
    pausedOffsetRef.current = 0
    setProgress({ ...initialProgress(source), status: 'processing' })

    await pipelineService.startPipeline(source, token, {
      mode,
      year: source === 'candidates' && selectedYear != null ? selectedYear : undefined,
    })
  }, [source, token, selectedYear])

  const handlePause = useCallback(async () => {
    log.info('Unified pipeline pause', { source })
    await pipelineService.pause()
  }, [source])

  const handleResume = useCallback(async () => {
    log.info('Unified pipeline resume', { source, skip: pausedOffsetRef.current })
    setProgress(prev => ({ ...prev, status: 'processing', pauseReason: undefined, errorMessage: undefined }))

    await pipelineService.startPipeline(source, token, {
      skip: pausedOffsetRef.current,
      year: source === 'candidates' && selectedYear != null ? selectedYear : undefined,
    })
  }, [source, token, selectedYear])

  const handleRetryAllFailed = useCallback(async () => {
    log.info('Retry all failed', { source })
    setProgress(prev => ({ ...prev, status: 'processing' }))

    await pipelineService.retryAllFailed(source, token)
  }, [source, token])

  const handleRetrySingle = useCallback(async (upstreamId: number) => {
    log.info('Retry single', { source, upstreamId })
    setRetryingId(upstreamId)
    try {
      const result = await pipelineService.retrySingle(source, token, upstreamId)
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
    } finally {
      setRetryingId(undefined)
    }
  }, [source, token])

  const handleStartOver = useCallback(async () => {
    log.info('Start over', { source })
    await pipelineService.clearState(source)
    setSucceededRecords([])
    setFailedRecords([])
    setSkippedRecords([])
    pausedOffsetRef.current = 0
    setProgress(initialProgress(source))
  }, [source])

  const isRunning = progress.status === 'processing'
  const isPaused = progress.status === 'paused'
  const isCompleted = progress.status === 'completed'
  const progressPercent = progress.totalRecords > 0
    ? Math.round((progress.processedRecords / progress.totalRecords) * 100)
    : 0

  return {
    progress,
    succeededRecords,
    failedRecords,
    skippedRecords,
    retryingId,
    activeTab,
    setActiveTab,
    isRunning,
    isPaused,
    isCompleted,
    progressPercent,
    handleStartSync,
    handlePause,
    handleResume,
    handleStartOver,
    handleRetryAllFailed,
    handleRetrySingle,
  }
}
