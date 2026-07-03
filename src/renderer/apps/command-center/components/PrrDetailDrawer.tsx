import { useEffect, useState } from 'react'
import { prrService } from '../services/prrService'
import type { PrrCoeStatus, PrrDetailResult } from '../types'
import { XIcon } from './Icons'
import { getCoeStatusBadgeStyle } from '../utils/badgeStyles'
import PrrOverviewTab from './drawers/PrrOverviewTab'
import PresentationsTab from './drawers/PresentationsTab'
import PrrCommentsTab from './drawers/PrrCommentsTab'

interface PrrDetailDrawerProps {
  upstreamId: number | null
  onClose: () => void
  onDataChanged?: () => void
}

type DrawerTab = 'overview' | 'presentations' | 'comments'

export default function PrrDetailDrawer({ upstreamId, onClose, onDataChanged }: PrrDetailDrawerProps) {
  const [detail, setDetail] = useState<PrrDetailResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview')
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
    if (!upstreamId) { setDetail(null); setError(null); return }
    setActiveTab('overview')
    void loadDetail(upstreamId)
  }, [upstreamId])

  useEffect(() => {
    if (!upstreamId) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, upstreamId])

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
      onDataChanged?.()
    } catch {
      setDetail({ ...detail, prr: { ...detail.prr, coeStatus: previousStatus } })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddComment = async (text: string) => {
    if (!detail) return
    await prrService.addComment(detail.prr.upstreamId, text, 'COE User')
    await loadDetail(detail.prr.upstreamId)
    onDataChanged?.()
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
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getCoeStatusBadgeStyle(detail.prr.coeStatus)}`}>{detail.prr.coeStatus}</span>
                  <span className="px-2 py-1 rounded-md text-xs font-mono font-bold text-primary bg-white/5">{detail.prr.daysOpened}d</span>
                </>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-secondary transition-colors" type="button"><XIcon /></button>
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
          <PrrOverviewTab prr={detail.prr} onStatusChange={handleStatusChange} updatingStatus={updatingStatus} />
        )}

        {!loading && detail && activeTab === 'presentations' && (
          <PresentationsTab presentations={detail.presentations} />
        )}

        {!loading && detail && activeTab === 'comments' && (
          <PrrCommentsTab comments={detail.prr.coeComments} onCommentAdded={handleAddComment} />
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
