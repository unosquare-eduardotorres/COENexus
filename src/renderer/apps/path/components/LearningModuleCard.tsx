import type { LearningResource, ProgressStatus } from '../types';
import ResourceBadge from './ResourceBadge';

interface LearningModuleCardProps {
  name: string;
  description?: string;
  resources?: LearningResource[];
  status?: ProgressStatus;
  progress?: number;
  onSelect?: () => void;
}

const statusLabel: Record<ProgressStatus, { text: string; dot: string }> = {
  'not-started': { text: 'Not Started', dot: 'bg-gray-400' },
  'in-progress': { text: 'In Progress', dot: 'bg-blue-500' },
  completed: { text: 'Completed', dot: 'bg-emerald-500' },
  blocked: { text: 'Blocked', dot: 'bg-red-500' },
};

export default function LearningModuleCard({ name, description, resources, status = 'not-started', progress, onSelect }: LearningModuleCardProps) {
  const st = statusLabel[status];

  return (
    <div
      className="glass-card-hover cursor-pointer rounded-xl p-4 transition-all"
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-primary">{name}</h4>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className={`h-2 w-2 rounded-full ${st.dot}`} />
          <span className="text-[11px] text-muted">{st.text}</span>
        </div>
      </div>
      {description && <p className="mt-1.5 text-xs text-secondary leading-relaxed">{description}</p>}
      {progress !== undefined && status === 'in-progress' && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10">
            <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {resources && resources.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <ResourceBadge tier={r.tier} />
              <span className="truncate text-xs text-secondary">{r.title}</span>
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-violet-500 hover:text-violet-600">
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M4 8l4-4M4 4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
