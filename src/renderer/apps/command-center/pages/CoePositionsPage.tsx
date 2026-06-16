import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { coeTrackingService } from '../services/coeTrackingService'
import type { TrackedPosition, HealthBreakdown, HealthTier } from '../types'
import PositionCard from '../components/PositionCard'
import CoeTrackingBreadcrumb from '../components/CoeTrackingBreadcrumb'
import CoverageProgressBar from '../components/CoverageProgressBar'
import HealthFilterPills from '../components/HealthFilterPills'

export default function CoePositionsPage() {
  const { coe: rawCoe, practice: rawPractice, skill: rawSkill } = useParams<{ coe: string; practice: string; skill: string }>()
  const coe = decodeURIComponent(rawCoe || '')
  const practice = decodeURIComponent(rawPractice || '')
  const skill = decodeURIComponent(rawSkill || '')

  const [data, setData] = useState<TrackedPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<HealthTier | 'all'>('all')

  useEffect(() => {
    if (!coe || !practice || !skill) return
    setLoading(true)
    coeTrackingService.getSkillPositions(coe, practice, skill)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [coe, practice, skill])

  const breakdown = useMemo<HealthBreakdown>(() => {
    const bd: HealthBreakdown = { critical: 0, warning: 0, good: 0, excellent: 0, won: 0 }
    for (const p of data) {
      if (!p.isVirtual) bd[p.healthTier]++
    }
    return bd
  }, [data])

  const filteredData = useMemo(() => {
    if (filter === 'all') return data
    return data.filter(p => p.healthTier === filter)
  }, [data, filter])

  const virtualCount = data.filter(p => p.isVirtual).length
  const realCount = data.length - virtualCount
  const realData = data.filter(p => !p.isVirtual)
  const covered = realData.filter(p => p.activeCandidateCount > 0 || p.healthTier === 'won').length
  const effectiveness = realData.length > 0 ? Math.round((covered / realData.length) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading positions...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CoeTrackingBreadcrumb
        segments={[
          { label: 'C.O.E. Tracking', href: '/command-center/coe-tracking' },
          { label: coe, href: `/command-center/coe-tracking/${encodeURIComponent(coe)}` },
          { label: practice, href: `/command-center/coe-tracking/${encodeURIComponent(coe)}/${encodeURIComponent(practice)}` },
          { label: skill },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">{skill}</h1>
          <p className="text-sm text-secondary mt-1">
            {realCount} position{realCount !== 1 ? 's' : ''}{virtualCount > 0 ? ` (+ ${virtualCount} virtual)` : ''} · {effectiveness}% coverage · {coe}
          </p>
        </div>
        <div className="w-48">
          <CoverageProgressBar
            breakdown={breakdown}
            covered={covered}
            total={realData.length}
            compact
          />
        </div>
      </div>

      <HealthFilterPills
        breakdown={breakdown}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      {filteredData.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted">
            {data.length === 0
              ? `No positions found for ${skill} in ${coe}.`
              : `No positions match the "${filter}" health filter.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 grid-cols-1">
          {filteredData.map(pos => (
            <PositionCard
              key={pos.position.upstream_id}
              position={pos}
              href={`/command-center/coe-tracking/${encodeURIComponent(coe)}/${encodeURIComponent(practice)}/${encodeURIComponent(skill)}/${pos.position.upstream_id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
