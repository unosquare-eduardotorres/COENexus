import { useEffect, useMemo, useState } from 'react'
import { prrService } from '../services/prrService'
import type { PrrCoeStatus, PrrDetailResult } from '../types'
import { PRR_COE_STATUSES } from '../types'

interface PrrDetailDrawerProps {
  upstreamId: number | null
  onClose: () => void
}

type DrawerTab = 'overview' | 'presentations' | 'comments'

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
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`
  return `${Math.floor(diffMonths / 12)}y ago`
}

function getCoeStatusBadgeStyle(status: PrrCoeStatus): string {
  const styles: Record<PrrCoeStatus, string> = {
    Active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    Idle: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    Closed: 'bg-red-500/15 text-red-400 border-red-500/25',
    Undefined: 'bg-gray-500/15 text-gray-300 border-gray-500/25',
    'Not Apply': 'bg-slate-500/15 text-slate-300 border-slate-500/25',
  }
  return styles[status] ?? styles.Undefined
}

function getImpactBadgeStyle(impact: string): string {
  const value = impact.trim().toLowerCase()
  if (value.includes('high') || value.includes('critical')) return 'bg-red-500/15 text-red-400 border-red-500/25'
  if (value.includes('medium')) return 'bg-amber-500/15 text-amber-400 border-amber-500/25'
  if (value.includes('low')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
  return 'bg-white/5 text-secondary border-white/10'
}

function getRiskBadgeStyle(risk: string): string {
  const value = risk.trim().toLowerCase()
  if (value.includes('high') || value.includes('critical')) return 'bg-red-500/15 text-red-400 border-red-500/25'
  if (value.includes('medium')) return 'bg-amber-500/15 text-amber-400 border-amber-500/25'
  if (value.includes('low')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
  return 'bg-white/5 text-secondary border-white/10'
}

export default function PrrDetailDrawer({ upstreamId, onClose }: PrrDetailDrawerProps) {
  const [detail, setDetail] = useState<PrrDetailResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview')
  const [commentText, setCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const loadDetail = async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await prrService.getDetail(id)
      setDetail(data)
    } catch {
      setDetail(null)
      setError('Unable to load project reallocation details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!upstreamId) {
      setDetail(null)
      setError(null)
      return
    }
    setActiveTab('overview')
    void loadDetail(upstreamId)
  }, [upstreamId])

  useEffect(() => {
    if (!upstreamId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, upstreamId])

  const orderedComments = useMemo(() => {
    const comments = detail?.prr.coeComments ?? []
    return [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [detail])

  if (!upstreamId) return null

  const tabs: Array<{ key: DrawerTab; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'presentations', label: `Presentations (${detail?.presentations.length ?? 0})` },
    { key: 'comments', label: 'COE Comments' },
  ]

  const handleStatusChange = async (nextStatus: PrrCoeStatus) => {
    if (!detail || updatingStatus) return
    const previousStatus = detail.prr.coeStatus
    setUpdatingStatus(true)
    setDetail({ ...detail, prr: { ...detail.prr, coeStatus: nextStatus } })
    try {
      await prrService.updateCoeStatus(detail.prr.upstreamId, nextStatus)
    } catch {
      setDetail({ ...detail, prr: { ...detail.prr, coeStatus: previousStatus } })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddComment = async () => {
    if (!detail || savingComment) return
    const text = commentText.trim()
    if (!text) return
    setSavingComment(true)
    try {
      await prrService.addComment(detail.prr.upstreamId, text, 'COE User')
      setCommentText('')
      await loadDetail(detail.prr.upstreamId)
    } finally {
      setSavingComment(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-10 bottom-0 w-full max-w-2xl bg-dark-bg border-l border-t border-white/5 z-50 overflow-y-auto transform transition-transform duration-300 ease-out translate-x-0">
        <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur border-b border-white/5 px-6 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {detail ? (
                <>
                  <h2 className="text-base font-semibold text-primary truncate">{detail.prr.employee}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted font-mono">#{detail.prr.upstreamId}</span>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-secondary">{detail.prr.account || '—'}</span>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-secondary">{detail.prr.mainSkill || '—'}</span>
                  </div>
                </>
              ) : (
                <h2 className="text-base font-semibold text-primary">Project Reallocation Details</h2>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {detail && (
                <>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getCoeStatusBadgeStyle(detail.prr.coeStatus)}`}>
                    {detail.prr.coeStatus}
                  </span>
                  <span className="px-2 py-1 rounded-md text-xs font-mono font-bold text-primary bg-white/5">
                    {detail.prr.daysOpened}d
                  </span>
                </>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-secondary transition-colors" type="button">
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
                  type="button"
                >
                  {tab.label}
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

        {!loading && error && (
          <div className="p-6">
            <div className="glass-panel-subtle p-4 border border-red-500/20">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {!loading && detail && activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Employee</p>
                <p className="text-sm text-primary">{detail.prr.employee || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Client</p>
                <p className="text-sm text-primary">{detail.prr.account || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Team</p>
                <p className="text-sm text-primary">{detail.prr.team || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Main Skill</p>
                <p className="text-sm text-primary">{detail.prr.mainSkill || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Seniority</p>
                <p className="text-sm text-primary">{detail.prr.seniority || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">PRR Status</p>
                <p className="text-sm text-primary">{detail.prr.transitionStatus || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">CoE Status</p>
                <div className="flex items-center gap-2">
                  <select
                    value={detail.prr.coeStatus}
                    onChange={(event) => void handleStatusChange(event.target.value as PrrCoeStatus)}
                    disabled={updatingStatus}
                    className="glass-input text-xs h-8 min-w-[140px]"
                  >
                    {PRR_COE_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getCoeStatusBadgeStyle(detail.prr.coeStatus)}`}>
                    {detail.prr.coeStatus}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Location</p>
                <p className="text-sm text-primary">{detail.prr.location || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Impact</p>
                <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${getImpactBadgeStyle(detail.prr.impact)}`}>
                  {detail.prr.impact || '—'}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Attrition Risk</p>
                <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${getRiskBadgeStyle(detail.prr.attritionRisk)}`}>
                  {detail.prr.attritionRisk || '—'}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Request Date</p>
                <p className="text-sm text-primary">{formatDate(detail.prr.requestDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Days Opened</p>
                <p className="text-sm text-primary font-mono">{detail.prr.daysOpened}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Days Since Last Interview</p>
                <p className="text-sm text-primary">{detail.prr.daysSinceLastInterview || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Transition Sub Type</p>
                <p className="text-sm text-primary">{detail.prr.transitionSubType || '—'}</p>
              </div>
            </div>

            <div className="glass-panel-subtle p-4">
              <p className="text-xs text-muted uppercase tracking-wide mb-1">Upstream Comments</p>
              <p className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">{detail.prr.comments || '—'}</p>
            </div>
          </div>
        )}

        {!loading && detail && activeTab === 'presentations' && (
          <div className="p-6">
            {detail.presentations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-muted">No presentations found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Open Position ID', 'Client', 'Position Status', 'Location', 'Presented On', 'Candidate Status'].map(col => (
                      <th key={col} className="py-2 px-3 text-xs uppercase tracking-wider text-muted font-medium text-left">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {detail.presentations.map((presentation, index) => (
                    <tr key={`${presentation.openPositionId}-${index}`} className="hover:bg-white/[0.03]">
                      <td className="py-2.5 px-3 text-primary font-mono">#{presentation.openPositionId}</td>
                      <td className="py-2.5 px-3 text-primary">{presentation.account || '—'}</td>
                      <td className="py-2.5 px-3 text-secondary">{presentation.openPositionStatus || '—'}</td>
                      <td className="py-2.5 px-3 text-secondary">{presentation.location || '—'}</td>
                      <td className="py-2.5 px-3 text-secondary font-mono">{formatDate(presentation.presentedOn)}</td>
                      <td className="py-2.5 px-3 text-secondary">{presentation.candidateStatus || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && detail && activeTab === 'comments' && (
          <div className="p-6 space-y-4">
            <div className="space-y-0">
              {orderedComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm text-muted">No CoE comments yet</p>
                </div>
              ) : (
                orderedComments.map((comment, index) => (
                  <div key={`${comment.author}-${comment.createdAt}-${index}`}>
                    <div className="flex gap-3 py-3">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <span className="text-xs font-bold text-emerald-400">
                          {(comment.author || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-primary">{comment.author || 'Unknown'}</span>
                          <span className="text-xs text-muted font-mono" title={formatDateTime(comment.createdAt)}>
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    </div>
                    {index < orderedComments.length - 1 && <div className="minimal-divider my-1" />}
                  </div>
                ))
              )}
            </div>

            <div className="glass-panel-subtle p-4">
              <p className="text-xs text-muted uppercase tracking-wide mb-2">Add CoE Comment</p>
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Write a comment..."
                className="glass-input w-full min-h-[100px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => void handleAddComment()}
                  disabled={savingComment || !commentText.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  type="button"
                >
                  {savingComment ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !detail && !error && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted">Project reallocation not found</p>
          </div>
        )}
      </div>
    </>
  )
}
