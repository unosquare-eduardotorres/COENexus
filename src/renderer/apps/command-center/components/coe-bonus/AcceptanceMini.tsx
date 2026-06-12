// Compact right-aligned accept/reject indicator for a Closed-position row.
// Renders a 2-segment micro-bar (green = approved share, red = rejected share)
// plus inline ✓/✗ counts. Falls back to a muted "No decision" when there are
// no approve/reject decisions on the position.

interface Props {
  approved: number
  rejected: number
  declined: number
  unresolved: number
}

export default function AcceptanceMini({ approved, rejected, declined, unresolved }: Props) {
  const inconclusive = declined + unresolved
  const total = approved + rejected + inconclusive
  const tooltip = `${approved} approved · ${rejected} rejected · ${declined} declined · ${unresolved} unresolved`

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 shrink-0" title={tooltip}>
        <div className="w-10 h-1.5 rounded-full bg-slate-500/25" />
        <span className="text-[10px] text-muted">No decision</span>
      </div>
    )
  }

  const pct = (n: number) => (n / total) * 100

  return (
    <div className="flex items-center gap-2 shrink-0" title={tooltip}>
      <div className="flex w-10 h-1.5 rounded-full overflow-hidden bg-slate-500/20">
        <div className="bg-emerald-500/80" style={{ width: `${pct(approved)}%` }} />
        <div className="bg-red-500/80" style={{ width: `${pct(rejected)}%` }} />
        <div className="bg-blue-500/80" style={{ width: `${pct(inconclusive)}%` }} />
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium">
        {approved > 0 && <span className="text-emerald-500">✓{approved}</span>}
        {rejected > 0 && <span className="text-red-400">✗{rejected}</span>}
        {inconclusive > 0 && <span className="text-blue-400">~{inconclusive}</span>}
      </div>
    </div>
  )
}
