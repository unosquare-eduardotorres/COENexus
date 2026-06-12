import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useOutletContext } from 'react-router-dom'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import BonusFilterBar from '../components/coe-bonus/BonusFilterBar'
import { coeBonusService } from '../services/coeBonusService'
import { DEFAULT_FILTERS, FILTER_OPTIONS } from '../mocks/coeBonusMockData'
import type { CoeBonusFilterOptions, CoeBonusFilters } from '../types/coeBonus'

const log = createRendererLogger('CoeBonusPage')

const TABS = [
  { path: '', label: 'Overview', end: true },
  { path: 'placement-margin', label: 'Placement Margin', end: false },
  { path: 'gross-margin', label: 'Gross Margin', end: false },
  { path: 'fill-rate', label: 'Fill Rate', end: false },
  { path: 'acceptance-rate', label: 'Acceptance Rate', end: false },
]

export interface CoeBonusOutletContext {
  filters: CoeBonusFilters
  options: CoeBonusFilterOptions
}

export function useCoeBonusContext() {
  return useOutletContext<CoeBonusOutletContext>()
}

function TrophyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

export default function CoeBonusPage() {
  const [filters, setFilters] = useState<CoeBonusFilters>(DEFAULT_FILTERS)
  const [options, setOptions] = useState<CoeBonusFilterOptions>(FILTER_OPTIONS)

  useEffect(() => {
    log.info('C.O.E. Bonus report viewed')
    coeBonusService.getFilterOptions().then(setOptions).catch(() => {})
  }, [])

  const context = useMemo<CoeBonusOutletContext>(() => ({ filters, options }), [filters, options])

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header + filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 dark:bg-emerald-400/15 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
              <TrophyIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">C.O.E. Bonus</h1>
              <p className="text-sm text-secondary mt-0.5">Goal vs. achievement across the four bonus measures</p>
            </div>
          </div>
          <BonusFilterBar filters={filters} options={options} onChange={setFilters} />
        </div>

        <nav className="flex gap-1 border-b minimal-divider pb-px overflow-x-auto">
          {TABS.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10'
                    : 'text-muted hover:text-primary hover:bg-gray-50 dark:hover:bg-dark-hover/50'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet context={context} />
    </div>
  )
}
