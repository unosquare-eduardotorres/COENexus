import { useState, useCallback, useEffect, useRef } from 'react'
import { pipelineService } from '../services/pipelineService'
import type { PipelineProgressEvent } from '../services/pipelineService'
import { dataSyncService } from '../services/dataSyncService'
import type { SyncRecord } from '../types'
import { useNexusStatus } from '../../../contexts/NexusStatusContext'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import { usePipelineRecords, makeInitialProgress } from './usePipelineRecords'

export type { PipelineRecordEvent, PipelineProgressDto } from './usePipelineRecords'

const log = createRendererLogger('useUnifiedPipeline')

interface UseUnifiedPipelineOptions {
  source: 'employees' | 'candidates'
  selectedYear?: number | null
}

export function useUnifiedPipeline({ source, selectedYear }: UseUnifiedPipelineOptions) {
  const { apiTokens } = useNexusStatus()
  const token = apiTokens.unocore.token

  const records = usePipelineRecords({ source })
  const [activeTab, setActiveTab] = useState<'all-records' | 'succeeded' | 'failed' | 'skipped'>('all-records')

  const [allRecords, setAllRecords] = useState<SyncRecord[]>([])
  const [isLoadingAllRecords, setIsLoadingAllRecords] = useState(false)

  const prevTokenRef = useRef(token)

  const fetchAllRecords = useCallback(async () => {
    setIsLoadingAllRecords(true)
    try {
      const recs = await dataSyncService.fetchRecords(source)
      setAllRecords(recs)
    } catch (err) {
      log.error('Failed to load all records', err)
    } finally {
      setIsLoadingAllRecords(false)
    }
  }, [source])

  useEffect(() => {
    fetchAllRecords()
  }, [fetchAllRecords])

  // Load DB failed records on mount
  useEffect(() => {
    pipelineService.getFailedRecords(source)
      .then(dbFailed => records.loadDbFailed(dbFailed))
      .catch(err => log.error('Failed to load DB failed records', err))
  }, [source])

  // Subscribe to pipeline events
  useEffect(() => {
    const unsub = pipelineService.onProgress((event: PipelineProgressEvent) => {
      records.handleEvent(event, source)

      // On completion, refresh the records list and DB failed
      if (event.type === 'complete' && event.progress?.source === source && event.progress.status === 'completed') {
        fetchAllRecords()
        pipelineService.getFailedRecords(source)
          .then(dbFailed => records.refreshDbFailed(dbFailed))
          .catch(err => log.error('Failed to refresh DB failed records', err))
      }
    })
    return unsub
  }, [source])

  // Restore persisted state
  useEffect(() => {
    pipelineService.getState(source).then(saved => {
      if (saved && saved.status === 'paused') {
        log.info('Restoring persisted pipeline state', { source, offset: saved.offset })
        records.restoreState(saved)
      }
    }).catch(err => log.error('Failed to load persisted state', err))
  }, [source])

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
        log.info('Token refreshed — auto-resuming pipeline', { source, skip: records.pausedOffsetRef.current })
        records.markProcessing()
        pipelineService.startPipeline(source, token, {
          skip: records.pausedOffsetRef.current,
          year: source === 'candidates' && selectedYear != null ? selectedYear : undefined,
        })
      }
    }
  }, [token, records.progress.status, records.progress.pauseReason, source, selectedYear, apiTokens.unocore.isValid])

  const handleStartSync = useCallback(async (mode?: 'full' | 'sync-only') => {
    log.info('Unified pipeline start', { source, mode: mode ?? 'full' })
    await pipelineService.clearState(source)
    records.resetAll()
    records.setProgress({ ...makeInitialProgress(source), status: 'processing' })

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
    log.info('Unified pipeline resume', { source, skip: records.pausedOffsetRef.current })
    records.markProcessing()

    await pipelineService.startPipeline(source, token, {
      skip: records.pausedOffsetRef.current,
      year: source === 'candidates' && selectedYear != null ? selectedYear : undefined,
    })
  }, [source, token, selectedYear])

  const handleRetryAllFailed = useCallback(async () => {
    log.info('Retry all failed', { source })
    records.setProgress(prev => ({ ...prev, status: 'processing' }))
    await pipelineService.retryAllFailed(source, token)
  }, [source, token])

  const handleRetrySingle = useCallback(async (upstreamId: number) => {
    log.info('Retry single', { source, upstreamId })
    records.setRetryingId(upstreamId)
    try {
      const result = await pipelineService.retrySingle(source, token, upstreamId)
      records.applyRetryResult(upstreamId, result)
    } finally {
      records.setRetryingId(undefined)
    }
  }, [source, token])

  const handleStartOver = useCallback(async () => {
    log.info('Start over', { source })
    await pipelineService.clearState(source)
    records.resetAll()
  }, [source])

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
    handleStartSync,
    handlePause,
    handleResume,
    handleStartOver,
    handleRetryAllFailed,
    handleRetrySingle,
    allRecords,
    isLoadingAllRecords,
    refreshAllRecords: fetchAllRecords,
    dbFailedCount: records.dbFailedCount,
  }
}
