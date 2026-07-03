import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { coeTrackingService } from '../services/coeTrackingService'
import type { SkillTrackingSummary, TrackedPosition, HealthBreakdown, HealthTier } from '../types'
import { TIER_CONFIG } from '../constants/tierConfig'
import TrackingCard from '../components/TrackingCard'
import CoeTrackingBreadcrumb from '../components/CoeTrackingBreadcrumb'
import EffectivenessRing from '../components/EffectivenessRing'
import HealthFilterPills from '../components/HealthFilterPills'

function buildSkillDescription(skill: SkillTrackingSummary): string {
  if (skill.healthBreakdown.critical > 0) {
    return `${skill.healthBreakdown.critical} position${skill.healthBreakdown.critical > 1 ? 's' : ''} need candidates`
  }
  return `${skill.coveredPositions} of ${skill.totalPositions} covered`
}

function StatWithTooltip({ value, label, color, tooltip }: { value: number; label: string; color: string; tooltip: string }) {
  return (
    <div className="text-center group relative">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
        <div className="glass-panel px-3 py-2 rounded-lg shadow-lg text-[10px] text-secondary whitespace-nowrap">
          {tooltip}
        </div>
      </div>
    </div>
  )
}

export default function PracticeSkillsPage() {
  const { coe: rawCoe, practice: rawPractice } = useParams<{ coe: string; practice: string }>()
  const coe = decodeURIComponent(rawCoe || '')
  const practice = decodeURIComponent(rawPractice || '')
  const navigate = useNavigate()

  const [data, setData] = useState<SkillTrackingSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<HealthTier | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'by-skill' | 'all-positions'>('by-skill')
  const [practicePositions, setPracticePositions] = useState<TrackedPosition[] | null>(null)
  const [positionsLoading, setPositionsLoading] = useState(false)

  useEffect(() => {
    if (!coe || !practice) return
    setLoading(true)
    coeTrackingService.getPracticeDetail(coe, practice)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [coe, practice])

  useEffect(() => {
    if (activeTab !== 'all-positions' || !coe || !practice || practicePositions !== null) return
    setPositionsLoading(true)
    coeTrackingService.getPracticePositions(coe, practice)
      .then(setPracticePositions)
      .catch(() => setPracticePositions([]))
      .finally(() => setPositionsLoading(false))
  }, [activeTab, coe, practice, practicePositions])

  const totalPositions = data.reduce((sum, s) => sum + s.totalPositions, 0)
  const totalCovered = data.reduce((sum, s) => sum + s.coveredPositions, 0)
  const totalVirtual = data.reduce((sum, s) => sum + s.virtualPositions, 0)
  const overallEffectiveness = totalPositions > 0
    ? Math.round((totalCovered / totalPositions) * 100)
    : 0

  const skillBreakdown = useMemo<HealthBreakdown>(() => {
    const bd: HealthBreakdown = { critical: 0, warning: 0, good: 0, excellent: 0, won: 0 }
    for (const s of data) {
      bd.critical += s.healthBreakdown.critical
      bd.warning += s.healthBreakdown.warning
      bd.good += s.healthBreakdown.good
      bd.excellent += s.healthBreakdown.excellent
      bd.won += s.healthBreakdown.won
    }
    return bd
  }, [data])

  const positionsBreakdown = useMemo<HealthBreakdown>(() => {
    if (!practicePositions) return skillBreakdown
    const bd: HealthBreakdown = { critical: 0, warning: 0, good: 0, excellent: 0, won: 0 }
    for (const p of practicePositions) {
      if (!p.isVirtual) bd[p.healthTier]++
    }
    return bd
  }, [practicePositions, skillBreakdown])

  const activeBreakdown = activeTab === 'by-skill' ? skillBreakdown : positionsBreakdown

  const filteredSkills = useMemo(() => {
    if (filter === 'all') return data
    return data.filter(s => s.healthBreakdown[filter] > 0)
  }, [data, filter])

  const filteredPositions = useMemo(() => {
    if (!practicePositions) return []
    if (filter === 'all') return practicePositions
    return practicePositions.filter(p => p.healthTier === filter)
  }, [practicePositions, filter])

  const enc = encodeURIComponent

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading skills...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CoeTrackingBreadcrumb
        segments={[
          { label: 'C.O.E. Tracking', href: '/command-center/coe-tracking' },
          { label: coe, href: `/command-center/coe-tracking/${enc(coe)}` },
          { label: practice },
        ]}
      />

      <div className="glass-panel p-5">
        <div className="flex items-center gap-5">
          <EffectivenessRing percent={overallEffectiveness} size="lg" />
          <div>
            <h1 className="text-xl font-bold text-primary">{practice}</h1>
            <p className="text-sm text-secondary mt-0.5">{coe}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{totalPositions}</p>
                <p className="text-[10px] text-muted">Total Positions</p>
              </div>
              <StatWithTooltip
                value={totalCovered}
                label="Covered"
                color="text-emerald-500"
                tooltip="Positions with at least 1 active candidate or an approved hire"
              />
              <StatWithTooltip
                value={totalPositions - totalCovered}
                label="Uncovered"
                color="text-red-500"
                tooltip="Positions with 0 active candidates — need sourcing attention"
              />
              {totalVirtual > 0 && (
                <StatWithTooltip
                  value={totalVirtual}
                  label="Virtual"
                  color="text-cyan-400"
                  tooltip="Internal/CE positions — not counted in coverage metrics"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center glass-panel-subtle rounded-lg p-1 gap-1">
          <button
            onClick={() => setActiveTab('by-skill')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'by-skill'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            By Skill
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

      {activeTab === 'by-skill' && (
        <>
          {filteredSkills.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted">
                {data.length === 0
                  ? `No skills found for ${practice} in ${coe}.`
                  : `No skills have positions with "${filter}" health status.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-3 md:grid-cols-2 grid-cols-1">
              {filteredSkills.map(skill => (
                <TrackingCard
                  key={skill.skill}
                  name={skill.skill}
                  effectivenessPercent={skill.effectivenessPercent}
                  totalPositions={skill.totalPositions}
                  coveredPositions={skill.coveredPositions}
                  healthBreakdown={skill.healthBreakdown}
                  href={`/command-center/coe-tracking/${enc(coe)}/${enc(practice)}/${enc(skill.skill)}`}
                  description={buildSkillDescription(skill)}
                  virtualPositions={skill.virtualPositions}
                />
              ))}
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
                {!practicePositions || practicePositions.length === 0
                  ? `No positions found for ${practice} in ${coe}.`
                  : `No positions match the "${filter}" health filter.`}
              </p>
            </div>
          ) : (
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider w-16">Status</th>
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
                      const skill = p.main_skill || 'Unspecified'
                      const tier = TIER_CONFIG[pos.healthTier]
                      return (
                        <tr
                          key={p.upstream_id}
                          onClick={() => navigate(`/command-center/coe-tracking/${enc(coe)}/${enc(practice)}/${enc(skill)}/${p.upstream_id}`)}
                          className={`border-l-4 ${tier.borderLeft} ${tier.rowTint} hover:bg-white/[0.03] cursor-pointer transition-colors${pos.isVirtual ? ' opacity-60' : ''}`}
                        >
                          <td className="px-4 py-3 text-center">
                            <tier.Icon size={16} className={tier.color} />
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
                          <td className="px-4 py-3 text-xs text-secondary truncate max-w-[140px]">
                            {p.stakeholder}
                            {pos.isVirtual && (
                              <span className="ml-1 px-1 py-0.5 text-[9px] rounded bg-cyan-500/15 text-cyan-400">Virtual</span>
                            )}
                          </td>
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
