import {
  BenchEmployee,
  BenchOpenPosition,
  BenchBurnRequest,
  ExternalCandidateMatchRequest,
  CrossMatchResult,
  CandidateTiming,
  SearchProgress,
  SyncedCandidateListItem,
  RankedPositionDto,
  MatchToPositionsRequest,
} from '../types';

export interface BenchBurnSearchResult {
  sessionId: number;
  employeeResults: Record<number, CrossMatchResult[]>;
  positionResults: Record<number, CrossMatchResult[]>;
  stats: {
    totalPairs: number;
    analyzed: number;
    time: string;
    searchCost: string;
    timings?: Record<string, number>;
    candidateTimings?: CandidateTiming[];
  };
}

function createStreamingPromise(
  invoker: () => void,
  eventListener: (callback: (data: unknown) => void) => () => void,
  onProgress: (p: SearchProgress) => void,
): Promise<BenchBurnSearchResult> {
  return new Promise((resolve, reject) => {
    let result: BenchBurnSearchResult | null = null;

    const cleanup = eventListener((data: any) => {
      switch (data.type) {
        case 'progress':
          onProgress({ percent: data.percent, stage: data.stage });
          break;
        case 'result':
          result = {
            sessionId: 0,
            employeeResults: data.candidates?.employeeResults ?? {},
            positionResults: data.candidates?.positionResults ?? {},
            stats: data.stats ?? { totalPairs: 0, analyzed: 0, time: '0s', searchCost: '$0' },
          };
          if (!result.employeeResults || typeof result.employeeResults !== 'object' || Object.keys(result.employeeResults).length === 0) {
            result.employeeResults = {};
            result.positionResults = {};
            const allResults = Array.isArray(data.candidates) ? data.candidates : [];
            for (const r of allResults) {
              const empKey = r.employeeUpstreamId;
              if (!result.employeeResults[empKey]) result.employeeResults[empKey] = [];
              result.employeeResults[empKey].push(r);
              const posKey = r.positionUpstreamId;
              if (!result.positionResults[posKey]) result.positionResults[posKey] = [];
              result.positionResults[posKey].push(r);
            }
          }
          break;
        case 'session':
          if (result) result.sessionId = data.sessionId;
          break;
        case 'error':
          cleanup();
          reject(new Error(data.message));
          break;
        case 'complete':
          cleanup();
          result ? resolve(result) : reject(new Error('No result received'));
          break;
      }
    });

    invoker();
  });
}

export const benchBurnService = {
  async getBenchEmployees(): Promise<BenchEmployee[]> {
    return window.api.match.getBenchEmployees() as Promise<BenchEmployee[]>;
  },

  async getAllEmployees(): Promise<BenchEmployee[]> {
    return window.api.match.getAllEmployees() as Promise<BenchEmployee[]>;
  },

  async getOpenPositions(): Promise<BenchOpenPosition[]> {
    return window.api.match.getOpenPositions() as Promise<BenchOpenPosition[]>;
  },

  async getAllCandidates(): Promise<SyncedCandidateListItem[]> {
    return window.api.match.getAllCandidates() as Promise<SyncedCandidateListItem[]>;
  },

  async searchCandidates(query: string): Promise<SyncedCandidateListItem[]> {
    return window.api.match.searchCandidates(query) as Promise<SyncedCandidateListItem[]>;
  },

  async searchEmployees(query: string): Promise<BenchEmployee[]> {
    return window.api.match.searchEmployees(query) as Promise<BenchEmployee[]>;
  },

  async getCandidateCount(): Promise<number> {
    return window.api.match.getCandidateCount();
  },

  async getEmployeeCount(): Promise<number> {
    return window.api.match.getEmployeeCount();
  },

  executeBenchBurn(
    request: BenchBurnRequest,
    onProgress: (p: SearchProgress) => void,
  ): Promise<BenchBurnSearchResult> {
    return createStreamingPromise(
      () => window.api.match.benchBurn(request),
      (cb) => window.api.match.onBenchBurnEvent(cb),
      onProgress,
    );
  },

  retryFallbacks(
    request: { sessionId: number; pairs: { employeeUpstreamId: number; positionUpstreamId: number }[] },
    onProgress: (p: SearchProgress) => void,
  ): Promise<BenchBurnSearchResult> {
    return createStreamingPromise(
      () => window.api.match.benchBurnRetry(request),
      (cb) => window.api.match.onBenchBurnEvent(cb),
      onProgress,
    );
  },

  executeExternalCandidateMatch(
    request: ExternalCandidateMatchRequest,
    onProgress: (p: SearchProgress) => void,
  ): Promise<BenchBurnSearchResult> {
    return createStreamingPromise(
      () => window.api.match.externalCandidate(request),
      (cb) => window.api.match.onSearchEvent(cb),
      onProgress,
    );
  },

  async getResumeText(sourceType: string, upstreamId: number): Promise<string | null> {
    const result = await window.api.match.getResumeText({ sourceType, upstreamId }) as { text: string | null };
    return result.text;
  },

  async rankPositionsForPerson(
    sourceType: 'candidate' | 'employee',
    upstreamId: number,
    topN: number
  ): Promise<{ positions: RankedPositionDto[] }> {
    return window.api.match.rankPositions({ sourceType, upstreamId, topN }) as Promise<{ positions: RankedPositionDto[] }>;
  },

  async rankPositionsForText(
    resumeText: string,
    topN: number
  ): Promise<{ positions: RankedPositionDto[] }> {
    return window.api.match.rankPositionsForText({ resumeText, topN }) as Promise<{ positions: RankedPositionDto[] }>;
  },

  executeMatchToPositions(
    request: MatchToPositionsRequest,
    onProgress: (p: SearchProgress) => void,
  ): Promise<BenchBurnSearchResult> {
    return createStreamingPromise(
      () => window.api.match.matchToPositions(request),
      (cb) => window.api.match.onBenchBurnEvent(cb),
      onProgress,
    );
  },

  async getSession(id: number): Promise<BenchBurnSearchResult> {
    const raw = await window.api.match.getBenchBurnSession(id) as Record<string, unknown>;
    if (!raw) throw new Error(`Session ${id} not found`);
    const results = raw.results as Record<string, unknown> | undefined;
    return {
      sessionId: raw.id as number,
      employeeResults: (results?.employeeResults as Record<number, CrossMatchResult[]>) ?? {},
      positionResults: (results?.positionResults as Record<number, CrossMatchResult[]>) ?? {},
      stats: {
        totalPairs: (raw.pipelineStats as Record<string, unknown>)?.totalPairs as number ?? 0,
        analyzed: (raw.pipelineStats as Record<string, unknown>)?.analyzed as number ?? 0,
        time: (raw.pipelineStats as Record<string, unknown>)?.time as string ?? '0s',
        searchCost: '$0',
      },
    };
  },
};
