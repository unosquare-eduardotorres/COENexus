interface MentorFeedbackCardProps {
  authorName: string;
  authorRole: string;
  content: string;
  timestamp: string;
  avatarUrl?: string;
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MentorFeedbackCard({ authorName, authorRole, content, timestamp, avatarUrl }: MentorFeedbackCardProps) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt={authorName} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-600 dark:text-violet-300">
            {getInitials(authorName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary truncate">{authorName}</span>
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
              {authorRole.replace('-', ' ')}
            </span>
          </div>
        </div>
        <span className="text-[11px] text-muted whitespace-nowrap">{formatTimeAgo(timestamp)}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-secondary">{content}</p>
    </div>
  );
}
