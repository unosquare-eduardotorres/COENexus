import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { coeTrackingService } from '../services/coeTrackingService'
import { reportService } from '../services/reportService'
import { useNexusStatus } from '../../../contexts/NexusStatusContext'
import type { TrackedPositionDetail, HealthTier } from '../types'
import CoeTrackingBreadcrumb from '../components/CoeTrackingBreadcrumb'
import CandidatePipeline from '../components/CandidatePipeline'
import AgingTimeline from '../components/AgingTimeline'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const TIER_HERO: Record<HealthTier, { bg: string; text: string; label: string; description: string }> = {
  critical: {
    bg: 'bg-red-500/10 border-red-500/25',
    text: 'text-red-500',
    label: '🔴 CRITICAL',
    description: 'This position has no active candidates in the pipeline. Immediate action is needed.',
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/25',
    text: 'text-amber-500',
    label: '🟡 WARNING',
    description: 'This position has only 1 active candidate. It could be rejected at any time with no backup.',
  },
  good: {
    bg: 'bg-emerald-500/10 border-emerald-500/25',
    text: 'text-emerald-500',
    label: '🟢 GOOD',
    description: 'This position has solid coverage with 2 active candidates in the pipeline.',
  },
  excellent: {
    bg: 'bg-blue-500/10 border-blue-500/25',
    text: 'text-blue-500',
    label: '🔵 EXCELLENT',
    description: 'This position has excellent coverage with 3+ active candidates in the pipeline.',
  },
}

export default function CoePositionDetailPage() {
  const { coe: rawCoe, practice: rawPractice, skill: rawSkill, positionId } = useParams<{ coe: string; practice: string; skill: string; positionId: string }>()
  const coe = decodeURIComponent(rawCoe || '')
  const practice = decodeURIComponent(rawPractice || '')
  const skill = decodeURIComponent(rawSkill || '')
  const upstreamId = Number(positionId)

  const [detail, setDetail] = useState<TrackedPositionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedbackCatalog, setFeedbackCatalog] = useState<Record<number, string>>({})
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const { sharepoint } = useNexusStatus()

  useEffect(() => {
    if (!upstreamId) return
    setLoading(true)
    coeTrackingService.getPositionDetail(upstreamId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [upstreamId])

  useEffect(() => {
    if (!detail) return
    const hasRejected = detail.candidates.some(c => c.candidateStatus === 'RejectedByClient')
    if (!hasRejected) return

    if (sharepoint.token) {
      reportService.getFeedbackCatalog(sharepoint.token)
        .then(setFeedbackCatalog)
        .catch(() => {
          reportService.getFeedbackCatalogLocal()
            .then(setFeedbackCatalog)
            .catch(() => setFeedbackCatalog({}))
        })
    } else {
      reportService.getFeedbackCatalogLocal()
        .then(setFeedbackCatalog)
        .catch(() => setFeedbackCatalog({}))
    }
  }, [detail, sharepoint.token])

  const additionalSkills = useMemo(() => {
    if (!detail?.position.additional_skills) return []
    try {
      const parsed = JSON.parse(detail.position.additional_skills) as Array<Record<string, unknown>>
      return parsed.map(s => ((s.label ?? s.tagName ?? s.name ?? '') as string)).filter(Boolean)
    } catch { return [] }
  }, [detail])

  const rateRange = detail
    ? (detail.position.minimum_rate != null || detail.position.maximum_rate != null)
      ? `$${detail.position.minimum_rate ?? 0} – $${detail.position.maximum_rate ?? 0}`
      : '—'
    : '—'

  const groupedDiscussions = useMemo(() => {
    if (!detail) return []
    const rootCommentIds = new Set(detail.discussions.map(d => d.commentId))
    const roots = detail.discussions.filter(d => !d.parentCommentId || !rootCommentIds.has(d.parentCommentId))
    const replyPool = detail.discussions.filter(d => d.parentCommentId && rootCommentIds.has(d.parentCommentId) && roots.every(r => r.commentId !== d.commentId))
    return roots
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(root => ({
        root,
        replies: replyPool
          .filter(d => d.parentCommentId === root.commentId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      }))
  }, [detail])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Loading position details...</span>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <CoeTrackingBreadcrumb
          segments={[
            { label: 'C.O.E. Tracking', href: '/command-center/coe-tracking' },
            { label: coe, href: `/command-center/coe-tracking/${encodeURIComponent(coe)}` },
            { label: practice, href: `/command-center/coe-tracking/${encodeURIComponent(coe)}/${encodeURIComponent(practice)}` },
            { label: skill, href: `/command-center/coe-tracking/${encodeURIComponent(coe)}/${encodeURIComponent(practice)}/${encodeURIComponent(skill)}` },
            { label: `Position #${positionId}` },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-sm text-muted">Position not found.</p>
        </div>
      </div>
    )
  }

  const hero = TIER_HERO[detail.healthTier]
  const p = detail.position

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <CoeTrackingBreadcrumb
        segments={[
          { label: 'C.O.E. Tracking', href: '/command-center/coe-tracking' },
          { label: coe, href: `/command-center/coe-tracking/${encodeURIComponent(coe)}` },
          { label: practice, href: `/command-center/coe-tracking/${encodeURIComponent(coe)}/${encodeURIComponent(practice)}` },
          { label: skill, href: `/command-center/coe-tracking/${encodeURIComponent(coe)}/${encodeURIComponent(practice)}/${encodeURIComponent(skill)}` },
          { label: p.job_title || `Position #${p.upstream_id}` },
        ]}
      />

      {/* Health Hero */}
      <div className={`glass-panel border ${hero.bg} p-5`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-lg font-bold ${hero.text}`}>{hero.label}</span>
            <div className="flex items-center gap-6 mt-2">
              <div>
                <p className={`text-2xl font-bold ${hero.text}`}>{detail.activeCandidateCount}</p>
                <p className="text-[10px] text-muted">Active Candidates</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">{detail.candidates.length}</p>
                <p className="text-[10px] text-muted">Total Candidates</p>
              </div>
            </div>
            <p className="text-sm text-secondary mt-2 max-w-xl">{hero.description}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.api.app.openExternal(
            `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Open-Positions.aspx?OpenPositionId=${p.upstream_id}`
          )}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open in SharePoint
        </button>
        <button
          disabled
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 bg-gray-500/10 border border-gray-500/20 opacity-50 cursor-not-allowed"
          title="Coming soon"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* Overview Grid */}
      <div className="glass-panel p-5 space-y-5">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Position Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Job Title', value: p.job_title || '—' },
            { label: 'COE', value: p.coe },
            { label: 'Practice', value: p.practice },
            { label: 'Stakeholder', value: p.stakeholder },
            { label: 'CSU / CS', value: `${p.csu || '—'} / ${p.cs || '—'}` },
            { label: 'Countries', value: p.countries || '—' },
            { label: 'Seniority', value: p.seniorities || '—' },
            { label: 'Rate Range', value: rateRange },
            { label: 'Sourcing', value: p.sourcing || '—' },
            { label: 'Vertical', value: p.vertical_industry || '—' },
            { label: 'Main Skill', value: p.main_skill || '—' },
          ].map(row => (
            <div key={row.label}>
              <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{row.label}</p>
              <p className="text-sm text-primary">{row.value}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel-subtle p-4 flex items-center justify-between">
          {[
            { label: 'Created', value: formatDate(p.created), highlight: false },
            { label: 'Ready Date', value: formatDate(p.ready_date), highlight: false },
            { label: 'Last Modified', value: formatDate(p.last_modification), highlight: false },
            { label: 'Aging', value: `${p.aging} days`, highlight: true },
          ].map((d, i, arr) => (
            <div key={d.label} className="flex items-center gap-0">
              <div className="text-center">
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{d.label}</p>
                <p className={`text-sm font-mono ${d.highlight ? 'text-emerald-400 font-bold' : 'text-primary'}`}>{d.value}</p>
              </div>
              {i < arr.length - 1 && <div className="w-px h-8 bg-white/10 mx-4" />}
            </div>
          ))}
        </div>

        {additionalSkills.length > 0 && (
          <div>
            <p className="text-xs text-muted uppercase tracking-wide mb-2">Additional Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {additionalSkills.map((name, i) => (
                <span key={i} className="px-2 py-1 rounded-md bg-white/5 text-xs text-secondary border border-white/5">{name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Candidate Pipeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Candidate Pipeline</h2>
        <CandidatePipeline candidates={detail.candidates} feedbackCatalog={feedbackCatalog} />
      </div>

      {/* Aging Timeline */}
      {detail.timelineEvents.length > 0 && detail.position.created && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Timeline</h2>
          <AgingTimeline events={detail.timelineEvents} createdDate={detail.position.created} />
        </div>
      )}

      {/* Job Description */}
      <div className="glass-panel p-5 space-y-3">
        <button
          onClick={() => setDescriptionExpanded(!descriptionExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Job Description</h2>
          <svg
            className={`w-4 h-4 text-muted transition-transform ${descriptionExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {descriptionExpanded && (
          p.job_description ? (
            <div className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
              {p.job_description}
            </div>
          ) : (
            <p className="text-sm text-muted">No job description available.</p>
          )
        )}
      </div>

      {/* Discussion */}
      <div className="glass-panel p-5 space-y-3">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">
          Discussion ({detail.discussions.length})
        </h2>
        {detail.discussions.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">No discussion comments yet.</p>
        ) : (
          <div className="space-y-0">
            {groupedDiscussions.map((thread, idx) => (
              <div key={thread.root.commentId}>
                <div className="flex gap-3 py-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-400">
                      {thread.root.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-primary">
                        {thread.root.author.split('@')[0]}
                      </span>
                      <span className="text-xs text-muted font-mono">
                        {formatDate(thread.root.date)}
                      </span>
                    </div>
                    <p className="text-sm text-secondary leading-relaxed">{thread.root.message}</p>
                  </div>
                </div>
                {thread.replies.length > 0 && (
                  <div className="ml-4 border-l-2 border-white/10 pl-4 space-y-0">
                    {thread.replies.map(reply => (
                      <div key={reply.commentId} className="flex gap-3 py-2.5">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                          <span className="text-xs font-bold text-muted">
                            {reply.author.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-secondary">
                              {reply.author.split('@')[0]}
                            </span>
                            <span className="text-xs text-muted font-mono">
                              {formatDate(reply.date)}
                            </span>
                          </div>
                          <p className="text-sm text-secondary leading-relaxed">{reply.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {idx < groupedDiscussions.length - 1 && <div className="minimal-divider my-1" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
