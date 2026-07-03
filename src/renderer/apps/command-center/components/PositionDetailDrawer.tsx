import { useEffect, useState } from 'react'
import { reportService } from '../services/reportService'
import { useNexusStatus } from '../../../contexts/NexusStatusContext'
import { XIcon } from './Icons'
import PositionOverviewTab from './drawers/PositionOverviewTab'
import CandidatesTab from './drawers/CandidatesTab'
import DiscussionTab from './drawers/DiscussionTab'
import type { PositionDetailResult } from '../types'

interface PositionDetailDrawerProps {
  upstreamId: number | null
  onClose: () => void
  initialTab?: DrawerTab
}

type DrawerTab = 'overview' | 'description' | 'candidates' | 'discussion'

export default function PositionDetailDrawer({ upstreamId, onClose, initialTab }: PositionDetailDrawerProps) {
  const [detail, setDetail] = useState<PositionDetailResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview')
  const { apiTokens } = useNexusStatus()

  useEffect(() => {
    if (!upstreamId) {
      setDetail(null)
      return
    }
    setLoading(true)
    setActiveTab(initialTab ?? 'overview')
    reportService.getPositionDetail(upstreamId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [upstreamId])

  const additionalSkills = detail?.position.additional_skills
    ? (() => {
        try {
          const parsed = JSON.parse(detail.position.additional_skills) as Array<Record<string, unknown>>
          return parsed.map(s => ({ name: ((s.label ?? s.tagName ?? s.name ?? '') as string) }))
        } catch { return [] }
      })()
    : []

  const rateRange = detail
    ? (detail.position.minimum_rate != null || detail.position.maximum_rate != null)
      ? `$${detail.position.minimum_rate ?? 0} – $${detail.position.maximum_rate ?? 0}`
      : '—'
    : '—'

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
                  <h2 className="text-base font-semibold text-primary truncate">{detail.position.account}</h2>
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
                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">{detail.position.position_status}</span>
                  <span className="px-2 py-1 rounded-md text-xs font-mono font-bold text-primary bg-white/5">{detail.position.aging}d</span>
                </>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-secondary transition-colors"><XIcon /></button>
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
                    activeTab === tab.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-muted hover:text-secondary'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-muted">{tab.count}</span>
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
          <PositionOverviewTab position={detail.position} additionalSkills={additionalSkills} rateRange={rateRange} />
        )}

        {!loading && detail && activeTab === 'description' && (
          <div className="p-6">
            {detail.position.job_description ? (
              <div className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{detail.position.job_description}</div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted">No job description available</p>
              </div>
            )}
          </div>
        )}

        {!loading && detail && activeTab === 'candidates' && (
          <CandidatesTab candidates={detail.candidates} unocoreToken={apiTokens.unocore.token} />
        )}

        {!loading && detail && activeTab === 'discussion' && (
          <DiscussionTab discussions={detail.discussions} />
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
