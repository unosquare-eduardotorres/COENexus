import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Workflow, FileSearch, Brain, Settings } from 'lucide-react';
import GlobalTitleBar from '../../../components/GlobalTitleBar';

const ICON_MAP: Record<string, React.ReactNode> = {
  Search: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Shuffle: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H20" /><path d="m18 2 4 4-4 4" /><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" /><path d="M20 18h-3.9c-1.3 0-2.5-.6-3.3-1.7l-.5-.8" /><path d="m18 14 4 4-4 4" />
    </svg>
  ),
  GraduationCap: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
    </svg>
  ),
  Trophy: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0012 0V2Z" />
    </svg>
  ),
};

interface SidebarAgent {
  id: string;
  label: string;
  icon: string;
  accentColor: string;
  status: 'online' | 'coming-soon';
}

const SIDEBAR_AGENTS: SidebarAgent[] = [
  { id: 'scout-9', label: 'Scout-9', icon: 'Search', accentColor: '#3b82f6', status: 'online' },
  { id: 'switchboard', label: 'Switchboard', icon: 'Shuffle', accentColor: '#f59e0b', status: 'coming-soon' },
  { id: 'sensei', label: 'Sensei', icon: 'GraduationCap', accentColor: '#10b981', status: 'coming-soon' },
  { id: 'payday', label: 'Payday', icon: 'Trophy', accentColor: '#ec4899', status: 'coming-soon' },
];

function BotIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="8" x2="12" y2="11" />
      <circle cx="8" cy="16" r="1" fill="currentColor" />
      <circle cx="16" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

type AgentLiveStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'online' | 'coming-soon';

function useScout9LiveStatus(): AgentLiveStatus {
  const [status, setStatus] = useState<AgentLiveStatus>('online');

  useEffect(() => {
    let mounted = true;

    window.api.scout9.getStatus().then((res) => {
      if (!mounted) return;
      if (res?.success && res.data?.active_job) {
        const jobStatus = res.data.active_job.status;
        if (jobStatus === 'running' || jobStatus === 'queued') {
          setStatus('running');
        } else {
          setStatus('online');
        }
      }
    }).catch(() => {});

    const unsubscribe = window.api.scout9.onStatusEvent((event) => {
      if (!mounted) return;
      if (event.status === 'running') {
        setStatus('running');
      } else if (event.status === 'completed') {
        setStatus('online');
      } else if (event.status === 'failed') {
        setStatus('failed');
      } else if (event.status === 'canceled') {
        setStatus('online');
      } else {
        setStatus('online');
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return status;
}

function getStatusDotClass(status: AgentLiveStatus): string {
  switch (status) {
    case 'running': return 'bg-blue-400 animate-pulse';
    case 'failed': return 'bg-red-400';
    case 'coming-soon': return 'bg-amber-400/80';
    default: return 'bg-emerald-400';
  }
}

function getStatusTitle(status: AgentLiveStatus): string {
  switch (status) {
    case 'running': return 'Running';
    case 'failed': return 'Last run failed';
    case 'coming-soon': return 'Coming Soon';
    default: return 'Online';
  }
}

export default function AgentsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const scout9Status = useScout9LiveStatus();

  return (
    <div className="min-h-screen pb-8 gradient-subtle transition-colors duration-300">
      <GlobalTitleBar />

      <aside className="fixed top-10 left-0 bottom-0 z-50 flex flex-col w-[220px] border-r border-gray-200/30 dark:border-dark-border/30 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl">
        <div className="flex items-center h-12 px-4 gap-2.5 border-b border-gray-200/30 dark:border-dark-border/30">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 dark:bg-violet-400/15 flex-shrink-0 flex items-center justify-center text-violet-500 dark:text-violet-400">
            <BotIcon />
          </div>
          <span className="text-sm font-bold text-primary tracking-tight">A.G.E.N.T.</span>
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

        <nav className="flex-1 py-2 overflow-y-auto">
          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Specialist Agents</p>
          {SIDEBAR_AGENTS.map(agent => {
            const agentPath = `/agents/${agent.id}`;
            const isActive = location.pathname === agentPath || location.pathname.startsWith(agentPath + '/');
            return (
              <div key={agent.id}>
                <button
                  onClick={() => navigate(agentPath)}
                  className={`
                    w-full flex items-center gap-2.5 mx-2 my-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left
                    ${isActive
                      ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
                    }
                  `}
                  style={{ maxWidth: 'calc(100% - 16px)' }}
                >
                  <span className="flex-shrink-0">{ICON_MAP[agent.icon]}</span>
                  <span className="truncate flex-1">{agent.label}</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      agent.id === 'scout-9'
                        ? getStatusDotClass(scout9Status)
                        : getStatusDotClass(agent.status as AgentLiveStatus)
                    }`}
                    title={
                      agent.id === 'scout-9'
                        ? getStatusTitle(scout9Status)
                        : getStatusTitle(agent.status as AgentLiveStatus)
                    }
                  />
                </button>

                {agent.id === 'scout-9' && isActive && (
                  <div className="ml-6 mr-2 mt-0.5 mb-1 space-y-0.5">
                    {[
                      { path: agentPath, label: 'Pipeline', icon: Workflow },
                      { path: `${agentPath}/reports`, label: 'Reports', icon: FileSearch },
                      { path: `${agentPath}/brain`, label: 'Brain', icon: Brain },
                      { path: `${agentPath}/settings`, label: 'Settings', icon: Settings },
                    ].map(sub => {
                      const isSubActive = sub.path === agentPath
                        ? location.pathname === agentPath
                        : location.pathname.startsWith(sub.path);
                      return (
                        <button
                          key={sub.path}
                          onClick={() => navigate(sub.path)}
                          className={`
                            w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all text-left
                            ${isSubActive
                              ? 'text-violet-500 dark:text-violet-300 bg-violet-500/8'
                              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-dark-hover/40'
                            }
                          `}
                        >
                          <sub.icon size={13} className="flex-shrink-0" />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-gray-200/30 dark:border-dark-border/30 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(scout9Status)}`} />
            <span className="text-[10px] text-muted font-mono">
              {scout9Status === 'running' ? '1 running' : '1 online'} • 3 coming soon
            </span>
          </div>
        </div>
      </aside>

      <div className="flex flex-col min-h-screen md:ml-[220px]">
        <main className="flex-1 pt-14 p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
