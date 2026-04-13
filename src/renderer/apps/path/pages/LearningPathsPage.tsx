import { useLearningPathData } from '../hooks/useLearningPathData';
import PathHeader from '../components/PathHeader';
import PathModuleSidebar from '../components/PathModuleSidebar';
import TopicGrid from '../components/TopicGrid';

export default function LearningPathsPage() {
  const {
    loading,
    ladder,
    domains,
    activeDomain,
    topics,
    allTopics,
    allResources,
    allChallenges,
    selectedDomain,
    setSelectedDomain,
    getTopicStatus,
    completedTopics,
    totalTopics,
  } = useLearningPathData();

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
  if (!ladder) return <div className="glass-card rounded-xl p-8 text-center text-secondary">No data available</div>;

  return (
    <div className="space-y-6">
      <PathHeader
        fromLevel={ladder.fromLevel}
        toLevel={ladder.toLevel}
        description={ladder.description}
        completedTopics={completedTopics}
        totalTopics={totalTopics}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <PathModuleSidebar
          domains={domains}
          allTopics={allTopics}
          selectedDomain={selectedDomain}
          onSelectDomain={setSelectedDomain}
          getTopicStatus={getTopicStatus}
        />

        <TopicGrid
          activeDomain={activeDomain}
          topics={topics}
          allResources={allResources}
          allChallenges={allChallenges}
          getTopicStatus={getTopicStatus}
        />
      </div>
    </div>
  );
}
