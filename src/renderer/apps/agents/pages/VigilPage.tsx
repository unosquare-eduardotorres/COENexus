import { useCallback, useEffect, useMemo, useState } from 'react'
import { reportError } from '../../../shared/utils/reportError'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import AgentBanner from '../components/AgentBanner'
import AgentStepStream from '../components/AgentStepStream'
import type {
  VigilActivityLog,
  VigilActivitySeverity,
  VigilChatMessage,
  VigilConfig,
  VigilRun,
  VigilRunStatus,
  VigilSource,
} from '../../../../shared/ipc-types'
import { vigilService } from '../services/vigilService'
import StatusBanner from '../components/vigil/StatusBanner'
import HeartbeatStrip, { type HeartbeatDay } from '../components/vigil/HeartbeatStrip'
import CurrentRunCard, { type SourceProgressRow } from '../components/vigil/CurrentRunCard'
import QuickActionsBar from '../components/vigil/QuickActionsBar'
import ActivityTimeline from '../components/vigil/ActivityTimeline'
import ChatPanel from '../components/vigil/ChatPanel'

const SOURCE_ORDER: VigilSource[] = ['employees', 'candidates', 'open-positions', 'project-reallocations']
const log = createRendererLogger('VigilPage')

function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

function sourceLabel(source: VigilSource): string {
  if (source === 'employees') return 'Employees'
  if (source === 'candidates') return 'Candidates'
  if (source === 'open-positions') return 'Open Positions'
  return 'PRR'
}

function buildHeartbeatDays(runs: VigilRun[]): HeartbeatDay[] {
  const today = new Date()
  const byDay = new Map<string, VigilRun[]>()

  for (const run of runs) {
    const key = getDayKey(new Date(run.started_at))
    const list = byDay.get(key) ?? []
    list.push(run)
    byDay.set(key, list)
  }

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const key = getDayKey(date)
    const dayRuns = byDay.get(key) ?? []

    if (dayRuns.length === 0) {
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        state: 'missed',
        details: ['No runs'],
      }
    }

    const statuses = dayRuns.map(run => run.status)
    const allCompleted = statuses.every(status => status === 'completed')
    const allFailed = statuses.every(status => status === 'failed')

    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      state: allCompleted ? 'success' : allFailed ? 'failed' : 'partial',
      details: dayRuns.map(run => `${run.trigger_type} • ${run.status}`),
    }
  })
}

function buildSourceProgress(activeRun: VigilRun | null, activity: VigilActivityLog[], isSyncing: boolean): SourceProgressRow[] {
  const runId = activeRun?.id
  const relevant = runId ? activity.filter(entry => entry.run_id === runId) : []
  const startTs = activeRun ? new Date(activeRun.started_at).getTime() : Date.now()

  return SOURCE_ORDER.map((source, index) => {
    const sourceEvents = relevant.filter(entry => entry.source === source)
    const latestEvent = sourceEvents[0]
    const details = parseJsonObject(latestEvent?.details_json)
    const countFromDetails = typeof details?.count === 'number' ? details.count : 0
    const progressFromDetails = typeof details?.progress === 'number' ? details.progress : null
    const elapsedSecs = Math.max(0, Math.floor((Date.now() - startTs) / 1000))

    let status: 'running' | 'completed' | 'failed' | 'idle' = 'idle'
    if (sourceEvents.some(entry => entry.severity === 'error')) status = 'failed'
    else if (sourceEvents.some(entry => entry.event_type === 'run_completed')) status = 'completed'
    else if (isSyncing) status = 'running'

    const fallbackProgress = isSyncing
      ? Math.min(95, Math.max(8, Math.floor((sourceEvents.length * 20) + index * 12)))
      : status === 'completed'
        ? 100
        : status === 'failed'
          ? 100
          : 0

    return {
      source,
      label: sourceLabel(source),
      progress: progressFromDetails ?? fallbackProgress,
      count: countFromDetails,
      duration: `${Math.max(1, Math.floor(elapsedSecs / (index + 1)))}s`,
      status,
    }
  })
}

export default function VigilPage() {
  const [status, setStatus] = useState<VigilRunStatus | 'idle'>('idle')
  const [activeRun, setActiveRun] = useState<VigilRun | null>(null)
  const [config, setConfig] = useState<VigilConfig | null>(null)
  const [runs, setRuns] = useState<VigilRun[]>([])
  const [activity, setActivity] = useState<VigilActivityLog[]>([])
  const [messages, setMessages] = useState<VigilChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
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
      const [statusRes, configRes, runsRes, activityRes, messagesRes] = await Promise.all([
        vigilService.getStatus(),
        vigilService.getConfig(),
        vigilService.listRuns({ limit: 30, offset: 0 }),
        vigilService.getActivityLog({ limit: 50, offset: 0 }),
        vigilService.listMessages({ limit: 50, offset: 0 }),
      ])

      if (!statusRes.success || !configRes.success || !runsRes.success || !activityRes.success || !messagesRes.success) {
        throw new Error(statusRes.error ?? configRes.error ?? runsRes.error ?? activityRes.error ?? messagesRes.error ?? 'Failed to load Vigil data')
      }

      setActiveRun(statusRes.data?.active_run ?? null)
      setStatus(statusRes.data?.active_run?.status ?? 'idle')
      setConfig(configRes.data ?? null)
      setRuns(runsRes.data ?? [])
      setActivity((activityRes.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)))
      setMessages((messagesRes.data ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at)))
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
      log.warn('Vigil wake requested without token')
      setError('Token is required to wake Vigil now')
      return
    }

    setActionLoading(true)
    setError(null)

    try {
      const response = await vigilService.run({ token: token.trim() })
      if (!response.success) {
        throw new Error(response.error ?? 'Unable to start Vigil run')
      }
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
      if (!response.success) {
        throw new Error(response.error ?? 'Unable to pause current run')
      }
      setStatus('idle')
      setActiveRun(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pause action failed')
    } finally {
      setActionLoading(false)
    }
  }, [activeRun])

  const handleScheduleUpdate = useCallback(async (hour: number, minute: number) => {
    if (!config) return

    setError(null)
    const response = await vigilService.updateConfig({
      schedule_enabled: 1,
      schedule_hour: hour,
      schedule_minute: minute,
    })

    if (!response.success) {
      setError(response.error ?? 'Unable to update schedule')
      return
    }

    setConfig(response.data ?? config)
  }, [config])

  const handleLoadMoreActivity = useCallback(async () => {
    if (timelineLoading || !timelineHasMore) return

    setTimelineLoading(true)

    try {
      const response = await vigilService.getActivityLog({ limit: 50, offset: activity.length })
      if (!response.success) {
        throw new Error(response.error ?? 'Failed to load more activity')
      }

      const nextBatch = (response.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
      setActivity(prev => [...prev, ...nextBatch])
      setTimelineHasMore(nextBatch.length >= 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load more activity')
    } finally {
      setTimelineLoading(false)
    }
  }, [activity.length, timelineHasMore, timelineLoading])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    setChatLoading(true)
    setError(null)

    const now = new Date().toISOString()
    const optimisticUserMessage: VigilChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      metadata_json: null,
      created_at: now,
    }
    setMessages(prev => [...prev, optimisticUserMessage])

    try {
      const response = await vigilService.sendMessage({ content: content.trim() })
      if (!response.success) {
        throw new Error(response.error ?? 'Message failed')
      }

      const listResponse = await vigilService.listMessages({ limit: 100, offset: 0 })
      if (listResponse.success && listResponse.data && listResponse.data.length > 0) {
        setMessages(listResponse.data.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)))
      } else if (response.data) {
        setMessages(prev => {
          const withoutOptimistic = prev.filter(m => m.id !== optimisticUserMessage.id)
          return [...withoutOptimistic, response.data as VigilChatMessage]
        })
      }
    } catch (err) {
      const errorMsg = reportError(err)
      setError(errorMsg)

      const errorBubble: VigilChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Failed to get a response: ${errorMsg}`,
        metadata_json: JSON.stringify({ error: true }),
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorBubble])
    } finally {
      setChatLoading(false)
    }
  }, [])

  const handleClearChat = useCallback(async () => {
    setChatLoading(true)

    try {
      const response = await vigilService.clearMessages()
      if (!response.success) {
        throw new Error(response.error ?? 'Unable to clear chat history')
      }
      setMessages([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to clear chat history')
    } finally {
      setChatLoading(false)
    }
  }, [])

  const heartbeatDays = useMemo(() => buildHeartbeatDays(runs), [runs])
  const sourceProgress = useMemo(() => buildSourceProgress(activeRun, activity, isSyncing), [activeRun, activity, isSyncing])
  const tokenReady = Boolean(activeRun?.token_hash)

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-muted">Loading Vigil mission control...</div>
  }

  return (
    <div className="space-y-4">
      <AgentBanner agentId="vigil" agentName="Vigil" compact />
      <div className="flex gap-4 h-[calc(100vh-15rem)]">
      <div className="flex-[7] overflow-y-auto space-y-4 pr-1">
        <StatusBanner
          status={status}
          config={config}
          onScheduleUpdate={handleScheduleUpdate}
          error={error}
        />
        <HeartbeatStrip days={heartbeatDays} />
        <CurrentRunCard
          isSyncing={isSyncing}
          activeRun={activeRun}
          progressRows={sourceProgress}
        />
        <QuickActionsBar
          onWakeNow={handleWakeNow}
          onPause={handlePause}
          isSyncing={isSyncing}
          tokenReady={tokenReady}
          loading={actionLoading}
        />
        <AgentStepStream agentId="vigil" agentName="Vigil" />
        <ActivityTimeline
          entries={activity}
          hasMore={timelineHasMore}
          loadingMore={timelineLoading}
          onLoadMore={handleLoadMoreActivity}
        />
      </div>
      <div className="flex-[3] flex flex-col min-w-[320px]">
        <ChatPanel
          messages={messages}
          onSend={handleSendMessage}
          onClear={handleClearChat}
          isLoading={chatLoading}
        />
      </div>
      </div>
    </div>
  )
}
