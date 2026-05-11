import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, User, TrendingUp, Globe, Award, Clock, AlertTriangle, Lightbulb, Info, BarChart3, Trash2 } from 'lucide-react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import { braniacService } from '../../services/braniacService'
import { parseJsonArray, formatRate, confidenceTooltip, confidenceColor, approvalBadgeSmall } from '../../components/braniac/profileUtils'
import MetricCard from '../../components/braniac/MetricCard'
import AddPatternForm from '../../components/braniac/AddPatternForm'
import ConfirmDeleteModal from '../../components/braniac/ConfirmDeleteModal'
import type { BraniacStakeholderProfile, BraniacPattern } from '../../../../../shared/ipc-types'

const log = createRendererLogger('BraniacProfileDetail')

export default function ProfileDetailPage() {
  const { profileId } = useParams<{ profileId: string }>()
  const [searchParams] = useSearchParams()
  const account = searchParams.get('account') ?? ''
  const navigate = useNavigate()
  const [profile, setProfile] = useState<BraniacStakeholderProfile | null>(null)
  const [linkedPatterns, setLinkedPatterns] = useState<BraniacPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteMode, setDeleteMode] = useState<'profile' | 'stakeholder' | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!profileId || !account) return
    try {
      setLoading(true)
      const stakeholderName = decodeURIComponent(profileId)
      const res = await braniacService.getProfile({ stakeholder: stakeholderName, account })
      if (res.success && res.data) {
        setProfile(res.data)

        const patternsRes = await braniacService.listPatterns({ account: res.data.account })
        if (patternsRes.success && patternsRes.data) {
          const filtered = patternsRes.data.filter(p =>
            p.stakeholder === res.data!.stakeholder_name ||
            (!p.stakeholder && p.pattern_text.toLowerCase().includes(res.data!.stakeholder_name.toLowerCase()))
          )
          setLinkedPatterns(filtered)
        }
      } else {
        setError('Profile not found')
      }
    } catch (err) {
      const msg = reportError(err)
      setError(msg)
      log.error('Failed to load profile', { error: msg })
    } finally {
      setLoading(false)
    }
  }, [profileId, account])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const handleDelete = useCallback(
    async ({ include_jobs }: { include_jobs?: boolean }) => {
      if (!profile || !deleteMode) return
      try {
        setIsDeleting(true)
        if (deleteMode === 'profile') {
          const res = await braniacService.deleteProfile({
            stakeholder: profile.stakeholder_name,
            account: profile.account,
          })
          if (!res.success) {
            setError(res.error ?? 'Failed to delete profile')
            return
          }
        } else {
          const res = await braniacService.clearStakeholder({
            account: profile.account,
            stakeholder: profile.stakeholder_name,
            include_jobs,
          })
          if (!res.success) {
            setError(res.error ?? 'Failed to clear stakeholder data')
            return
          }
        }
        setDeleteMode(null)
        navigate('/agents/braniac/profiles')
      } catch (err) {
        setError(reportError(err))
      } finally {
        setIsDeleting(false)
      }
    },
    [profile, deleteMode, navigate],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading profile…</span>
        </div>
      </div>
    )
  }

  if (error || !profile) {
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
          <User className="h-10 w-10 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-primary mb-1">Profile not found</h3>
          <p className="text-xs text-muted">{error || 'The requested profile could not be loaded.'}</p>
        </div>
      </div>
    )
  }

  const acceptedCountries = parseJsonArray(profile.accepted_countries)
  const rejectedCountries = parseJsonArray(profile.rejected_countries)
  const topRejections = parseJsonArray(profile.top_rejection_reasons)
  const topAcceptance = parseJsonArray(profile.top_acceptance_signals)
  const postedSeniorities = parseJsonArray(profile.posted_seniorities)
  const acceptedSeniorities = parseJsonArray(profile.accepted_seniorities)
  const rateFloor = profile.observed_rate_floor
  const rateCeiling = profile.observed_rate_ceiling
  const rateAvg = profile.avg_accepted_rate

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/agents/braniac/profiles')}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profiles
      </button>

      <div className="glass-panel p-5 rounded-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-500/20">
            <User className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-primary">{profile.stakeholder_name}</h2>
            <p className="text-xs text-muted">{profile.account}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${confidenceColor(profile.confidence_score)}`}
              title={confidenceTooltip(profile.confidence_score)}
            >
              {Math.round(profile.confidence_score * 100)}% confidence
            </span>
            <span
              className="text-sm text-muted"
              title="Total candidate submissions across all positions for this stakeholder"
            >
              {profile.data_points_count} data points
              <Info className="h-3 w-3 inline ml-1 opacity-50" />
            </span>
          </div>
        </div>

        <section>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Performance Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Success Rate"
              value={profile.success_rate}
              format="percent"
              accent="green"
              tooltip="Candidates accepted ÷ candidates presented"
            />
            <MetricCard
              label="Win Rate"
              value={profile.win_rate}
              format="percent"
              accent="violet"
              tooltip="Positions won ÷ positions closed"
            />
            <MetricCard
              label="Candidates Presented"
              value={profile.total_candidates_presented}
              format="count"
              tooltip="Total candidates submitted to this stakeholder"
            />
            <MetricCard
              label="Candidates Accepted"
              value={profile.total_candidates_accepted}
              format="count"
              accent="green"
              tooltip="Candidates accepted by this stakeholder"
            />
            <MetricCard
              label="Positions Closed"
              value={profile.total_closed_positions}
              format="count"
              tooltip="Total positions that reached a closing decision"
            />
            <MetricCard
              label="Positions Won"
              value={profile.total_won_positions}
              format="count"
              accent="violet"
              tooltip="Positions won (candidate placed)"
            />
            <MetricCard
              label="Avg Days to Close"
              value={profile.avg_days_to_close}
              format="days"
              accent="blue"
              tooltip="Average time from position open to close"
            />
            <MetricCard
              label="Avg Published Rate"
              value={profile.avg_published_rate}
              format="currency"
              tooltip="Average published hourly rate across positions"
            />
          </div>
        </section>

        {profile.preference_summary && (
          <section>
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Preference Summary</h3>
            <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">{profile.preference_summary}</p>
          </section>
        )}

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
                {rateFloor !== null && rateCeiling !== null && (
                  <div className="h-2 bg-gray-200 dark:bg-dark-muted/30 rounded-full overflow-hidden relative mt-1">
                    <div className="absolute inset-y-0 bg-green-400/40 dark:bg-green-500/30 rounded-full" style={{
                      left: '0%',
                      right: '0%',
                    }} />
                    {rateAvg !== null && rateCeiling > rateFloor && (
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

          {profile.avg_time_to_decision_days !== null && (
            <section>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Decision Speed
              </h3>
              <p className="text-sm text-primary">
                Average <strong>{Math.round(profile.avg_time_to_decision_days)}</strong> days from candidate presentation to decision
              </p>
            </section>
          )}
        </div>

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
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Add Pattern for {profile.stakeholder_name}</h3>
          <AddPatternForm
            onPatternCreated={() => void loadProfile()}
            defaultAccount={profile.account}
            defaultStakeholder={profile.stakeholder_name}
          />
        </section>

        <section className="border-t border-gray-100 dark:border-dark-border pt-4">
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Metadata</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted">Last updated</span>
              <p className="text-primary">{new Date(profile.updated_at).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-muted">Created</span>
              <p className="text-primary">{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
            {profile.last_inference_job_id && (
              <div className="col-span-2">
                <span className="text-muted">Last job ID</span>
                <p className="text-primary font-mono text-[10px]">{profile.last_inference_job_id}</p>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-red-200/50 dark:border-red-500/20 pt-4">
          <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Danger Zone</h3>
          <p className="text-xs text-muted mb-2">
            Deleting this profile only removes the aggregated analysis. Clearing all stakeholder data also deletes every pattern tied to this stakeholder.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDeleteMode('profile')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Profile Only
            </button>
            <button
              onClick={() => setDeleteMode('stakeholder')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All Stakeholder Data
            </button>
          </div>
        </section>
      </div>

      {deleteMode && (
        <ConfirmDeleteModal
          title={
            deleteMode === 'profile'
              ? `Delete profile for ${profile.stakeholder_name}?`
              : `Clear all data for ${profile.stakeholder_name}?`
          }
          description={
            deleteMode === 'profile'
              ? 'Removes this stakeholder profile only. Patterns and job history will remain.'
              : 'Deletes this stakeholder profile and all associated patterns. Optional: include past jobs.'
          }
          impactSummary={
            deleteMode === 'profile'
              ? [`${profile.stakeholder_name} (${profile.account}) profile`]
              : [
                  `${profile.stakeholder_name} (${profile.account}) profile`,
                  `${linkedPatterns.length} linked pattern${linkedPatterns.length === 1 ? '' : 's'}`,
                ]
          }
          includeJobsToggle={deleteMode === 'stakeholder'}
          confirmLabel={deleteMode === 'profile' ? 'Delete Profile' : 'Clear Stakeholder'}
          busy={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteMode(null)}
        />
      )}
    </div>
  )
}
