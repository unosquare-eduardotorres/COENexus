import { useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('OraclePage')

const TABS = [
  { path: '', label: 'Home', end: true },
  { path: 'chat', label: 'Chat', end: false },
]

export default function OraclePage() {
  useEffect(() => {
    log.info('Oracle page viewed')
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <nav className="flex gap-1 border-b minimal-divider pb-px">
        {TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/10'
                  : 'text-muted hover:text-primary hover:bg-gray-50 dark:hover:bg-dark-hover/50'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
