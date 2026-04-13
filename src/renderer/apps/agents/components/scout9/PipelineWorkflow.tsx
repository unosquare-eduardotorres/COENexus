import { useRef, useLayoutEffect, useState, useCallback } from 'react'
import WorkflowNode, { STEP_CONFIGS } from './workflow/WorkflowNode'
import type { StepState } from './workflow/WorkflowNode'
import WorkflowConnector from './workflow/WorkflowConnector'
import SubNodeCluster from './workflow/SubNodeCluster'
import { STEP_BLUEPRINTS, ICON_MAP, deriveSubTaskStatus } from './workflow/stepBlueprints'
import type { SubTaskStatus } from './workflow/stepBlueprints'

export type { StepState }

interface PipelineWorkflowProps {
  steps: StepState[]
  onStepClick?: (stepIndex: number) => void
  stats: Record<string, number>
}

interface NodeRect {
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
  width: number
  height: number
}

const STAT_BADGE_MAP: Record<number, { key: string; suffix: string }> = {
  0: { key: 'positionsFound', suffix: ' pos' },
  1: { key: 'candidatesGathered', suffix: ' cands' },
  2: { key: 'crossReferencedPairs', suffix: ' pairs' },
  3: { key: 'analysisCompleted', suffix: ' scored' },
  4: { key: 'ranked', suffix: ' ranked' },
}

function SubTaskStatusIcon({ status }: { status: SubTaskStatus }) {
  switch (status) {
    case 'pending':
      return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-400/40 text-[8px] text-gray-400">○</span>
    case 'running':
      return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-green-400 bg-green-400/20 animate-pulse"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /></span>
    case 'done':
      return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-green-500 bg-green-500/20 text-[10px] text-green-500">✓</span>
    case 'failed':
      return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-red-500 bg-red-500/20 text-[10px] text-red-500">✗</span>
  }
}

export default function PipelineWorkflow({ steps, onStepClick, stats }: PipelineWorkflowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const [nodeRects, setNodeRects] = useState<NodeRect[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined)

  const displaySteps: StepState[] = STEP_CONFIGS.map((config, i) =>
    steps[i] ?? { name: config.label, status: 'idle' as const }
  )

  const measureNodes = useCallback(() => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const rects: NodeRect[] = []

    for (let i = 0; i < nodeRefs.current.length; i++) {
      const el = nodeRefs.current[i]
      if (el) {
        const r = el.getBoundingClientRect()
        rects.push({
          left: r.left - containerRect.left,
          top: r.top - containerRect.top,
          right: r.right - containerRect.left,
          bottom: r.bottom - containerRect.top,
          centerX: r.left - containerRect.left + r.width / 2,
          centerY: r.top - containerRect.top + r.height / 2,
          width: r.width,
          height: r.height,
        })
      }
    }

    setNodeRects(rects)
  }, [])

  useLayoutEffect(() => {
    measureNodes()
    const observer = new ResizeObserver(measureNodes)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [measureNodes, steps])

  const handleStepClick = useCallback((index: number) => {
    setSelectedIndex(prev => (prev === index ? undefined : index))
    onStepClick?.(index)
  }, [onStepClick])

  const getBadgeText = (sourceIndex: number): string | undefined => {
    const mapping = STAT_BADGE_MAP[sourceIndex]
    if (!mapping) return undefined
    const val = stats[mapping.key]
    if (!val || val <= 0) return undefined
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k${mapping.suffix}`
    return `${val}${mapping.suffix}`
  }

  const selectedBlueprint = selectedIndex !== undefined
    ? STEP_BLUEPRINTS.find(b => b.stepIndex === selectedIndex)
    : undefined

  const selectedStepState = selectedIndex !== undefined
    ? displaySteps[selectedIndex]
    : undefined

  const selectedConfig = selectedIndex !== undefined
    ? STEP_CONFIGS[selectedIndex]
    : undefined

  return (
    <div className="glass-panel p-3 overflow-x-auto">
      <div ref={containerRef} className="relative" style={{ minHeight: 240 }}>
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0, width: '100%', height: '100%' }}
        >
          <style>{`
            @keyframes flowDash {
              0% { stroke-dashoffset: 20; }
              100% { stroke-dashoffset: 0; }
            }
          `}</style>
          {nodeRects.length === displaySteps.length &&
            displaySteps.slice(0, -1).map((_, i) => {
              const from = nodeRects[i]
              const to = nodeRects[i + 1]
              if (!from || !to) return null

              const goingDown = i % 2 === 0

              return (
                <WorkflowConnector
                  key={i}
                  from={goingDown
                    ? { x: from.right, y: from.centerY }
                    : { x: from.right, y: from.centerY }
                  }
                  to={goingDown
                    ? { x: to.centerX, y: to.top }
                    : { x: to.left, y: to.centerY }
                  }
                  sourceStatus={displaySteps[i].status}
                  destStatus={displaySteps[i + 1].status}
                  badge={getBadgeText(i)}
                  sourceColor={STEP_CONFIGS[i].color}
                  destColor={STEP_CONFIGS[i + 1].color}
                />
              )
            })}
        </svg>

        <div
          className="grid relative"
          style={{
            zIndex: 1,
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridTemplateRows: 'auto auto',
            columnGap: '1.5rem',
            rowGap: '1rem',
            paddingTop: '0.5rem',
          }}
        >
          {displaySteps.map((step, i) => {
            const isTopRow = i % 2 === 0
            return (
              <div
                key={i}
                className="flex flex-col items-center"
                ref={el => { nodeRefs.current[i] = el }}
                style={{
                  gridColumn: i + 1,
                  gridRow: isTopRow ? 1 : 2,
                }}
              >
                <WorkflowNode
                  step={step}
                  index={i}
                  selected={selectedIndex === i}
                  onClick={() => handleStepClick(i)}
                />
                {i === 3 && (
                  <SubNodeCluster parentStatus={step.status} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedBlueprint && selectedStepState && selectedConfig && (
        <div
          className="glass-panel-subtle rounded-xl p-4 mt-4 transition-all duration-200"
          style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
        >
          <style>{`
            @keyframes fadeSlideIn {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = selectedConfig.icon
                return (
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${selectedConfig.colorClasses.iconBg}`}>
                    <Icon size={13} className={selectedConfig.colorClasses.iconText} />
                  </div>
                )
              })()}
              <span className="text-xs font-semibold text-primary">
                Step {selectedBlueprint.stepIndex + 1}: {selectedBlueprint.title}
              </span>
            </div>
            {selectedStepState.elapsed !== undefined && selectedStepState.elapsed > 0 && (
              <span className="text-[10px] text-muted font-mono">
                {selectedStepState.elapsed < 1000
                  ? `${selectedStepState.elapsed}ms`
                  : `${(selectedStepState.elapsed / 1000).toFixed(1)}s`}
              </span>
            )}
          </div>

          <div className="h-px bg-white/5 mb-2" />

          <div className="space-y-1">
            {selectedBlueprint.subTasks.map((subTask, stIdx) => {
              const subStatus = deriveSubTaskStatus(selectedStepState.status, stIdx, selectedBlueprint.subTasks.length)
              const IconComponent = ICON_MAP[subTask.icon]

              return (
                <div
                  key={subTask.id}
                  className={`
                    flex items-start gap-2 py-1.5 px-2 rounded transition-colors
                    ${subStatus === 'running' ? 'bg-green-400/5' : ''}
                    ${subStatus === 'done' ? 'opacity-75' : ''}
                    ${subStatus === 'failed' ? 'bg-red-400/5' : ''}
                  `}
                >
                  <SubTaskStatusIcon status={subStatus} />
                  <IconComponent size={12} className="text-muted mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-secondary">{subTask.id} {subTask.label}</span>
                    <p className="text-[9px] text-muted leading-tight mt-0.5 truncate">{subTask.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {selectedStepState.data && Object.keys(selectedStepState.data).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-white/5">
              {Object.entries(selectedStepState.data).map(([key, val]) => (
                <span key={key} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                  {key}: {typeof val === 'number' ? val.toLocaleString() : String(val)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 mt-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400/60" />
          <span className="text-[9px] text-muted">Data</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-400/60" />
          <span className="text-[9px] text-muted">Agentic</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400/60" />
          <span className="text-[9px] text-muted">Scoring</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400/60" />
          <span className="text-[9px] text-muted">Output</span>
        </div>
      </div>
    </div>
  )
}
