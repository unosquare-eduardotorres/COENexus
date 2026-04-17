import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import GlobalTitleBar from '../../../components/GlobalTitleBar'

function NomicoreLayoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="10" y2="18" />
      <line x1="14" y1="18" x2="16" y2="18" />
    </svg>
  )
}

function CalculatorNavIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
      <circle cx="15" cy="11" r="1" fill="currentColor" />
      <circle cx="9" cy="15" r="1" fill="currentColor" />
      <circle cx="15" cy="15" r="1" fill="currentColor" />
    </svg>
  )
}

interface SidebarItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
  active: boolean
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'calculator', label: 'Calculator', path: '/nomicore', icon: <CalculatorNavIcon />, active: true },
]

export default function NomicoreLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen pb-8 gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />

      <aside className="fixed top-10 left-0 bottom-0 z-50 flex flex-col w-[220px] border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl">
        <div className="flex items-center h-12 px-4 gap-2.5 border-b border-gray-200/30 dark:border-dark-border/30">
          <Link to="/nomicore" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 dark:bg-cyan-400/15 flex-shrink-0 flex items-center justify-center text-cyan-500 dark:text-cyan-400">
              <NomicoreLayoutIcon />
            </div>
            <span className="text-sm font-bold text-primary tracking-tight">N.O.M.I.</span>
          </Link>
        </div>

        <Link
          to="/"
          className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted hover:text-secondary transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Nexus
        </Link>

        <nav className="flex-1 py-2 overflow-hidden">
          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Salary Tools</p>
          {SIDEBAR_ITEMS.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => item.active && navigate(item.path)}
                disabled={!item.active}
                className={`w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                    : item.active
                      ? 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                }`}
                style={{ maxWidth: 'calc(100% - 16px)' }}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {!item.active && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted flex-shrink-0">Soon</span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="flex flex-col min-h-screen md:ml-[220px]">
        <main className="flex-1 pt-10 p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
