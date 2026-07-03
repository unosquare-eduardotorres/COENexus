import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react'

type SyncSource = 'open-positions' | 'employees' | 'candidates'

type SyncStatus = 'processing' | 'paused' | 'completed'

interface SyncProgress {
  source: SyncSource
  status: SyncStatus
  totalRecords: number
  processedRecords: number
  succeededCount: number
  failedCount: number
  skippedCount: number
  pauseReason?: 'user' | 'token-expiring' | 'error'
  errorMessage?: string
  completedAt?: number
}

interface SyncActivityContextValue {
  activeSyncs: SyncProgress[]
  dismissSync: (source: SyncSource) => void
}

const SyncActivityContext = createContext<SyncActivityContextValue | null>(null)

export function useSyncActivity(): SyncActivityContextValue {
  const ctx = useContext(SyncActivityContext)
  if (!ctx) throw new Error('useSyncActivity must be used within SyncActivityProvider')
  return ctx
}

const SOURCE_LABELS: Record<SyncSource, string> = {
  'open-positions': 'OP',
  employees: 'EMP',
  candidates: 'CAN',
}

export { SOURCE_LABELS }
export type { SyncSource, SyncProgress }

export function SyncActivityProvider({ children }: { children: ReactNode }) {
  const [syncs, setSyncs] = useState<Map<SyncSource, SyncProgress>>(new Map())
  const unsubsRef = useRef<Array<() => void>>([])

  const updateSync = useCallback(
    (source: SyncSource, updater: (prev: SyncProgress | undefined) => SyncProgress | null) => {
      setSyncs(prev => {
        const next = new Map(prev)
        const result = updater(prev.get(source))
        if (result) {
          next.set(source, result)
        } else {
          next.delete(source)
        }
        return next
      })
    },
    [],
  )

  const handlePipelineEvent = useCallback(
    (sourceHint: SyncSource | null) =>
      (event: { type: string; progress?: { source: string; status: string; totalRecords: number; processedRecords: number; succeededCount: number; failedCount: number; skippedCount: number; pauseReason?: string; errorMessage?: string }; message?: string }) => {
        if (event.type === 'progress' && event.progress) {
          const src = (event.progress.source || sourceHint) as SyncSource
          if (!src) return
          updateSync(src, () => ({
            source: src,
            status: event.progress!.status as SyncStatus,
            totalRecords: event.progress!.totalRecords,
            processedRecords: event.progress!.processedRecords,
            succeededCount: event.progress!.succeededCount,
            failedCount: event.progress!.failedCount,
            skippedCount: event.progress!.skippedCount,
            pauseReason: event.progress!.pauseReason as SyncProgress['pauseReason'],
            errorMessage: event.progress!.errorMessage,
          }))
        }

        if (event.type === 'complete' && event.progress) {
          const src = (event.progress.source || sourceHint) as SyncSource
          if (!src) return
          updateSync(src, () => ({
            source: src,
            status: event.progress!.status as SyncStatus,
            totalRecords: event.progress!.totalRecords,
            processedRecords: event.progress!.processedRecords,
            succeededCount: event.progress!.succeededCount,
            failedCount: event.progress!.failedCount,
            skippedCount: event.progress!.skippedCount,
            pauseReason: event.progress!.pauseReason as SyncProgress['pauseReason'],
            errorMessage: event.progress!.errorMessage,
            completedAt: Date.now(),
          }))
        }

        if (event.type === 'error') {
          if (sourceHint) {
            updateSync(sourceHint, prev => {
              if (!prev) return null
              return { ...prev, status: 'paused', pauseReason: 'error', errorMessage: event.message }
            })
          }
        }
      },
    [updateSync],
  )

  useEffect(() => {
    if (window.api?.positionPipeline?.getState) {
      window.api.positionPipeline.getState().then((saved: { status: string; totalRecords: number; processedRecords: number; succeededCount: number; failedCount: number; skippedCount: number; pauseReason?: string; errorMessage?: string } | null) => {
        if (saved && saved.status === 'paused') {
          updateSync('open-positions', () => ({
            source: 'open-positions',
            status: 'paused',
            totalRecords: saved.totalRecords,
            processedRecords: saved.processedRecords,
            succeededCount: saved.succeededCount,
            failedCount: saved.failedCount,
            skippedCount: saved.skippedCount,
            pauseReason: saved.pauseReason as SyncProgress['pauseReason'],
            errorMessage: saved.errorMessage,
          }))
        }
      }).catch(() => {})
    }
  }, [updateSync])

  useEffect(() => {
    const unsubs: Array<() => void> = []

    if (window.api?.positionPipeline?.onProgress) {
      unsubs.push(window.api.positionPipeline.onProgress(handlePipelineEvent('open-positions')))
    }

    if (window.api?.pipeline?.onProgress) {
      unsubs.push(window.api.pipeline.onProgress(handlePipelineEvent(null)))
    }

    unsubsRef.current = unsubs
    return () => {
      unsubs.forEach(fn => fn())
    }
  }, [handlePipelineEvent])

  const dismissSync = useCallback((source: SyncSource) => {
    setSyncs(prev => {
      const next = new Map(prev)
      next.delete(source)
      return next
    })
  }, [])

  const activeSyncs = useMemo(
    () => Array.from(syncs.values()),
    [syncs],
  )

  const value = useMemo<SyncActivityContextValue>(
    () => ({ activeSyncs, dismissSync }),
    [activeSyncs, dismissSync],
  )

  return (
    <SyncActivityContext.Provider value={value}>
      {children}
    </SyncActivityContext.Provider>
  )
}
