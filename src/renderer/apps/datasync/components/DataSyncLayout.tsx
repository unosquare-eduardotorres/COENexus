import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import DataSyncSidebar, { DataSyncPanel } from './DataSyncSidebar';
import TokenBar from './TokenBar';

const TITLEBAR_HEIGHT = 'h-10';

interface DataSyncLayoutProps {
  children: ReactNode;
  activePanel: DataSyncPanel;
  onPanelChange: (panel: DataSyncPanel) => void;
  token: string;
  onTokenChange: (token: string) => void;
  isTokenValid: boolean;
  isValidating: boolean;
  tokenError?: string;
  onValidate: () => void;
  onDisconnect: () => void;
  onTokenExpired: () => void;
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

export default function DataSyncLayout({
  children,
  activePanel,
  onPanelChange,
  token,
  onTokenChange,
  isTokenValid,
  isValidating,
  tokenError,
  onValidate,
  onDisconnect,
  onTokenExpired,
}: DataSyncLayoutProps) {
  return (
    <div className="min-h-screen gradient-subtle transition-colors duration-300">
      <div className={`glass-nav fixed top-0 left-0 right-0 z-[60] ${TITLEBAR_HEIGHT} titlebar-drag border-b border-white/5`} />

      <header className="fixed top-10 left-0 right-0 z-50 glass-nav border-b border-gray-200/30 dark:border-dark-border/30">
        <div className="flex items-center justify-between h-12 px-4 max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link to="/" className="titlebar-no-drag flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors mr-4">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Nexus
            </Link>

            <div className="flex items-center gap-2.5 titlebar-no-drag">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 flex-shrink-0 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <DataSyncIcon />
              </div>
              <span className="text-sm font-bold text-primary tracking-tight">D.A.T.A.</span>
            </div>
          </div>

          <TokenBar
            token={token}
            onTokenChange={onTokenChange}
            isTokenValid={isTokenValid}
            isValidating={isValidating}
            tokenError={tokenError}
            onValidate={onValidate}
            onDisconnect={onDisconnect}
            onExpired={onTokenExpired}
          />
        </div>
      </header>

      <div className="pt-[5.5rem] flex max-w-7xl mx-auto px-4 gap-5">
        <div className="sticky top-[5.5rem] self-start py-6">
          <DataSyncSidebar activePanel={activePanel} onPanelChange={onPanelChange} />
        </div>
        <main className="flex-1 py-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
