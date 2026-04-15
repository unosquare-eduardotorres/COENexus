import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Workflow, FileSearch, Brain, Settings, Home } from 'lucide-react';
import GlobalTitleBar from '../../../components/GlobalTitleBar';
import { AGENT_IMAGES } from '../assets';

interface SidebarAgent {
  id: string;
  label: string;
  icon: string;
  accentColor: string;
  status: 'online' | 'coming-soon';
}

const SIDEBAR_AGENTS: SidebarAgent[] = [
  { id: 'scout-9', label: 'Scout-9', icon: 'Search', accentColor: '#3b82f6', status: 'online' },
  { id: 'vigil', label: 'Vigil', icon: 'Radar', accentColor: '#94a3b8', status: 'online' },
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

    window.api?.scout9?.getStatus().then((res) => {
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

    const unsubscribe = window.api?.scout9?.onStatusEvent((event) => {
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
      unsubscribe?.();
    };
  }, []);

  return status;
}

function useVigilLiveStatus(): AgentLiveStatus {
  const [status, setStatus] = useState<AgentLiveStatus>('online');

  useEffect(() => {
    let mounted = true;

    window.api?.vigil?.getStatus().then((res) => {
      if (!mounted) return;
      if (res?.success && res.data?.active_run) {
        const runStatus = res.data.active_run.status;
        if (runStatus === 'running' || runStatus === 'queued') {
          setStatus('running');
        } else if (runStatus === 'failed') {
          setStatus('failed');
        } else {
          setStatus('online');
        }
      } else {
        setStatus('online');
      }
    }).catch(() => {});

    const unsubscribe = window.api?.vigil?.onStatusEvent((event) => {
      if (!mounted) return;
      if (event.status === 'running' || event.status === 'queued') {
        setStatus('running');
      } else if (event.status === 'failed') {
        setStatus('failed');
      } else {
        setStatus('online');
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
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
  const vigilStatus = useVigilLiveStatus();

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
          <button
            onClick={() => navigate('/agents')}
            className={`
              w-full flex items-center gap-2.5 mx-2 my-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left
              ${location.pathname === '/agents'
                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-dark-hover/50'
              }
            `}
            style={{ maxWidth: 'calc(100% - 16px)' }}
          >
            <Home size={16} className="flex-shrink-0" />
            <span className="truncate flex-1">Home</span>
          </button>
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
                  <img
                    src={AGENT_IMAGES[agent.id]?.avatar}
                    alt={agent.label}
                    className="h-7 w-7 rounded-lg object-cover flex-shrink-0"
                  />
                  <span className="truncate flex-1">{agent.label}</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      agent.id === 'scout-9'
                        ? getStatusDotClass(scout9Status)
                        : agent.id === 'vigil'
                        ? getStatusDotClass(vigilStatus)
                        : getStatusDotClass(agent.status as AgentLiveStatus)
                    }`}
                    title={
                      agent.id === 'scout-9'
                        ? getStatusTitle(scout9Status)
                        : agent.id === 'vigil'
                        ? getStatusTitle(vigilStatus)
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
            <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(
              scout9Status === 'running' || vigilStatus === 'running'
                ? 'running'
                : scout9Status === 'failed' || vigilStatus === 'failed'
                ? 'failed'
                : 'online'
            )}`} />
            <span className="text-[10px] text-muted font-mono">
              2 online • 3 coming soon
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
