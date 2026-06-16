import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import GlobalTitleBar from '../../../components/GlobalTitleBar';

interface CommandCenterLayoutProps {
  lastSyncedAt: string | null;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never synced';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CoreIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ArrowsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

interface SidebarItem {
  label: string;
  path: string;
  active: boolean;
  icon: React.ReactNode;
}

const OVERVIEW_ITEM: SidebarItem = {
  label: 'Overview', path: '/command-center', active: true, icon: <CoreIcon />,
};

const REPORT_ITEMS: SidebarItem[] = [
  { label: 'Open Positions', path: '/command-center/open-positions', active: true, icon: <BarChartIcon /> },
  { label: 'Placements', path: '/command-center/placements', active: false, icon: <UsersIcon /> },
  { label: 'Project Reallocation', path: '/command-center/reallocation', active: true, icon: <ArrowsIcon /> },
  { label: 'C.O.E. Tracking', path: '/command-center/coe-tracking', active: true, icon: <TargetIcon /> },
  { label: 'C.O.E. Bonus', path: '/command-center/coe-bonus', active: true, icon: <TrophyIcon /> },
  { label: 'Responsiveness', path: '/command-center/responsiveness', active: true, icon: <ChatBubbleIcon /> },
];

export default function CommandCenterLayout({ lastSyncedAt }: CommandCenterLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 'w-[52px]' : 'w-[220px]';
  const contentMargin = collapsed ? 'md:ml-[52px]' : 'md:ml-[220px]';

  return (
    <div className="min-h-screen pb-8 gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />

      <aside className={`fixed top-10 left-0 bottom-7 z-50 flex flex-col ${sidebarWidth} border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl no-print transition-all duration-200`}>
        <div className={`flex items-center h-12 ${collapsed ? 'justify-center px-0' : 'px-4'} gap-2.5 border-b border-gray-200/30 dark:border-dark-border/30`}>
          <Link to="/command-center" className="flex items-center gap-2.5" title="C.O.R.E.">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 dark:bg-emerald-400/15 flex-shrink-0 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
              <CoreIcon />
            </div>
            {!collapsed && <span className="text-sm font-bold text-primary tracking-tight">C.O.R.E.</span>}
          </Link>
        </div>

        <div className={`flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-4'} py-1.5`}>
          {!collapsed ? (
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Nexus
            </Link>
          ) : (
            <Link
              to="/"
              className="text-muted hover:text-secondary transition-colors"
              title="Back to Nexus"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-md text-muted hover:text-secondary hover:bg-white/5 dark:hover:bg-dark-hover/50 transition-all"
              title="Collapse sidebar"
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center py-1 text-muted hover:text-secondary hover:bg-white/5 dark:hover:bg-dark-hover/50 transition-all"
            title="Expand sidebar"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              className="rotate-180"
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
        )}

        <nav className="flex-1 py-2 overflow-hidden">
          {!collapsed && <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Overview</p>}
          {(() => {
            const isActive = location.pathname === OVERVIEW_ITEM.path && !location.pathname.includes('/open-positions') && !location.pathname.includes('/placements') && !location.pathname.includes('/reallocation') && !location.pathname.includes('/coe-tracking');
            return (
              <button
                type="button"
                onClick={() => navigate(OVERVIEW_ITEM.path)}
                title={collapsed ? OVERVIEW_ITEM.label : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center gap-0 mx-0 px-0 py-2.5' : 'gap-3 mx-2 px-3 py-2.5'} my-0.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                }`}
                style={collapsed ? undefined : { maxWidth: 'calc(100% - 16px)' }}
              >
                <span className="flex-shrink-0">{OVERVIEW_ITEM.icon}</span>
                {!collapsed && <span className="truncate">{OVERVIEW_ITEM.label}</span>}
              </button>
            );
          })()}

          <div className="minimal-divider mx-3 my-2" />

          {!collapsed && <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Reports</p>}
          {REPORT_ITEMS.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => item.active && navigate(item.path)}
                disabled={!item.active}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center gap-0 mx-0 px-0 py-2.5' : 'gap-3 mx-2 px-3 py-2.5'} my-0.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : item.active
                      ? 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                }`}
                style={collapsed ? undefined : { maxWidth: 'calc(100% - 16px)' }}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && !item.active && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted flex-shrink-0">Soon</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-200/30 dark:border-dark-border/30 px-2 py-2">
          {!collapsed ? (
            <div className="flex items-center gap-1.5 px-2">
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${lastSyncedAt ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-[10px] text-muted font-mono">Synced: {formatRelativeTime(lastSyncedAt)}</span>
            </div>
          ) : (
            <div className="flex justify-center" title={`Synced: ${formatRelativeTime(lastSyncedAt)}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${lastSyncedAt ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>
          )}
        </div>
      </aside>

      <div className={`flex flex-col min-h-screen ${contentMargin} transition-all duration-200`}>
        <main className="flex-1 pt-10 p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
