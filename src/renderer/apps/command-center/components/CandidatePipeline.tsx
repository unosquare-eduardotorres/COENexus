import type { TrackedPositionDetail } from '../types'

type Candidate = TrackedPositionDetail['candidates'][number]

interface CandidatePipelineProps {
  candidates: TrackedPositionDetail['candidates']
  feedbackCatalog?: Record<number, string>
}

const ACTIVE_STATUSES = ['PresentedToCGX', 'PresentedToClient', 'CustomerInterview'] as const

const COLUMNS = [
  { status: 'PresentedToCGX', label: 'Presented to CGX', color: 'border-teal-500', headerBg: 'bg-teal-500/10 text-teal-500' },
  { status: 'PresentedToClient', label: 'Presented to Client', color: 'border-violet-500', headerBg: 'bg-violet-500/10 text-violet-500' },
  { status: 'CustomerInterview', label: 'Customer Interview', color: 'border-indigo-500', headerBg: 'bg-indigo-500/10 text-indigo-500' },
  { status: 'Ended', label: 'Ended', color: 'border-gray-400', headerBg: 'bg-gray-500/10 text-gray-400' },
] as const

function resolveFeedbackLabels(ids: number[], catalog: Record<number, string>): string[] {
  return ids.map(id => catalog[id] || `Feedback #${id}`)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CandidateCard({ candidate, isEnded, feedbackCatalog }: { candidate: Candidate; isEnded: boolean; feedbackCatalog: Record<number, string> }) {
  const feedbackLabels = candidate.rejectionFeedback?.length
    ? resolveFeedbackLabels(candidate.rejectionFeedback, feedbackCatalog)
    : []

  return (
    <div className={`glass-panel-subtle p-3 rounded-lg ${isEnded ? 'opacity-75' : ''}`}>
      <p className="text-xs font-semibold text-primary">{candidate.candidateName}</p>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-primary/80">
        {candidate.mainSkill && <span>{candidate.mainSkill}</span>}
        {candidate.rate > 0 && <span>${candidate.rate}/hr</span>}
      </div>
      {candidate.startDate && (
        <p className="text-[10px] text-secondary mt-1">{formatDate(candidate.startDate)}</p>
      )}
      <span className={`inline-flex mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${
        isEnded
          ? 'bg-red-500/10 text-red-400 border-red-500/20'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      }`}>
        {candidate.candidateStatus.replace(/([A-Z])/g, ' $1').trim()}
      </span>
      {isEnded && feedbackLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {feedbackLabels.map((label, i) => (
            <span key={i} className="px-1 py-0.5 text-[9px] rounded bg-red-500/10 text-red-400 border border-red-500/20">
              {label}
            </span>
          ))}
        </div>
      )}
      {isEnded && candidate.rejectionComments && (
        <p className="text-[9px] text-muted mt-1 line-clamp-4">{candidate.rejectionComments}</p>
      )}
    </div>
  )
}

export default function CandidatePipeline({ candidates, feedbackCatalog = {} }: CandidatePipelineProps) {
  const columns = COLUMNS.map(col => {
    let filtered: Candidate[]
    if (col.status === 'Ended') {
      filtered = candidates.filter(c =>
        !(ACTIVE_STATUSES as readonly string[]).includes(c.candidateStatus)
      )
    } else {
      filtered = candidates.filter(c => c.candidateStatus === col.status)
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

  return (
    <div className="grid grid-cols-4 gap-3">
      {columns.map(col => (
        <div key={col.status} className="space-y-2">
          <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${col.headerBg}`}>
            <span className="text-xs font-medium">{col.label}</span>
            <span className="text-[10px] font-mono">{col.candidates.length}</span>
          </div>
          <div className="space-y-1.5 min-h-[60px]">
            {col.candidates.map(c => (
              <CandidateCard
                key={c.candidateRequisitionId}
                candidate={c}
                isEnded={col.status === 'Ended'}
                feedbackCatalog={feedbackCatalog}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
