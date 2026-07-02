import { useState, useCallback, useRef } from 'react'
import { resumeProcessingService } from '../services/processingService'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import type { ProcessingProgress, ProcessingRecord, SyncRecord, SyncSourceType } from '../types'

const log = createRendererLogger('ProcessingPipeline')

const PROCESSING_STATUS = { PROCESSING: 'processing', COMPLETED: 'completed' } as const

function initialProcessingProgress(source: SyncSourceType): ProcessingProgress {
  return { source, status: 'idle', totalRecords: 0, processedRecords: 0, successCount: 0, failedCount: 0, skippedCount: 0 }
}

interface UseProcessingPipelineReturn {
  extractionProgress: ProcessingProgress
  vectorizationProgress: ProcessingProgress
  extractingUpstreamId: number | undefined
  vectorizingUpstreamId: number | undefined
  isProcessingAll: boolean
  handleStartExtraction: () => Promise<void>
  handlePauseExtraction: () => void
  handleStartVectorization: () => Promise<void>
  handlePauseVectorization: () => void
  handleProcessAll: () => Promise<void>
}

export function useProcessingPipeline(
  source: SyncSourceType,
  token: string,
  setRecords: React.Dispatch<React.SetStateAction<SyncRecord[]>>,
  invalidateRecordQueries: () => void | Promise<void>,
): UseProcessingPipelineReturn {
  const [extractionProgress, setExtractionProgress] = useState<ProcessingProgress>(() => initialProcessingProgress(source))
  const [vectorizationProgress, setVectorizationProgress] = useState<ProcessingProgress>(() => initialProcessingProgress(source))
  const [extractingUpstreamId, setExtractingUpstreamId] = useState<number | undefined>()
  const [vectorizingUpstreamId, setVectorizingUpstreamId] = useState<number | undefined>()
  const [isProcessingAll, setIsProcessingAll] = useState(false)

  const extractionAbortRef = useRef<AbortController | null>(null)
  const vectorizationAbortRef = useRef<AbortController | null>(null)

  const handleRecordExtracted = useCallback((processed: ProcessingRecord) => {
    if (processed.status === PROCESSING_STATUS.COMPLETED) {
      setRecords(prev => prev.map(r => r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'extracted' as const, reason: undefined } : r))
      setExtractingUpstreamId(undefined)
    } else if (processed.status === 'failed') {
      setRecords(prev => prev.map(r => r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'extract_failed' as const, reason: processed.error } : r))
      setExtractingUpstreamId(undefined)
    } else {
      setExtractingUpstreamId(processed.upstreamId)
    }
  }, [setRecords])

  const handleRecordVectorized = useCallback((processed: ProcessingRecord) => {
    if (processed.status === PROCESSING_STATUS.COMPLETED) {
      setRecords(prev => prev.map(r => r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'vectorized' as const, reason: undefined } : r))
      setVectorizingUpstreamId(undefined)
    } else if (processed.status === 'failed') {
      setRecords(prev => prev.map(r => r.upstreamId === processed.upstreamId ? { ...r, pipelineStatus: 'vectorize_failed' as const, reason: processed.error } : r))
      setVectorizingUpstreamId(undefined)
    } else {
      setVectorizingUpstreamId(processed.upstreamId)
    }
  }, [setRecords])

  const handleStartExtraction = useCallback(async () => {
    log.info('Extraction started', { source })
    extractionAbortRef.current?.abort()
    const controller = new AbortController()
    extractionAbortRef.current = controller

    setExtractionProgress({ source, status: PROCESSING_STATUS.PROCESSING, totalRecords: 0, processedRecords: 0, successCount: 0, failedCount: 0, skippedCount: 0 })
    setVectorizationProgress(initialProcessingProgress(source))
    setRecords(prev => prev.map(r => r.pipelineStatus === 'extract_failed' ? { ...r, pipelineStatus: 'synced' as const, reason: undefined } : r))

    try {
      const finalProgress = await resumeProcessingService.startExtraction(source, token, (p: ProcessingProgress) => setExtractionProgress(p), handleRecordExtracted, controller.signal)
      setExtractionProgress(finalProgress)
      setExtractingUpstreamId(undefined)
      log.info('Extraction completed', { source, successCount: finalProgress.successCount, failedCount: finalProgress.failedCount, skippedCount: finalProgress.skippedCount })
      if (finalProgress.successCount > 0) await invalidateRecordQueries()
    } catch (err) {
      log.error('Extraction failed', err instanceof Error ? err : new Error(String(err)))
      setExtractionProgress(prev => ({ ...prev, status: 'error' }))
      setExtractingUpstreamId(undefined)
    }
  }, [source, token, handleRecordExtracted, invalidateRecordQueries, setRecords])

  const handlePauseExtraction = useCallback(() => {
    log.warn('Extraction pause requested', { source })
    extractionAbortRef.current?.abort()
  }, [source])

  const handleStartVectorization = useCallback(async () => {
    log.info('Vectorization started', { source })
    vectorizationAbortRef.current?.abort()
    const controller = new AbortController()
    vectorizationAbortRef.current = controller

    setVectorizationProgress({ source, status: PROCESSING_STATUS.PROCESSING, totalRecords: 0, processedRecords: 0, successCount: 0, failedCount: 0, skippedCount: 0 })
    setExtractionProgress(initialProcessingProgress(source))
    setRecords(prev => prev.map(r => r.pipelineStatus === 'vectorize_failed' ? { ...r, pipelineStatus: 'extracted' as const, reason: undefined } : r))

    try {
      const finalProgress = await resumeProcessingService.startVectorization(source, (p: ProcessingProgress) => setVectorizationProgress(p), handleRecordVectorized, controller.signal)
      setVectorizationProgress(finalProgress)
      setVectorizingUpstreamId(undefined)
      log.info('Vectorization completed', { source, successCount: finalProgress.successCount, failedCount: finalProgress.failedCount, skippedCount: finalProgress.skippedCount })
      if (finalProgress.successCount > 0) await invalidateRecordQueries()
    } catch (err) {
      log.error('Vectorization failed', err instanceof Error ? err : new Error(String(err)))
      setVectorizationProgress(prev => ({ ...prev, status: 'error' }))
      setVectorizingUpstreamId(undefined)
    }
  }, [source, handleRecordVectorized, invalidateRecordQueries, setRecords])

  const handlePauseVectorization = useCallback(() => {
    log.warn('Vectorization pause requested', { source })
    vectorizationAbortRef.current?.abort()
  }, [source])

  const handleProcessAll = useCallback(async () => {
    log.info('Process-all started', { source })
    extractionAbortRef.current?.abort()
    vectorizationAbortRef.current?.abort()
    const controller = new AbortController()
    extractionAbortRef.current = controller

    setIsProcessingAll(true)
    setExtractionProgress({ source, status: PROCESSING_STATUS.PROCESSING, totalRecords: 0, processedRecords: 0, successCount: 0, failedCount: 0, skippedCount: 0 })
    setVectorizationProgress(initialProcessingProgress(source))
    setRecords(prev => prev.map(r => {
      if (r.pipelineStatus === 'extract_failed') return { ...r, pipelineStatus: 'synced' as const, reason: undefined }
      if (r.pipelineStatus === 'vectorize_failed') return { ...r, pipelineStatus: 'extracted' as const, reason: undefined }
      return r
    }))

    const handleRecord = (processed: ProcessingRecord) => {
      const st = processed.status as string
      if (st === 'extracted') handleRecordExtracted(processed)
      else if (st === 'vectorized') handleRecordVectorized(processed)
      else if (st === 'failed') handleRecordExtracted(processed)
    }

    try {
      const finalProgress = await resumeProcessingService.processAll(source, token, (p: ProcessingProgress) => setExtractionProgress(p), handleRecord, controller.signal)
      setExtractionProgress(finalProgress)
      setExtractingUpstreamId(undefined)
      setVectorizingUpstreamId(undefined)
      setIsProcessingAll(false)
      log.info('Process-all completed', { source, successCount: finalProgress.successCount, failedCount: finalProgress.failedCount, skippedCount: finalProgress.skippedCount })
      if (finalProgress.successCount > 0) await invalidateRecordQueries()
    } catch (err) {
      log.error('Process-all failed', err instanceof Error ? err : new Error(String(err)))
      setExtractionProgress(prev => ({ ...prev, status: 'error' }))
      setExtractingUpstreamId(undefined)
      setVectorizingUpstreamId(undefined)
      setIsProcessingAll(false)
    }
  }, [source, token, handleRecordExtracted, handleRecordVectorized, invalidateRecordQueries, setRecords])

  return {
    extractionProgress,
    vectorizationProgress,
    extractingUpstreamId,
    vectorizingUpstreamId,
    isProcessingAll,
    handleStartExtraction,
    handlePauseExtraction,
    handleStartVectorization,
    handlePauseVectorization,
    handleProcessAll,
  }
}
