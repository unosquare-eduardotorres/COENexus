import {
  activityItems,
  developerGateStatuses,
  developerProfiles,
  developerSkillProgress,
  developerTopicProgress,
  teamMembers,
} from '../data';
import { ActivityItem, DeveloperProfile, DeveloperTopicProgress, TeamMember } from '../types';

const toPathNumericId = (id: string): number => {
  const parsed = Number(id.replace(/\D+/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

type PathApi = {
  getDeveloperDashboard: (params: { id: number }) => Promise<unknown>;
};

const getPathApi = (): PathApi | undefined => (window.api as { path?: PathApi }).path;

export const developerService = {
  async listDevelopers(): Promise<DeveloperProfile[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return developerProfiles;
      }
      await Promise.all(
        developerProfiles.map((developer) =>
          pathApi.getDeveloperDashboard({ id: toPathNumericId(developer.id) }).catch(() => null),
        ),
      );
      return developerProfiles;
    } catch (_error) {
      return developerProfiles;
    }
  },

  async getDeveloperById(developerId: string): Promise<DeveloperProfile | null> {
    const fallback = developerProfiles.find((developer) => developer.id === developerId) || null;
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.getDeveloperDashboard({ id: toPathNumericId(developerId) });
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async getDeveloperTeam(developerId: string): Promise<TeamMember[]> {
    const fallback = teamMembers.filter((member) => member.developerId === developerId);
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.getDeveloperDashboard({ id: toPathNumericId(developerId) });
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async getDeveloperActivity(developerId: string): Promise<ActivityItem[]> {
    const fallback = activityItems.filter((item) => item.developerId === developerId);
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.getDeveloperDashboard({ id: toPathNumericId(developerId) });
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async hydrateDeveloperProfile(developerId: string): Promise<DeveloperProfile | null> {
    const profile = developerProfiles.find((developer) => developer.id === developerId);
    if (!profile) {
      return null;
    }
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return profile;
      }
      await pathApi.getDeveloperDashboard({ id: toPathNumericId(developerId) });
      return {
        ...profile,
        skillProgress: developerSkillProgress.filter((item) => item.developerId === developerId),
        gateStatuses: developerGateStatuses.filter((item) => item.developerId === developerId),
        teamAssignments: teamMembers.filter((item) => item.developerId === developerId),
        activity: activityItems.filter((item) => item.developerId === developerId),
      };
    } catch (_error) {
      return {
        ...profile,
        skillProgress: developerSkillProgress.filter((item) => item.developerId === developerId),
        gateStatuses: developerGateStatuses.filter((item) => item.developerId === developerId),
        teamAssignments: teamMembers.filter((item) => item.developerId === developerId),
        activity: activityItems.filter((item) => item.developerId === developerId),
      };
    }
  },

  async getDeveloperTopicProgress(developerId: string): Promise<DeveloperTopicProgress[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return developerTopicProgress.filter((item) => item.developerId === developerId);
      }
      await pathApi.getDeveloperDashboard({ id: toPathNumericId(developerId) });
      return developerTopicProgress.filter((item) => item.developerId === developerId);
    } catch (_error) {
      return developerTopicProgress.filter((item) => item.developerId === developerId);
    }
  },
};
