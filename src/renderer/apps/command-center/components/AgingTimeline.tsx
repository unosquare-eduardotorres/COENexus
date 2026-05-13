import { useMemo } from 'react'
import type { CoeTrackingTimelineEvent } from '../types'

interface AgingTimelineProps {
  events: CoeTrackingTimelineEvent[]
  createdDate: string
}

const EVENT_STYLES: Record<CoeTrackingTimelineEvent['type'], { dot: string; ring: string }> = {
  created: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  ready: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  modified: { dot: 'bg-gray-400', ring: 'ring-gray-400/30' },
  'candidate-presented': { dot: 'bg-amber-500', ring: 'ring-amber-500/30' },
  'candidate-rejected': { dot: 'bg-red-500', ring: 'ring-red-500/30' },
  discussion: { dot: 'bg-purple-500', ring: 'ring-purple-500/30' },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AgingTimeline({ events, createdDate }: AgingTimelineProps) {
  const { positions, startMs, endMs } = useMemo(() => {
    const now = new Date()
    const start = new Date(createdDate)
    const startMs = start.getTime()
    const endMs = now.getTime()
    const range = endMs - startMs

    if (range <= 0 || events.length === 0) {
      return { positions: [], startMs, endMs }
    }

    const raw = events.map(evt => {
      const evtMs = new Date(evt.date).getTime()
      const pct = Math.max(0, Math.min(100, ((evtMs - startMs) / range) * 100))
      return { ...evt, pct, yOffset: 0 }
    })

    const positions = raw.map((evt, i) => {
      const nearby = raw.filter((other, j) => j < i && Math.abs(other.pct - evt.pct) < 1.5)
      return { ...evt, yOffset: nearby.length * 10 }
    })

    return { positions, startMs, endMs }
  }, [events, createdDate])

  if (events.length === 0) {
    return (
      <div className="glass-panel-subtle p-4 text-center">
        <p className="text-sm text-muted">No timeline events available.</p>
      </div>
    )
  }

  const totalDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-3">
      <div className="relative h-20 glass-panel-subtle rounded-lg px-4 py-2">
        <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-gray-300 dark:bg-dark-border -translate-y-1/2" />

        {positions.map((evt, i) => {
          const style = EVENT_STYLES[evt.type]
          const isSmall = evt.type === 'discussion'
          const size = isSmall ? 'w-2 h-2' : 'w-3 h-3'
          return (
            <div
              key={`${evt.type}-${i}`}
              className="absolute -translate-x-1/2 group z-10"
              style={{
                left: `calc(${evt.pct}% * (100% - 32px) / 100% + 16px)`,
                top: `calc(50% + ${evt.yOffset - 5}px)`,
              }}
            >
              <div className={`${size} rounded-full ${style.dot} ring-2 ${style.ring}`} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                <div className="glass-panel px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  <p className="text-[10px] font-medium text-primary">{evt.label}</p>
                  <p className="text-[9px] text-muted">{formatDate(evt.date)}</p>
                  {evt.detail && <p className="text-[9px] text-secondary mt-0.5 max-w-[200px] truncate">{evt.detail}</p>}
                </div>
              </div>
            </div>
          )
        })}

        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <div className="w-0 h-6 border-l border-dashed border-gray-400 dark:border-gray-500" />
          <span className="text-[9px] text-muted font-medium">Today</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-muted">{formatDate(createdDate)}</span>
        <span className="text-[10px] text-muted">{totalDays}d total</span>
        <span className="text-[10px] text-muted">Today</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(EVENT_STYLES).map(([type, style]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${style.dot}`} />
            <span className="text-[9px] text-muted capitalize">{type.replace(/-/g, ' ')}</span>
          </div>
        ))}
      </div>

      <div className="glass-panel-subtle rounded-lg divide-y divide-white/[0.04]">
        {positions.map((evt, i) => {
          const style = EVENT_STYLES[evt.type]
          return (
            <div key={`list-${evt.type}-${i}`} className="flex items-start gap-3 px-4 py-2.5">
              <span className="text-[10px] text-muted font-mono w-14 shrink-0 pt-0.5">
                {formatDate(evt.date)}
              </span>
              <div className={`w-2 h-2 rounded-full ${style.dot} mt-1.5 shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-primary">{evt.label}</p>
                {evt.detail && (
                  <p className="text-[10px] text-secondary mt-0.5 leading-relaxed">{evt.detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
