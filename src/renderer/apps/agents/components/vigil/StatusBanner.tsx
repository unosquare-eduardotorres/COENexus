import { useEffect, useMemo, useState } from 'react'
import type { VigilConfig, VigilRunStatus } from '../../../../../shared/ipc-types'

interface StatusBannerProps {
  status: VigilRunStatus | 'idle'
  config: VigilConfig | null
  onScheduleUpdate: (hour: number, minute: number) => Promise<void> | void
  error: string | null
}

function statusMeta(status: VigilRunStatus | 'idle') {
  if (status === 'running' || status === 'queued') {
    return {
      label: 'Syncing',
      tone: 'text-blue-400',
      dot: 'bg-blue-400 animate-pulse',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19.07 4.93A10 10 0 1 1 4.93 19.07" />
          <path d="M22 12h-4" />
          <path d="M6 12H2" />
          <path d="M12 2v4" />
          <path d="M12 18v4" />
        </svg>
      ),
    }
  }

  if (status === 'failed') {
    return {
      label: 'Error',
      tone: 'text-red-400',
      dot: 'bg-red-400',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      ),
    }
  }

  if (status === 'completed') {
    return {
      label: 'Awake',
      tone: 'text-amber-400',
      dot: 'bg-amber-400 animate-pulse',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    }
  }

  return {
    label: 'Sleeping',
    tone: 'text-slate-400',
    dot: 'bg-slate-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a7 7 0 1 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    ),
  }
}

function nextWakeCountdown(config: VigilConfig | null): string {
  if (!config || !config.schedule_enabled) return 'Schedule disabled'

  const now = new Date()
  const next = new Date()
  next.setHours(config.schedule_hour, config.schedule_minute, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }

  const diffMs = next.getTime() - now.getTime()
  const totalMins = Math.floor(diffMs / 60000)
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return `${hrs}h ${mins}m`
}

export default function StatusBanner({ status, config, onScheduleUpdate, error }: StatusBannerProps) {
  const [timeValue, setTimeValue] = useState('09:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!config) return
    const hour = String(config.schedule_hour).padStart(2, '0')
    const minute = String(config.schedule_minute).padStart(2, '0')
    setTimeValue(`${hour}:${minute}`)
  }, [config])

  const meta = useMemo(() => statusMeta(status), [status])
  const countdown = useMemo(() => nextWakeCountdown(config), [config])

  async function handleTimeCommit() {
    const [hourText, minuteText] = timeValue.split(':')
    const hour = Number(hourText)
    const minute = Number(minuteText)
    if (Number.isNaN(hour) || Number.isNaN(minute)) return

    setSaving(true)
    await onScheduleUpdate(hour, minute)
    setSaving(false)
  }

  return (
    <section className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={meta.tone}>{meta.icon}</span>
            <h2 className="text-base font-semibold text-primary">Vigil Mission Control</h2>
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          </div>
          <p className={`mt-1 text-sm ${meta.tone}`}>{meta.label}</p>
          <p className="text-xs text-muted mt-1">Next wake-up in {countdown}</p>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>

        <div className="glass-panel-subtle rounded-xl p-3 min-w-[220px]">
          <p className="text-xs text-muted">Schedule</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="time"
              value={timeValue}
              onChange={(event) => setTimeValue(event.target.value)}
              className="glass-input h-9 px-2 text-sm flex-1"
            />
            <button
              onClick={handleTimeCommit}
              disabled={saving}
              className="glass-button h-9 px-3 text-xs font-semibold text-primary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-[10px] text-secondary mt-1">
            Daily at {timeValue}
          </p>
        </div>
      </div>
    </section>
  )
}
