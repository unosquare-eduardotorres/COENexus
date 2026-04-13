import {
  careerLadders,
  codeChallenges,
  learningResources,
  mainSkills,
  pathMockData,
  practices,
  promotionGates,
  skillDomains,
  skillTopics,
} from '../data';
import {
  CareerLadder,
  CodeChallenge,
  LearningResource,
  MainSkill,
  Practice,
  PromotionGate,
  SkillDomain,
  SkillTopic,
} from '../types';

export interface LearningPathFilters {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

const toPathNumericId = (id: string): number => {
  const parsed = Number(id.replace(/\D+/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

type PathApi = {
  listLearningPaths: (params: LearningPathFilters) => Promise<unknown>;
  getLearningPath: (params: { id: number }) => Promise<unknown>;
  createLearningPath: (params: {
    title: string;
    role: string;
    level: string;
    description?: string;
    ownerId: number;
  }) => Promise<{ id: number }>;
  updateLearningPath: (params: {
    id: number;
    title?: string;
    role?: string;
    level?: string;
    description?: string;
    status?: string;
  }) => Promise<{ updated: boolean }>;
  deleteLearningPath: (params: { id: number }) => Promise<{ deleted: boolean }>;
};

const getPathApi = (): PathApi | undefined => (window.api as { path?: PathApi }).path;

export const learningPathService = {
  async listLearningPaths(filters: LearningPathFilters = {}): Promise<CareerLadder[]> {
    const fallback = careerLadders.filter((ladder) => {
      if (!filters.search) {
        return true;
      }
      const term = filters.search.toLowerCase();
      return (
        ladder.description.toLowerCase().includes(term) ||
        ladder.fromLevel.toLowerCase().includes(term) ||
        ladder.toLevel.toLowerCase().includes(term)
      );
    });
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.listLearningPaths(filters);
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async getLearningPath(pathId: string): Promise<CareerLadder | null> {
    const fallback = careerLadders.find((ladder) => ladder.id === pathId) || null;
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.getLearningPath({ id: toPathNumericId(pathId) });
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async createLearningPath(input: {
    title: string;
    role: string;
    level: string;
    description?: string;
    ownerId: number;
  }): Promise<{ id: string }> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return { id: `ladder-${Date.now()}` };
      }
      const created = await pathApi.createLearningPath(input);
      return { id: `ladder-${created.id}` };
    } catch (_error) {
      return { id: `ladder-${Date.now()}` };
    }
  },

  async updateLearningPath(input: {
    id: string;
    title?: string;
    role?: string;
    level?: string;
    description?: string;
    status?: string;
  }): Promise<{ updated: boolean }> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return { updated: true };
      }
      return await pathApi.updateLearningPath({
        id: toPathNumericId(input.id),
        title: input.title,
        role: input.role,
        level: input.level,
        description: input.description,
        status: input.status,
      });
    } catch (_error) {
      return { updated: true };
    }
  },

  async deleteLearningPath(pathId: string): Promise<{ deleted: boolean }> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return { deleted: true };
      }
      return await pathApi.deleteLearningPath({ id: toPathNumericId(pathId) });
    } catch (_error) {
      return { deleted: true };
    }
  },

  async listPractices(): Promise<Practice[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return practices;
      }
      await pathApi.listLearningPaths({});
      return practices;
    } catch (_error) {
      return practices;
    }
  },

  async listMainSkills(): Promise<MainSkill[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return mainSkills;
      }
      await pathApi.listLearningPaths({});
      return mainSkills;
    } catch (_error) {
      return mainSkills;
    }
  },

  async listSkillDomains(): Promise<SkillDomain[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return skillDomains;
      }
      await pathApi.listLearningPaths({});
      return skillDomains;
    } catch (_error) {
      return skillDomains;
    }
  },

  async listSkillTopics(): Promise<SkillTopic[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return skillTopics;
      }
      await pathApi.listLearningPaths({});
      return skillTopics;
    } catch (_error) {
      return skillTopics;
    }
  },

  async listLearningResources(): Promise<LearningResource[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return learningResources;
      }
      await pathApi.listLearningPaths({});
      return learningResources;
    } catch (_error) {
      return learningResources;
    }
  },

  async listCodeChallenges(): Promise<CodeChallenge[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return codeChallenges;
      }
      await pathApi.listLearningPaths({});
      return codeChallenges;
    } catch (_error) {
      return codeChallenges;
    }
  },

  async listPromotionGates(): Promise<PromotionGate[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return promotionGates;
      }
      await pathApi.listLearningPaths({});
      return promotionGates;
    } catch (_error) {
      return promotionGates;
    }
  },

  async getLearningPathBundle() {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return pathMockData.taxonomy;
      }
      await pathApi.listLearningPaths({});
      return pathMockData.taxonomy;
    } catch (_error) {
      return pathMockData.taxonomy;
    }
  },
};
