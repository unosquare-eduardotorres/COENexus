import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'
import { PLBConfigProvider, usePLBConfig } from '../contexts/PracticeLeadBonusConfigContext'

const log = createRendererLogger('PracticeLeadBonusPage')

const TABS = [
  { path: '', label: 'Overview', end: true },
  { path: 'placements', label: 'Placements', end: false },
  { path: 'offboardings', label: 'Offboardings', end: false },
]

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

function PLBConfigBadge() {
  const { activePeriod } = usePLBConfig()
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
        {activePeriod.quarter} {activePeriod.year}
      </span>
    </div>
  )
}

export default function PracticeLeadBonusPage() {
  useEffect(() => {
    log.info('Practice Lead Bonus report viewed')
  }, [])

  return (
    <PLBConfigProvider>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 dark:bg-emerald-400/15 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                <TrophyIcon />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">Practice Lead Bonus</h1>
                <p className="text-sm text-secondary mt-0.5">Quarterly practice lead bonus calculator</p>
              </div>
            </div>
            <PLBConfigBadge />
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

        <Outlet />
      </div>
    </PLBConfigProvider>
  )
}
