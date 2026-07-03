// Inline candidate cards for an expanded position row (V2). Cards show
// disposition badges with audit trail: why each candidate was included/excluded,
// and dedup information linking to the first-counted position.

import type { ReportCandidateAudit } from '../../types/coeBonus'
import {
  DISPOSITION_CARD_STYLE,
  DISPOSITION_CHIP,
  DISPOSITION_ICON,
  DISPOSITION_LABEL,
  humanizeStatus,
} from './acceptanceStatus'

function CandidateCard({ candidate }: { candidate: ReportCandidateAudit }) {
  const { disposition } = candidate
  return (
    <div className={`p-3 rounded-lg ${DISPOSITION_CARD_STYLE[disposition]}`}>
      <p className="text-xs font-semibold text-primary">{candidate.candidateName}</p>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-secondary">
        {candidate.mainSkill && <span>{candidate.mainSkill}</span>}
        {candidate.rate > 0 && <span>${candidate.rate}/hr</span>}
        {candidate.isEmployee && <span className="text-blue-400">Employee</span>}
      </div>

      {/* Status label */}
      <div className="mt-1.5 text-[10px] text-muted">
        {humanizeStatus(candidate.candidateStatus)}
      </div>

      {/* Disposition badge */}
      <span
        className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[9px] font-medium border ${DISPOSITION_CHIP[disposition]}`}
        title={candidate.exclusionReason ?? DISPOSITION_LABEL[disposition]}
      >
        <span>{DISPOSITION_ICON[disposition]}</span>
        {DISPOSITION_LABEL[disposition]}
      </span>

      {/* Exclusion / dedup reason detail */}
      {candidate.exclusionReason && (
        <p className="mt-1 text-[9px] text-muted leading-snug">
          {candidate.disposition === 'dedup-skipped' && candidate.dedupFirstPositionId ? (
            <>
              Already counted in <span className="font-mono">#{candidate.dedupFirstPositionId}</span>
              {candidate.dedupFirstPositionLabel && (
                <span className="text-muted/70"> — {candidate.dedupFirstPositionLabel}</span>
              )}
            </>
          ) : (
            candidate.exclusionReason
          )}
        </p>
      )}
    </div>
  )
}

export default function CandidateOutcomeBreakdown({ candidates }: { candidates: ReportCandidateAudit[] }) {
  if (candidates.length === 0) {
    return (
      <div className="glass-panel-subtle p-4 text-center">
        <p className="text-xs text-muted">No candidates were presented for this position.</p>
      </div>
    )
  }

  // numerator first, then denominator, then dedup-skipped, then excluded
  const order: Record<ReportCandidateAudit['disposition'], number> = {
    numerator: 0,
    denominator: 1,
    'dedup-skipped': 2,
    excluded: 3,
  }
  const sorted = [...candidates].sort((a, b) => order[a.disposition] - order[b.disposition])

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map(c => (
        <CandidateCard key={c.candidateRequisitionId} candidate={c} />
      ))}
    </div>
  )
}
