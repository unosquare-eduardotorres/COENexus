import type { CoeBonusFilterOptions, CoeBonusFilters, Quarter } from '../../types/coeBonus'

interface BonusFilterBarProps {
  filters: CoeBonusFilters
  options: CoeBonusFilterOptions
  onChange: (next: CoeBonusFilters) => void
  disabled?: boolean
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  )
}

export default function BonusFilterBar({ filters, options, onChange, disabled }: BonusFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Year">
        <select
          className="glass-select text-sm py-1.5 pl-3 min-w-[96px]"
          value={filters.year}
          disabled={disabled}
          onChange={e => onChange({ ...filters, year: Number(e.target.value) })}
        >
          {options.years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </Field>

      <Field label="Quarter">
        <select
          className="glass-select text-sm py-1.5 pl-3 min-w-[96px]"
          value={filters.quarter}
          disabled={disabled}
          onChange={e => onChange({ ...filters, quarter: e.target.value as Quarter })}
        >
          {options.quarters.map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </Field>

      <Field label="C.O.E.">
        <select
          className="glass-select text-sm py-1.5 pl-3 min-w-[200px]"
          value={filters.coe}
          disabled={disabled}
          onChange={e => onChange({ ...filters, coe: e.target.value })}
        >
          {options.coes.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </Field>
    </div>
  )
}
