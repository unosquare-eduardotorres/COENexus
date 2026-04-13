import type { ThreadMessage as ThreadMessageType } from '../types';

interface ThreadMessageProps {
  message: ThreadMessageType;
  isOwnMessage?: boolean;
}

const roleBadgeStyles: Record<string, string> = {
  mentor: 'bg-slate-700 text-white dark:bg-slate-600',
  evaluator: 'bg-emerald-600 text-white dark:bg-emerald-500',
  'practice-lead': 'bg-violet-600 text-white dark:bg-violet-500',
  'coe-lead': 'bg-blue-600 text-white dark:bg-blue-500',
  developer: 'bg-gray-200 text-gray-700 dark:bg-white/15 dark:text-gray-300',
};

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ThreadMessage({ message, isOwnMessage = false }: ThreadMessageProps) {
  if (isOwnMessage) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-violet-500/15 px-4 py-3 dark:bg-violet-500/20">
            <p className="text-sm text-primary leading-relaxed">{message.content}</p>
          </div>
          <div className="mt-1 flex items-center justify-end gap-2">
            <span className="text-[11px] text-muted">{formatTime(message.createdAt)}</span>
            {message.isRead && <span className="text-[11px] text-muted">Read</span>}
          </div>
        </div>
      </div>
    );
  }

  const badgeStyle = roleBadgeStyles[message.authorRole] || roleBadgeStyles.developer;

  return (
    <div className="flex justify-start">
      <div className="max-w-[75%]">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-primary">{message.authorName}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeStyle}`}>
            {message.authorRole.replace('-', ' ')}
          </span>
        </div>
        <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
          <p className="text-sm text-secondary leading-relaxed">{message.content}</p>
        </div>
        <span className="mt-1 block text-[11px] text-muted">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}
