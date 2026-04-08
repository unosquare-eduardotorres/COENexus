import { VectorizationConfig, VoyageModel } from '../types';
import { createRendererLogger } from '../utils/rendererLogger';

const log = createRendererLogger('vectorizationConfigService');

const STORAGE_KEY = 'vectorization_config';

const DEFAULT_CONFIG: VectorizationConfig = {
  model: 'voyage-4-large',
};

export const vectorizationConfigService = {
  getConfig(): VectorizationConfig {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        log.error('[VectorizationConfig] Failed to parse stored config, using defaults:', error);
      }
    }
    return DEFAULT_CONFIG;
  },

  saveModel(model: VoyageModel): void {
    const config = this.getConfig();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, model }));
  },

  async checkVoyageKey(): Promise<{ configured: boolean; keyCount?: number }> {
    try {
      return await window.api.processing.getVoyageKeyStatus() as { configured: boolean; keyCount?: number };
    } catch (error) {
      log.error('[VectorizationConfig] Failed to check Voyage key status:', error);
      return { configured: false };
    }
  },
};
