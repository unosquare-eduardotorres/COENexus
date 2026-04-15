export interface HeartbeatDay {
  key: string
  label: string
  date: string
  state: 'success' | 'partial' | 'failed' | 'missed'
  details: string[]
}

interface HeartbeatStripProps {
  days: HeartbeatDay[]
}

function stateClass(state: HeartbeatDay['state']): string {
  if (state === 'success') return 'bg-emerald-400'
  if (state === 'partial') return 'bg-amber-400'
  if (state === 'failed') return 'bg-red-400'
  return 'bg-slate-400/60'
}

function stateLabel(state: HeartbeatDay['state']): string {
  if (state === 'success') return 'All success'
  if (state === 'partial') return 'Partial success'
  if (state === 'failed') return 'All failed'
  return 'Missed'
}

export default function HeartbeatStrip({ days }: HeartbeatStripProps) {
  return (
    <section className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-primary">Heartbeat</h3>
        <span className="text-xs text-muted">Last 7 days</span>
      </div>

      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 border-t minimal-divider -translate-y-1/2" />
        <div className="relative grid grid-cols-7 gap-3">
          {days.map(day => (
            <div key={day.key} className="group flex flex-col items-center gap-1.5">
              <div className={`h-4 w-4 rounded-full ${stateClass(day.state)} ring-2 ring-white/40 dark:ring-white/10`} />
              <span className="text-[10px] text-muted">{day.label}</span>

              <div className="invisible group-hover:visible absolute z-20 mt-16 w-40 glass-panel-subtle rounded-xl p-2">
                <p className="text-[11px] font-semibold text-primary">{day.date}</p>
                <p className="text-[10px] text-muted mt-0.5">{stateLabel(day.state)}</p>
                <div className="mt-1.5 space-y-0.5">
                  {day.details.map(detail => (
                    <p key={detail} className="text-[10px] text-secondary">{detail}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
