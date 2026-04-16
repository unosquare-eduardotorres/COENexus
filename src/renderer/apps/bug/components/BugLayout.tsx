import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import GlobalTitleBar from '../../../components/GlobalTitleBar'

function BugLayoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.88 1.88" /><path d="M14.12 3.88L16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 116 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
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
  { id: 'dashboard', label: 'Dashboard', path: '/bug', icon: <DashboardIcon />, active: true },
  { id: 'log-files', label: 'Log Files', path: '/bug/logs', icon: <FileIcon />, active: false },
]

export default function BugLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen pb-8 gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />

      <aside className="fixed top-10 left-0 bottom-0 z-50 flex flex-col w-[220px] border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl">
        <div className="flex items-center h-12 px-4 gap-2.5 border-b border-gray-200/30 dark:border-dark-border/30">
          <Link to="/bug" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 dark:bg-red-400/15 flex-shrink-0 flex items-center justify-center text-red-500 dark:text-red-400">
              <BugLayoutIcon />
            </div>
            <span className="text-sm font-bold text-primary tracking-tight">B.U.G.</span>
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
          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Error Tracking</p>
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
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
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
