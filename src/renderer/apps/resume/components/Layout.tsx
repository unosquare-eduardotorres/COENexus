import { useState, useEffect, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DatabaseUpdateBanner from './DatabaseUpdateBanner';
import VemLogo from '../../../components/VemLogo';

type SidebarMode = 'expanded' | 'collapsed' | 'top';

const SIDEBAR_MODE_KEY = 'resume-sidebar-mode';
const MAIN_CONTENT_ID = 'main-content';
const TITLEBAR_HEIGHT = 'h-10';
const TITLEBAR_TOP = 'top-10';

interface LayoutProps {
  children: React.ReactNode;
}

function NexusIcon() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-violet-600">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="12" x2="5" y2="6" />
        <line x1="12" y1="12" x2="19" y2="6" />
        <line x1="12" y1="12" x2="5" y2="18" />
        <line x1="12" y1="12" x2="19" y2="18" />
        <line x1="12" y1="12" x2="12" y2="3" />
        <circle cx="5" cy="6" r="2" fill="white" opacity="0.6" />
        <circle cx="19" cy="6" r="2" fill="white" opacity="0.6" />
        <circle cx="5" cy="18" r="2" fill="white" opacity="0.6" />
        <circle cx="19" cy="18" r="2" fill="white" opacity="0.6" />
        <circle cx="12" cy="3" r="2" fill="white" opacity="0.6" />
        <circle cx="12" cy="12" r="3" fill="white" />
      </svg>
    </div>
  );
}

const navigation = [
  {
    name: 'Getting Started',
    href: '/resume',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: 'Resume',
    href: '/resume/enhance',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    name: 'Match Engine',
    href: '/resume/match',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="18" cy="18" r="3" strokeWidth={1.5} />
        <circle cx="6" cy="6" r="3" strokeWidth={1.5} />
        <circle cx="6" cy="18" r="3" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 9v6m9.35 1.35L8.65 8.65" />
      </svg>
    ),
  },
  {
    name: 'Batch Processing',
    href: '/resume/batch',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    name: 'Settings',
    href: '/resume/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

function GlobalTitleBar() {
  return (
    <div className={`glass-nav fixed top-0 left-0 right-0 z-[60] ${TITLEBAR_HEIGHT} titlebar-drag border-b border-white/5`}>
      <div className="flex items-center justify-center h-full px-4">
        <Link to="/" className="titlebar-no-drag flex items-center gap-2">
          <NexusIcon />
          <span className="text-xs font-semibold tracking-tight text-primary">COE Operation Nexus</span>
        </Link>
      </div>
    </div>
  );
}

function Sidebar({
  mode,
  onToggleMode,
  onSwitchToTop,
  isMobileOpen,
  onMobileClose,
  onNavClick,
}: {
  mode: 'expanded' | 'collapsed';
  onToggleMode: () => void;
  onSwitchToTop: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onNavClick: (href: string) => void;
}) {
  const location = useLocation();
  const isExpanded = mode === 'expanded';
  const sidebarWidth = isExpanded ? 'w-[220px]' : 'w-[60px]';

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="primary-sidebar"
        aria-label="Primary navigation"
        className={`fixed ${TITLEBAR_TOP} left-0 bottom-0 z-50 flex flex-col border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl overflow-hidden transition-all duration-300 ${sidebarWidth} ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className={`flex items-center h-12 border-b border-gray-200/30 dark:border-dark-border/30 ${isExpanded ? 'px-4 gap-2.5' : 'justify-center px-2'}`}>
          <Link to="/resume" className="titlebar-no-drag flex items-center gap-2.5 min-w-0" onClick={onMobileClose}>
            <div className="w-8 h-8 rounded-lg bg-accent-500/15 dark:bg-accent-400/15 flex-shrink-0 flex items-center justify-center">
              <VemLogo size={24} className="text-accent-500 dark:text-accent-400" />
            </div>
            {isExpanded && (
              <span className="text-sm font-bold text-primary tracking-tight truncate" title="V.E.M.">
                V.E.M.
              </span>
            )}
          </Link>
        </div>

        {isExpanded && (
          <Link
            to="/"
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted hover:text-secondary transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Nexus
          </Link>
        )}

        {!isExpanded && (
          <Link
            to="/"
            className="flex items-center justify-center py-2 text-muted hover:text-secondary transition-colors"
            title="Back to Nexus"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}

        <nav className="flex-1 py-2 overflow-hidden" aria-label="Resume app sections">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/resume' && location.pathname.startsWith(item.href));

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => { onMobileClose(); onNavClick(item.href); }}
                title={!isExpanded ? item.name : undefined}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 mx-2 my-0.5 rounded-lg transition-all duration-200 ${
                  isExpanded ? 'px-3 py-2.5 min-h-[44px]' : 'justify-center px-2 py-2.5 min-h-[44px] min-w-[44px]'
                } ${
                  isActive
                    ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isExpanded && (
                  <span className="text-sm font-medium truncate" title={item.name}>{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-gray-200/30 dark:border-dark-border/30 py-2 ${isExpanded ? 'px-2' : 'px-1'}`}>
          <button
            type="button"
            onClick={onToggleMode}
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`flex items-center gap-3 w-full rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors ${
              isExpanded ? 'px-3 py-2.5 min-h-[44px]' : 'justify-center px-2 py-2.5 min-h-[44px] min-w-[44px]'
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium">Collapse</span>
            )}
          </button>

          <button
            type="button"
            onClick={onSwitchToTop}
            title="Switch to top navigation"
            aria-label="Switch to top navigation"
            className={`flex items-center gap-3 w-full rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors ${
              isExpanded ? 'px-3 py-2.5 min-h-[44px]' : 'justify-center px-2 py-2.5 min-h-[44px] min-w-[44px]'
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium">Top bar</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ onSwitchMode, onNavClick }: { onSwitchMode: () => void; onNavClick: (href: string) => void }) {
  const location = useLocation();

  return (
    <nav className="glass-nav fixed ${TITLEBAR_TOP} left-0 right-0 z-50 transition-all duration-300" aria-label="Top navigation" style={{ top: '2.5rem' }}>
      <div className="max-w-[1400px] mx-auto px-6" style={{ paddingLeft: '86px' }}>
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-10 titlebar-no-drag">
            <Link to="/resume" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-500/15 dark:bg-accent-400/15 flex items-center justify-center">
                <VemLogo size={24} className="text-accent-500 dark:text-accent-400" />
              </div>
              <span className="text-sm font-bold text-primary tracking-tight">
                V.E.M.
              </span>
            </Link>
            <Link to="/" className="text-xs text-muted hover:text-secondary transition-colors">
              ← Nexus
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/resume' && location.pathname.startsWith(item.href));
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onNavClick(item.href)}
                    aria-label={item.name}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 titlebar-no-drag">
            <button
              type="button"
              onClick={onSwitchMode}
              className="h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              title="Switch to sidebar navigation"
              aria-label="Switch to sidebar navigation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

const Layout = memo(function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    const saved = localStorage.getItem(SIDEBAR_MODE_KEY);
    if (saved === 'expanded' || saved === 'collapsed' || saved === 'top') return saved;
    return 'expanded';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_MODE_KEY, sidebarMode);
  }, [sidebarMode]);

  const handleToggleSidebarSize = () => {
    setSidebarMode((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'));
  };

  const handleSwitchToSidebar = () => {
    setSidebarMode('expanded');
  };

  const handleNavClick = (href: string) => {
    navigate(href);
  };

  const mainMargin =
    sidebarMode === 'expanded'
      ? 'md:ml-[220px]'
      : sidebarMode === 'collapsed'
      ? 'md:ml-[60px]'
      : 'ml-0';

  return (
    <div className="min-h-screen gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-accent-600 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      {sidebarMode !== 'top' ? (
        <>
          <Sidebar
            mode={sidebarMode as 'expanded' | 'collapsed'}
            onToggleMode={handleToggleSidebarSize}
            onSwitchToTop={() => setSidebarMode('top')}
            isMobileOpen={isMobileMenuOpen}
            onMobileClose={() => setIsMobileMenuOpen(false)}
            onNavClick={handleNavClick}
          />

          <div className={`flex flex-col min-h-screen transition-all duration-300 ${mainMargin}`}>
            <div className="md:hidden glass-nav fixed top-10 left-0 right-0 z-30">
              <div className="flex items-center justify-between h-12 px-4" style={{ paddingLeft: '86px' }}>
                <Link to="/resume" className="titlebar-no-drag flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent-500/15 dark:bg-accent-400/15 flex items-center justify-center">
                    <VemLogo size={24} className="text-accent-500 dark:text-accent-400" />
                  </div>
                  <span className="text-sm font-bold text-primary">V.E.M.</span>
                </Link>
                <div className="flex items-center gap-2 titlebar-no-drag">
                  <button
                    type="button"
                    onClick={() => setSidebarMode('top')}
                    className="h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
                    title="Switch to top navigation"
                    aria-label="Switch to top navigation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
                    aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="primary-sidebar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isMobileMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <main id={MAIN_CONTENT_ID} className="flex-1 pt-10">
              <DatabaseUpdateBanner />
              {children}
            </main>

            <footer className="border-t border-gray-200/30 dark:border-dark-border/30 mt-auto">
              <div className="max-w-[1400px] mx-auto px-6 py-4">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <p>© {new Date().getFullYear()} Unosquare • COE Operation Nexus</p>
                  <p className="hidden sm:block">v1.0</p>
                </div>
              </div>
            </footer>
          </div>
        </>
      ) : (
        <>
          <TopBar onSwitchMode={handleSwitchToSidebar} onNavClick={handleNavClick} />

          <main id={MAIN_CONTENT_ID} className="pt-[5.5rem]">
            <DatabaseUpdateBanner />
            {children}
          </main>

          <footer className="border-t border-gray-200/30 dark:border-dark-border/30 mt-auto">
            <div className="max-w-[1400px] mx-auto px-6 py-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <p>© {new Date().getFullYear()} Unosquare • COE Operation Nexus</p>
                <p className="hidden sm:block">v1.0</p>
              </div>
            </div>
          </footer>
        </>
      )}

    </div>
  );
});

export default Layout;
