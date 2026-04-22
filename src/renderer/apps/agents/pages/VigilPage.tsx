import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, NavLink, useOutletContext } from 'react-router-dom'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import AgentBanner from '../components/AgentBanner'
import type {
  VigilActivityLog,
  VigilActivitySeverity,
  VigilConfig,
  VigilRun,
  VigilRunStatus,
  VigilSource,
} from '../../../../shared/ipc-types'
import { vigilService } from '../services/vigilService'

const log = createRendererLogger('VigilPage')

const TABS = [
  { path: '', label: 'Mission Control', end: true },
  { path: 'schedule', label: 'Schedule', end: false },
  { path: 'runs', label: 'Runs', end: false },
]

export interface VigilOutletContext {
  status: VigilRunStatus | 'idle'
  activeRun: VigilRun | null
  config: VigilConfig | null
  runs: VigilRun[]
  activity: VigilActivityLog[]
  loading: boolean
  error: string | null
  isSyncing: boolean
  actionLoading: boolean
  setError: (error: string | null) => void
  setConfig: (config: VigilConfig | null) => void
  handleWakeNow: (token: string) => Promise<void>
  handlePause: () => Promise<void>
  handleLoadMoreActivity: () => Promise<void>
  timelineHasMore: boolean
  timelineLoading: boolean
  refreshData: () => Promise<void>
}

export function useVigilContext() {
  return useOutletContext<VigilOutletContext>()
}

export default function VigilPage() {
  const [status, setStatus] = useState<VigilRunStatus | 'idle'>('idle')
  const [activeRun, setActiveRun] = useState<VigilRun | null>(null)
  const [config, setConfig] = useState<VigilConfig | null>(null)
  const [runs, setRuns] = useState<VigilRun[]>([])
  const [activity, setActivity] = useState<VigilActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineHasMore, setTimelineHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isSyncing = status === 'running' || status === 'queued'

  const loadInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    log.info('Vigil page data load requested')

    try {
      const [statusRes, configRes, runsRes, activityRes] = await Promise.all([
        vigilService.getStatus(),
        vigilService.getConfig(),
        vigilService.listRuns({ limit: 30, offset: 0 }),
        vigilService.getActivityLog({ limit: 50, offset: 0 }),
      ])

      if (!statusRes.success || !configRes.success || !runsRes.success || !activityRes.success) {
        throw new Error(statusRes.error ?? configRes.error ?? runsRes.error ?? activityRes.error ?? 'Failed to load Vigil data')
      }

      setActiveRun(statusRes.data?.active_run ?? null)
      setStatus(statusRes.data?.active_run?.status ?? 'idle')
      setConfig(configRes.data ?? null)
      setRuns(runsRes.data ?? [])
      setActivity((activityRes.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)))
      setTimelineHasMore((activityRes.data ?? []).length >= 50)
    } catch (err) {
      log.error('Vigil page data load failed', err)
      setError(err instanceof Error ? err.message : 'Unable to load Vigil workspace')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    log.info('Vigil page viewed')
    void loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    const unsubscribeActivity = vigilService.onActivityEvent(event => {
      const synthetic: VigilActivityLog = {
        id: `${event.timestamp}-${event.source}-${event.event_type}`,
        run_id: event.run_id,
        event_type: event.event_type,
        source: event.source,
        severity: event.severity as VigilActivitySeverity,
        message: event.message,
        details_json: event.details_json ?? null,
        created_at: event.timestamp,
      }
      setActivity(prev => [synthetic, ...prev])
    })

    const unsubscribeStatus = vigilService.onStatusEvent(async event => {
      setStatus(event.status)
      if (event.status === 'idle') {
        setActiveRun(null)
        return
      }
      if (event.run_id) {
        const runRes = await vigilService.getRun(event.run_id)
        if (runRes.success && runRes.data) {
          setActiveRun(runRes.data)
          setRuns(prev => {
            const withoutRun = prev.filter(run => run.id !== runRes.data?.id)
            return [runRes.data as VigilRun, ...withoutRun]
          })
        }
      }
    })

    return () => {
      unsubscribeActivity()
      unsubscribeStatus()
    }
  }, [])

  const handleWakeNow = useCallback(async (token: string) => {
    if (!token.trim()) {
      setError('Token is required to wake Vigil now')
      return
    }
    setActionLoading(true)
    setError(null)
    try {
      const response = await vigilService.run({ token: token.trim() })
      if (!response.success) throw new Error(response.error ?? 'Unable to start Vigil run')
      if (response.data) {
        setActiveRun(response.data)
        setStatus(response.data.status)
        setRuns(prev => [response.data as VigilRun, ...prev.filter(run => run.id !== response.data?.id)])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wake up action failed')
    } finally {
      setActionLoading(false)
    }
  }, [])

  const handlePause = useCallback(async () => {
    if (!activeRun?.id) return
    setActionLoading(true)
    setError(null)
    try {
      const response = await vigilService.cancelRun({ run_id: activeRun.id })
      if (!response.success) throw new Error(response.error ?? 'Unable to pause current run')
      setStatus('idle')
      setActiveRun(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pause action failed')
    } finally {
      setActionLoading(false)
    }
  }, [activeRun])

  const handleLoadMoreActivity = useCallback(async () => {
    if (timelineLoading || !timelineHasMore) return
    setTimelineLoading(true)
    try {
      const response = await vigilService.getActivityLog({ limit: 50, offset: activity.length })
      if (!response.success) throw new Error(response.error ?? 'Failed to load more activity')
      const nextBatch = (response.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
      setActivity(prev => [...prev, ...nextBatch])
      setTimelineHasMore(nextBatch.length >= 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load more activity')
    } finally {
      setTimelineLoading(false)
    }
  }, [activity.length, timelineHasMore, timelineLoading])

  const contextValue: VigilOutletContext = useMemo(() => ({
    status,
    activeRun,
    config,
    runs,
    activity,
    loading,
    error,
    isSyncing,
    actionLoading,
    setError,
    setConfig,
    handleWakeNow,
    handlePause,
    handleLoadMoreActivity,
    timelineHasMore,
    timelineLoading,
    refreshData: loadInitialData,
  }), [
    status, activeRun, config, runs, activity, loading, error,
    isSyncing, actionLoading, handleWakeNow, handlePause,
    handleLoadMoreActivity, timelineHasMore, timelineLoading, loadInitialData,
  ])

  return (
    <div className="space-y-4">
      <AgentBanner agentId="vigil" agentName="Vigil" compact />

      <nav className="flex gap-1 border-b minimal-divider pb-px">
        {TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                isActive
                  ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-500 bg-violet-50/50 dark:bg-violet-500/10'
                  : 'text-muted hover:text-primary hover:bg-gray-50 dark:hover:bg-dark-hover/50'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={contextValue} />
    </div>
  )
}
