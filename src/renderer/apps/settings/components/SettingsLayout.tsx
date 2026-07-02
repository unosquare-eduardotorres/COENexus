import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import GlobalTitleBar from '../../../components/GlobalTitleBar'

function DatabaseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function VectorizationIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  )
}

function DataMaintenanceIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  )
}

function AIModelsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

interface SidebarItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
  active: boolean
  group: 'configuration' | 'infrastructure'
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'database', label: 'Database', path: '/settings', icon: <DatabaseIcon />, active: true, group: 'configuration' },
  { id: 'email', label: 'Email', path: '/settings/email', icon: <MailIcon />, active: true, group: 'configuration' },
  { id: 'vectorization', label: 'Vectorization', path: '/settings/vectorization', icon: <VectorizationIcon />, active: true, group: 'infrastructure' },
  { id: 'data-maintenance', label: 'Data Maintenance', path: '/settings/data-maintenance', icon: <DataMaintenanceIcon />, active: true, group: 'infrastructure' },
  { id: 'ai-models', label: 'AI Models', path: '/settings/ai-models', icon: <AIModelsIcon />, active: true, group: 'configuration' },
]

const GROUPS = [
  { key: 'configuration' as const, label: 'Configuration' },
  { key: 'infrastructure' as const, label: 'Infrastructure' },
]

export default function SettingsLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="min-h-screen pb-8 gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />

      <aside className="fixed top-10 left-0 bottom-0 z-50 flex flex-col w-[220px] border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl">
        <div className="flex items-center h-12 px-4 gap-2.5 border-b border-gray-200/30 dark:border-dark-border/30">
          <Link to="/settings" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-500/15 dark:bg-gray-400/15 flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <GearIcon />
            </div>
            <span className="text-sm font-bold text-primary tracking-tight">Settings</span>
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
          {GROUPS.map((group, groupIndex) => {
            const items = SIDEBAR_ITEMS.filter(i => i.group === group.key)
            if (!items.length) return null
            return (
              <div key={group.key}>
                {groupIndex > 0 && <div className="minimal-divider mx-3 my-1" />}
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{group.label}</p>
                {items.map(item => {
                  const isActive = item.path === '/settings'
                    ? location.pathname === '/settings'
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => item.active && navigate(item.path)}
                      disabled={!item.active}
                      className={`w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
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
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="flex flex-col min-h-screen md:ml-[220px]">
        <main ref={mainRef} className="flex-1 pt-10 p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
