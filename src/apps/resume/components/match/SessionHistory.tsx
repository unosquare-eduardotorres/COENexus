import { MatchSessionSummary, DataSource, MatchFlowType } from '../../types';

interface SessionHistoryProps {
  sessions: MatchSessionSummary[];
  onLoadSession: (id: number) => void;
  currentSessionId?: number | null;
  onClose: () => void;
}

const SOURCE_LABELS: Record<DataSource, string> = {
  bench: 'Bench',
  'all-employees': 'Employees',
  candidates: 'Candidates',
  'all-sources': 'All Sources',
};

const FLOW_LABELS: Record<MatchFlowType, string> = {
  'find-for-position': 'Find for Position',
  'match-to-positions': 'Match to Positions',
  'delivery-to-op': 'Delivery Pro to OP',
};

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  running: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SessionHistory({ sessions, onLoadSession, currentSessionId, onClose }: SessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-muted">No search sessions yet</p>
        <p className="text-xs text-muted/60 mt-1">Sessions will appear here after your first search</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-primary">Session History</span>
          <span className="text-xs text-muted font-mono px-1.5 py-0.5 rounded-md bg-white/5">{sessions.length}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/5 text-muted hover:text-secondary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {sessions.map((session) => {
          const isActive = currentSessionId === session.id;
          return (
            <button
              key={session.id}
              onClick={() => onLoadSession(session.id)}
              className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-b-0 transition-colors ${
                isActive
                  ? 'bg-accent-500/10'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${isActive ? 'text-accent-500' : 'text-primary'}`}>
                      {session.name}
                    </span>
                    {isActive && (
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                      {SOURCE_LABELS[session.dataSource] || session.dataSource}
                    </span>
                    <span className="text-xs text-muted">
                      {FLOW_LABELS[session.matchFlowType] || session.matchFlowType}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${STATUS_STYLES[session.status] || ''}`}>
                    {session.status}
                  </span>
                  <span className="text-xs text-muted">{formatDate(session.createdAt)}</span>
                </div>
              </div>
              {session.status === 'completed' && (
                <div className="flex items-center gap-3 mt-1.5">
                  {session.candidateCount != null && (
                    <span className="text-xs text-secondary font-mono">
                      {session.candidateCount} candidates
                    </span>
                  )}
                  {session.time && (
                    <span className="text-xs text-muted font-mono">{session.time}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
