import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import type { TrackedPosition } from '../types'
import { CRITERIA_CONFIG } from '../types'
import { TIER_CONFIG } from '../constants/tierConfig'

interface PositionCardProps {
  position: TrackedPosition
  href: string
}

export default function PositionCard({ position, href }: PositionCardProps) {
  const p = position.position
  const tier = TIER_CONFIG[position.healthTier]

  const countries = p.countries
    ? (() => { try { return (JSON.parse(p.countries) as string[]) } catch { return [p.countries] } })()
    : []

  const seniorities = p.seniorities
    ? (() => { try { return (JSON.parse(p.seniorities) as string[]) } catch { return [p.seniorities] } })()
    : []

  // Build compact metadata string: "0 active · Sr · Argentina, Bolivia +3"
  const seniorityStr = seniorities.length > 0
    ? seniorities.slice(0, 1).join(', ') + (seniorities.length > 1 ? ` +${seniorities.length - 1}` : '')
    : null
  const countryStr = countries.length > 0
    ? countries.slice(0, 2).join(', ') + (countries.length > 2 ? ` +${countries.length - 2}` : '')
    : null

  const metaParts = [
    `${position.activeCandidateCount} active`,
    seniorityStr,
    countryStr,
  ].filter(Boolean)

  // Build criteria text strip
  const criteriaLabels = position.matchingCriteria.map(key => {
    const cfg = CRITERIA_CONFIG.find(c => c.key === key)
    return cfg?.label ?? key
  })

  return (
    <Link
      to={href}
      className={`block glass-card-hover border-l-4 ${tier.borderLeft} p-4 transition-all${position.isVirtual ? ' opacity-60' : ''}`}
    >
      {/* Header: status icon + account + aging */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex items-center gap-1 text-[10px] font-medium ${tier.color}`}>
              <tier.Icon size={12} />
              {tier.label}
            </span>
            {position.isVirtual && (
              <span className="text-[10px] font-medium text-cyan-400">Virtual</span>
            )}
            <span className="text-xs text-muted truncate">{p.account}</span>
            {p.stakeholder && (
              <>
                <span className="text-muted text-[10px]">·</span>
                <span className="text-xs text-muted truncate">{p.stakeholder}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-primary truncate">
            {p.job_title || `Position #${p.upstream_id}`}
          </h4>

          {/* Compact metadata line */}
          <p className="text-xs text-secondary mt-1">
            {metaParts.join(' · ')}
          </p>
        </div>

        {/* Aging */}
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-secondary tabular-nums">{p.aging}<span className="text-xs text-muted font-normal">d</span></p>
        </div>
      </div>

      {/* Criteria as text strip */}
      {criteriaLabels.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-red-400">
          <AlertTriangle size={10} className="shrink-0" />
          <span className="truncate">{criteriaLabels.join(' · ')}</span>
        </div>
      )}
    </Link>
  )
}
