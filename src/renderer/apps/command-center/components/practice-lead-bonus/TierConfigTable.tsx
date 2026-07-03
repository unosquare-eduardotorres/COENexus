// Editable tier amounts with inline inputs + Reset button

import type { BonusTier } from '../../../../../shared/ipc-types'

interface TierConfigTableProps {
  tiers: BonusTier[]
  onUpdateTier: (index: number, amount: number) => void
  onReset: () => void
}

export function TierConfigTable({ tiers, onUpdateTier, onReset }: TierConfigTableProps) {
  return (
    <div className="glass-panel-subtle rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Tier Configuration</h4>
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] text-muted hover:text-primary underline"
        >
          Reset to Defaults
        </button>
      </div>
      <div className="space-y-1.5">
        {tiers.map((tier, i) => (
          <div key={tier.label} className="flex items-center justify-between gap-3 px-2 py-1.5">
            <span className="text-sm text-secondary w-28">{tier.label}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted">$</span>
              <input
                type="number"
                value={tier.amount}
                onChange={e => onUpdateTier(i, Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-sm text-primary text-right focus:outline-none focus:border-emerald-500/50"
                min={0}
                step={50}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
