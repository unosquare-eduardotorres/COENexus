import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';

type SidebarMode = 'expanded' | 'collapsed' | 'top';

const SIDEBAR_MODE_KEY = 'resume-sidebar-mode';

interface LayoutProps {
  children: React.ReactNode;
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
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
    name: 'Data Sync',
    href: '/resume/data-sync',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
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
  const { theme, toggleTheme } = useTheme();
  const isExpanded = mode === 'expanded';
  const sidebarWidth = isExpanded ? 'w-[220px]' : 'w-[60px]';

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl transition-all duration-300 ${sidebarWidth} ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className={`flex items-center h-14 border-b border-gray-200/30 dark:border-dark-border/30 ${isExpanded ? 'px-4 gap-2.5' : 'justify-center px-2'}`}>
          <Link to="/resume" className="flex items-center gap-2.5 min-w-0" onClick={onMobileClose}>
            <div className="w-8 h-8 rounded-lg bg-accent-500 flex-shrink-0 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            {isExpanded && (
              <span className="text-sm font-semibold text-primary tracking-tight truncate">
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

        <nav className="flex-1 py-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/resume' && location.pathname.startsWith(item.href));

            return (
              <button
                key={item.name}
                onClick={() => { onMobileClose(); onNavClick(item.href); }}
                title={!isExpanded ? item.name : undefined}
                className={`w-full flex items-center gap-3 mx-2 my-0.5 rounded-lg transition-all duration-200 ${
                  isExpanded ? 'px-3 py-2.5' : 'justify-center px-2 py-2.5'
                } ${
                  isActive
                    ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isExpanded && (
                  <span className="text-sm font-medium truncate">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-gray-200/30 dark:border-dark-border/30 py-2 ${isExpanded ? 'px-2' : 'px-1'}`}>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`flex items-center gap-3 w-full rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors ${
              isExpanded ? 'px-3 py-2.5' : 'justify-center px-2 py-2.5'
            }`}
          >
            {theme === 'dark' ? (
              <SunIcon className="w-5 h-5 flex-shrink-0" />
            ) : (
              <MoonIcon className="w-5 h-5 flex-shrink-0" />
            )}
            {isExpanded && (
              <span className="text-sm font-medium">
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </span>
            )}
          </button>

          <button
            onClick={onToggleMode}
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`flex items-center gap-3 w-full rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors ${
              isExpanded ? 'px-3 py-2.5' : 'justify-center px-2 py-2.5'
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
            onClick={onSwitchToTop}
            title="Switch to top navigation"
            className={`flex items-center gap-3 w-full rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 transition-colors ${
              isExpanded ? 'px-3 py-2.5' : 'justify-center px-2 py-2.5'
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
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-10">
            <Link to="/resume" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-sm font-semibold text-primary tracking-tight">
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
                    onClick={() => onNavClick(item.href)}
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

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <SunIcon className="w-4 h-4" />
              ) : (
                <MoonIcon className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onSwitchMode}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              title="Switch to sidebar navigation"
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

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    const saved = localStorage.getItem(SIDEBAR_MODE_KEY);
    if (saved === 'expanded' || saved === 'collapsed' || saved === 'top') return saved;
    return 'expanded';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [continueTarget, setContinueTarget] = useState('');

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
    const saved = sessionStorage.getItem('resume-enhance-state');
    const isOnEnhance = location.pathname === '/resume/enhance';

    let hasMeaningfulProgress = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        hasMeaningfulProgress = parsed.currentStepKey && parsed.currentStepKey !== 'processing';
      } catch { /* ignore parse errors */ }
    }

    if (hasMeaningfulProgress && isOnEnhance && href !== '/resume/enhance') {
      setContinueTarget(href);
      setShowContinueModal(true);
    } else if (hasMeaningfulProgress && !isOnEnhance && href === '/resume/enhance') {
      setContinueTarget(href);
      setShowContinueModal(true);
    } else {
      navigate(href);
    }
  };

  const mainMargin =
    sidebarMode === 'expanded'
      ? 'md:ml-[220px]'
      : sidebarMode === 'collapsed'
      ? 'md:ml-[60px]'
      : 'ml-0';

  return (
    <div className="min-h-screen gradient-subtle transition-colors duration-300">
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
            <div className="md:hidden glass-nav fixed top-0 left-0 right-0 z-30">
              <div className="flex items-center justify-between h-14 px-4">
                <Link to="/resume" className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-accent-500 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-primary">V.E.M.</span>
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSidebarMode('top')}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
                    title="Switch to top navigation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
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

            <main className="flex-1 md:pt-0 pt-14">{children}</main>

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

          <main className="pt-14">{children}</main>

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

      {showContinueModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-primary mb-2">Resume Enhancement In Progress</h3>
            <p className="text-sm text-muted mb-5">
              {continueTarget === '/resume/enhance'
                ? 'You have an enhancement in progress. Would you like to continue where you left off?'
                : 'You have an enhancement in progress. Navigating away will keep your progress saved. Continue?'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  sessionStorage.removeItem('resume-enhance-state');
                  setShowContinueModal(false);
                  navigate(continueTarget);
                }}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                {continueTarget === '/resume/enhance' ? 'Start Fresh' : 'Discard & Navigate'}
              </button>
              <button
                onClick={() => {
                  setShowContinueModal(false);
                  if (continueTarget === '/resume/enhance') {
                    navigate('/resume/enhance');
                  } else {
                    navigate(continueTarget);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-500 rounded-xl hover:bg-accent-600 transition-colors"
              >
                {continueTarget === '/resume/enhance' ? 'Continue' : 'Keep & Navigate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
