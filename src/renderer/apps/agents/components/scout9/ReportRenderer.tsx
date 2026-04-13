import { useState } from 'react'
import { Check, SkipForward, Brain, User, Briefcase } from 'lucide-react'
import SkipModal from './SkipModal'
import BrainSnapshotViewer from './BrainSnapshotViewer'

interface ReportCandidate {
  id: string
  title: string
  details: string
  source_ref: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  confidence_score: number | null
  metadata_json: string
}

interface Report {
  id: string
  job_id: string
  report_title: string
  report_markdown: string
  status: string
  confidence_score: number | null
  created_at: string
}

interface ReportRendererProps {
  report: Report
  candidates: ReportCandidate[]
  onUpdateCandidate: (id: string, status: string) => void
  onSubmitSkip: (candidateId: string, reason: string, scope: string) => void
}

export default function ReportRenderer({ report, candidates, onUpdateCandidate, onSubmitSkip }: ReportRendererProps) {
  const [skipTarget, setSkipTarget] = useState<ReportCandidate | null>(null)
  const [showBrain, setShowBrain] = useState(false)

  let parsedContent: Record<string, unknown> = {}
  try {
    parsedContent = JSON.parse(report.report_markdown)
  } catch {
    parsedContent = { summary: report.report_markdown }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-400/20 text-gray-400',
    approved: 'bg-green-500/20 text-green-400',
    selected: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    skipped: 'bg-amber-500/20 text-amber-400',
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-primary">{report.report_title}</h3>
            <p className="text-xs text-muted mt-1">{new Date(report.created_at).toLocaleString()}</p>
            {parsedContent.summary && (
              <p className="text-sm text-secondary mt-2">{parsedContent.summary as string}</p>
            )}
          </div>
          <button
            onClick={() => setShowBrain(true)}
            className="glass-button px-2.5 py-1.5 text-[10px] font-semibold inline-flex items-center gap-1 text-violet-400"
          >
            <Brain size={12} />
            Brain Snapshot
          </button>
        </div>
      </div>

      {candidates.length === 0 && (
        <div className="glass-panel p-8 text-center">
          <p className="text-xs text-muted">No candidates in this report.</p>
        </div>
      )}

      {candidates.map(candidate => (
        <div
          key={candidate.id}
          className={`glass-card p-4 transition-all ${
            candidate.status === 'approved' ? 'border-l-2 border-green-500' :
            candidate.status === 'skipped' ? 'border-l-2 border-amber-500' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <User size={14} className="text-secondary" />
                <h4 className="text-sm font-semibold text-primary">{candidate.title}</h4>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${statusColors[candidate.status] ?? statusColors.pending}`}>
                  {candidate.status}
                </span>
              </div>
              {candidate.details && (
                <p className="text-xs text-secondary mt-1.5 line-clamp-2">{candidate.details}</p>
              )}
              {candidate.source_ref && (
                <div className="flex items-center gap-1 mt-1">
                  <Briefcase size={10} className="text-muted" />
                  <span className="text-[10px] text-muted">{candidate.source_ref}</span>
                </div>
              )}
              {candidate.confidence_score !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-dark-surface max-w-[120px]">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${Math.min(100, candidate.confidence_score)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted">{candidate.confidence_score}%</span>
                </div>
              )}
            </div>

            {candidate.status === 'pending' && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onUpdateCandidate(candidate.id, 'approved')}
                  className="glass-button px-2 py-1.5 text-[10px] font-semibold inline-flex items-center gap-1 bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                >
                  <Check size={12} />
                  Select
                </button>
                <button
                  onClick={() => setSkipTarget(candidate)}
                  className="glass-button px-2 py-1.5 text-[10px] font-semibold inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
                >
                  <SkipForward size={12} />
                  Skip
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {skipTarget && (
        <SkipModal
          candidateId={skipTarget.id}
          candidateName={skipTarget.title}
          onSubmit={(data) => {
            onSubmitSkip(skipTarget.id, data.reason, data.scope)
            onUpdateCandidate(skipTarget.id, 'skipped')
            setSkipTarget(null)
          }}
          onClose={() => setSkipTarget(null)}
        />
      )}

      {showBrain && <BrainSnapshotViewer onClose={() => setShowBrain(false)} />}
    </div>
  )
}
