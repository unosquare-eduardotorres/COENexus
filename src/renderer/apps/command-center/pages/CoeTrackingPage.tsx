import { useState, useEffect, useMemo } from 'react'
import { coeTrackingService } from '../services/coeTrackingService'
import type { CoeTrackingSummary, HealthBreakdown, HealthTier } from '../types'
import TrackingCard from '../components/TrackingCard'
import HealthFilterPills from '../components/HealthFilterPills'

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never synced'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function buildDescription(coe: CoeTrackingSummary): string {
  const top = (coe.topPractices ?? []).slice(0, 3)
  const remaining = (coe.topPractices ?? []).length - 3
  if (top.length === 0) return ''
  return `Focus: ${top.join(', ')}${remaining > 0 ? ` +${remaining} more` : ''}`
}

export default function CoeTrackingPage() {
  const [data, setData] = useState<CoeTrackingSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [filter, setFilter] = useState<HealthTier | 'all'>('all')

  useEffect(() => {
    Promise.all([
      coeTrackingService.getOverview(),
      coeTrackingService.getSyncStatus(),
    ])
      .then(([overview, sync]) => {
        setData(overview)
        setLastSynced(sync.lastSyncedAt)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalBreakdown = useMemo<HealthBreakdown>(() => {
    const bd: HealthBreakdown = { critical: 0, warning: 0, good: 0, excellent: 0 }
    for (const coe of data) {
      bd.critical += coe.healthBreakdown.critical
      bd.warning += coe.healthBreakdown.warning
      bd.good += coe.healthBreakdown.good
      bd.excellent += coe.healthBreakdown.excellent
    }
    return bd
  }, [data])

  const filteredData = useMemo(() => {
    if (filter === 'all') return data
    return data.filter(coe => coe.healthBreakdown[filter] > 0)
  }, [data, filter])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading C.O.E. data...</span>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/15 dark:bg-blue-400/15">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 dark:text-blue-400">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-primary">No Positions Synced</h2>
        <p className="text-sm text-secondary">Sync data from D.A.T.A. first to see C.O.E. tracking information.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">C.O.E. Tracking</h1>
          <p className="text-sm text-secondary mt-1">
            Track position coverage across Centers of Excellence
          </p>
        </div>
        <div className="flex items-center gap-2 glass-panel-subtle px-3 py-1.5 rounded-lg">
          <span className={`h-1.5 w-1.5 rounded-full ${lastSynced ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-[10px] text-muted font-mono">Synced: {formatRelativeTime(lastSynced)}</span>
        </div>
      </div>

      <HealthFilterPills
        breakdown={totalBreakdown}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2 grid-cols-1">
        {filteredData.map(coe => (
          <TrackingCard
            key={coe.coe}
            name={coe.coe}
            effectivenessPercent={coe.effectivenessPercent}
            totalPositions={coe.totalPositions}
            coveredPositions={coe.coveredPositions}
            healthBreakdown={coe.healthBreakdown}
            href={`/command-center/coe-tracking/${encodeURIComponent(coe.coe)}`}
            description={buildDescription(coe)}
          />
        ))}
      </div>

      {filteredData.length === 0 && filter !== 'all' && (
        <div className="text-center py-8">
          <p className="text-sm text-muted">No C.O.E.s have positions with "{filter}" health status.</p>
        </div>
      )}
    </div>
  )
}
