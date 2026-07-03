// COE → Practice → Skill cascading dropdowns (reusable across tabs)
// Shared filters (COE, Practice, Skill) persist across tabs via context.
// Local filters (Quarter, Month, Account) are per-tab.

import { useState, useEffect, useMemo } from 'react'
import type { CatalogCoe, CatalogPractice } from '../../../../../shared/ipc-types'
import type { PLBSharedFilters } from '../../contexts/PracticeLeadBonusConfigContext'

// Re-export for backward compatibility — tabs can still import this type
export type { PLBSharedFilters }

// Legacy alias kept so existing imports don't break during transition
export interface CascadingFilterState {
  coe: string | null
  practice: string | null
  mainSkill: string | null
  quarter: string
  month: number | null
  account: string | null
}

interface CascadingFiltersProps {
  // Shared filters (from context — persist across tabs)
  sharedFilters: PLBSharedFilters
  onSharedChange: (filters: PLBSharedFilters) => void
  // Local filters (per tab — quarter, month, account)
  quarter: string
  month: number | null
  account: string | null
  onLocalChange: (patch: { quarter?: string; month?: number | null; account?: string | null }) => void
  // Data-derived
  accounts: string[]
  // Optional: hide local controls (e.g. for OverviewTab)
  hideLocalFilters?: boolean
}

const QUARTER_OPTIONS = ['ALL', 'Q1', 'Q2', 'Q3', 'Q4']
const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const QUARTER_MONTH_RANGES: Record<string, [number, number]> = {
  Q1: [1, 3],
  Q2: [4, 6],
  Q3: [7, 9],
  Q4: [10, 12],
}

export function CascadingFilters({
  sharedFilters,
  onSharedChange,
  quarter,
  month,
  account,
  onLocalChange,
  accounts,
  hideLocalFilters = false,
}: CascadingFiltersProps) {
  const [catalogCoes, setCatalogCoes] = useState<CatalogCoe[]>([])
  const [catalogPractices, setCatalogPractices] = useState<CatalogPractice[]>([])

  useEffect(() => {
    window.api.catalog.getCoes().then(setCatalogCoes).catch(() => {})
    window.api.catalog.getPractices().then(setCatalogPractices).catch(() => {})
  }, [])

  // Practices filtered by selected COE
  const filteredPractices = useMemo(() => {
    if (!sharedFilters.coe) return catalogPractices
    const coe = catalogCoes.find(c => c.name === sharedFilters.coe)
    if (!coe) return catalogPractices
    return catalogPractices.filter(p =>
      (p as any).coes?.some((c: { name: string }) => c.name === sharedFilters.coe)
    )
  }, [catalogPractices, catalogCoes, sharedFilters.coe])

  // Skills from selected practice
  const filteredSkills = useMemo(() => {
    if (!sharedFilters.practice) return []
    const practice = catalogPractices.find(p => p.name === sharedFilters.practice)
    return (practice as any)?.skills?.map((s: { name: string }) => s.name) ?? []
  }, [catalogPractices, sharedFilters.practice])

  // Available months for selected quarter
  const availableMonths = useMemo(() => {
    if (quarter === 'ALL') return []
    const range = QUARTER_MONTH_RANGES[quarter]
    if (!range) return []
    const months: number[] = []
    for (let m = range[0]; m <= range[1]; m++) months.push(m)
    return months
  }, [quarter])

  const hasActiveFilters = sharedFilters.coe || sharedFilters.practice || sharedFilters.mainSkill || account || month !== null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quarter tabs */}
      {!hideLocalFilters && (
        <div className="flex gap-0.5 rounded-lg bg-white/5 p-0.5">
          {QUARTER_OPTIONS.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => onLocalChange({ quarter: q, month: null })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                quarter === q
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Month buttons */}
      {!hideLocalFilters && availableMonths.length > 0 && (
        <div className="flex gap-0.5 rounded-lg bg-white/5 p-0.5">
          {availableMonths.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onLocalChange({ month: month === m ? null : m })}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                month === m
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {MONTH_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      {/* COE dropdown */}
      <select
        value={sharedFilters.coe ?? ''}
        onChange={e => onSharedChange({ ...sharedFilters, coe: e.target.value || null, practice: null, mainSkill: null })}
        className="px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-primary"
      >
        <option value="">All COEs</option>
        {catalogCoes.map(c => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>

      {/* Practice dropdown */}
      <select
        value={sharedFilters.practice ?? ''}
        onChange={e => onSharedChange({ ...sharedFilters, practice: e.target.value || null, mainSkill: null })}
        className="px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-primary"
      >
        <option value="">All Practices</option>
        {filteredPractices.map(p => (
          <option key={p.id} value={p.name}>{p.name}</option>
        ))}
      </select>

      {/* Main Skill dropdown */}
      {filteredSkills.length > 0 && (
        <select
          value={sharedFilters.mainSkill ?? ''}
          onChange={e => onSharedChange({ ...sharedFilters, mainSkill: e.target.value || null })}
          className="px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-primary"
        >
          <option value="">All Skills</option>
          {filteredSkills.map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {/* Account dropdown */}
      {!hideLocalFilters && accounts.length > 0 && (
        <select
          value={account ?? ''}
          onChange={e => onLocalChange({ account: e.target.value || null })}
          className="px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-primary"
        >
          <option value="">All Accounts</option>
          {accounts.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      )}

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            onSharedChange({ coe: null, practice: null, mainSkill: null })
            if (!hideLocalFilters) onLocalChange({ month: null, account: null })
          }}
          className="text-[10px] text-muted hover:text-red-400 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
