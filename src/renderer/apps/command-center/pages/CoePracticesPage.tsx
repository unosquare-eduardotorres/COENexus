import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { coeTrackingService } from '../services/coeTrackingService'
import type { PracticeTrackingSummary, TrackedPosition, HealthBreakdown, HealthTier } from '../types'
import TrackingCard from '../components/TrackingCard'
import CoeTrackingBreadcrumb from '../components/CoeTrackingBreadcrumb'
import EffectivenessRing from '../components/EffectivenessRing'
import HealthFilterPills from '../components/HealthFilterPills'

const TIER_ICON: Record<HealthTier, string> = {
  critical: '🔴',
  warning: '🟡',
  good: '🟢',
  excellent: '🔵',
}

const TIER_ROW_TINT: Record<HealthTier, string> = {
  critical: 'bg-red-500/[0.03]',
  warning: '',
  good: '',
  excellent: '',
}

const TIER_BORDER: Record<HealthTier, string> = {
  critical: 'border-l-red-500',
  warning: 'border-l-amber-500',
  good: 'border-l-emerald-500',
  excellent: 'border-l-blue-500',
}

function buildPracticeDescription(practice: PracticeTrackingSummary): string {
  if (practice.healthBreakdown.critical > 0) {
    return `${practice.healthBreakdown.critical} critical position${practice.healthBreakdown.critical > 1 ? 's' : ''} need attention`
  }
  return `${practice.coveredPositions} of ${practice.totalPositions} covered`
}

function buildPracticeSubtitle(practice: PracticeTrackingSummary): string {
  if (practice.skillCount === 1) return practice.singleSkill || ''
  return `${practice.skillCount} skills`
}

export default function CoePracticesPage() {
  const { coe: rawCoe } = useParams<{ coe: string }>()
  const coe = decodeURIComponent(rawCoe || '')
  const navigate = useNavigate()

  const [data, setData] = useState<PracticeTrackingSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<HealthTier | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'by-practice' | 'all-positions'>('by-practice')
  const [coePositions, setCoePositions] = useState<TrackedPosition[] | null>(null)
  const [positionsLoading, setPositionsLoading] = useState(false)

  useEffect(() => {
    if (!coe) return
    setLoading(true)
    coeTrackingService.getCoeDetail(coe)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [coe])

  useEffect(() => {
    if (activeTab !== 'all-positions' || !coe || coePositions !== null) return
    setPositionsLoading(true)
    coeTrackingService.getCoePositions(coe)
      .then(setCoePositions)
      .catch(() => setCoePositions([]))
      .finally(() => setPositionsLoading(false))
  }, [activeTab, coe, coePositions])

  const totalPositions = data.reduce((sum, s) => sum + s.totalPositions, 0)
  const totalCovered = data.reduce((sum, s) => sum + s.coveredPositions, 0)
  const overallEffectiveness = totalPositions > 0
    ? Math.round((totalCovered / totalPositions) * 100)
    : 0

  const practiceBreakdown = useMemo<HealthBreakdown>(() => {
    const bd: HealthBreakdown = { critical: 0, warning: 0, good: 0, excellent: 0 }
    for (const s of data) {
      bd.critical += s.healthBreakdown.critical
      bd.warning += s.healthBreakdown.warning
      bd.good += s.healthBreakdown.good
      bd.excellent += s.healthBreakdown.excellent
    }
    return bd
  }, [data])

  const positionsBreakdown = useMemo<HealthBreakdown>(() => {
    if (!coePositions) return practiceBreakdown
    const bd: HealthBreakdown = { critical: 0, warning: 0, good: 0, excellent: 0 }
    for (const p of coePositions) {
      bd[p.healthTier]++
    }
    return bd
  }, [coePositions, practiceBreakdown])

  const activeBreakdown = activeTab === 'by-practice' ? practiceBreakdown : positionsBreakdown

  const filteredPractices = useMemo(() => {
    if (filter === 'all') return data
    return data.filter(s => s.healthBreakdown[filter] > 0)
  }, [data, filter])

  const filteredPositions = useMemo(() => {
    if (!coePositions) return []
    if (filter === 'all') return coePositions
    return coePositions.filter(p => p.healthTier === filter)
  }, [coePositions, filter])

  const enc = encodeURIComponent

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading practices...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CoeTrackingBreadcrumb
        segments={[
          { label: 'C.O.E. Tracking', href: '/command-center/coe-tracking' },
          { label: coe },
        ]}
      />

      <div className="glass-panel p-5">
        <div className="flex items-center gap-5">
          <EffectivenessRing percent={overallEffectiveness} size="lg" />
          <div>
            <h1 className="text-xl font-bold text-primary">{coe}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{totalPositions}</p>
                <p className="text-[10px] text-muted">Total Positions</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-500">{totalCovered}</p>
                <p className="text-[10px] text-muted">Covered</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-500">{totalPositions - totalCovered}</p>
                <p className="text-[10px] text-muted">Uncovered</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-secondary">{data.length}</p>
                <p className="text-[10px] text-muted">Practices</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center glass-panel-subtle rounded-lg p-1 gap-1">
          <button
            onClick={() => setActiveTab('by-practice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'by-practice'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            By Practice
          </button>
          <button
            onClick={() => setActiveTab('all-positions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'all-positions'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            All Positions
          </button>
        </div>
      </div>

      <HealthFilterPills
        breakdown={activeBreakdown}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      {activeTab === 'by-practice' && (
        <>
          {filteredPractices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted">
                {data.length === 0
                  ? 'No practices found for this C.O.E.'
                  : `No practices have positions with "${filter}" health status.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2 grid-cols-1">
              {filteredPractices.map(practice => {
                const href = practice.skillCount === 1 && practice.singleSkill
                  ? `/command-center/coe-tracking/${enc(coe)}/${enc(practice.practice)}/${enc(practice.singleSkill)}`
                  : `/command-center/coe-tracking/${enc(coe)}/${enc(practice.practice)}`
                return (
                  <TrackingCard
                    key={practice.practice}
                    name={practice.practice}
                    effectivenessPercent={practice.effectivenessPercent}
                    totalPositions={practice.totalPositions}
                    coveredPositions={practice.coveredPositions}
                    healthBreakdown={practice.healthBreakdown}
                    href={href}
                    description={buildPracticeDescription(practice)}
                    subtitle={buildPracticeSubtitle(practice)}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'all-positions' && (
        <>
          {positionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted">Loading positions...</span>
              </div>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted">
                {!coePositions || coePositions.length === 0
                  ? 'No positions found for this C.O.E.'
                  : `No positions match the "${filter}" health filter.`}
              </p>
            </div>
          ) : (
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider w-16">Health</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider">Practice</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider">Skill</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider">Job Title</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider">Account</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider">Stakeholder</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-center w-16">Active</th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-right w-16">Aging</th>
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredPositions.map(pos => {
                      const p = pos.position
                      const practice = p.practice || 'Unspecified'
                      const skill = p.main_skill || 'Unspecified'
                      return (
                        <tr
                          key={p.upstream_id}
                          onClick={() => navigate(`/command-center/coe-tracking/${enc(coe)}/${enc(practice)}/${enc(skill)}/${p.upstream_id}`)}
                          className={`border-l-4 ${TIER_BORDER[pos.healthTier]} ${TIER_ROW_TINT[pos.healthTier]} hover:bg-white/[0.03] cursor-pointer transition-colors`}
                        >
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm" title={pos.healthTier}>{TIER_ICON[pos.healthTier]}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-dark-hover text-secondary">
                              {practice}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-dark-hover text-secondary">
                              {skill}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-primary font-medium truncate max-w-[200px]">
                            {p.job_title || `Position #${p.upstream_id}`}
                          </td>
                          <td className="px-4 py-3 text-xs text-secondary truncate max-w-[140px]">{p.account}</td>
                          <td className="px-4 py-3 text-xs text-secondary truncate max-w-[140px]">{p.stakeholder}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-semibold ${
                              pos.activeCandidateCount === 0 ? 'text-red-500' :
                              pos.activeCandidateCount === 1 ? 'text-amber-500' :
                              pos.activeCandidateCount === 2 ? 'text-emerald-500' :
                              'text-blue-500'
                            }`}>
                              {pos.activeCandidateCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-secondary font-mono">{p.aging}d</td>
                          <td className="px-4 py-3">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
