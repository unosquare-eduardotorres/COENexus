import { useState, useMemo, useEffect, useCallback } from 'react'
import { reportService } from '../../services/reportService'
import { formatDate } from '../../utils/dateFormatters'

interface Candidate {
  candidateRequisitionId: number
  candidateName: string
  candidateStatus: string
  mainSkill: string
  rate: number
  startDate: string | null
  rejectionFeedback: number[]
  rejectionComments: string
  rejectionActionDate: string | null
}

interface CandidatesTabProps {
  candidates: Candidate[]
  unocoreToken: string | null
}

export default function CandidatesTab({ candidates, unocoreToken }: CandidatesTabProps) {
  const [feedbackCatalog, setFeedbackCatalog] = useState<Record<number, string>>({})
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())

  const rejectedCandidates = useMemo(() =>
    candidates.filter(c => c.candidateStatus === 'RejectedByClient'),
    [candidates]
  )

  useEffect(() => {
    if (rejectedCandidates.length === 0) return

    if (unocoreToken) {
      reportService.getFeedbackCatalog(unocoreToken)
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
  }, [rejectedCandidates.length, unocoreToken])

  const toggleCommentExpand = useCallback((candidateRequisitionId: number) => {
    setExpandedComments(prev => {
      const next = new Set(prev)
      if (next.has(candidateRequisitionId)) {
        next.delete(candidateRequisitionId)
      } else {
        next.add(candidateRequisitionId)
      }
      return next
    })
  }, [])

  const resolveFeedbackLabels = useCallback((ids: number[]): string[] => {
    return ids.map(id => feedbackCatalog[id] || `Feedback #${id}`)
  }, [feedbackCatalog])

  if (candidates.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted">No candidates presented</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {['Name', 'Status', 'Skill', 'Rate', 'Start'].map(col => (
              <th key={col} className={`py-2 px-3 text-xs uppercase tracking-wider text-muted font-medium ${col === 'Rate' ? 'text-right' : 'text-left'}`}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {candidates.map(c => (
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
  )
}
