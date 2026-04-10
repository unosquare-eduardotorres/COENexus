import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { transformSessionService } from '../services/transformSessionService';
import {
  TransformSessionSummary,
  TransformSessionDetail,
  TransformSessionStatus,
  SessionContextType,
} from '../types';
import { ChevronIcon, CloseIcon, SearchIcon } from '../../../shared/components/icons';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('TransformHistoryPage');

const STATUS_STYLES: Record<TransformSessionStatus, { bg: string; dot: string }> = {
  draft: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  processing: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  completed: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

const CONTEXT_LABELS: Record<SessionContextType, string> = {
  candidate: 'Candidate',
  employee: 'Employee',
  upload: 'Upload',
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

export default function TransformHistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TransformSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<TransformSessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    transformSessionService
      .list()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    setDeleting(true);
    try {
      await transformSessionService.remove(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }, []);

  const handleViewDetails = useCallback(async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(id);
    setExpandedDetail(null);
    setDetailLoading(true);
    try {
      const detail = await transformSessionService.get(id);
      setExpandedDetail(detail);
    } catch (err) {
      log.error('Failed to delete session:', err);
      setExpandedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [expandedId]);

  const filteredSessions = useMemo(() => {
    if (!nameFilter.trim()) return sessions;
    const query = nameFilter.toLowerCase();
    return sessions.filter((s) => s.name.toLowerCase().includes(query));
  }, [sessions, nameFilter]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel rounded-xl p-5 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/resume')}
          className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <div>
          <h2 className="text-2xl font-bold text-primary">Session History</h2>
          <p className="text-sm text-secondary mt-0.5">
            <span className="font-mono font-semibold text-primary">{sessions.length}</span> session{sessions.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      {error && (
        <div className="glass-panel rounded-xl p-4 border border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 hover:underline mt-1">
            Dismiss
          </button>
        </div>
      )}

      <div className="relative">
        <SearchIcon size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
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
            <CloseIcon size="sm" />
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
              <p className="text-sm text-muted">No enhancement sessions yet</p>
              <p className="text-xs text-muted/60 mt-1">Sessions will appear here after you save an enhancement</p>
              <button
                onClick={() => navigate('/resume/enhance')}
                className="mt-4 px-4 py-2 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors"
              >
                Start Enhancing
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredSessions.map((session) => {
            const statusStyle = STATUS_STYLES[session.status] || STATUS_STYLES.draft;
            const isExpanded = expandedId === session.id;
            return (
              <div key={session.id} className="glass-panel rounded-xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-semibold text-primary truncate" title={session.name}>
                          {session.name}
                        </h3>
                        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${statusStyle.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {session.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                          {CONTEXT_LABELS[session.contextType] || session.contextType}
                        </span>
                        {session.contextName && (
                          <span className="text-xs text-muted truncate max-w-[200px]" title={session.contextName}>
                            {session.contextName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs text-muted">{formatDate(session.createdAt)}</span>
                      <span className="text-xs text-muted/60">{formatFullDate(session.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => navigate(`/resume/enhance?session=${session.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent-500 rounded-lg hover:bg-accent-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Resume
                    </button>
                    <button
                      onClick={() => handleViewDetails(session.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-lg hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
                    >
                      <ChevronIcon
                        size="sm"
                        direction={isExpanded ? 'up' : 'down'}
                        className="transition-transform"
                      />
                      Details
                    </button>
                    <button
                      onClick={() => setDeleteTarget(session.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/5 rounded-lg hover:bg-red-500/10 transition-colors ml-auto"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-200/20 dark:border-dark-border/20">
                    {detailLoading ? (
                      <div className="py-4 space-y-2 animate-pulse">
                        <div className="h-3 bg-white/10 rounded w-2/3" />
                        <div className="h-3 bg-white/5 rounded w-1/2" />
                      </div>
                    ) : expandedDetail ? (
                      <div className="py-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                        <div>
                          <span className="text-muted">Processing Mode</span>
                          <p className="text-primary font-medium mt-0.5">{expandedDetail.processingMode || '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted">Refinement Mode</span>
                          <p className="text-primary font-medium mt-0.5">{expandedDetail.refinementMode || '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted">JD Source</span>
                          <p className="text-primary font-medium mt-0.5">{expandedDetail.jobDescriptionSource || '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted">Context ID</span>
                          <p className="text-primary font-medium mt-0.5">{expandedDetail.contextId ?? '—'}</p>
                        </div>
                        {expandedDetail.jobDescription && (
                          <div className="col-span-2">
                            <span className="text-muted">Job Description</span>
                            <p className="text-primary mt-0.5 line-clamp-3 leading-relaxed">{expandedDetail.jobDescription}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-muted">Created</span>
                          <p className="text-primary font-medium mt-0.5">{formatFullDate(expandedDetail.createdAt)}</p>
                        </div>
                        <div>
                          <span className="text-muted">Last Updated</span>
                          <p className="text-primary font-medium mt-0.5">{formatFullDate(expandedDetail.updatedAt)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="py-4 text-xs text-muted">Failed to load details</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {nameFilter && filteredSessions.length > 0 && filteredSessions.length < sessions.length && (
        <p className="text-xs text-muted text-center">
          Showing {filteredSessions.length} of {sessions.length} sessions
        </p>
      )}

      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-primary mb-2">Delete Session</h3>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
