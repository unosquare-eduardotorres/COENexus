import { useState } from 'react'
import { User, TrendingUp, Target, AlertTriangle, Clock, Trophy, Users, Calendar } from 'lucide-react'
import type { BraniacStakeholderProfile } from '../../../../../shared/ipc-types'
import StakeholderProfileDetailModal from './StakeholderProfileDetailModal'
import { parseJsonArray, formatRate, formatPercent, formatDays } from './profileUtils'

interface StakeholderProfileCardsProps {
  profiles: BraniacStakeholderProfile[]
}

function rateBadgeColor(rate: number, highThreshold = 0.3, midThreshold = 0.15) {
  if (rate >= highThreshold) return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
  if (rate >= midThreshold) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
  return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
}

export default function StakeholderProfileCards({ profiles }: StakeholderProfileCardsProps) {
  const [selectedProfile, setSelectedProfile] = useState<BraniacStakeholderProfile | null>(null)

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
          const topRejections = parseJsonArray(profile.top_rejection_reasons)
          const hasWinRate = profile.win_rate != null
          const hasSuccessRate = profile.success_rate != null

          return (
            <div
              key={profile.id}
              className="glass-card-hover p-4 rounded-xl space-y-3 cursor-pointer"
              onClick={() => setSelectedProfile(profile)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-500/20 shrink-0">
                    <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-primary truncate">{profile.stakeholder_name}</h3>
                    <p className="text-xs text-muted truncate">{profile.account}</p>
                  </div>
                </div>
                {hasWinRate && (
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-muted uppercase tracking-wide">Win Rate</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rateBadgeColor(profile.win_rate!, 0.5, 0.25)}`}>
                        <Trophy className="h-3 w-3" />
                        {Math.round(profile.win_rate! * 100)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted mt-0.5">
                      {profile.total_won_positions} of {profile.total_closed_positions} positions won
                    </p>
                  </div>
                )}
              </div>

              {profile.preference_summary && (
                <p className="text-xs text-secondary leading-relaxed line-clamp-3">
                  {profile.preference_summary}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="glass-panel-subtle rounded-lg p-2 space-y-0.5">
                  <div className="flex items-center gap-1 text-muted">
                    <Trophy className="h-3 w-3" />
                    <span>Win Rate</span>
                  </div>
                  {hasWinRate ? (
                    <>
                      <p className="text-primary font-semibold">{Math.round(profile.win_rate! * 100)}%</p>
                      <p className="text-[10px] text-muted">{profile.total_won_positions}/{profile.total_closed_positions} closed</p>
                    </>
                  ) : (
                    <p className="text-muted">No closed positions</p>
                  )}
                </div>
                <div className="glass-panel-subtle rounded-lg p-2 space-y-0.5">
                  <div className="flex items-center gap-1 text-muted">
                    <Target className="h-3 w-3" />
                    <span>Candidate Success</span>
                  </div>
                  {hasSuccessRate ? (
                    <>
                      <p className="text-primary font-semibold">{Math.round(profile.success_rate! * 100)}%</p>
                      <p className="text-[10px] text-muted">{profile.total_candidates_accepted}/{profile.total_candidates_presented} accepted</p>
                    </>
                  ) : (
                    <p className="text-muted">No candidates yet</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted">
                    <TrendingUp className="h-3 w-3" />
                    <span>Avg Published Rate</span>
                  </div>
                  <p className="text-primary font-medium">
                    {profile.avg_published_rate != null
                      ? formatRate(profile.avg_published_rate)
                      : `${formatRate(profile.observed_rate_floor)} – ${formatRate(profile.observed_rate_ceiling)}`}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted">
                    <TrendingUp className="h-3 w-3" />
                    <span>Avg Accepted Rate</span>
                  </div>
                  <p className="text-primary font-medium">
                    {formatRate(profile.avg_accepted_rate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs border-t border-gray-100 dark:border-dark-border/50 pt-2 flex-wrap">
                {profile.avg_days_to_close != null && (
                  <div className="flex items-center gap-1 text-muted">
                    <Clock className="h-3 w-3" />
                    <span>{Math.round(profile.avg_days_to_close)}d avg to close</span>
                  </div>
                )}
                <div
                  className="flex items-center gap-1 text-muted"
                  title="Total candidate submissions across all positions for this stakeholder"
                >
                  <Users className="h-3 w-3" />
                  <span>{profile.data_points_count} data points</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs border-t border-gray-100 dark:border-dark-border/50 pt-2">
                <div className="flex items-center gap-1.5" title="Candidate success rate (accepted / presented)">
                  <Target className="h-3 w-3 text-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted uppercase tracking-wide">Success</p>
                    <p className="text-primary font-semibold">{formatPercent(profile.success_rate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5" title="Win rate (won / closed positions)">
                  <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted uppercase tracking-wide">Win</p>
                    <p className="text-primary font-semibold">{formatPercent(profile.win_rate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5" title="Average days from open to close">
                  <Calendar className="h-3 w-3 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted uppercase tracking-wide">To Close</p>
                    <p className="text-primary font-semibold">{formatDays(profile.avg_days_to_close)}</p>
                  </div>
                </div>
              </div>

              {topRejections.length > 0 && (
                <div className="text-xs space-y-1 border-t border-gray-100 dark:border-dark-border/50 pt-2">
                  <div className="flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-secondary">{topRejections.slice(0, 3).join(' · ')}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedProfile && (
        <StakeholderProfileDetailModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  )
}
