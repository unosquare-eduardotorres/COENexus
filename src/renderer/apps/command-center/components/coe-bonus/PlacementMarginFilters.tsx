// Placement Margin filter bar: Quarter tabs + Month buttons + Account dropdown.

import { useState, useRef, useEffect } from 'react'

type QuarterKey = 'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

interface PlacementMarginFiltersProps {
  selectedQuarter: QuarterKey
  selectedMonth: number | null
  selectedAccount: string | null
  accounts: { name: string; count: number }[]
  onQuarterChange: (q: QuarterKey) => void
  onMonthChange: (month: number | null) => void
  onAccountChange: (account: string | null) => void
  hideQuarterTabs?: boolean
}

const QUARTER_MONTHS: Record<QuarterKey, number[]> = {
  ALL: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12],
}

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const QUARTERS: QuarterKey[] = ['ALL', 'Q1', 'Q2', 'Q3', 'Q4']

export default function PlacementMarginFilters({
  selectedQuarter,
  selectedMonth,
  selectedAccount,
  accounts,
  onQuarterChange,
  onMonthChange,
  onAccountChange,
  hideQuarterTabs,
}: PlacementMarginFiltersProps) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountSearch, setAccountSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
        setAccountSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const months = QUARTER_MONTHS[selectedQuarter]

  const filteredAccounts = accounts.filter(a =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase()),
  )

  const hasFilters = selectedQuarter !== 'ALL' || selectedMonth !== null || selectedAccount !== null

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Quarter tabs */}
      {!hideQuarterTabs && (
        <div className="inline-flex rounded-lg bg-slate-800/60 p-0.5">
          {QUARTERS.map(q => (
            <button
              key={q}
              onClick={() => {
                onQuarterChange(q)
                onMonthChange(null)
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedQuarter === q
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {q === 'ALL' ? 'All' : q}
            </button>
          ))}
        </div>
      )}

      {/* Month buttons */}
      <div className="inline-flex items-center gap-1">
        {months.map(m => (
          <button
            key={m}
            onClick={() => onMonthChange(selectedMonth === m ? null : m)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
              selectedMonth === m
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {MONTH_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Account dropdown */}
      <div ref={dropdownRef} className="relative ml-auto">
        <button
          onClick={() => setAccountOpen(o => !o)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 rounded-lg transition-colors min-w-[160px]"
        >
          <span className="truncate">
            {selectedAccount ?? 'All Accounts'}
          </span>
          <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${accountOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {accountOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-slate-700">
              <input
                type="text"
                value={accountSearch}
                onChange={e => setAccountSearch(e.target.value)}
                placeholder="Search accounts…"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-900/60 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
            {/* Options */}
            <div className="max-h-60 overflow-y-auto">
              <button
                onClick={() => { onAccountChange(null); setAccountOpen(false); setAccountSearch('') }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  selectedAccount === null
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                All Accounts
              </button>
              {filteredAccounts.map(a => (
                <button
                  key={a.name}
                  onClick={() => { onAccountChange(a.name); setAccountOpen(false); setAccountSearch('') }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex justify-between ${
                    selectedAccount === a.name
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  <span className="truncate">{a.name}</span>
                  <span className="text-slate-500 ml-2 flex-shrink-0">{a.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={() => {
            onQuarterChange('ALL')
            onMonthChange(null)
            onAccountChange(null)
          }}
          className="text-[11px] text-red-400 hover:text-red-300 underline underline-offset-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
