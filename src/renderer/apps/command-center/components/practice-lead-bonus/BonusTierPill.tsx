// Color-coded pill: tier label + dollar amount

interface BonusTierPillProps {
  tierLabel: string
  amount: number
  type: 'bonus' | 'penalty'
  hideAmount?: boolean
}

const TIER_COLORS: Record<string, string> = {
  '≥55%':       'bg-emerald-500/20 text-emerald-400',
  '50%–54.99%': 'bg-blue-500/20 text-blue-400',
  '45%–49.99%': 'bg-amber-500/20 text-amber-400',
  '40%–44.99%': 'bg-orange-500/20 text-orange-300',
  '<40%':       'bg-slate-500/20 text-slate-400',
}

export function BonusTierPill({ tierLabel, amount, type, hideAmount = false }: BonusTierPillProps) {
  const colorClass = TIER_COLORS[tierLabel] ?? 'bg-slate-500/20 text-slate-400'
  const prefix = type === 'penalty' && amount > 0 ? '-' : ''

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      <span>{tierLabel}</span>
      {!hideAmount && amount > 0 && (
        <span className="font-semibold">{prefix}${amount}</span>
      )}
    </span>
  )
}
