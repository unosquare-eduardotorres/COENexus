import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Info } from 'lucide-react'
import { coeTrackingService } from '../services/coeTrackingService'
import { reportService } from '../services/reportService'
import { useNexusStatus } from '../../../contexts/NexusStatusContext'
import type { TrackedPositionDetail } from '../types'
import { TIER_CONFIG } from '../constants/tierConfig'
import CoeTrackingBreadcrumb from '../components/CoeTrackingBreadcrumb'
import CandidatePipeline from '../components/CandidatePipeline'
import AgingTimeline from '../components/AgingTimeline'
import PositionDetailsPanel from '../components/coe/PositionDetailsPanel'
import PositionDiscussionSection from '../components/coe/PositionDiscussionSection'

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
  const { apiTokens } = useNexusStatus()

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

    if (apiTokens.unocore.token) {
      reportService.getFeedbackCatalog(apiTokens.unocore.token)
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
  }, [detail, apiTokens.unocore.token])

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

  const tier = TIER_CONFIG[detail.healthTier]
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
      <div className={`glass-panel border ${tier.bgColor} ${tier.borderColor} p-5`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <tier.Icon size={20} className={tier.color} />
              <span className={`text-lg font-bold ${tier.color}`}>{tier.label}</span>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div>
                <p className={`text-2xl font-bold ${tier.color}`}>{detail.activeCandidateCount}</p>
                <p className="text-[10px] text-muted">Active Candidates</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">{detail.candidates.length}</p>
                <p className="text-[10px] text-muted">Total Candidates</p>
              </div>
            </div>
            <p className="text-sm text-secondary mt-2 max-w-xl">{tier.description}</p>
          </div>
        </div>
      </div>

      {detail.isVirtual && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
          <Info size={16} />
          <span>This is a virtual/internal position (CE) used for organizational purposes — not a real client position.</span>
        </div>
      )}

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
        <button disabled className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 bg-gray-500/10 border border-gray-500/20 opacity-50 cursor-not-allowed" title="Coming soon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      <PositionDetailsPanel position={p} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Candidate Pipeline</h2>
        <CandidatePipeline candidates={detail.candidates} feedbackCatalog={feedbackCatalog} />
      </div>

      {detail.timelineEvents.length > 0 && detail.position.created && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Timeline</h2>
          <AgingTimeline events={detail.timelineEvents} createdDate={detail.position.created} />
        </div>
      )}

      {/* Job Description */}
      <div className="glass-panel p-5 space-y-3">
        <button onClick={() => setDescriptionExpanded(!descriptionExpanded)} className="flex items-center justify-between w-full text-left">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">Job Description</h2>
          <svg className={`w-4 h-4 text-muted transition-transform ${descriptionExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {descriptionExpanded && (
          p.job_description ? (
            <div className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{p.job_description}</div>
          ) : (
            <p className="text-sm text-muted">No job description available.</p>
          )
        )}
      </div>

      <PositionDiscussionSection discussions={detail.discussions} />
    </div>
  )
}
