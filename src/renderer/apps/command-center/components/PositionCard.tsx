import { Link } from 'react-router-dom'
import type { TrackedPosition, HealthTier } from '../types'
import { CRITERIA_CONFIG } from '../types'

interface PositionCardProps {
  position: TrackedPosition
  href: string
}

const TIER_STYLES: Record<HealthTier, { border: string; badge: string; label: string }> = {
  critical: {
    border: 'border-l-red-500',
    badge: 'bg-red-500/15 text-red-500 border-red-500/25',
    label: 'Critical',
  },
  warning: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
    label: 'Warning',
  },
  good: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
    label: 'Good',
  },
  excellent: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-500/15 text-blue-500 border-blue-500/25',
    label: 'Excellent',
  },
}

export default function PositionCard({ position, href }: PositionCardProps) {
  const p = position.position
  const style = TIER_STYLES[position.healthTier]

  const countries = p.countries
    ? (() => { try { return (JSON.parse(p.countries) as string[]) } catch { return [p.countries] } })()
    : []

  const seniorities = p.seniorities
    ? (() => { try { return (JSON.parse(p.seniorities) as string[]) } catch { return [p.seniorities] } })()
    : []

  return (
    <Link to={href} className={`block glass-card-hover border-l-4 ${style.border} p-4 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border ${style.badge}`}>
              {style.label}
            </span>
            <span className="text-xs text-muted truncate">{p.account}</span>
          </div>
          <h4 className="text-sm font-semibold text-primary truncate">
            {p.job_title || `Position #${p.upstream_id}`}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-secondary">
            <span>{position.activeCandidateCount} active</span>
            <span className="text-muted">·</span>
            <span>{p.aging}d aging</span>
            {p.stakeholder && (
              <>
                <span className="text-muted">·</span>
                <span className="truncate">{p.stakeholder}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {seniorities.map(s => (
          <span key={s} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-dark-hover text-secondary">{s}</span>
        ))}
        {countries.map(c => (
          <span key={c} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-dark-hover text-secondary">{c}</span>
        ))}
      </div>

      {position.matchingCriteria.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {position.matchingCriteria.map(key => {
            const cfg = CRITERIA_CONFIG.find(c => c.key === key)
            return (
              <span
                key={key}
                className={`px-1.5 py-0.5 text-[10px] rounded border ${cfg?.colorClass ?? 'bg-gray-500/15 text-gray-400'}`}
              >
                {cfg?.label ?? key}
              </span>
            )
          })}
        </div>
      )}
    </Link>
  )
}
