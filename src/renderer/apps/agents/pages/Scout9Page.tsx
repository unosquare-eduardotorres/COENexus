import { useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import AgentBanner from '../components/AgentBanner'
import { createRendererLogger } from '../../../shared/utils/rendererLogger'

const log = createRendererLogger('Scout9Page')

const TABS = [
  { path: '', label: 'Pipeline', end: true },
  { path: 'reports', label: 'Reports', end: false },
  { path: 'brain', label: 'Brain', end: false },
  { path: 'chat', label: 'Chat', end: false },
  { path: 'settings', label: 'Settings', end: false },
]

export default function Scout9Page() {
  useEffect(() => {
    log.info('Scout-9 page viewed')
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <AgentBanner agentId="scout-9" agentName="Scout-9" compact />

      <nav className="flex gap-1 border-b minimal-divider pb-px">
        {TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                isActive
                  ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-500 bg-violet-50/50 dark:bg-violet-500/10'
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
