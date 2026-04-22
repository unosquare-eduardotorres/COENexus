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

  const [savedOffset, setSavedOffset] = useState<number | null>(null)
  const pausedOffsetRef = useRef(0)

  useEffect(() => {
    positionPipelineService.getSavedOffset().then(offset => setSavedOffset(offset))
  }, [])

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
            positionPipelineService.getSavedOffset().then(offset => setSavedOffset(offset))
          } else {
            setSavedOffset(null)
          }
        }
      }
      if (event.type === 'error') {
        log.error('Position pipeline error', new Error(event.message))
        setIsVectorizingSynced(false)
      }
    })

    return unsub
  }, [])

  const resetState = useCallback(() => {
    setSucceededRecords([])
    setFailedRecords([])
    setSkippedRecords([])
    pausedOffsetRef.current = 0
  }, [])

  const handleSyncActive = useCallback(async () => {
    log.info('Position pipeline sync active')
    resetState()
    setProgress({ ...initialProgress(), status: 'processing' })
    await positionPipelineService.startPipeline(true, token)
  }, [token, resetState])

  const handleSyncAll = useCallback(async () => {
    log.info('Position pipeline sync all')
    resetState()
    setSavedOffset(null)
    await positionPipelineService.clearSavedOffset()
    setProgress({ ...initialProgress(), status: 'processing' })
    await positionPipelineService.startPipeline(false, token)
  }, [token, resetState])

  const handleResumeSyncAll = useCallback(async () => {
    log.info('Position pipeline resume sync all from saved offset', { savedOffset })
    setProgress(prev => ({ ...prev, status: 'processing' }))
    await positionPipelineService.startPipeline(false, token, { skip: savedOffset ?? 0 })
  }, [token, savedOffset])

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
    log.info('Position pipeline resume', { skip: pausedOffsetRef.current })
    setProgress(prev => ({ ...prev, status: 'processing' }))
    await positionPipelineService.startPipeline(true, token, { skip: pausedOffsetRef.current })
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
    isVectorizingSynced,
    savedOffset,
    handleSyncActive,
    handleSyncAll,
    handleResumeSyncAll,
    handleVectorizeSynced,
    handlePause,
    handleResume,
    handleRetryAllFailed,
    handleRetrySingle,
  }
}
