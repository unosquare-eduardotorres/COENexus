// Inline candidate cards for an expanded position row. Colour follows the
// candidate's bucket (green = approved, red = rejected, muted = declined/unresolved),
// reusing the success/reject styling from CandidatePipeline.

import type { CandidateOutcome } from '../../types/coeBonus'
import { BUCKET_CHIP, BUCKET_LABEL, humanizeStatus } from './acceptanceStatus'

const CARD_STYLE: Record<CandidateOutcome['bucket'], string> = {
  approved: 'bg-emerald-500/10 border border-emerald-500/20',
  rejected: 'bg-red-500/10 border border-red-500/20',
  declined: 'glass-panel-subtle opacity-75',
  unresolved: 'glass-panel-subtle',
}

function CandidateCard({ candidate }: { candidate: CandidateOutcome }) {
  const { bucket } = candidate
  return (
    <div className={`p-3 rounded-lg ${CARD_STYLE[bucket]}`}>
      <p className="text-xs font-semibold text-primary">{candidate.candidateName}</p>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-secondary">
        {candidate.mainSkill && <span>{candidate.mainSkill}</span>}
        {candidate.rate > 0 && <span>${candidate.rate}/hr</span>}
        {candidate.isEmployee && <span className="text-blue-400">Employee</span>}
      </div>
      <span
        className={`inline-flex mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${BUCKET_CHIP[bucket]}`}
        title={`${BUCKET_LABEL[bucket]} — ${humanizeStatus(candidate.candidateStatus)}`}
      >
        {humanizeStatus(candidate.candidateStatus)}
      </span>
    </div>
  )
}

export default function CandidateOutcomeBreakdown({ candidates }: { candidates: CandidateOutcome[] }) {
  if (candidates.length === 0) {
    return (
      <div className="glass-panel-subtle p-4 text-center">
        <p className="text-xs text-muted">No candidates were presented for this position.</p>
      </div>
    )
  }

  // Approved first, then rejected, then the rest — most relevant outcomes on top.
  const order: Record<CandidateOutcome['bucket'], number> = { approved: 0, rejected: 1, unresolved: 2, declined: 3 }
  const sorted = [...candidates].sort((a, b) => order[a.bucket] - order[b.bucket])

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map(c => (
        <CandidateCard key={c.candidateRequisitionId} candidate={c} />
      ))}
    </div>
  )
}
