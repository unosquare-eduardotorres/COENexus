import { useMemo } from 'react'
import { useVigilContext } from '../../pages/VigilPage'
import type {
  VigilActivityLog,
  VigilRun,
  VigilSource,
} from '../../../../../shared/ipc-types'
import StatusBanner from './StatusBanner'
import HeartbeatStrip, { type HeartbeatDay } from './HeartbeatStrip'
import CurrentRunCard, { type SourceProgressRow } from './CurrentRunCard'
import QuickActionsBar from './QuickActionsBar'
import AgentStepStream from '../../components/AgentStepStream'
import ActivityTimeline from './ActivityTimeline'

const SOURCE_ORDER: VigilSource[] = ['employees', 'candidates', 'open-positions', 'project-reallocations']

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
        state: 'missed' as const,
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
      state: allCompleted ? 'success' as const : allFailed ? 'failed' as const : 'partial' as const,
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
      : status === 'completed' || status === 'failed'
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

export default function MissionControlTab() {
  const ctx = useVigilContext()

  const heartbeatDays = useMemo(() => buildHeartbeatDays(ctx.runs), [ctx.runs])
  const sourceProgress = useMemo(
    () => buildSourceProgress(ctx.activeRun, ctx.activity, ctx.isSyncing),
    [ctx.activeRun, ctx.activity, ctx.isSyncing],
  )
  const tokenReady = Boolean(ctx.activeRun?.token_hash)

  if (ctx.loading) {
    return <div className="glass-panel p-6 text-sm text-muted">Loading Vigil mission control...</div>
  }

  return (
    <div className="space-y-4">
      <StatusBanner
        status={ctx.status}
        config={ctx.config}
        error={ctx.error}
      />
      <HeartbeatStrip days={heartbeatDays} />
      <CurrentRunCard
        isSyncing={ctx.isSyncing}
        activeRun={ctx.activeRun}
        progressRows={sourceProgress}
      />
      <QuickActionsBar
        onWakeNow={ctx.handleWakeNow}
        onPause={ctx.handlePause}
        isSyncing={ctx.isSyncing}
        tokenReady={tokenReady}
        loading={ctx.actionLoading}
      />
      <AgentStepStream agentId="vigil" agentName="Vigil" />
      <ActivityTimeline
        entries={ctx.activity}
        hasMore={ctx.timelineHasMore}
        loadingMore={ctx.timelineLoading}
        onLoadMore={ctx.handleLoadMoreActivity}
      />
    </div>
  )
}
