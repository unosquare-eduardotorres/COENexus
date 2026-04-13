import { useState, useEffect, useRef, useCallback } from 'react';
import { learningPathService, developerService } from '../services';
import { trackPathEvent } from '../services/pathAnalytics';
import type { SkillDomain, SkillTopic, LearningResource, CodeChallenge, CareerLadder, DeveloperTopicProgress, ProgressStatus } from '../types';

export function useLearningPathData() {
  const [allDomains, setAllDomains] = useState<SkillDomain[]>([]);
  const [allTopics, setAllTopics] = useState<SkillTopic[]>([]);
  const [allResources, setAllResources] = useState<LearningResource[]>([]);
  const [allChallenges, setAllChallenges] = useState<CodeChallenge[]>([]);
  const [ladders, setLadders] = useState<CareerLadder[]>([]);
  const [topicProgress, setTopicProgress] = useState<DeveloperTopicProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string | undefined>();
  const hasInitialized = useRef(false);

  useEffect(() => {
    Promise.all([
      learningPathService.listSkillDomains(),
      learningPathService.listSkillTopics(),
      learningPathService.listLearningResources(),
      learningPathService.listCodeChallenges(),
      learningPathService.listLearningPaths(),
      developerService.getDeveloperTopicProgress('dev-001'),
    ])
      .then(([domains, topics, resources, challenges, paths, progress]) => {
        setAllDomains(domains);
        setAllTopics(topics);
        setAllResources(resources);
        setAllChallenges(challenges);
        setLadders(paths);
        setTopicProgress(progress);
        const ladder = paths[0];
        const filteredDomains = domains.filter((d) => d.mainSkillId === ladder?.mainSkillId || d.id === 'sd-quality');
        if (filteredDomains.length > 0) setSelectedDomain(filteredDomains[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }

    if (selectedDomain) {
      trackPathEvent('learning_path_opened', { domainId: selectedDomain });
    }
  }, [selectedDomain]);

  const ladder = ladders[0];

  const domains = ladder
    ? allDomains.filter((d) => d.mainSkillId === ladder.mainSkillId || d.id === 'sd-quality')
    : [];

  const activeDomain = domains.find((d) => d.id === selectedDomain);
  const topics = allTopics.filter((t) => t.skillDomainId === selectedDomain);

  const getTopicStatus = useCallback((topicId: string): ProgressStatus => {
    const p = topicProgress.find((t) => t.topicId === topicId && t.developerId === 'dev-001');
    return (p?.status as ProgressStatus) || 'not-started';
  }, [topicProgress]);

  const completedTopics = allTopics.filter((t) =>
    topicProgress.some((p) => p.topicId === t.id && p.developerId === 'dev-001' && p.status === 'completed')
  ).length;

  const totalTopics = allTopics.length;

  return {
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
  };
}
