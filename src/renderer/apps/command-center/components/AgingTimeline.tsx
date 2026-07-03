import { useMemo } from 'react'
import { CirclePlus, CircleCheckBig, RefreshCw, UserCheck, UserX, MessageCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CoeTrackingTimelineEvent } from '../types'

interface AgingTimelineProps {
  events: CoeTrackingTimelineEvent[]
  createdDate: string
}

const EVENT_CONFIG: Record<CoeTrackingTimelineEvent['type'], { Icon: LucideIcon; color: string; bgColor: string }> = {
  created: { Icon: CirclePlus, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  ready: { Icon: CircleCheckBig, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  modified: { Icon: RefreshCw, color: 'text-gray-400', bgColor: 'bg-gray-500/15' },
  'candidate-presented': { Icon: UserCheck, color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
  'candidate-rejected': { Icon: UserX, color: 'text-red-400', bgColor: 'bg-red-500/15' },
  discussion: { Icon: MessageCircle, color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
}

function formatGroupDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

interface DateGroup {
  dateLabel: string
  isToday: boolean
  events: CoeTrackingTimelineEvent[]
}

export default function AgingTimeline({ events, createdDate }: AgingTimelineProps) {
  const { groups, totalDays, lastActivityDays } = useMemo(() => {
    if (events.length === 0) {
      return { groups: [] as DateGroup[], totalDays: 0, lastActivityDays: 0 }
    }

    const now = new Date()
    const created = new Date(createdDate)
    const totalDays = daysBetween(created, now)

    // Sort events chronologically
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Group by date
    const groupMap = new Map<string, CoeTrackingTimelineEvent[]>()
    for (const evt of sorted) {
      const key = new Date(evt.date).toDateString()
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(evt)
    }

    const groups: DateGroup[] = Array.from(groupMap.entries()).map(([, evts]) => ({
      dateLabel: formatGroupDate(evts[0].date),
      isToday: isToday(evts[0].date),
      events: evts,
    }))

    const lastEvent = sorted[sorted.length - 1]
    const lastActivityDays = lastEvent ? daysBetween(new Date(lastEvent.date), now) : totalDays

    return { groups, totalDays, lastActivityDays }
  }, [events, createdDate])

  if (events.length === 0) {
    return (
      <div className="glass-panel-subtle p-4 text-center">
        <p className="text-sm text-muted">No timeline events available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Aging summary */}
      <div className="flex items-center gap-3 text-xs text-secondary">
        <span>{totalDays} days since created</span>
        <span className="text-muted">·</span>
        <span>Last activity {lastActivityDays === 0 ? 'today' : `${lastActivityDays}d ago`}</span>
      </div>

      {/* Vertical timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.08]" />

        {groups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-4 last:mb-0">
            {/* Date header */}
            <div className="relative flex items-center gap-3 mb-2">
              <div className="absolute -left-6 w-[22px] flex justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              </div>
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                {group.dateLabel}
                {group.isToday && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/15 text-blue-400 normal-case tracking-normal">
                    Today
                  </span>
                )}
              </span>
            </div>

            {/* Events in this group */}
            {group.events.map((evt, evtIdx) => {
              const config = EVENT_CONFIG[evt.type]
              return (
                <div key={`${evt.type}-${evtIdx}`} className="relative flex items-start gap-3 py-1.5">
                  {/* Icon on the line */}
                  <div className="absolute -left-6 w-[22px] flex justify-center">
                    <div className={`w-5 h-5 rounded-full ${config.bgColor} flex items-center justify-center`}>
                      <config.Icon size={10} className={config.color} />
                    </div>
                  </div>

                  {/* Event content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-primary">{evt.label}</p>
                    {evt.detail && (
                      <p className="text-[10px] text-muted mt-0.5 line-clamp-2">{evt.detail}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
