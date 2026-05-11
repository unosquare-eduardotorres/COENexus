import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, TrendingUp, Globe, Award, AlertTriangle, Clock, SlidersHorizontal, Target, Trophy, Calendar, Briefcase, Users } from 'lucide-react'
import { createRendererLogger } from '../../../../shared/utils/rendererLogger'
import { reportError } from '../../../../shared/utils/reportError'
import { braniacService } from '../../services/braniacService'
import { parseJsonArray, confidenceBadge, formatRate, confidenceTooltip, formatPercent, formatDays } from '../../components/braniac/profileUtils'
import type { BraniacStakeholderProfile, BraniacAccountSummary } from '../../../../../shared/ipc-types'

const log = createRendererLogger('BraniacProfilesTab')

type SortKey = 'name' | 'confidence' | 'dataPoints' | 'updated'
type ViewMode = 'accounts' | 'stakeholders'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'confidence', label: 'Confidence ↓' },
  { value: 'dataPoints', label: 'Data Points ↓' },
  { value: 'updated', label: 'Last Updated' },
]

const ACCOUNT_SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'confidence', label: 'Confidence ↓' },
  { value: 'dataPoints', label: 'Data Points ↓' },
  { value: 'updated', label: 'Last Analyzed' },
]

export default function ProfilesTab() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<BraniacStakeholderProfile[]>([])
  const [accountSummaries, setAccountSummaries] = useState<BraniacAccountSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('confidence')
  const [viewMode, setViewMode] = useState<ViewMode>('accounts')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [profilesRes, summariesRes] = await Promise.all([
        braniacService.listProfiles(),
        braniacService.listAccountSummaries(),
      ])
      if (profilesRes.success && profilesRes.data) setProfiles(profilesRes.data)
      if (summariesRes.success && summariesRes.data) setAccountSummaries(summariesRes.data.summaries)
    } catch (err) {
      const msg = reportError(err)
      setError(msg)
      log.error('Failed to load profiles', { error: msg })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const accounts = useMemo(() => {
    const set = new Set(profiles.map(p => p.account))
    return [...set].sort()
  }, [profiles])

  const filtered = useMemo(() => {
    let result = profiles

    if (accountFilter) {
      result = result.filter(p => p.account === accountFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.stakeholder_name.toLowerCase().includes(q) ||
        p.account.toLowerCase().includes(q)
      )
    }

    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.stakeholder_name.localeCompare(b.stakeholder_name)
        case 'confidence':
          return b.confidence_score - a.confidence_score
        case 'dataPoints':
          return b.data_points_count - a.data_points_count
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        default:
          return 0
      }
    })

    return result
  }, [profiles, accountFilter, search, sortKey])

  const filteredAccounts = useMemo(() => {
    let result = accountSummaries

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(a => a.account.toLowerCase().includes(q))
    }

    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.account.localeCompare(b.account)
        case 'confidence':
          return b.avg_confidence_score - a.avg_confidence_score
        case 'dataPoints':
          return b.total_data_points - a.total_data_points
        case 'updated': {
          const aT = a.last_analyzed_at ? new Date(a.last_analyzed_at).getTime() : 0
          const bT = b.last_analyzed_at ? new Date(b.last_analyzed_at).getTime() : 0
          return bT - aT
        }
        default:
          return 0
      }
    })

    return result
  }, [accountSummaries, search, sortKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading profiles…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="glass-panel p-3 rounded-xl bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-1 glass-panel-subtle rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode('accounts')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            viewMode === 'accounts'
              ? 'bg-violet-500/20 text-violet-600 dark:text-violet-300'
              : 'text-muted hover:bg-gray-100 dark:hover:bg-dark-hover/50'
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          Accounts ({accountSummaries.length})
        </button>
        <button
          onClick={() => setViewMode('stakeholders')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            viewMode === 'stakeholders'
              ? 'bg-violet-500/20 text-violet-600 dark:text-violet-300'
              : 'text-muted hover:bg-gray-100 dark:hover:bg-dark-hover/50'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Stakeholders ({profiles.length})
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={viewMode === 'accounts' ? 'Search accounts…' : 'Search stakeholders…'}
            className="glass-input w-full pl-9 pr-3 py-2 text-sm rounded-lg"
          />
        </div>

        {viewMode === 'stakeholders' && (
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="glass-select text-sm py-2 pl-3 pr-8 rounded-lg"
          >
            <option value="">All Accounts</option>
            {accounts.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}

        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="glass-select text-sm py-2 pl-3 pr-8 rounded-lg"
        >
          {(viewMode === 'accounts' ? ACCOUNT_SORT_OPTIONS : SORT_OPTIONS).map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {viewMode === 'accounts' ? (
        accountSummaries.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <Briefcase className="h-10 w-10 text-muted mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-primary mb-1">No accounts analyzed yet</h3>
            <p className="text-xs text-muted">Run a Braniac analysis from the Pipeline tab to generate account insights.</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <SlidersHorizontal className="h-10 w-10 text-muted mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-primary mb-1">No accounts match your search</h3>
            <p className="text-xs text-muted">Try a different search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredAccounts.map(summary => (
              <div
                key={summary.account}
                className="glass-card-hover p-4 rounded-xl space-y-3 cursor-pointer"
                onClick={() => navigate(`account/${encodeURIComponent(summary.account)}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-500/20 shrink-0">
                      <Briefcase className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-primary truncate">{summary.account}</h3>
                      <p className="text-xs text-muted">
                        {summary.stakeholder_count} {summary.stakeholder_count === 1 ? 'stakeholder' : 'stakeholders'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${confidenceBadge(summary.avg_confidence_score)}`}
                    title={confidenceTooltip(summary.avg_confidence_score)}
                  >
                    {Math.round(summary.avg_confidence_score * 100)}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-muted">
                      <TrendingUp className="h-3 w-3" />
                      <span>Rate Range</span>
                    </div>
                    <p className="text-primary font-medium">
                      {formatRate(summary.observed_rate_floor)} – {formatRate(summary.observed_rate_ceiling)}
                    </p>
                    {summary.avg_accepted_rate !== null && (
                      <p className="text-muted">Avg: {formatRate(summary.avg_accepted_rate)}</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-muted">
                      <Globe className="h-3 w-3" />
                      <span>Countries</span>
                    </div>
                    {summary.accepted_countries.length > 0 && (
                      <p className="text-green-600 dark:text-green-400">✓ {summary.accepted_countries.slice(0, 3).join(', ')}</p>
                    )}
                    {summary.rejected_countries.length > 0 && (
                      <p className="text-red-500 dark:text-red-400">✗ {summary.rejected_countries.slice(0, 3).join(', ')}</p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-muted">
                      <Users className="h-3 w-3" />
                      <span>Data Points</span>
                    </div>
                    <p className="text-primary font-medium">{summary.total_data_points}</p>
                    <p className="text-muted">across {summary.stakeholder_count}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs border-t border-gray-100 dark:border-dark-border/50 pt-2">
                  <div className="flex items-center gap-1.5" title="Aggregate candidate success rate">
                    <Target className="h-3 w-3 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted uppercase tracking-wide">Success</p>
                      <p className="text-primary font-semibold">{formatPercent(summary.success_rate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5" title="Aggregate win rate">
                    <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted uppercase tracking-wide">Win</p>
                      <p className="text-primary font-semibold">{formatPercent(summary.win_rate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5" title="Weighted average days to close">
                    <Calendar className="h-3 w-3 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted uppercase tracking-wide">To Close</p>
                      <p className="text-primary font-semibold">{formatDays(summary.avg_days_to_close)}</p>
                    </div>
                  </div>
                </div>

                {(summary.top_acceptance_signals.length > 0 || summary.top_rejection_reasons.length > 0) && (
                  <div className="text-xs space-y-1 border-t border-gray-100 dark:border-dark-border/50 pt-2">
                    {summary.top_acceptance_signals.length > 0 && (
                      <div className="flex items-start gap-1">
                        <Award className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-secondary">{summary.top_acceptance_signals.slice(0, 3).join(' · ')}</span>
                      </div>
                    )}
                    {summary.top_rejection_reasons.length > 0 && (
                      <div className="flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-secondary">{summary.top_rejection_reasons.slice(0, 3).join(' · ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : profiles.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center">
          <User className="h-10 w-10 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-primary mb-1">No profiles generated yet</h3>
          <p className="text-xs text-muted">Run a Braniac analysis from the Pipeline tab to generate stakeholder profiles.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center">
          <SlidersHorizontal className="h-10 w-10 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-primary mb-1">No profiles match your filter</h3>
          <p className="text-xs text-muted">Try adjusting your search or account filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(profile => {
            const acceptedCountries = parseJsonArray(profile.accepted_countries)
            const rejectedCountries = parseJsonArray(profile.rejected_countries)
            const topRejections = parseJsonArray(profile.top_rejection_reasons)
            const topAcceptance = parseJsonArray(profile.top_acceptance_signals)
            const postedSeniorities = parseJsonArray(profile.posted_seniorities)
            const acceptedSeniorities = parseJsonArray(profile.accepted_seniorities)

            return (
              <div
                key={profile.id}
                className="glass-card-hover p-4 rounded-xl space-y-3 cursor-pointer"
                onClick={() => navigate(`${encodeURIComponent(profile.stakeholder_name)}?account=${encodeURIComponent(profile.account)}`)}
              >
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
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${confidenceBadge(profile.confidence_score)}`}
                    title={confidenceTooltip(profile.confidence_score)}
                  >
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
                  <div className="text-muted" title="Total candidate submissions across all positions for this stakeholder">
                    {profile.data_points_count} data points
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
      )}
    </div>
  )
}
