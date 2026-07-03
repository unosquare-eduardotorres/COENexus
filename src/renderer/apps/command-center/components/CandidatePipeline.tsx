import { useState } from 'react'
import { Send, Building2, MessageSquare, Archive, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TrackedPositionDetail } from '../types'

type Candidate = TrackedPositionDetail['candidates'][number]

interface CandidatePipelineProps {
  candidates: TrackedPositionDetail['candidates']
  feedbackCatalog?: Record<number, string>
}

const ACTIVE_STATUSES = ['PresentedToCGX', 'PresentedToClient', 'CustomerInterview'] as const

const STATUS_SYNONYMS: Record<string, string> = {
  PresentedToClientSuccess: 'PresentedToCGX',
}

function normalizeStatus(status: string): string {
  return STATUS_SYNONYMS[status] ?? status
}

const SUCCESS_STATUSES = new Set(['Approved', 'Hired', 'AcceptedByClient', 'Started', 'Active'])

const COLUMNS: Array<{
  status: string
  label: string
  Icon: LucideIcon
  iconColor: string
}> = [
  { status: 'PresentedToCGX', label: 'Presented to CGX', Icon: Send, iconColor: 'text-teal-400' },
  { status: 'PresentedToClient', label: 'Presented to Client', Icon: Building2, iconColor: 'text-violet-400' },
  { status: 'CustomerInterview', label: 'Customer Interview', Icon: MessageSquare, iconColor: 'text-indigo-400' },
  { status: 'Ended', label: 'Ended', Icon: Archive, iconColor: 'text-gray-400' },
]

function resolveFeedbackLabels(ids: number[], catalog: Record<number, string>): string[] {
  return ids.map(id => catalog[id] || `Feedback #${id}`)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CandidateCard({ candidate, isEnded, feedbackCatalog, isExpanded, onToggle }: {
  candidate: Candidate
  isEnded: boolean
  feedbackCatalog: Record<number, string>
  isExpanded: boolean
  onToggle: () => void
}) {
  const feedbackLabels = candidate.rejectionFeedback?.length
    ? resolveFeedbackLabels(candidate.rejectionFeedback, feedbackCatalog)
    : []

  const isSuccess = SUCCESS_STATUSES.has(candidate.candidateStatus)

  return (
    <div className={`p-3 rounded-lg ${
      isSuccess
        ? 'bg-emerald-500/10 border border-emerald-500/20'
        : isEnded
          ? 'glass-panel-subtle opacity-75'
          : 'glass-panel-subtle'
    }`}>
      <p className={`text-xs font-semibold ${isSuccess ? 'text-white' : 'text-primary'}`}>{candidate.candidateName}</p>
      <div className={`flex items-center gap-2 mt-1 text-[10px] ${isSuccess ? 'text-emerald-100' : 'text-slate-400'}`}>
        {candidate.mainSkill && <span>{candidate.mainSkill}</span>}
        {candidate.rate > 0 && <span>${candidate.rate}/hr</span>}
      </div>
      {candidate.startDate && (
        <p className={`text-[10px] mt-1 ${isSuccess ? 'text-emerald-200' : 'text-muted'}`}>{formatDate(candidate.startDate)}</p>
      )}

      {/* Status: show as subtle text for ended cards, inline badge for success */}
      {isSuccess && (
        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium text-emerald-400">
          <CheckCircle2 size={10} />
          {candidate.candidateStatus.replace(/([A-Z])/g, ' $1').trim()}
        </span>
      )}
      {isEnded && !isSuccess && (
        <p className="text-[10px] text-muted mt-1.5">
          {candidate.candidateStatus.replace(/([A-Z])/g, ' $1').trim()}
        </p>
      )}

      {/* Feedback labels as text list instead of pills */}
      {isEnded && feedbackLabels.length > 0 && (
        <p className="text-[10px] text-red-400/80 mt-1.5">
          {feedbackLabels.join(' · ')}
        </p>
      )}

      {isEnded && candidate.rejectionComments && (
        <div className="mt-2">
          <p className={`text-xs text-secondary leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
            {candidate.rejectionComments}
          </p>
          {candidate.rejectionComments.length > 120 && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle() }}
              className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 cursor-pointer"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function CandidatePipeline({ candidates, feedbackCatalog = {} }: CandidatePipelineProps) {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const toggleExpand = (id: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const columns = COLUMNS.map(col => {
    let filtered: Candidate[]
    if (col.status === 'Ended') {
      filtered = candidates.filter(c =>
        !(ACTIVE_STATUSES as readonly string[]).includes(normalizeStatus(c.candidateStatus))
      )
    } else {
      filtered = candidates.filter(c => normalizeStatus(c.candidateStatus) === col.status)
    }
    return { ...col, candidates: filtered }
  })

  if (candidates.length === 0) {
    return (
      <div className="glass-panel-subtle p-6 text-center">
        <p className="text-sm text-muted">No candidates have been presented for this position.</p>
      </div>
    )
  }

  const approvedCount = candidates.filter(c => SUCCESS_STATUSES.has(c.candidateStatus)).length
  const rejectedCount = candidates.filter(c => c.candidateStatus === 'RejectedByClient').length

  return (
    <div className="space-y-2">
      {(approvedCount > 0 || rejectedCount > 0) && (
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-muted">{candidates.length} total</span>
          {approvedCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={10} />
              {approvedCount} approved
            </span>
          )}
          {rejectedCount > 0 && <span className="text-red-400">{rejectedCount} rejected</span>}
        </div>
      )}
      <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr] gap-3">
        {columns.map(col => (
          <div key={col.status} className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden">
            {/* Column header with icon */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
              <col.Icon size={14} className={col.iconColor} />
              <span className="text-xs font-medium text-secondary">{col.label}</span>
              <span className="ml-auto text-[10px] text-muted bg-white/[0.05] px-1.5 py-0.5 rounded">
                {col.candidates.length}
              </span>
            </div>
            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[60px]">
              {col.candidates.map(c => (
                <CandidateCard
                  key={c.candidateRequisitionId}
                  candidate={c}
                  isEnded={col.status === 'Ended'}
                  feedbackCatalog={feedbackCatalog}
                  isExpanded={expandedCards.has(c.candidateRequisitionId)}
                  onToggle={() => toggleExpand(c.candidateRequisitionId)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
