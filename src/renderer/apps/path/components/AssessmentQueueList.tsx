import type { AtRiskCandidate } from '../types';

interface AssessmentQueueListProps {
  candidates: AtRiskCandidate[];
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AssessmentQueueList({ candidates }: AssessmentQueueListProps) {
  return (
    <div className="space-y-2">
      {candidates.map((c) => (
        <div key={c.id} className="glass-card-hover flex items-center gap-3 rounded-xl p-3">
          {c.avatarUrl ? (
            <img src={c.avatarUrl} alt={c.name} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-600 dark:text-violet-300">
              {getInitials(c.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary truncate">{c.name}</p>
            <p className="text-[11px] text-muted">{c.fromLevel} → {c.toLevel}</p>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
              {c.bandLimitPercent}% Band Limit
            </span>
            <p className="mt-0.5 text-[10px] text-muted">{c.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
