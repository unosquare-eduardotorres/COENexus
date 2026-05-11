import { useEffect, useState } from 'react'
import { X, User, TrendingUp, Globe, Award, Clock, AlertTriangle, Lightbulb, Info, Target, Trophy, Users } from 'lucide-react'
import type { BraniacStakeholderProfile, BraniacPattern } from '../../../../../shared/ipc-types'
import { braniacService } from '../../services/braniacService'
import { parseJsonArray, formatRate, approvalBadgeSmall } from './profileUtils'

interface StakeholderProfileDetailModalProps {
  profile: BraniacStakeholderProfile
  onClose: () => void
}

function rateBarColor(rate: number, highThreshold = 0.3, midThreshold = 0.15) {
  if (rate >= highThreshold) return 'bg-green-500'
  if (rate >= midThreshold) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function StakeholderProfileDetailModal({ profile, onClose }: StakeholderProfileDetailModalProps) {
  const [linkedPatterns, setLinkedPatterns] = useState<BraniacPattern[]>([])

  const acceptedCountries = parseJsonArray(profile.accepted_countries)
  const rejectedCountries = parseJsonArray(profile.rejected_countries)
  const topRejections = parseJsonArray(profile.top_rejection_reasons)
  const topAcceptance = parseJsonArray(profile.top_acceptance_signals)
  const postedSeniorities = parseJsonArray(profile.posted_seniorities)
  const acceptedSeniorities = parseJsonArray(profile.accepted_seniorities)

  useEffect(() => {
    braniacService.listPatterns({ account: profile.account }).then(res => {
      if (res.success && res.data) {
        const filtered = res.data.filter(p =>
          p.stakeholder === profile.stakeholder_name ||
          (!p.stakeholder && p.pattern_text.toLowerCase().includes(profile.stakeholder_name.toLowerCase()))
        )
        setLinkedPatterns(filtered)
      }
    })
  }, [profile.account, profile.stakeholder_name])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const rateFloor = profile.observed_rate_floor
  const rateCeiling = profile.observed_rate_ceiling
  const rateAvg = profile.avg_accepted_rate
  const hasWinRate = profile.win_rate != null
  const hasSuccessRate = profile.success_rate != null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-dark-bg border-l border-gray-200 dark:border-dark-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-gray-100 dark:border-dark-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-500/20">
              <User className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">{profile.stakeholder_name}</h2>
              <p className="text-xs text-muted">{profile.account}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-sm text-muted flex items-center gap-1"
              title="Total candidate submissions across all positions for this stakeholder"
            >
              <Users className="h-3.5 w-3.5" />
              {profile.data_points_count} data points
              <Info className="h-3 w-3 inline ml-1 opacity-50" />
            </span>
            {profile.avg_days_to_close != null && (
              <span className="text-sm text-muted flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {Math.round(profile.avg_days_to_close)}d avg to close
              </span>
            )}
          </div>

          {(hasWinRate || hasSuccessRate) && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Key Metrics
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {hasWinRate && (
                  <div className="glass-panel-subtle p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> Win Rate
                      </span>
                      <span className="font-semibold text-primary">{Math.round(profile.win_rate! * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Won / Closed Positions</span>
                      <span className="text-primary">{profile.total_won_positions} / {profile.total_closed_positions}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-dark-muted/30 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${rateBarColor(profile.win_rate!, 0.5, 0.25)}`}
                        style={{ width: `${Math.min(Math.round(profile.win_rate! * 100), 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {hasSuccessRate && (
                  <div className="glass-panel-subtle p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" /> Candidate Success Rate
                      </span>
                      <span className="font-semibold text-primary">{Math.round(profile.success_rate! * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Accepted / Presented</span>
                      <span className="text-primary">{profile.total_candidates_accepted} / {profile.total_candidates_presented}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-dark-muted/30 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${rateBarColor(profile.success_rate!)}`}
                        style={{ width: `${Math.min(Math.round(profile.success_rate! * 100), 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {profile.preference_summary && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Preference Summary</h3>
              <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">{profile.preference_summary}</p>
            </section>
          )}

          {(rateFloor != null || rateCeiling != null || profile.avg_published_rate != null) && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Rate Analysis
              </h3>
              <div className="glass-panel-subtle p-3 rounded-xl space-y-2">
                {profile.avg_published_rate != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Avg Published Rate</span>
                    <span className="font-medium text-primary">{formatRate(profile.avg_published_rate)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Floor</span>
                  <span className="font-medium text-primary">{formatRate(rateFloor)}</span>
                </div>
                {rateAvg != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Average Accepted</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatRate(rateAvg)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Ceiling</span>
                  <span className="font-medium text-primary">{formatRate(rateCeiling)}</span>
                </div>
                {rateFloor != null && rateCeiling != null && (
                  <div className="h-2 bg-gray-200 dark:bg-dark-muted/30 rounded-full overflow-hidden relative mt-1">
                    <div className="absolute inset-y-0 bg-green-400/40 dark:bg-green-500/30 rounded-full" style={{
                      left: '0%',
                      right: '0%',
                    }} />
                    {rateAvg != null && rateCeiling > rateFloor && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-green-600 dark:bg-green-400 rounded-full"
                        style={{ left: `${((rateAvg - rateFloor) / (rateCeiling - rateFloor)) * 100}%` }}
                        title={`Average: ${formatRate(rateAvg)}`}
                      />
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {(acceptedCountries.length > 0 || rejectedCountries.length > 0) && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Geography
              </h3>
              <div className="space-y-2">
                {acceptedCountries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {acceptedCountries.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                )}
                {rejectedCountries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rejectedCountries.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        ✗ {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {(postedSeniorities.length > 0 || acceptedSeniorities.length > 0) && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" /> Seniority
              </h3>
              <div className="glass-panel-subtle p-3 rounded-xl space-y-2 text-sm">
                {postedSeniorities.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-xs w-16">Posted:</span>
                    <span className="text-primary">{postedSeniorities.join(', ')}</span>
                  </div>
                )}
                {acceptedSeniorities.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-xs w-16">Accepted:</span>
                    <span className="text-primary">{acceptedSeniorities.join(', ')}</span>
                  </div>
                )}
                {profile.seniority_flexibility === 1 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                    Flexible on seniority
                  </span>
                )}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Decision Speed
            </h3>
            <div className="glass-panel-subtle p-3 rounded-xl space-y-2 text-sm">
              {profile.avg_days_to_close != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Avg days to close position</span>
                  <span className="font-medium text-primary">{Math.round(profile.avg_days_to_close)} days</span>
                </div>
              )}
              {profile.avg_time_to_decision_days != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Avg days to decision</span>
                  <span className="font-medium text-primary">{Math.round(profile.avg_time_to_decision_days)} days</span>
                </div>
              )}
              {profile.avg_days_to_close == null && profile.avg_time_to_decision_days == null && (
                <p className="text-sm text-muted">No timing data available</p>
              )}
            </div>
          </section>

          {(topAcceptance.length > 0 || topRejections.length > 0) && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Signals</h3>
              <div className="space-y-2">
                {topAcceptance.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-1">Acceptance signals</p>
                    <div className="flex flex-wrap gap-1.5">
                      {topAcceptance.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {topRejections.length > 0 && (
                  <div>
                    <p className="text-xs text-muted mb-1">Rejection reasons</p>
                    <div className="flex flex-wrap gap-1.5">
                      {topRejections.map((r, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3 inline mr-0.5" />{r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {linkedPatterns.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" /> Linked Patterns ({linkedPatterns.length})
              </h3>
              <div className="space-y-2">
                {linkedPatterns.map(p => (
                  <div key={p.id} className="glass-panel-subtle p-2.5 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-primary">{p.pattern_name}</p>
                      {approvalBadgeSmall(p.approval_status)}
                    </div>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{p.pattern_text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="border-t border-gray-100 dark:border-dark-border pt-4">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Metadata</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted">Confidence</span>
                <p className="text-primary">{Math.round(profile.confidence_score * 100)}%</p>
              </div>
              <div>
                <span className="text-muted">Last updated</span>
                <p className="text-primary">{new Date(profile.updated_at).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted">Created</span>
                <p className="text-primary">{new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
              {profile.last_inference_job_id && (
                <div>
                  <span className="text-muted">Last job ID</span>
                  <p className="text-primary font-mono text-[10px]">{profile.last_inference_job_id}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
