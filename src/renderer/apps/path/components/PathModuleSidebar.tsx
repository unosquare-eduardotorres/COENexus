import type { SkillDomain, SkillTopic, ProgressStatus } from '../types';

function getDomainIcon(status: string) {
  if (status === 'completed') return '\u2713';
  if (status === 'in-progress') return '\u2192';
  return '\uD83D\uDD12';
}

interface PathModuleSidebarProps {
  domains: SkillDomain[];
  allTopics: SkillTopic[];
  selectedDomain: string | undefined;
  onSelectDomain: (domainId: string) => void;
  getTopicStatus: (topicId: string) => ProgressStatus;
}

export default function PathModuleSidebar({ domains, allTopics, selectedDomain, onSelectDomain, getTopicStatus }: PathModuleSidebarProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Path Modules</h2>
      <div className="space-y-1">
        {domains.map((d) => {
          const domainTopics = allTopics.filter((t) => t.skillDomainId === d.id);
          const allComplete = domainTopics.every((t) => getTopicStatus(t.id) === 'completed');
          const anyInProgress = domainTopics.some((t) => getTopicStatus(t.id) === 'in-progress');
          const status = allComplete ? 'completed' : anyInProgress ? 'in-progress' : 'not-started';
          const isActive = selectedDomain === d.id;

          return (
            <button
              key={d.id}
              onClick={() => onSelectDomain(d.id)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                isActive
                  ? 'glass-card font-semibold text-primary shadow-sm'
                  : 'text-secondary hover:bg-violet-500/5 hover:text-primary'
              }`}
            >
              <span className="truncate">{d.name}</span>
              <span className="ml-2 text-xs">{getDomainIcon(status)}</span>
            </button>
          );
        })}
      </div>

      <div className="glass-card rounded-xl p-4">
        <h3 className="text-xs font-semibold text-secondary">Mentor Feedback</h3>
        <p className="mt-2 text-xs italic text-secondary leading-relaxed">
          &quot;Great progress on the CQRS implementation. Focus next on eventual consistency scenarios.&quot;
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-600 dark:text-violet-300">SR</div>
          <span className="text-[11px] text-muted">Sarah Rickard</span>
        </div>
      </div>
    </div>
  );
}
