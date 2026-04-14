import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { return Object.create(DOMMatrix.prototype); }
    static fromMatrix() { return new DOMMatrix(); }
    static fromFloat32Array() { return new DOMMatrix(); }
    static fromFloat64Array() { return new DOMMatrix(); }
  } as unknown as typeof globalThis.DOMMatrix;
}

Object.defineProperty(window, 'api', {
  value: {
    sync: {
      validateToken: vi.fn().mockResolvedValue({ valid: false }),
      getStatus: vi.fn().mockResolvedValue({}),
      applyYearFilter: vi.fn().mockResolvedValue({}),
      start: vi.fn().mockResolvedValue({}),
      pause: vi.fn().mockResolvedValue({}),
      syncSingle: vi.fn().mockResolvedValue({}),
      retryFailed: vi.fn().mockResolvedValue({}),
      retryNotProcessed: vi.fn().mockResolvedValue({}),
      getRecords: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue({}),
      getSkills: vi.fn().mockResolvedValue([]),
      uploadNote: vi.fn().mockResolvedValue({}),
      onProgress: vi.fn().mockReturnValue(() => {}),
    },
    processing: {
      getVoyageKeyStatus: vi.fn().mockResolvedValue({ configured: false }),
      getStatus: vi.fn().mockResolvedValue({}),
      vectorizeSingle: vi.fn().mockResolvedValue({}),
      startExtraction: vi.fn().mockResolvedValue({}),
      pauseExtraction: vi.fn().mockResolvedValue({}),
      startVectorization: vi.fn().mockResolvedValue({}),
      pauseVectorization: vi.fn().mockResolvedValue({}),
      retryFailed: vi.fn().mockResolvedValue({}),
      retryFailedVectorization: vi.fn().mockResolvedValue({}),
      resetStatus: vi.fn().mockResolvedValue({}),
      onProgress: vi.fn().mockReturnValue(() => {}),
    },
    match: {
      getPoolCounts: vi.fn().mockResolvedValue({ candidates: 0, employees: 0, positions: 0 }),
      getFilterOptions: vi.fn().mockResolvedValue({ skills: [], seniorities: [], accounts: [] }),
      search: vi.fn().mockResolvedValue({}),
      cancelSearch: vi.fn().mockResolvedValue({}),
      confirmHaiku: vi.fn().mockResolvedValue({}),
      searchSession: vi.fn().mockResolvedValue({}),
      listSessions: vi.fn().mockResolvedValue([]),
      getSession: vi.fn().mockResolvedValue({}),
      getProxyStatus: vi.fn().mockResolvedValue({ available: false }),
      getBenchEmployees: vi.fn().mockResolvedValue([]),
      getAllEmployees: vi.fn().mockResolvedValue([]),
      getAllCandidates: vi.fn().mockResolvedValue([]),
      searchCandidates: vi.fn().mockResolvedValue([]),
      searchEmployees: vi.fn().mockResolvedValue([]),
      getOpenPositions: vi.fn().mockResolvedValue([]),
      getBenchBurnSession: vi.fn().mockResolvedValue({}),
      benchBurn: vi.fn().mockResolvedValue({}),
      benchBurnRetry: vi.fn().mockResolvedValue({}),
      getResumeText: vi.fn().mockResolvedValue(''),
      externalCandidate: vi.fn().mockResolvedValue({}),
      onSearchEvent: vi.fn().mockReturnValue(() => {}),
      onBenchBurnEvent: vi.fn().mockReturnValue(() => {}),
    },
    sessions: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue({}),
      list: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue({}),
    },
    database: {
      getConfig: vi.fn().mockResolvedValue({ isConfigured: false, sharedPath: '', exporterName: '' }),
      saveConfig: vi.fn().mockResolvedValue({}),
      export: vi.fn().mockResolvedValue({}),
      import: vi.fn().mockResolvedValue({ success: true }),
      listSnapshots: vi.fn().mockResolvedValue({ snapshots: [] }),
      getStatus: vi.fn().mockResolvedValue({}),
    },
    ai: {
      chat: vi.fn().mockResolvedValue({ content: '' }),
      checkConnection: vi.fn().mockResolvedValue({ connected: false }),
    },
    app: {
      getVersion: vi.fn().mockResolvedValue('1.0.0'),
      getPlatform: vi.fn().mockResolvedValue('darwin'),
      openExternal: vi.fn().mockResolvedValue(undefined),
      checkForUpdates: vi.fn().mockResolvedValue(null),
      downloadUpdate: vi.fn().mockResolvedValue({ success: true }),
      installUpdate: vi.fn().mockResolvedValue(undefined),
      onUpdateAvailable: vi.fn().mockReturnValue(() => {}),
      onUpdateDownloaded: vi.fn().mockReturnValue(() => {}),
    },
  },
  writable: true,
  configurable: true,
});
