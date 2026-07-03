import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import GlobalTitleBar from '../../../components/GlobalTitleBar';

const ACCENT = '#a855f7';

function CatalogIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20" />
      <path d="M8 7h6" /><path d="M8 11h4" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Overview', path: '/catalogs', icon: <OverviewIcon /> },
  { label: 'Centers of Excellence', path: '/catalogs/coes', icon: <BuildingIcon /> },
  { label: 'Practices', path: '/catalogs/practices', icon: <LayersIcon /> },
  { label: 'Skills', path: '/catalogs/skills', icon: <WrenchIcon /> },
];

export default function CatalogsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 'w-[52px]' : 'w-[220px]';
  const contentMargin = collapsed ? 'md:ml-[52px]' : 'md:ml-[220px]';

  return (
    <div className="min-h-screen pb-8 gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />

      <aside className={`fixed top-10 left-0 bottom-7 z-50 flex flex-col ${sidebarWidth} border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl no-print transition-all duration-200`}>
        {/* Header */}
        <div className={`flex items-center h-12 ${collapsed ? 'justify-center px-0' : 'px-4'} gap-2.5 border-b border-gray-200/30 dark:border-dark-border/30`}>
          <Link to="/catalogs" className="flex items-center gap-2.5" title="C.A.T.">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: `${ACCENT}26`, color: ACCENT }}>
              <CatalogIcon />
            </div>
            {!collapsed && <span className="text-sm font-bold text-primary tracking-tight">C.A.T.</span>}
          </Link>
        </div>

        {/* Back + Collapse */}
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="rotate-180">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-hidden">
          {!collapsed && <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Catalogs</p>}
          {NAV_ITEMS.map(item => {
            const isActive = item.path === '/catalogs'
              ? location.pathname === '/catalogs'
              : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center gap-0 mx-0 px-0 py-2.5' : 'gap-3 mx-2 px-3 py-2.5'} my-0.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                }`}
                style={collapsed ? undefined : { maxWidth: 'calc(100% - 16px)' }}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200/30 dark:border-dark-border/30 px-2 py-2">
          {!collapsed ? (
            <div className="flex items-center gap-1.5 px-2">
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-purple-400" />
              <span className="text-[10px] text-muted font-mono">Catalog Administration Tools</span>
            </div>
          ) : (
            <div className="flex justify-center" title="C.A.T.">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
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
