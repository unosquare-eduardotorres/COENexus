import { memo } from 'react';

export type DataSyncPanel = 'employees' | 'candidates' | 'open-positions' | 'vectorization' | 'database-sharing';

interface DataSyncSidebarProps {
  activePanel: DataSyncPanel;
  onPanelChange: (panel: DataSyncPanel) => void;
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

const DataSyncSidebar = memo(function DataSyncSidebar({ activePanel, onPanelChange }: DataSyncSidebarProps) {
  return (
    <nav className="w-56 flex-shrink-0" aria-label="DataSync sections">
      <div className="glass-card overflow-hidden" role="tablist" aria-orientation="vertical">
        <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted uppercase tracking-wider">Sources</p>
        {sourceItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activePanel === item.id}
            onClick={() => onPanelChange(item.id)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all text-sm ${
              activePanel === item.id
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-l-2 border-amber-500'
                : 'text-secondary hover:bg-white/50 dark:hover:bg-dark-hover/50'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        <div className="minimal-divider mx-3" />

        <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted uppercase tracking-wider">Configuration</p>
        {configItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activePanel === item.id}
            onClick={() => onPanelChange(item.id)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all text-sm ${
              activePanel === item.id
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-l-2 border-amber-500'
                : 'text-secondary hover:bg-white/50 dark:hover:bg-dark-hover/50'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
});

export default DataSyncSidebar;
