import { VectorizationConfig, VoyageModel } from '../types';

const STORAGE_KEY = 'vectorization_config';
const API_BASE = '/api/processing';

const DEFAULT_CONFIG: VectorizationConfig = {
  model: 'voyage-4-large',
};

export const vectorizationConfigService = {
  getConfig(): VectorizationConfig {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* fall through */ }
    }
    return DEFAULT_CONFIG;
  },

  saveModel(model: VoyageModel): void {
    const config = this.getConfig();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, model }));
  },

  async checkVoyageKey(): Promise<{ configured: boolean; maskedKey?: string; source?: string }> {
    try {
      const res = await fetch(`${API_BASE}/voyage-key`);
      if (!res.ok) return { configured: false };
      return res.json();
    } catch {
      return { configured: false };
    }
  },
};
