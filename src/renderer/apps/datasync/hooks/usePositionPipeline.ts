import { useState, useCallback, useEffect, useRef } from 'react'
import { positionPipelineService } from '../services/positionPipelineService'
import type { PipelineRecordEvent, PipelineProgressDto, PipelineProgressEvent } from '../services/positionPipelineService'
import { useNexusStatus } from '../../../contexts/NexusStatusContext'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('usePositionPipeline')

export type { PipelineRecordEvent, PipelineProgressDto }

const initialProgress = (): PipelineProgressDto => ({
  source: 'open-positions',
  status: 'completed',
  totalRecords: 0,
  processedRecords: 0,
  succeededCount: 0,
  failedCount: 0,
  skippedCount: 0,
})

export function usePositionPipeline() {
  const { sharepoint } = useNexusStatus()
  const token = sharepoint.token

  const [progress, setProgress] = useState<PipelineProgressDto>(initialProgress)
  const [succeededRecords, setSucceededRecords] = useState<PipelineRecordEvent[]>([])
  const [failedRecords, setFailedRecords] = useState<PipelineRecordEvent[]>([])
  const [skippedRecords, setSkippedRecords] = useState<PipelineRecordEvent[]>([])
  const [retryingId, setRetryingId] = useState<number | undefined>()
  const [activeTab, setActiveTab] = useState<'succeeded' | 'failed' | 'skipped'>('succeeded')
  const [isVectorizingSynced, setIsVectorizingSynced] = useState(false)

  const [syncMode, setSyncMode] = useState<'active' | 'full'>('active')
  const pausedOffsetRef = useRef(0)
  const savedActiveOnlyRef = useRef<boolean>(true)
  const prevTokenRef = useRef(token)

  useEffect(() => {
    const unsub = positionPipelineService.onProgress((event: PipelineProgressEvent) => {
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
        if (event.progress.source === 'open-positions') {
          setProgress(event.progress)
        }
      }
      if (event.type === 'complete' && event.progress) {
        if (event.progress.source === 'open-positions') {
          setProgress(event.progress)
          setIsVectorizingSynced(false)
          if (event.progress.status === 'paused') {
            pausedOffsetRef.current = event.progress.processedRecords
          }
        }
      }
      if (event.type === 'error') {
        log.error('Position pipeline error', new Error(event.message))
        setIsVectorizingSynced(false)
        setProgress(prev => prev.status === 'processing' ? { ...prev, status: 'paused' } : prev)
      }
    })

    return unsub
  }, [])

  useEffect(() => {
    positionPipelineService.getState().then(saved => {
      if (saved && saved.status === 'paused') {
        log.info('Restoring persisted position pipeline state', { offset: saved.offset })
        setProgress({
          source: 'open-positions',
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
        const restoredActiveOnly = saved.activeOnly ?? true
        savedActiveOnlyRef.current = restoredActiveOnly
        setSyncMode(restoredActiveOnly ? 'active' : 'full')
      }
    }).catch(err => log.error('Failed to load persisted state', err))
  }, [])

  useEffect(() => {
    if (prevTokenRef.current !== token) {
      prevTokenRef.current = token
      if (
        progress.status === 'paused'
        && (progress.pauseReason === 'token-expiring' || progress.pauseReason === 'error')
        && pausedOffsetRef.current > 0
        && sharepoint.isValid
      ) {
        log.info('Token refreshed — auto-resuming position pipeline', { skip: pausedOffsetRef.current, activeOnly: savedActiveOnlyRef.current })
        setProgress(prev => ({ ...prev, status: 'processing', pauseReason: undefined, errorMessage: undefined }))
        positionPipelineService.startPipeline(savedActiveOnlyRef.current, token, { skip: pausedOffsetRef.current })
      }
    }
  }, [token, progress.status, progress.pauseReason, sharepoint.isValid])

  const resetState = useCallback(() => {
    setSucceededRecords([])
    setFailedRecords([])
    setSkippedRecords([])
    pausedOffsetRef.current = 0
  }, [])

  const handleSyncActive = useCallback(async () => {
    log.info('Position pipeline sync active')
    savedActiveOnlyRef.current = true
    setSyncMode('active')
    await positionPipelineService.clearState()
    resetState()
    setProgress({ ...initialProgress(), status: 'processing' })
    await positionPipelineService.startPipeline(true, token, { skip: 0 })
  }, [token, resetState])

  const handleSyncAll = useCallback(async () => {
    log.info('Position pipeline sync all')
    savedActiveOnlyRef.current = false
    setSyncMode('full')
    await positionPipelineService.clearState()
    resetState()
    setProgress({ ...initialProgress(), status: 'processing' })
    await positionPipelineService.startPipeline(false, token, { skip: 0 })
  }, [token, resetState])

  const handleVectorizeSynced = useCallback(async () => {
    log.info('Position pipeline vectorize synced')
    setIsVectorizingSynced(true)
    setSucceededRecords([])
    setFailedRecords([])
    setSkippedRecords([])
    setProgress({ ...initialProgress(), status: 'processing' })
    await positionPipelineService.vectorizeSynced(token)
  }, [token])

  const handlePause = useCallback(async () => {
    log.info('Position pipeline pause')
    await positionPipelineService.pause()
  }, [])

  const handleResume = useCallback(async () => {
    log.info('Position pipeline resume', { skip: pausedOffsetRef.current, activeOnly: savedActiveOnlyRef.current })
    setProgress(prev => ({ ...prev, status: 'processing', pauseReason: undefined, errorMessage: undefined }))
    await positionPipelineService.startPipeline(savedActiveOnlyRef.current, token, { skip: pausedOffsetRef.current })
  }, [token])

  const handleRetryAllFailed = useCallback(async () => {
    log.info('Position pipeline retry all failed')
    setProgress(prev => ({ ...prev, status: 'processing' }))
    await positionPipelineService.retryAllFailed(token)
  }, [token])

  const handleRetrySingle = useCallback(async (upstreamId: number) => {
    log.info('Position pipeline retry single', { upstreamId })
    setRetryingId(upstreamId)
    try {
      const result = await positionPipelineService.retrySingle(token, upstreamId)
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
  }, [token])

  const handleStartOver = useCallback(async () => {
    log.info('Position pipeline start over')
    savedActiveOnlyRef.current = true
    setSyncMode('active')
    await positionPipelineService.clearState()
    resetState()
    setProgress(initialProgress())
  }, [resetState])

  const isRunning = progress.status === 'processing'
  const isPaused = progress.status === 'paused'
  const isCompleted = progress.status === 'completed'
  const progressPercent = progress.totalRecords > 0
    ? Math.min(100, Math.round((progress.processedRecords / progress.totalRecords) * 100))
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
    isVectorizingSynced,
    syncMode,
    handleSyncActive,
    handleSyncAll,
    handleVectorizeSynced,
    handlePause,
    handleResume,
    handleStartOver,
    handleRetryAllFailed,
    handleRetrySingle,
  }
}
