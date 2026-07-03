// Candidate-grain "GOAL" hero for the Acceptance Rate V2 report.
//
// The headline of the report: the candidate acceptance rate measured against the
// 33% goal, on the same 5-point linear scale used by the other bonus measures.
// V2 shows Approved ÷ Total Presented (QTD) instead of the old Approved ÷ (Approved + Rejected).

import type { AcceptanceRateSummaryV2 } from '../../types/coeBonus'
import MeasureGauge from './MeasureGauge'
import LinearScaleStrip from './LinearScaleStrip'
import StatusPill from './StatusPill'
import { ACCEPTANCE_FLOOR, ACCEPTANCE_TARGET, acceptanceStatusFor } from './acceptanceStatus'

function TargetIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function CandidateAcceptanceHero({ summary }: { summary: AcceptanceRateSummaryV2 }) {
  const rate = summary.acceptanceRate
  const status = acceptanceStatusFor(rate)
  const hasDecisions = summary.totalDenominator > 0
  // Gauge axis tops out a little above the target so the marker has headroom.
  const gaugeMax = Math.max(ACCEPTANCE_TARGET + 12, Math.ceil(rate / 10) * 10 + 5)

  return (
    <div className="glass-card p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center">
        {/* Headline */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-500">
            <TargetIcon className="w-5 h-5" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Candidate Acceptance — QTD Goal
            </span>
          </div>

          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold leading-none text-primary">{rate}%</span>
            <span className="text-sm text-muted mb-1">acceptance rate</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={status} />
            <span className="text-xs text-muted">
              Goal {ACCEPTANCE_TARGET}% · floor {ACCEPTANCE_FLOOR}%
            </span>
          </div>

          <div className="pt-1">
            <p className="text-base font-semibold text-primary">
              <span className="text-emerald-500">{summary.totalNumerator} approved</span>
              <span className="text-muted"> of </span>
              <span className="text-blue-400">{summary.totalDenominator} presented</span>
            </p>
            <p className="text-xs text-muted mt-0.5">
              Acceptance = Approved ÷ Total Presented (QTD)
            </p>
            {(summary.totalExcluded > 0 || summary.totalDeduped > 0) && (
              <p className="text-[10px] text-muted mt-0.5">
                {summary.totalExcluded > 0 && <span>{summary.totalExcluded} excluded by status</span>}
                {summary.totalExcluded > 0 && summary.totalDeduped > 0 && <span> · </span>}
                {summary.totalDeduped > 0 && <span>{summary.totalDeduped} deduped</span>}
              </p>
            )}
          </div>
        </div>

        {/* Gauge + scale */}
        <div>
          {hasDecisions ? (
            <>
              <MeasureGauge
                value={rate}
                goal={ACCEPTANCE_TARGET}
                min={0}
                max={gaugeMax}
                status={status}
                height={180}
              />
              <div className="mt-1">
                <LinearScaleStrip floor={ACCEPTANCE_FLOOR} target={ACCEPTANCE_TARGET} achievement={rate} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-sm text-muted">
              No accept/reject decisions in this scope
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
