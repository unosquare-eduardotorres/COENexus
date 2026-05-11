import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  TrendingUp,
  Globe,
  AlertTriangle,
  BarChart3,
  Users,
  User,
  Lightbulb,
  Trophy,
  Target,
  Calendar,
  Trash2,
} from 'lucide-react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import { braniacService } from '../../services/braniacService'
import {
  formatRate,
  formatPercent,
  formatDays,
  confidenceColor,
  confidenceTooltip,
  confidenceBadge,
  approvalBadgeSmall,
} from '../../components/braniac/profileUtils'
import MetricCard from '../../components/braniac/MetricCard'
import AddPatternForm from '../../components/braniac/AddPatternForm'
import ConfirmDeleteModal from '../../components/braniac/ConfirmDeleteModal'
import type {
  BraniacAccountSummary,
  BraniacPattern,
  BraniacStakeholderProfile,
} from '../../../../../shared/ipc-types'

const log = createRendererLogger('BraniacAccountDetail')

export default function AccountDetailPage() {
  const { account } = useParams<{ account: string }>()
  const accountName = account ? decodeURIComponent(account) : ''
  const navigate = useNavigate()

  const [summary, setSummary] = useState<BraniacAccountSummary | null>(null)
  const [profiles, setProfiles] = useState<BraniacStakeholderProfile[]>([])
  const [patterns, setPatterns] = useState<BraniacPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadAll = useCallback(async () => {
    if (!accountName) return
    try {
      setLoading(true)
      const [summaryRes, profilesRes, patternsRes] = await Promise.all([
        braniacService.getAccountSummary({ account: accountName }),
        braniacService.listProfiles({ account: accountName }),
        braniacService.listPatterns({ account: accountName }),
      ])
      if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data)
      else if (summaryRes.success) setSummary(null)
      if (profilesRes.success && profilesRes.data) setProfiles(profilesRes.data)
      if (patternsRes.success && patternsRes.data) setPatterns(patternsRes.data)
    } catch (err) {
      const msg = reportError(err)
      setError(msg)
      log.error('Failed to load account detail', { error: msg })
    } finally {
      setLoading(false)
    }
  }, [accountName])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const accountPatterns = useMemo(
    () => patterns.filter(p => p.account === accountName),
    [patterns, accountName],
  )

  const handleClearAccount = useCallback(
    async ({ include_jobs }: { include_jobs?: boolean }) => {
      try {
        setIsDeleting(true)
        const res = await braniacService.clearAccount({ account: accountName, include_jobs })
        if (res.success) {
          setShowDeleteModal(false)
          navigate('/agents/braniac/profiles')
        } else {
          setError(res.error ?? 'Failed to clear account')
        }
      } catch (err) {
        setError(reportError(err))
      } finally {
        setIsDeleting(false)
      }
    },
    [accountName, navigate],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading account…</span>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/agents/braniac/profiles')}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profiles
        </button>
        <div className="glass-panel p-8 rounded-2xl text-center">
          <Briefcase className="h-10 w-10 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-primary mb-1">Account not found</h3>
          <p className="text-xs text-muted">
            {error || `No analyzed profiles exist for "${accountName}" yet.`}
          </p>
        </div>
      </div>
    )
  }

  const rateFloor = summary.observed_rate_floor
  const rateCeiling = summary.observed_rate_ceiling
  const rateAvg = summary.avg_accepted_rate
  const impactSummary = [
    `${accountPatterns.length} pattern${accountPatterns.length === 1 ? '' : 's'}`,
    `${summary.stakeholder_count} stakeholder profile${summary.stakeholder_count === 1 ? '' : 's'}`,
  ]

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/agents/braniac/profiles')}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profiles
      </button>

      {error && (
        <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="glass-panel p-5 rounded-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-500/20">
            <Briefcase className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-primary truncate">{summary.account}</h2>
            <p className="text-xs text-muted">
              {summary.stakeholder_count} {summary.stakeholder_count === 1 ? 'stakeholder' : 'stakeholders'} · {summary.total_data_points} data points
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${confidenceColor(summary.avg_confidence_score)}`}
            title={confidenceTooltip(summary.avg_confidence_score)}
          >
            {Math.round(summary.avg_confidence_score * 100)}% avg confidence
          </span>
        </div>

        <section>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Performance Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Success Rate"
              value={summary.success_rate}
              format="percent"
              accent="green"
              tooltip="Total candidates accepted ÷ total candidates presented across this account"
            />
            <MetricCard
              label="Win Rate"
              value={summary.win_rate}
              format="percent"
              accent="violet"
              tooltip="Positions won ÷ positions closed across this account"
            />
            <MetricCard
              label="Candidates Presented"
              value={summary.total_candidates_presented}
              format="count"
            />
            <MetricCard
              label="Candidates Accepted"
              value={summary.total_candidates_accepted}
              format="count"
              accent="green"
            />
            <MetricCard
              label="Positions Closed"
              value={summary.total_closed_positions}
              format="count"
            />
            <MetricCard
              label="Positions Won"
              value={summary.total_won_positions}
              format="count"
              accent="violet"
            />
            <MetricCard
              label="Avg Days to Close"
              value={summary.avg_days_to_close}
              format="days"
              accent="blue"
            />
            <MetricCard
              label="Avg Published Rate"
              value={summary.avg_published_rate}
              format="currency"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(rateFloor !== null || rateCeiling !== null) && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Rate Analysis
              </h3>
              <div className="glass-panel-subtle p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Floor</span>
                  <span className="font-medium text-primary">{formatRate(rateFloor)}</span>
                </div>
                {rateAvg !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Average Accepted</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatRate(rateAvg)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Ceiling</span>
                  <span className="font-medium text-primary">{formatRate(rateCeiling)}</span>
                </div>
                {rateFloor !== null && rateCeiling !== null && rateCeiling > rateFloor && (
                  <div className="h-2 bg-gray-200 dark:bg-dark-muted/30 rounded-full overflow-hidden relative mt-1">
                    <div className="absolute inset-0 bg-green-400/40 dark:bg-green-500/30 rounded-full" />
                    {rateAvg !== null && (
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

          {(summary.accepted_countries.length > 0 || summary.rejected_countries.length > 0) && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Geography
              </h3>
              <div className="space-y-2">
                {summary.accepted_countries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {summary.accepted_countries.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                )}
                {summary.rejected_countries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {summary.rejected_countries.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        ✗ {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {summary.avg_time_to_decision_days !== null && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Decision Speed
              </h3>
              <p className="text-sm text-primary">
                Average <strong>{Math.round(summary.avg_time_to_decision_days)}</strong> days from candidate presentation to decision
              </p>
            </section>
          )}
        </div>

        {(summary.top_acceptance_signals.length > 0 || summary.top_rejection_reasons.length > 0) && (
          <section>
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Top Signals</h3>
            <div className="space-y-2">
              {summary.top_acceptance_signals.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1">Acceptance signals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.top_acceptance_signals.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                        <Target className="h-3 w-3 inline mr-0.5" />{s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {summary.top_rejection_reasons.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1">Rejection reasons</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.top_rejection_reasons.map((r, i) => (
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

        <section>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Stakeholders in this Account ({profiles.length})
          </h3>
          {profiles.length === 0 ? (
            <p className="text-xs text-muted">No stakeholder profiles available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className="glass-card-hover p-3 rounded-lg space-y-2 cursor-pointer"
                  onClick={() => navigate(`/agents/braniac/profiles/${encodeURIComponent(profile.stakeholder_name)}?account=${encodeURIComponent(profile.account)}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded bg-violet-100 dark:bg-violet-500/20 shrink-0">
                        <User className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{profile.stakeholder_name}</p>
                        <p className="text-[10px] text-muted">{profile.data_points_count} data points</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${confidenceBadge(profile.confidence_score)}`}
                    >
                      {Math.round(profile.confidence_score * 100)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1" title="Candidate success rate">
                      <Target className="h-3 w-3 text-green-500 shrink-0" />
                      <span className="text-primary font-medium">{formatPercent(profile.success_rate)}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Win rate">
                      <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="text-primary font-medium">{formatPercent(profile.win_rate)}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Avg days to close">
                      <Calendar className="h-3 w-3 text-blue-500 shrink-0" />
                      <span className="text-primary font-medium">{formatDays(profile.avg_days_to_close)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" /> Account-wide Patterns ({accountPatterns.length})
          </h3>
          {accountPatterns.length === 0 ? (
            <p className="text-xs text-muted">No patterns recorded for this account.</p>
          ) : (
            <div className="space-y-2">
              {accountPatterns.map(p => (
                <div key={p.id} className="glass-panel-subtle p-2.5 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-primary">{p.pattern_name}</p>
                      {p.stakeholder && (
                        <p className="text-[10px] text-muted">Stakeholder: {p.stakeholder}</p>
                      )}
                    </div>
                    {approvalBadgeSmall(p.approval_status)}
                  </div>
                  <p className="text-xs text-muted mt-1 line-clamp-3">{p.pattern_text}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-gray-100 dark:border-dark-border pt-4">
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Add Pattern for {summary.account}</h3>
          <AddPatternForm
            onPatternCreated={() => void loadAll()}
            defaultAccount={summary.account}
            defaultStakeholder={null}
          />
        </section>

        <section className="border-t border-gray-100 dark:border-dark-border pt-4">
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Metadata</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted">Last analyzed</span>
              <p className="text-primary">
                {summary.last_analyzed_at ? new Date(summary.last_analyzed_at).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-muted">Stakeholders</span>
              <p className="text-primary">{summary.stakeholder_count}</p>
            </div>
            {summary.last_inference_job_id && (
              <div className="col-span-2">
                <span className="text-muted">Last job ID</span>
                <p className="text-primary font-mono text-[10px]">{summary.last_inference_job_id}</p>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-red-200/50 dark:border-red-500/20 pt-4">
          <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Danger Zone</h3>
          <p className="text-xs text-muted mb-2">
            Clearing deletes every pattern and stakeholder profile associated with this account. Re-run Braniac to regenerate.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All Account Data
          </button>
        </section>
      </div>

      {showDeleteModal && (
        <ConfirmDeleteModal
          title={`Clear all data for ${summary.account}?`}
          description="This permanently deletes every pattern and stakeholder profile for this account. This action cannot be undone."
          impactSummary={impactSummary}
          includeJobsToggle
          confirmLabel="Clear Account"
          busy={isDeleting}
          onConfirm={handleClearAccount}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
