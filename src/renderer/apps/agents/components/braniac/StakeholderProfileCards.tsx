import { User, TrendingUp, Globe, Award, AlertTriangle, Clock } from 'lucide-react'
import type { BraniacStakeholderProfile } from '../../../../../shared/ipc-types'

interface StakeholderProfileCardsProps {
  profiles: BraniacStakeholderProfile[]
}

function parseJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function confidenceBadge(score: number) {
  if (score >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
  if (score >= 0.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
  return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
}

function formatRate(rate: number | null): string {
  if (rate === null || rate === undefined) return '—'
  return `$${rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function StakeholderProfileCards({ profiles }: StakeholderProfileCardsProps) {
  if (profiles.length === 0) {
    return (
      <div className="glass-panel p-5 rounded-2xl">
        <h2 className="text-base font-semibold text-primary mb-3">Stakeholder Profiles</h2>
        <p className="text-sm text-muted">No profiles generated yet. Run a Braniac job to create stakeholder profiles.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-primary">Stakeholder Profiles</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {profiles.map((profile) => {
          const acceptedCountries = parseJsonArray(profile.accepted_countries)
          const rejectedCountries = parseJsonArray(profile.rejected_countries)
          const topRejections = parseJsonArray(profile.top_rejection_reasons)
          const topAcceptance = parseJsonArray(profile.top_acceptance_signals)
          const postedSeniorities = parseJsonArray(profile.posted_seniorities)
          const acceptedSeniorities = parseJsonArray(profile.accepted_seniorities)

          return (
            <div key={profile.id} className="glass-card p-4 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-500/20">
                    <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary">{profile.stakeholder_name}</h3>
                    <p className="text-xs text-muted">{profile.account}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${confidenceBadge(profile.confidence_score)}`}>
                  {Math.round(profile.confidence_score * 100)}%
                </span>
              </div>

              {profile.preference_summary && (
                <p className="text-xs text-secondary leading-relaxed line-clamp-3">
                  {profile.preference_summary}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted">
                    <TrendingUp className="h-3 w-3" />
                    <span>Rates</span>
                  </div>
                  <p className="text-primary font-medium">
                    {formatRate(profile.observed_rate_floor)} – {formatRate(profile.observed_rate_ceiling)}
                  </p>
                  {profile.avg_accepted_rate !== null && (
                    <p className="text-muted">Avg: {formatRate(profile.avg_accepted_rate)}</p>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted">
                    <Globe className="h-3 w-3" />
                    <span>Countries</span>
                  </div>
                  {acceptedCountries.length > 0 && (
                    <p className="text-green-600 dark:text-green-400">✓ {acceptedCountries.slice(0, 3).join(', ')}</p>
                  )}
                  {rejectedCountries.length > 0 && (
                    <p className="text-red-500 dark:text-red-400">✗ {rejectedCountries.slice(0, 3).join(', ')}</p>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted">
                    <Award className="h-3 w-3" />
                    <span>Seniority</span>
                  </div>
                  <p className="text-primary">
                    {acceptedSeniorities.length > 0 ? acceptedSeniorities.join(', ') : postedSeniorities.join(', ') || '—'}
                  </p>
                  {profile.seniority_flexibility === 1 && (
                    <p className="text-violet-500 text-[10px]">Flexible</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs border-t border-gray-100 dark:border-dark-border/50 pt-2">
                {profile.avg_time_to_decision_days !== null && (
                  <div className="flex items-center gap-1 text-muted">
                    <Clock className="h-3 w-3" />
                    <span>{Math.round(profile.avg_time_to_decision_days)}d avg decision</span>
                  </div>
                )}
                <div className="text-muted">
                  {profile.data_points_count} data points
                </div>
              </div>

              {(topRejections.length > 0 || topAcceptance.length > 0) && (
                <div className="text-xs space-y-1 border-t border-gray-100 dark:border-dark-border/50 pt-2">
                  {topAcceptance.length > 0 && (
                    <div className="flex items-start gap-1">
                      <Award className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-secondary">{topAcceptance.slice(0, 3).join(' · ')}</span>
                    </div>
                  )}
                  {topRejections.length > 0 && (
                    <div className="flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-secondary">{topRejections.slice(0, 3).join(' · ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
