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
  { label: 'Project Reallocation', path: '/command-center/reallocation', active: false, icon: <ArrowsIcon /> },
];

export default function CommandCenterLayout({ lastSyncedAt }: CommandCenterLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-8 gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />

      <aside className="fixed top-10 left-0 bottom-0 z-50 flex flex-col w-[220px] border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl">
        <div className="flex items-center h-12 px-4 gap-2.5 border-b border-gray-200/30 dark:border-dark-border/30">
          <Link to="/command-center" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 dark:bg-emerald-400/15 flex-shrink-0 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
              <CoreIcon />
            </div>
            <span className="text-sm font-bold text-primary tracking-tight">C.O.R.E.</span>
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
          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Overview</p>
          {(() => {
            const isActive = location.pathname === OVERVIEW_ITEM.path && !location.pathname.includes('/open-positions') && !location.pathname.includes('/placements') && !location.pathname.includes('/reallocation');
            return (
              <button
                type="button"
                onClick={() => navigate(OVERVIEW_ITEM.path)}
                className={`w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                }`}
                style={{ maxWidth: 'calc(100% - 16px)' }}
              >
                <span className="flex-shrink-0">{OVERVIEW_ITEM.icon}</span>
                <span className="truncate">{OVERVIEW_ITEM.label}</span>
              </button>
            );
          })()}

          <div className="minimal-divider mx-3 my-2" />

          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Reports</p>
          {REPORT_ITEMS.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => item.active && navigate(item.path)}
                disabled={!item.active}
                className={`w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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
            );
          })}
        </nav>

        <div className="border-t border-gray-200/30 dark:border-dark-border/30 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${lastSyncedAt ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-[10px] text-muted font-mono">Synced: {formatRelativeTime(lastSyncedAt)}</span>
          </div>
        </div>
      </aside>

      <div className="flex flex-col min-h-screen md:ml-[220px]">
        <main className="flex-1 pt-10 p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
