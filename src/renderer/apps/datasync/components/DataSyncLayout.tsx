import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import GlobalTitleBar from '../../../components/GlobalTitleBar';

export type DataSyncPanel = 'overview' | 'employees' | 'candidates' | 'open-positions' | 'project-reallocations' | 'vectorization' | 'database-sharing';

interface DataSyncLayoutProps {
  children: ReactNode;
  activePanel: DataSyncPanel;
  onPanelChange: (panel: DataSyncPanel) => void;
}

function DataSyncIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
      />
    </svg>
  );
}

const sourceItems: Array<{ id: DataSyncPanel; label: string; icon: JSX.Element }> = [
  {
    id: 'employees',
    label: 'Employees',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    id: 'candidates',
    label: 'Candidates',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    id: 'open-positions',
    label: 'Open Positions',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    id: 'project-reallocations',
    label: 'Project Reallocations',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
];

const configItems: Array<{ id: DataSyncPanel; label: string; icon: JSX.Element }> = [
  {
    id: 'vectorization',
    label: 'Vectorization',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: 'database-sharing',
    label: 'Database Sharing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
];

export default function DataSyncLayout({
  children,
  activePanel,
  onPanelChange,
}: DataSyncLayoutProps) {
  return (
    <div className="min-h-screen pb-8 gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />

      <aside className="fixed top-10 left-0 bottom-0 z-50 flex flex-col w-[220px] border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl">
        <div className="flex items-center h-12 px-4 gap-2.5 border-b border-gray-200/30 dark:border-dark-border/30">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 flex-shrink-0 flex items-center justify-center text-amber-500 dark:text-amber-400">
            <DataSyncIcon />
          </div>
          <span className="text-sm font-bold text-primary tracking-tight">D.A.T.A.</span>
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

        <nav className="flex-1 py-2 overflow-hidden" aria-label="DataSync sections">
          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Overview</p>
          <button
            type="button"
            onClick={() => onPanelChange('overview')}
            className={`w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activePanel === 'overview'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
            }`}
            style={{ maxWidth: 'calc(100% - 16px)' }}
          >
            <span className="flex-shrink-0"><DataSyncIcon /></span>
            <span className="truncate">Overview</span>
          </button>

          <div className="minimal-divider mx-3 my-2" />

          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Sources</p>
          {sourceItems.map(item => {
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPanelChange(item.id)}
                className={`w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                }`}
                style={{ maxWidth: 'calc(100% - 16px)' }}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="minimal-divider mx-3 my-2" />

          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Configuration</p>
          {configItems.map(item => {
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPanelChange(item.id)}
                className={`w-full flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                }`}
                style={{ maxWidth: 'calc(100% - 16px)' }}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

      </aside>

      <div className="flex flex-col min-h-screen md:ml-[220px]">
        <main className="flex-1 pt-10 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
