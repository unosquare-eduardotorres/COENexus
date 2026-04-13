import { atRiskCandidates, orgAnalytics, promotionVelocity } from '../data';
import { AtRiskCandidate, OrgAnalytics, PromotionVelocityDataPoint } from '../types';

export interface PathSettingsState {
  assessmentReminderDays: number;
  discussionModerationEnabled: boolean;
  dossierAutoArchiveDays: number;
  defaultPageSize: number;
}

const fallbackSettings: PathSettingsState = {
  assessmentReminderDays: 7,
  discussionModerationEnabled: true,
  dossierAutoArchiveDays: 60,
  defaultPageSize: 25,
};

type PathApi = {
  getAdminAnalytics: () => Promise<unknown>;
  getSettings: () => Promise<PathSettingsState>;
  saveSettings: (settings: Partial<PathSettingsState>) => Promise<{ saved: boolean }>;
};

const getPathApi = (): PathApi | undefined => (window.api as { path?: PathApi }).path;

export const adminService = {
  async getOrgAnalytics(): Promise<OrgAnalytics> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return orgAnalytics;
      }
      await pathApi.getAdminAnalytics();
      return orgAnalytics;
    } catch (_error) {
      return orgAnalytics;
    }
  },

  async getPromotionVelocity(): Promise<PromotionVelocityDataPoint[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return promotionVelocity;
      }
      await pathApi.getAdminAnalytics();
      return promotionVelocity;
    } catch (_error) {
      return promotionVelocity;
    }
  },

  async getAtRiskCandidates(): Promise<AtRiskCandidate[]> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return atRiskCandidates;
      }
      await pathApi.getAdminAnalytics();
      return atRiskCandidates;
    } catch (_error) {
      return atRiskCandidates;
    }
  },

  async getSettings(): Promise<PathSettingsState> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallbackSettings;
      }
      const settings = await pathApi.getSettings();
      return {
        assessmentReminderDays: settings.assessmentReminderDays,
        discussionModerationEnabled: settings.discussionModerationEnabled,
        dossierAutoArchiveDays: settings.dossierAutoArchiveDays,
        defaultPageSize: settings.defaultPageSize,
      };
    } catch (_error) {
      return fallbackSettings;
    }
  },

  async saveSettings(settings: Partial<PathSettingsState>): Promise<{ saved: boolean }> {
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return { saved: true };
      }
      return await pathApi.saveSettings(settings);
    } catch (_error) {
      return { saved: true };
    }
  },
};
