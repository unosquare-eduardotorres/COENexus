import { useCallback, useEffect, useState } from 'react'
import { useVigilContext } from '../../pages/VigilPage'
import { vigilService } from '../../services/vigilService'
import type { VigilSource } from '../../../../../shared/ipc-types'

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

const ALL_SOURCES: { value: VigilSource; label: string }[] = [
  { value: 'employees', label: 'Employees' },
  { value: 'candidates', label: 'Candidates' },
  { value: 'open-positions', label: 'Open Positions' },
  { value: 'project-reallocations', label: 'PRR' },
]

function parseJsonArray<T>(value: string | undefined, fallback: T[]): T[] {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export default function ScheduleTab() {
  const { config, setConfig, setError, loading } = useVigilContext()

  const [scheduleEnabled, setScheduleEnabled] = useState(true)
  const [timeValue, setTimeValue] = useState('19:00')
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [selectedSources, setSelectedSources] = useState<VigilSource[]>([
    'employees', 'candidates', 'open-positions', 'project-reallocations',
  ])
  const [activePositionsOnly, setActivePositionsOnly] = useState(true)
  const [candidateYear, setCandidateYear] = useState(new Date().getFullYear())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!config) return
    setScheduleEnabled(config.schedule_enabled === 1)
    const hour = String(config.schedule_hour).padStart(2, '0')
    const minute = String(config.schedule_minute).padStart(2, '0')
    setTimeValue(`${hour}:${minute}`)
    setSelectedDays(parseJsonArray<number>(config.schedule_days_json, [1, 2, 3, 4, 5]))
    setSelectedSources(parseJsonArray<VigilSource>(config.sync_sources_json, ['employees', 'candidates', 'open-positions', 'project-reallocations']))
    setActivePositionsOnly(config.active_positions_only === 1)
    setCandidateYear(config.candidate_year_filter)
  }, [config])

  const toggleDay = useCallback((day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    )
  }, [])

  const toggleSource = useCallback((source: VigilSource) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source],
    )
  }, [])

  const handleSave = useCallback(async () => {
    const [hourText, minuteText] = timeValue.split(':')
    const hour = Number(hourText)
    const minute = Number(minuteText)
    if (Number.isNaN(hour) || Number.isNaN(minute)) return

    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const response = await vigilService.updateConfig({
        schedule_enabled: scheduleEnabled ? 1 : 0,
        schedule_hour: hour,
        schedule_minute: minute,
        schedule_days_json: JSON.stringify(selectedDays),
        sync_sources_json: JSON.stringify(selectedSources),
        active_positions_only: activePositionsOnly ? 1 : 0,
        candidate_year_filter: candidateYear,
      })

      if (!response.success) {
        setError(response.error ?? 'Unable to save schedule')
        return
      }

      setConfig(response.data ?? null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [timeValue, scheduleEnabled, selectedDays, selectedSources, activePositionsOnly, candidateYear, setConfig, setError])

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-muted">Loading schedule...</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-primary">Schedule Configuration</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-secondary">Schedule enabled</span>
            <button
              type="button"
              role="switch"
              aria-checked={scheduleEnabled}
              onClick={() => setScheduleEnabled(prev => !prev)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                scheduleEnabled ? 'bg-violet-500' : 'bg-slate-400/40'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  scheduleEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs text-muted mb-1.5 block">⏰ Run daily at</label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="glass-input h-10 px-3 text-sm w-36"
              disabled={!scheduleEnabled}
            />
          </div>

          <div>
            <label className="text-xs text-muted mb-2 block">📅 Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  disabled={!scheduleEnabled}
                  className={`h-9 w-14 text-xs font-semibold rounded-lg transition-colors ${
                    selectedDays.includes(day.value)
                      ? 'bg-violet-500 text-white'
                      : 'glass-button text-primary'
                  } disabled:opacity-50`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted mb-2 block">📦 Sources to sync</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SOURCES.map(src => (
                <button
                  key={src.value}
                  type="button"
                  onClick={() => toggleSource(src.value)}
                  disabled={!scheduleEnabled}
                  className={`h-9 px-3 text-xs font-semibold rounded-lg transition-colors ${
                    selectedSources.includes(src.value)
                      ? 'bg-violet-500 text-white'
                      : 'glass-button text-primary'
                  } disabled:opacity-50`}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs text-muted block">⚙️ Options</label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activePositionsOnly}
                onChange={() => setActivePositionsOnly(prev => !prev)}
                disabled={!scheduleEnabled}
                className="h-4 w-4 rounded border-gray-400 text-violet-500 focus:ring-violet-500"
              />
              <span className="text-xs text-primary">Sync only Active positions</span>
            </label>

            <div className="flex items-center gap-2">
              <label className="text-xs text-secondary">Candidate year filter:</label>
              <input
                type="number"
                value={candidateYear}
                onChange={(e) => setCandidateYear(Number(e.target.value))}
                min={2020}
                max={2030}
                disabled={!scheduleEnabled}
                className="glass-input h-9 px-2 text-sm w-24"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="glass-button h-10 px-5 text-sm font-semibold text-primary"
            style={{ borderColor: '#8b5cf660', boxShadow: 'inset 0 0 0 1px #8b5cf640' }}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          {saved && (
            <span className="text-xs text-emerald-400 animate-pulse">✓ Saved</span>
          )}
        </div>
      </section>
    </div>
  )
}
