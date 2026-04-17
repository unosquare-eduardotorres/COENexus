import { useEffect, useState, useMemo } from 'react'
import { reportService } from '../services/reportService'
import { useNexusStatus } from '../../../contexts/NexusStatusContext'
import type { PositionDetailResult } from '../types'

interface PositionDetailDrawerProps {
  upstreamId: number | null
  onClose: () => void
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

type DrawerTab = 'overview' | 'description' | 'candidates' | 'discussion'

export default function PositionDetailDrawer({ upstreamId, onClose }: PositionDetailDrawerProps) {
  const [detail, setDetail] = useState<PositionDetailResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview')
  const [feedbackCatalog, setFeedbackCatalog] = useState<Record<number, string>>({})
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const { sharepoint } = useNexusStatus()

  useEffect(() => {
    if (!upstreamId) {
      setDetail(null)
      return
    }
    setLoading(true)
    setActiveTab('overview')
    setExpandedComments(new Set())
    reportService.getPositionDetail(upstreamId)
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

  const additionalSkills = detail?.position.additional_skills
    ? (() => {
        try {
          const parsed = JSON.parse(detail.position.additional_skills) as Array<Record<string, unknown>>
          return parsed.map(s => ({
            name: ((s.label ?? s.tagName ?? s.name ?? '') as string),
          }))
        } catch { return [] }
      })()
    : []

  const rateRange = detail
    ? (detail.position.minimum_rate != null || detail.position.maximum_rate != null)
      ? `$${detail.position.minimum_rate ?? 0} – $${detail.position.maximum_rate ?? 0}`
      : '—'
    : '—'

  const rejectedCandidates = useMemo(() =>
    (detail?.candidates ?? []).filter(c => c.candidateStatus === 'RejectedByClient'),
    [detail]
  )

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

  function toggleCommentExpand(candidateRequisitionId: number) {
    setExpandedComments(prev => {
      const next = new Set(prev)
      if (next.has(candidateRequisitionId)) {
        next.delete(candidateRequisitionId)
      } else {
        next.add(candidateRequisitionId)
      }
      return next
    })
  }

  function resolveFeedbackLabels(ids: number[]): string[] {
    return ids.map(id => feedbackCatalog[id] || `Feedback #${id}`)
  }

  if (!upstreamId) return null

  const tabs: Array<{ key: DrawerTab; label: string; count?: number }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'description', label: 'Description' },
    { key: 'candidates', label: 'Candidates', count: detail?.candidates.length },
    { key: 'discussion', label: 'Discussion', count: detail?.discussions.length },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-10 bottom-0 w-full max-w-2xl bg-dark-bg border-l border-t border-white/5 z-50 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur border-b border-white/5 px-6 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {detail ? (
                <>
                  <h2 className="text-base font-semibold text-primary truncate">
                    {detail.position.account}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted font-mono">#{detail.position.upstream_id}</span>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-secondary">{detail.position.main_skill}</span>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-secondary">{detail.position.seniorities || '—'}</span>
                  </div>
                </>
              ) : (
                <h2 className="text-base font-semibold text-primary">Position Details</h2>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {detail && (
                <>
                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    {detail.position.position_status}
                  </span>
                  <span className="px-2 py-1 rounded-md text-xs font-mono font-bold text-primary bg-white/5">
                    {detail.position.aging}d
                  </span>
                </>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-secondary transition-colors">
                <XIcon />
              </button>
            </div>
          </div>
        </div>

        {detail && !loading && (
          <div className="sticky top-[73px] z-10 bg-dark-bg/95 backdrop-blur border-b border-white/5 px-6">
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-muted hover:text-secondary'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-muted">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && detail && activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Job Title', value: detail.position.job_title || '—' },
                { label: 'COE', value: detail.position.coe },
                { label: 'Practice', value: detail.position.practice },
                { label: 'Stakeholder', value: detail.position.stakeholder },
                { label: 'CSU / CS', value: `${detail.position.csu || '—'} / ${detail.position.cs || '—'}` },
                { label: 'Countries', value: detail.position.countries || '—' },
                { label: 'Rate Range', value: rateRange },
                { label: 'Sourcing', value: detail.position.sourcing || '—' },
                { label: 'Vertical', value: detail.position.vertical_industry || '—' },
              ].map(row => (
                <div key={row.label}>
                  <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{row.label}</p>
                  <p className="text-sm text-primary">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="glass-panel-subtle p-4 flex items-center justify-between">
              {[
                { label: 'Created', value: formatDate(detail.position.created), highlight: false },
                { label: 'Ready Date', value: formatDate(detail.position.ready_date), highlight: false },
                { label: 'Last Modified', value: formatDate(detail.position.last_modification), highlight: false },
                { label: 'Aging', value: `${detail.position.aging} days`, highlight: true },
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
                  {additionalSkills.map((s, i) => (
                    <span key={i} className="px-2 py-1 rounded-md bg-white/5 text-xs text-secondary border border-white/5">{s.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && detail && activeTab === 'description' && (
          <div className="p-6">
            {detail.position.job_description ? (
              <div className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                {detail.position.job_description}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted">No job description available</p>
              </div>
            )}
          </div>
        )}

        {!loading && detail && activeTab === 'candidates' && (
          <div className="p-6 space-y-6">
            {detail.candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-muted">No candidates presented</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Name', 'Status', 'Skill', 'Rate', 'Start'].map(col => (
                      <th key={col} className={`py-2 px-3 text-xs uppercase tracking-wider text-muted font-medium ${col === 'Rate' ? 'text-right' : 'text-left'}`}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {detail.candidates.map(c => (
                    <tr key={c.candidateRequisitionId} className="hover:bg-white/[0.03]">
                      <td className="py-2.5 px-3 text-primary font-medium">{c.candidateName}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-secondary">{c.candidateStatus}</span>
                      </td>
                      <td className="py-2.5 px-3 text-secondary">{c.mainSkill}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-secondary">${c.rate}</td>
                      <td className="py-2.5 px-3 text-secondary font-mono">{formatDate(c.startDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {rejectedCandidates.length > 0 && (
              <div className="glass-panel-subtle p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-primary">Rejected by Client</h3>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/25">
                    {rejectedCandidates.length}
                  </span>
                </div>

                {rejectedCandidates.every(c => c.rejectionFeedback.length === 0 && !c.rejectionComments) ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-xs text-amber-300">Rejection feedback unavailable. Re-sync open positions to fetch rejection details.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-2 px-3 text-xs uppercase tracking-wider text-muted font-medium text-left">Candidate</th>
                        <th className="py-2 px-3 text-xs uppercase tracking-wider text-muted font-medium text-left">Feedback</th>
                        <th className="py-2 px-3 text-xs uppercase tracking-wider text-muted font-medium text-left">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rejectedCandidates.map(c => {
                        const feedbackLabels = resolveFeedbackLabels(c.rejectionFeedback)
                        const isLongComment = c.rejectionComments.length > 120
                        const isExpanded = expandedComments.has(c.candidateRequisitionId)
                        const displayComment = isLongComment && !isExpanded
                          ? c.rejectionComments.slice(0, 120) + '...'
                          : c.rejectionComments

                        return (
                          <tr key={c.candidateRequisitionId} className="hover:bg-white/[0.03] align-top">
                            <td className="py-2.5 px-3">
                              <p className="text-primary font-medium">{c.candidateName}</p>
                              {c.rejectionActionDate && (
                                <p className="text-xs text-muted font-mono mt-0.5">{formatDate(c.rejectionActionDate)}</p>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {feedbackLabels.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {feedbackLabels.map((label, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-xs">
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {c.rejectionComments ? (
                                <div>
                                  <p className="text-xs text-secondary leading-relaxed">{displayComment}</p>
                                  {isLongComment && (
                                    <button
                                      onClick={() => toggleCommentExpand(c.candidateRequisitionId)}
                                      className="text-xs text-emerald-400 hover:text-emerald-300 mt-1 transition-colors"
                                    >
                                      {isExpanded ? 'Show less' : 'Show more'}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

        {!loading && detail && activeTab === 'discussion' && (
          <div className="p-6">
            {detail.discussions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-muted">No discussion comments yet</p>
              </div>
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
        )}

        {!loading && !detail && upstreamId && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted">Position not found</p>
          </div>
        )}
      </div>
    </>
  )
}
