import { useState, useEffect } from 'react';
import { discussionService } from '../services';
import { trackPathEvent } from '../services/pathAnalytics';
import type { DiscussionThread } from '../types';
import ThreadMessage from '../components/ThreadMessage';
import ReadinessRing from '../components/ReadinessRing';

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const statusLabel: Record<string, { text: string; className: string }> = {
  open: { text: 'Active', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  'in-review': { text: 'In Review', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  resolved: { text: 'Completed', className: 'bg-gray-500/15 text-gray-600 dark:text-gray-400' },
  archived: { text: 'Archive', className: 'bg-gray-500/10 text-gray-500' },
};

export default function InsightsPage() {
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    discussionService.listThreads()
      .then((data) => {
        setThreads(data);
        if (data.length > 0) setSelectedThreadId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
  if (threads.length === 0) return <div className="glass-card rounded-xl p-8 text-center text-secondary">No data available</div>;

  const activeThread = threads.find((t) => t.id === selectedThreadId);
  const messages = activeThread?.messages || [];

  const handleSend = () => {
    if (!newMessage.trim() || !selectedThreadId) return;
    trackPathEvent('message_sent', { threadId: selectedThreadId });
    setNewMessage('');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary">Collaboration Threads</h1>
        <p className="text-sm text-secondary">Aligning your growth with institutional standards through direct mentorship.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_260px]">
        <div className="space-y-3">
          <button className="glass-button flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-sm font-semibold text-violet-700 dark:text-violet-300">
            New Development Plan
          </button>

          <div className="space-y-1">
            {threads.map((thread) => {
              const st = statusLabel[thread.status] || statusLabel.open;
              const isActive = thread.id === selectedThreadId;
              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full rounded-xl p-3 text-left transition-all ${
                    isActive ? 'glass-card shadow-sm' : 'hover:bg-violet-500/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${st.className}`}>{st.text}</span>
                    <span className="text-[11px] text-muted">{formatTimeAgo(thread.lastActivityAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-primary truncate">{thread.title}</p>
                  <p className="mt-0.5 text-xs text-muted truncate">
                    {thread.messages?.[0]?.authorRole}: &quot;{thread.messages?.[0]?.content.slice(0, 50)}...&quot;
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-card flex flex-col rounded-xl">
          {activeThread && (
            <>
              <div className="border-b border-white/10 p-4">
                <h2 className="text-lg font-bold text-primary">{activeThread.title}</h2>
                <p className="text-xs text-muted">
                  Assigned to: {activeThread.participants?.[1] || 'Team'}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="flex justify-center">
                  <span className="rounded-full bg-gray-200/50 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted dark:bg-white/10">
                    Conversation Started {new Date(messages[0]?.createdAt || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {messages.map((msg) => (
                  <ThreadMessage
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.authorRole === 'developer'}
                  />
                ))}
              </div>

              <div className="border-t border-white/10 p-3">
                <div className="flex items-end gap-2">
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-primary">
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none"><path d="M14 8a6 6 0 11-12 0 6 6 0 0112 0z" stroke="currentColor" strokeWidth="1.2" /><path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  </button>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message to the team..."
                    className="glass-input min-h-[36px] flex-1 resize-none rounded-xl px-3 py-2 text-sm"
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-700"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none"><path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor" /></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Current Readiness</h3>
            <div className="mt-3 flex justify-center">
              <div className="relative">
                <ReadinessRing score={75} size={100} label="L3 Target" strokeWidth={6} />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary">System Design</span>
                  <span className="font-medium text-primary">Advanced</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-gray-200 dark:bg-white/10">
                  <div className="h-1 rounded-full bg-blue-500" style={{ width: '80%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary">Mentorship</span>
                  <span className="font-medium text-primary">Intermediate</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-gray-200 dark:bg-white/10">
                  <div className="h-1 rounded-full bg-blue-500" style={{ width: '55%' }} />
                </div>
              </div>
            </div>
          </div>

          {activeThread && (
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Thread Context</h3>
              <div className="mt-3 space-y-2">
                {activeThread.goal && (
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded bg-violet-500/15">
                      <svg className="h-3 w-3 text-violet-600 dark:text-violet-400" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1l1.5 3H11l-2.5 2 1 3L6 7.5 2.5 9l1-3L1 4h3.5L6 1z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted">Goal</p>
                      <p className="text-xs text-primary">{activeThread.goal}</p>
                    </div>
                  </div>
                )}
                {activeThread.competency && (
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded bg-blue-500/15">
                      <svg className="h-3 w-3 text-blue-600 dark:text-blue-400" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 2l1 2h2L7.5 6.5l.5 2L6 7.5 4 8.5l.5-2L3 5h2L6 3z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted">Competency</p>
                      <p className="text-xs text-primary">{activeThread.competency}</p>
                    </div>
                  </div>
                )}
                <button className="glass-button mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-secondary hover:text-primary">
                  View Learning Path
                </button>
              </div>
            </div>
          )}

          <div className="glass-card rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Team on Thread</h3>
            <div className="mt-3 space-y-2">
              {activeThread?.participants?.map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                    {name.split(' ').map((w) => w[0]).join('')}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary">{name}</p>
                    <p className="text-[10px] text-muted">Member</p>
                  </div>
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
