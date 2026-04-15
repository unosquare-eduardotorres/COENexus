import { VectorizationConfig, VoyageModel } from '../types';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

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

  async checkVoyageKey(): Promise<{
    configured: boolean
    keyCount?: number
    maskedKeys?: Array<{ index: number; masked: string }>
    source?: string
  }> {
    try {
      const result = await window.api.processing.getVoyageKeyStatus() as {
        configured: boolean
        keyCount?: number
        maskedKeys?: Array<{ index: number; masked: string }>
        source?: string
        __ipcError?: boolean
        message?: string
      };
      if (result.__ipcError) {
        log.error('[VectorizationConfig] IPC error checking Voyage key status:', result.message);
        return { configured: false };
      }
      return result;
    } catch (error) {
      log.error('[VectorizationConfig] Failed to check Voyage key status:', error);
      return { configured: false };
    }
  },

  async addVoyageKey(apiKey: string): Promise<{ saved: boolean }> {
    const result = await window.api.processing.addVoyageKey({ apiKey }) as { saved?: boolean; __ipcError?: boolean; message?: string };
    if (result.__ipcError) {
      throw new Error(result.message || 'Failed to save API key');
    }
    return { saved: result.saved ?? false };
  },

  async removeVoyageKey(index: number): Promise<{ deleted: boolean }> {
    const result = await window.api.processing.removeVoyageKey({ index }) as { deleted?: boolean; __ipcError?: boolean; message?: string };
    if (result.__ipcError) {
      throw new Error(result.message || 'Failed to remove API key');
    }
    return { deleted: result.deleted ?? false };
  },
};
