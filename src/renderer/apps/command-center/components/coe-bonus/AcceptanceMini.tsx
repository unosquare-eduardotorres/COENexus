// Compact right-aligned V2 disposition indicator for a Closed-position row.
// Renders a 3-segment micro-bar (emerald = numerator, blue = denominator-only,
// slate = excluded + deduped) plus inline count icons. Falls back to a muted
// "No decision" when the position has no evaluated candidates.

interface Props {
  numerator: number
  denominatorOnly: number
  excluded: number
  deduped: number
}

export default function AcceptanceMini({ numerator, denominatorOnly, excluded, deduped }: Props) {
  const other = excluded + deduped
  const total = numerator + denominatorOnly + other
  const tooltip = `${numerator} in numerator · ${denominatorOnly} denominator-only · ${excluded} excluded · ${deduped} deduped`

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
        <div className="bg-emerald-500/80" style={{ width: `${pct(numerator)}%` }} />
        <div className="bg-blue-500/80" style={{ width: `${pct(denominatorOnly)}%` }} />
        <div className="bg-slate-500/80" style={{ width: `${pct(other)}%` }} />
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium">
        {numerator > 0 && <span className="text-emerald-500">✓{numerator}</span>}
        {denominatorOnly > 0 && <span className="text-blue-400">○{denominatorOnly}</span>}
        {other > 0 && <span className="text-slate-400">~{other}</span>}
      </div>
    </div>
  )
}
