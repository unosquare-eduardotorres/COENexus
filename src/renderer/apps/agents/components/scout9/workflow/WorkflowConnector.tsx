import type { StepState } from './WorkflowNode'

interface ConnectorPoint {
  x: number
  y: number
}

interface WorkflowConnectorProps {
  from: ConnectorPoint
  to: ConnectorPoint
  sourceStatus: StepState['status']
  destStatus: StepState['status']
  badge?: string
  sourceColor: string
  destColor: string
}

function getStrokeColor(sourceStatus: StepState['status'], destStatus: StepState['status']): { className: string; animated: boolean } {
  if (sourceStatus === 'completed' && destStatus === 'completed') {
    return { className: 'stroke-green-400/60', animated: false }
  }
  if (sourceStatus === 'completed' && destStatus === 'running') {
    return { className: 'stroke-green-400/50', animated: true }
  }
  if (sourceStatus === 'completed') {
    return { className: 'stroke-green-400/40', animated: false }
  }
  if (sourceStatus === 'running') {
    return { className: 'stroke-green-400/30', animated: true }
  }
  return { className: 'stroke-gray-600/30', animated: false }
}

function buildPath(from: ConnectorPoint, to: ConnectorPoint): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  // Going down to top-center of bottom node: curve right then down
  if (dy > 0 && absDy > absDx * 0.5) {
    const cpY = absDy * 0.35
    return `M ${from.x},${from.y} C ${from.x + absDx * 0.6},${from.y} ${to.x},${to.y - cpY} ${to.x},${to.y}`
  }

  // Going up-right to left-center of top node: S-curve
  if (dy < 0 && absDy > absDx * 0.3) {
    const extend = Math.max(absDx * 0.4, 50)
    return `M ${from.x},${from.y} C ${from.x + extend},${from.y} ${to.x - extend},${to.y} ${to.x},${to.y}`
  }

  // Mostly horizontal (same row)
  const cpOffset = Math.min(dx * 0.35, 60)
  return `M ${from.x},${from.y} C ${from.x + cpOffset},${from.y} ${to.x - cpOffset},${to.y} ${to.x},${to.y}`
}

export default function WorkflowConnector({
  from,
  to,
  sourceStatus,
  destStatus,
  badge,
  sourceColor,
  destColor,
}: WorkflowConnectorProps) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const midX = from.x + dx / 2
  const midY = from.y + dy / 2

  const path = buildPath(from, to)

  const { className: strokeClass, animated } = getStrokeColor(sourceStatus, destStatus)
  const isIdle = sourceStatus === 'idle' && destStatus === 'idle'
  const isCompleted = sourceStatus === 'completed'

  const gradientId = `grad-${from.x}-${to.x}`

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" className={`stop-color-${sourceColor}`} style={{ stopColor: `var(--connector-from, currentColor)` }} stopOpacity={0.5} />
          <stop offset="100%" className={`stop-color-${destColor}`} style={{ stopColor: `var(--connector-to, currentColor)` }} stopOpacity={0.5} />
        </linearGradient>
        <marker
          id={`arrow-${from.x}`}
          viewBox="0 0 6 6"
          refX="5"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 6 3 L 0 6 z" className={isCompleted ? 'fill-green-400/60' : 'fill-gray-500/30'} />
        </marker>
      </defs>

      <path
        d={path}
        fill="none"
        strokeWidth={2}
        className={strokeClass}
        strokeDasharray={isIdle ? '6 4' : animated ? '6 4' : 'none'}
        style={animated ? { animation: 'flowDash 1.5s linear infinite' } : undefined}
        markerEnd={`url(#arrow-${from.x})`}
      />

      {badge && isCompleted && (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x={-badge.length * 3.2 - 6}
            y={-9}
            width={badge.length * 6.4 + 12}
            height={18}
            rx={9}
            className="fill-dark-surface/95 stroke-white/10"
            strokeWidth={1}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            className="fill-gray-300 text-[8px] font-mono"
            style={{ fontSize: '8px', fontFamily: 'ui-monospace, monospace' }}
          >
            {badge}
          </text>
        </g>
      )}
    </g>
  )
}
