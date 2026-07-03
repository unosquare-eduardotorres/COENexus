// "Paper receipt" / ledger-style calculation breakdown for one month of the
// Acceptance Rate V2 report. Every number in the card maps directly to a
// verifiable row in the reference spreadsheet, making manual reconciliation trivial.

import { useState } from 'react'
import { Calculator, ChevronRight, Info, ListPlus, RotateCcw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReportMonthBreakdown } from '../../types/coeBonus'
import { SectionCard } from './BonusUi'
import { formatMonth, humanizeStatus } from './acceptanceStatus'

function LedgerLine({
  label,
  value,
  prefix = '',
  muted = false,
  bold = false,
}: {
  label: string
  value: number | string
  prefix?: string
  muted?: boolean
  bold?: boolean
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${muted ? 'opacity-50' : ''}`}>
      <span className={`text-xs ${bold ? 'font-semibold text-primary' : 'text-secondary'}`}>{label}</span>
      <span className={`font-mono text-xs tabular-nums text-right min-w-[3rem] ${bold ? 'font-bold text-primary' : 'text-primary'}`}>
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

function Divider({ double = false }: { double?: boolean }) {
  return double ? (
    <div className="space-y-0.5 my-2">
      <div className="border-t border-slate-500/30" />
      <div className="border-t border-slate-500/30" />
    </div>
  ) : (
    <div className="border-t border-slate-500/20 my-2" />
  )
}

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon?: LucideIcon
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted hover:text-primary transition-colors w-full text-left"
      >
        <ChevronRight
          className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        {Icon && <Icon className="w-3 h-3 shrink-0" />}
        {title}
      </button>
      {open && <div className="mt-1.5 space-y-1">{children}</div>}
    </div>
  )
}

interface AdjustedMath {
  extraDenominator: number
  netDenominator: number
  rate: number
  qtd: {
    cumulativeNumerator: number
    cumulativeDenominator: number
    rate: number
  }
}

export default function AcceptanceMathCard({
  breakdown,
  adjusted,
  denominatorInclusions,
  onToggleInclusion,
  onIncludeAll,
  onExcludeAll,
}: {
  breakdown: ReportMonthBreakdown
  adjusted?: AdjustedMath
  denominatorInclusions?: Set<string>
  onToggleInclusion?: (status: string) => void
  onIncludeAll?: () => void
  onExcludeAll?: () => void
}) {
  const { math, qtd, positionCount, wonCount, lostCount, otherCount, month } = breakdown

  const excludedEntries = Object.entries(math.excludedByStatus).sort((a, b) => b[1] - a[1])

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <Calculator className="w-4 h-4 text-slate-400" />
          Calculation Breakdown — {formatMonth(month)}
        </span>
      }
      subtitle="Full formula breakdown for manual verification"
    >
      <div className="font-mono text-xs space-y-3">
        {/* Section 1: Result Hero */}
        <div className="glass-panel-subtle rounded-xl p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted">Monthly Rate</div>
              <div className="text-2xl font-bold text-primary mt-0.5">
                {adjusted ? adjusted.rate : math.rate}%
              </div>
              <div className="text-xs text-muted font-mono">
                {math.netNumerator} / {adjusted ? adjusted.netDenominator : math.netDenominator}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted">QTD</div>
              <div className="text-2xl font-bold text-primary mt-0.5">
                {adjusted ? adjusted.qtd.rate : qtd.rate}%
              </div>
              <div className="text-xs text-muted font-mono">
                {adjusted
                  ? `${adjusted.qtd.cumulativeNumerator} / ${adjusted.qtd.cumulativeDenominator}`
                  : `${qtd.cumulativeNumerator} / ${qtd.cumulativeDenominator}`
                }
              </div>
            </div>
          </div>

          {/* Compact formula bar */}
          <div className="mt-3 px-3 py-2 rounded-lg bg-slate-800/50 font-mono text-xs text-secondary">
            <span className="font-semibold text-emerald-400">{math.netNumerator}</span> approved
            <span className="mx-1.5 text-slate-500">÷</span>
            <span className="font-semibold text-emerald-400">{adjusted ? adjusted.netDenominator : math.netDenominator}</span> presented
            <span className="mx-1.5 text-slate-500">•</span>
            <span className="text-slate-400">{positionCount} pos</span>
            <span className="mx-1 text-slate-500">—</span>
            <span className="text-emerald-400">{wonCount}W</span>
            <span className="text-slate-500">/</span>
            <span className="text-red-400">{lostCount}L</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{otherCount}O</span>
          </div>

          {adjusted && adjusted.extraDenominator > 0 && (
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-blue-400/70">
              <Info className="w-3 h-3 shrink-0" />
              <span>Adjusted — {adjusted.extraDenominator} excluded candidates re-included in denominator (dedup not re-applied)</span>
            </div>
          )}
        </div>

        {/* Section 2: Excluded Toggles (always visible) */}
        {math.excludedTotal > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Excluded Statuses
              </span>
              {onToggleInclusion && excludedEntries.length > 1 && (
                <button
                  type="button"
                  onClick={denominatorInclusions?.size ? onExcludeAll : onIncludeAll}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-slate-500/30 text-muted hover:text-primary hover:border-slate-500/50 transition-colors"
                >
                  {denominatorInclusions?.size
                    ? <><RotateCcw className="w-3 h-3" /> Reset</>
                    : <><ListPlus className="w-3 h-3" /> Include all</>
                  }
                </button>
              )}
            </div>

            {excludedEntries.map(([status, count]) => {
              const included = denominatorInclusions?.has(status)
              return (
                <div key={status} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {onToggleInclusion && (
                      <span
                        role="switch"
                        tabIndex={0}
                        aria-checked={!!included}
                        onClick={() => onToggleInclusion(status)}
                        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggleInclusion(status) } }}
                        className={`
                          inline-block w-9 h-5 rounded-full transition-colors flex-none relative overflow-hidden cursor-pointer
                          focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
                          ${included
                            ? 'bg-blue-500'
                            : 'bg-slate-600/50'
                          }
                        `}
                      >
                        <span className={`
                          absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200
                          ${included ? 'left-[18px]' : 'left-0.5'}
                        `} />
                      </span>
                    )}
                    <span className={`text-xs truncate ${included ? 'text-blue-400' : 'text-secondary opacity-50'}`}>
                      {humanizeStatus(status)}
                    </span>
                  </div>
                  <span className={`font-mono text-xs tabular-nums ${included ? 'text-blue-400' : 'text-primary opacity-50'}`}>
                    {included ? `+${count}` : count}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Section 3: Full Breakdown (collapsed by default) */}
        <CollapsibleSection title="Full Breakdown" defaultOpen={false}>
          <LedgerLine
            label={`${positionCount} positions`}
            value={`${wonCount} Won · ${lostCount} Lost · ${otherCount} Other`}
          />
          <Divider />

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Numerator */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Numerator (Approved)</div>
              <LedgerLine label='Candidates with status "Approved"' value={math.rawApproved} />
              {math.dedupRemovedNumerator > 0 && (
                <LedgerLine
                  label="dedup (same Acct+Stakeholder+Skill)"
                  value={math.dedupRemovedNumerator}
                  prefix="-"
                />
              )}
              <Divider />
              <LedgerLine label="= net approved" value={math.netNumerator} bold />
            </div>

            {/* Denominator */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Denominator (All Presented)</div>
              <LedgerLine label="Approved" value={math.rawApproved} />
              <LedgerLine label="Presented to Client" value={math.rawPresentedToClient} />
              <LedgerLine label="Customer Interview" value={math.rawCustomerInterview} />
              <LedgerLine label="Rejected by Client" value={math.rawRejectedByClient} />
              <Divider />
              <LedgerLine label="sub-total" value={math.rawDenominator} />
              {math.dedupRemovedDenominator > 0 && (
                <LedgerLine
                  label="dedup (same Acct+Stakeholder+Skill)"
                  value={math.dedupRemovedDenominator}
                  prefix="-"
                />
              )}
              {adjusted && adjusted.extraDenominator > 0 && (
                <LedgerLine
                  label="re-included excluded statuses"
                  value={adjusted.extraDenominator}
                  prefix="+"
                />
              )}
              <Divider />
              <LedgerLine label="= net denominator" value={adjusted ? adjusted.netDenominator : math.netDenominator} bold />
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </SectionCard>
  )
}
