import type { ReactNode } from 'react';
import PathSidebar from './PathSidebar';
import GlobalTitleBar from '../../../components/GlobalTitleBar';

export default function PathLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-8 gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />
      <PathSidebar />
      <div className="flex flex-col min-h-screen md:ml-[220px]">
        <main className="flex-1 pt-10 p-6 overflow-y-auto">
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
    </div>
  );
}
