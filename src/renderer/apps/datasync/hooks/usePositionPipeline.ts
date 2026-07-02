import { useState, useCallback, useEffect, useRef } from 'react'
import { positionPipelineService } from '../services/positionPipelineService'
import type { PipelineProgressEvent } from '../services/positionPipelineService'
import { useNexusStatus } from '../../../contexts/NexusStatusContext'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import { usePipelineRecords, makeInitialProgress } from './usePipelineRecords'

export type { PipelineRecordEvent, PipelineProgressDto } from './usePipelineRecords'

const log = createRendererLogger('usePositionPipeline')

const SOURCE = 'open-positions'

export function usePositionPipeline() {
  const { apiTokens } = useNexusStatus()
  const token = apiTokens.unocore.token

  const records = usePipelineRecords({ source: SOURCE })
  const [activeTab, setActiveTab] = useState<'succeeded' | 'failed' | 'skipped'>('succeeded')
  const [isVectorizingSynced, setIsVectorizingSynced] = useState(false)

  const [syncMode, setSyncMode] = useState<'active' | 'full'>('active')
  const [syncYear, setSyncYear] = useState<number | null>(null)
  const savedActiveOnlyRef = useRef<boolean>(true)
  const savedYearRef = useRef<number | null>(null)
  const prevTokenRef = useRef(token)

  // Load DB failed records on mount
  useEffect(() => {
    positionPipelineService.getFailedRecords()
      .then(dbFailed => records.loadDbFailed(dbFailed))
      .catch(err => log.error('Failed to load DB failed records', err))
  }, [])

  // Subscribe to pipeline events
  useEffect(() => {
    const unsub = positionPipelineService.onProgress((event: PipelineProgressEvent) => {
      records.handleEvent(event, SOURCE)

      // Position-specific: clear vectorizing flag on complete/error
      if (event.type === 'complete' && event.progress?.source === SOURCE) {
        setIsVectorizingSynced(false)
        if (event.progress.status === 'completed') {
          positionPipelineService.getFailedRecords()
            .then(dbFailed => records.refreshDbFailed(dbFailed))
            .catch(err => log.error('Failed to refresh DB failed records', err))
        }
      }
      if (event.type === 'error') {
        setIsVectorizingSynced(false)
      }
    })
    return unsub
  }, [])

  // Restore persisted state
  useEffect(() => {
    positionPipelineService.getState().then(saved => {
      if (saved && saved.status === 'paused') {
        log.info('Restoring persisted position pipeline state', { offset: saved.offset })
        records.restoreState(saved)
        const restoredActiveOnly = saved.activeOnly ?? true
        savedActiveOnlyRef.current = restoredActiveOnly
        setSyncMode(restoredActiveOnly ? 'active' : 'full')
        savedYearRef.current = saved.year ?? null
        setSyncYear(saved.year ?? null)
      }
    }).catch(err => log.error('Failed to load persisted state', err))
  }, [])

  // Auto-resume on token refresh
  useEffect(() => {
    if (prevTokenRef.current !== token) {
      prevTokenRef.current = token
      if (
        records.isPaused
        && (records.progress.pauseReason === 'token-expiring' || records.progress.pauseReason === 'error')
        && records.pausedOffsetRef.current > 0
        && apiTokens.unocore.isValid
      ) {
        log.info('Token refreshed — auto-resuming position pipeline', { skip: records.pausedOffsetRef.current, activeOnly: savedActiveOnlyRef.current })
        records.markProcessing()
        positionPipelineService.startPipeline(savedActiveOnlyRef.current, token, { skip: records.pausedOffsetRef.current, year: savedYearRef.current ?? undefined })
      }
    }
  }, [token, records.progress.status, records.progress.pauseReason, apiTokens.unocore.isValid])

  const handleSyncActive = useCallback(async () => {
    log.info('Position pipeline sync active')
    savedActiveOnlyRef.current = true
    savedYearRef.current = null
    setSyncMode('active')
    await positionPipelineService.clearState()
    records.resetAll()
    records.setProgress({ ...makeInitialProgress(SOURCE), status: 'processing' })
    await positionPipelineService.startPipeline(true, token, { skip: 0 })
  }, [token])

  const handleSyncAll = useCallback(async () => {
    log.info('Position pipeline sync all')
    savedActiveOnlyRef.current = false
    savedYearRef.current = syncYear
    setSyncMode('full')
    await positionPipelineService.clearState()
    records.resetAll()
    records.setProgress({ ...makeInitialProgress(SOURCE), status: 'processing' })
    await positionPipelineService.startPipeline(false, token, { skip: 0, year: syncYear ?? undefined })
  }, [token, syncYear])

  const handleVectorizeSynced = useCallback(async () => {
    log.info('Position pipeline vectorize synced')
    setIsVectorizingSynced(true)
    records.resetAll()
    records.setProgress({ ...makeInitialProgress(SOURCE), status: 'processing' })
    await positionPipelineService.vectorizeSynced(token)
  }, [token])

  const handlePause = useCallback(async () => {
    log.info('Position pipeline pause')
    await positionPipelineService.pause()
  }, [])

  const handleResume = useCallback(async () => {
    log.info('Position pipeline resume', { skip: records.pausedOffsetRef.current, activeOnly: savedActiveOnlyRef.current })
    records.markProcessing()
    await positionPipelineService.startPipeline(savedActiveOnlyRef.current, token, { skip: records.pausedOffsetRef.current, year: savedYearRef.current ?? undefined })
  }, [token])

  const handleRetryAllFailed = useCallback(async () => {
    log.info('Position pipeline retry all failed')
    records.setProgress(prev => ({ ...prev, status: 'processing' }))
    await positionPipelineService.retryAllFailed(token)
  }, [token])

  const handleRetrySingle = useCallback(async (upstreamId: number) => {
    log.info('Position pipeline retry single', { upstreamId })
    records.setRetryingId(upstreamId)
    try {
      const result = await positionPipelineService.retrySingle(token, upstreamId)
      records.applyRetryResult(upstreamId, result)
    } finally {
      records.setRetryingId(undefined)
    }
  }, [token])

  const handleStartOver = useCallback(async () => {
    log.info('Position pipeline start over')
    savedActiveOnlyRef.current = true
    savedYearRef.current = null
    setSyncMode('active')
    setSyncYear(null)
    await positionPipelineService.clearState()
    records.resetAll()
  }, [])

  return {
    progress: records.progress,
    succeededRecords: records.succeededRecords,
    failedRecords: records.failedRecords,
    skippedRecords: records.skippedRecords,
    retryingId: records.retryingId,
    activeTab,
    setActiveTab,
    isRunning: records.isRunning,
    isPaused: records.isPaused,
    isCompleted: records.isCompleted,
    progressPercent: records.progressPercent,
    isVectorizingSynced,
    syncMode,
    syncYear,
    setSyncYear,
    handleSyncActive,
    handleSyncAll,
    handleVectorizeSynced,
    handlePause,
    handleResume,
    handleStartOver,
    handleRetryAllFailed,
    handleRetrySingle,
    dbFailedCount: records.dbFailedCount,
  }
}
