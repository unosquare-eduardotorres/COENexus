import type { SkillDomain, SkillTopic, LearningResource, CodeChallenge, ProgressStatus } from '../types';
import LearningModuleCard from './LearningModuleCard';

interface TopicGridProps {
  activeDomain: SkillDomain | undefined;
  topics: SkillTopic[];
  allResources: LearningResource[];
  allChallenges: CodeChallenge[];
  getTopicStatus: (topicId: string) => ProgressStatus;
}

export default function TopicGrid({ activeDomain, topics, allResources, allChallenges, getTopicStatus }: TopicGridProps) {
  return (
    <div className="space-y-4">
      {activeDomain && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
              <svg className="h-4 w-4 text-violet-600 dark:text-violet-400" viewBox="0 0 16 16" fill="none">
                <path d="M8 2l6 4-6 4-6-4 6-4Z" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-primary">{activeDomain.name}</h2>
          </div>
          <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-600 dark:text-violet-300">
            {topics.length} Modules
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((topic) => {
          const topicResources = allResources.filter((r) => r.topicId === topic.id);
          const status = getTopicStatus(topic.id);
          return (
            <LearningModuleCard
              key={topic.id}
              name={topic.name}
              resources={topicResources}
              status={status}
              progress={status === 'in-progress' ? 45 : undefined}
            />
          );
        })}
      </div>

      {topics.length > 0 && (
        <div>
          {allChallenges
            .filter((ch) => topics.some((t) => t.id === ch.topicId))
            .map((ch) => (
              <div key={ch.id} className="glass-card rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15">
                      <svg className="h-4 w-4 text-violet-600 dark:text-violet-400" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-primary">Code Challenge: {ch.title}</h3>
                      <p className="text-xs text-secondary">{ch.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
