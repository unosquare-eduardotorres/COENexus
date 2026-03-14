import { useState, useMemo } from 'react';
import { MatchSessionSummary, DataSource, MatchFlowType } from '../../types';

interface SessionHistoryPageProps {
  sessions: MatchSessionSummary[];
  onLoadSession: (id: number) => void;
  onBack: () => void;
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

const STATUS_STYLES: Record<string, { bg: string; dot: string }> = {
  completed: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  running: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  failed: { bg: 'bg-red-500/10 text-red-600 dark:text-red-400', dot: 'bg-red-500' },
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SessionHistoryPage({ sessions, onLoadSession, onBack }: SessionHistoryPageProps) {
  const [nameFilter, setNameFilter] = useState('');

  const filteredSessions = useMemo(() => {
    if (!nameFilter.trim()) return sessions;
    const query = nameFilter.toLowerCase();
    return sessions.filter((s) => s.name.toLowerCase().includes(query));
  }, [sessions, nameFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <div>
          <h2 className="text-2xl font-bold text-primary">Search History</h2>
          <p className="text-sm text-secondary mt-0.5">
            <span className="font-mono font-semibold text-primary">{sessions.length}</span> session{sessions.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Filter by session name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
        {nameFilter && (
          <button
            onClick={() => setNameFilter('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-white/10 text-muted hover:text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {filteredSessions.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          {nameFilter ? (
            <>
              <p className="text-sm text-muted">No sessions matching &ldquo;{nameFilter}&rdquo;</p>
              <button onClick={() => setNameFilter('')} className="text-xs text-accent-500 hover:underline mt-2">
                Clear filter
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">No search sessions yet</p>
              <p className="text-xs text-muted/60 mt-1">Sessions will appear here after your first search</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredSessions.map((session) => {
            const statusStyle = STATUS_STYLES[session.status] || STATUS_STYLES.completed;
            return (
              <button
                key={session.id}
                onClick={() => onLoadSession(session.id)}
                className="w-full text-left glass-panel rounded-xl p-5 hover:bg-white/5 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-semibold text-primary truncate group-hover:text-accent-500 transition-colors">
                        {session.name}
                      </h3>
                      <span className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md ${statusStyle.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {session.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                        {SOURCE_LABELS[session.dataSource] || session.dataSource}
                      </span>
                      <span className="text-xs text-muted">
                        {FLOW_LABELS[session.matchFlowType] || session.matchFlowType}
                      </span>
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded-md bg-white/5 text-muted">
                        Top {session.topN}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-xs text-muted">{formatDate(session.createdAt)}</span>
                    {session.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        {session.candidateCount != null && (
                          <span className="text-xs font-mono text-secondary">
                            {session.candidateCount} match{session.candidateCount !== 1 ? 'es' : ''}
                          </span>
                        )}
                        {session.time && (
                          <span className="text-xs font-mono text-muted">{session.time}</span>
                        )}
                      </div>
                    )}
                    <span className="text-[10px] text-muted/60">{formatFullDate(session.createdAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {nameFilter && filteredSessions.length > 0 && filteredSessions.length < sessions.length && (
        <p className="text-xs text-muted text-center">
          Showing {filteredSessions.length} of {sessions.length} sessions
        </p>
      )}
    </div>
  );
}
