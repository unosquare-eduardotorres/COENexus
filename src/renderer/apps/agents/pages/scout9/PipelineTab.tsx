import React, { useState, useReducer, useEffect, useCallback } from 'react'
import { Play, Square, Zap, Clock, Users, BarChart3 } from 'lucide-react'
import PipelineWorkflow from '../../components/scout9/PipelineWorkflow'
import type { StepState } from '../../components/scout9/workflow/WorkflowNode'
import LogStream from '../../components/scout9/LogStream'
import ScopeSelector, { useScopeLabel } from '../../components/scout9/ScopeSelector'
import RunConfirmModal from '../../components/scout9/RunConfirmModal'
import type { LogEntry } from '../../components/scout9/LogStream'

interface PipelineState {
  steps: StepState[]
  logs: LogEntry[]
  tokens: { input: number; output: number }
  elapsed: number
  isRunning: boolean
  scopeParams: { preset?: string; filters?: Record<string, string[]> }
  stats: Record<string, number>
}

type PipelineAction =
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'STEP_UPDATE'; step: number; status: StepState['status']; elapsed?: number; data?: Record<string, unknown> }
  | { type: 'LOG'; entry: LogEntry }
  | { type: 'STATS'; data: Record<string, number> }
  | { type: 'SET_SCOPE'; params: PipelineState['scopeParams'] }
  | { type: 'RESET' }

const STEP_NAMES = ['Fetch Positions', 'Gather Candidates', 'Cross-Reference', 'Analyze (AI)', 'Score & Rank', 'Generate Report']

function createInitialSteps(): StepState[] {
  return STEP_NAMES.map(name => ({ name, status: 'idle' as const }))
}

const initialState: PipelineState = {
  steps: createInitialSteps(),
  logs: [],
  tokens: { input: 0, output: 0 },
  elapsed: 0,
  isRunning: false,
  scopeParams: { preset: 'all-active' },
  stats: {},
}

function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case 'START':
      return { ...initialState, isRunning: true, scopeParams: state.scopeParams, steps: createInitialSteps() }
    case 'STOP':
      return { ...state, isRunning: false }
    case 'STEP_UPDATE': {
      const steps = [...state.steps]
      const idx = action.step - 1
      if (idx >= 0 && idx < steps.length) {
        steps[idx] = { ...steps[idx], status: action.status, elapsed: action.elapsed, data: action.data }
      }
      return { ...state, steps }
    }
    case 'LOG':
      return { ...state, logs: [...state.logs.slice(-499), action.entry] }
    case 'STATS':
      return { ...state, stats: { ...state.stats, ...action.data } }
    case 'SET_SCOPE':
      return { ...state, scopeParams: action.params }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

function nowTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function PipelineTab() {
  const [state, dispatch] = useReducer(pipelineReducer, initialState)
  const [showRunModal, setShowRunModal] = useState(false)
  const scopeInfo = useScopeLabel(state.scopeParams)

  useEffect(() => {
    const unsubscribe = window.api?.scout9?.onPipelineEvent?.((event: Record<string, unknown>) => {
      if (event.type === 'step-update') {
        dispatch({
          type: 'STEP_UPDATE',
          step: event.step as number,
          status: event.status as StepState['status'],
          elapsed: event.elapsed as number | undefined,
          data: event.data as Record<string, unknown> | undefined,
        })
      }
      if (event.type === 'log') {
        dispatch({
          type: 'LOG',
          entry: { timestamp: nowTimestamp(), source: 'info', message: event.message as string },
        })
      }
      if (event.type === 'stats') {
        dispatch({ type: 'STATS', data: event.data as Record<string, number> })
      }
    })
    return () => unsubscribe?.()
  }, [])

  const handleRun = useCallback(() => {
    setShowRunModal(true)
  }, [])

  const handleConfirmRun = useCallback(async () => {
    setShowRunModal(false)
    dispatch({ type: 'START' })
    dispatch({ type: 'LOG', entry: { timestamp: nowTimestamp(), source: 'step', message: 'Starting Scout-9 pipeline...' } })
    try {
      await window.api?.scout9?.run?.(state.scopeParams)
    } catch (err) {
      dispatch({ type: 'LOG', entry: { timestamp: nowTimestamp(), source: 'error', message: `Run failed: ${err}` } })
      dispatch({ type: 'STOP' })
    }
  }, [state.scopeParams])

  const handleCancel = useCallback(async () => {
    dispatch({ type: 'LOG', entry: { timestamp: nowTimestamp(), source: 'step', message: 'Cancelling...' } })
    try {
      await window.api?.scout9?.cancel?.()
      dispatch({ type: 'STOP' })
    } catch (err) {
      dispatch({ type: 'LOG', entry: { timestamp: nowTimestamp(), source: 'error', message: `Cancel failed: ${err}` } })
    }
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-primary flex-shrink-0">Pipeline</h3>
          <ScopeSelector
            onSelect={(params) => dispatch({ type: 'SET_SCOPE', params })}
            disabled={state.isRunning}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!state.isRunning ? (
            <button
              onClick={handleRun}
              className="glass-button px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
            >
              <Play size={14} />
              Run Scout-9
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="glass-button px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
            >
              <Square size={14} />
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<BarChart3 size={14} />} label="Positions" value={state.stats.positionsFound ?? 0} color="blue" />
        <StatCard icon={<Users size={14} />} label="Candidates" value={state.stats.candidatesGathered ?? 0} color="green" />
        <StatCard icon={<Zap size={14} />} label="Tokens" value={(state.tokens.input + state.tokens.output)} color="violet" />
        <StatCard icon={<Clock size={14} />} label="Elapsed" value={`${state.elapsed}s`} color="amber" />
      </div>

      <PipelineWorkflow steps={state.steps} stats={state.stats} />

      <LogStream logs={state.logs} />

      <RunConfirmModal
        open={showRunModal}
        onConfirm={handleConfirmRun}
        onCancel={() => setShowRunModal(false)}
        scopeLabel={scopeInfo.label}
        scopeDetails={scopeInfo.details}
      />
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  }
  return (
    <div className="glass-panel-subtle p-2.5 rounded-xl">
      <div className="flex items-center gap-1.5">
        <span className={`${colorClasses[color]} p-1 rounded`}>{icon}</span>
        <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-0.5 text-base font-bold text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  )
}
