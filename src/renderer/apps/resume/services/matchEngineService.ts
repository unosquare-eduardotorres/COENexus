import {
  MatchCandidate,
  PipelineStats,
  PipelineStages,
  HaikuConfirmPayload,
  DataSource,
  AdvancedConstraints,
  SearchProgress,
  TopN,
  PoolCounts,
  FilterOptions,
  MatchSessionSummary,
  MatchSessionDetail,
  CreateSessionRequest,
  FilterRule,
} from '../types';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('matchEngineService');

function normalizeConstraints(constraints: AdvancedConstraints | null | undefined): unknown {
  if (!constraints) return null;
  const normalize = (rules: FilterRule[]) =>
    rules.map(({ id: _id, ...rule }) => ({
      ...rule,
      value: String(rule.value),
    }));
  return {
    candidateFilters: normalize(constraints.candidateFilters),
    employeeFilters: normalize(constraints.employeeFilters),
  };
}

interface SearchResult {
  candidates: MatchCandidate[];
  stats: PipelineStats;
  pipelineStages?: PipelineStages;
  sessionId?: number;
}

export const matchEngineService = {
  async getPoolCounts(): Promise<PoolCounts> {
    log.info('Match pool counts requested');
    return window.api.match.getPoolCounts() as Promise<PoolCounts>;
  },

  async getFilterOptions(): Promise<FilterOptions> {
    log.info('Match filter options requested');
    return window.api.match.getFilterOptions() as Promise<FilterOptions>;
  },

  async getProxyStatus(): Promise<{ available: boolean }> {
    log.info('Match proxy status requested');
    return window.api.match.getProxyStatus() as Promise<{ available: boolean }>;
  },

  searchCandidates(
    jobDescription: string,
    source: DataSource,
    topN: TopN,
    constraints: AdvancedConstraints | null,
    onProgress: (progress: SearchProgress) => void,
    onPipelineStages?: (stages: PipelineStages) => void,
    onHaikuConfirm?: (payload: HaikuConfirmPayload) => void,
  ): Promise<SearchResult> {
    return new Promise((resolve, reject) => {
      log.info('Match candidate search requested', { source, topN });
      let result: SearchResult | null = null;

      const cleanup = window.api.match.onSearchEvent((data: any) => {
        switch (data.type) {
          case 'progress':
            onProgress({ percent: data.percent, stage: data.stage });
            break;
          case 'pipelineStages':
            onPipelineStages?.(data.stages);
            break;
          case 'result':
            result = { candidates: data.candidates, stats: data.stats };
            break;
          case 'haikuConfirm':
            onHaikuConfirm?.(data.payload);
            break;
          case 'session':
            if (result) result.sessionId = data.sessionId;
            break;
          case 'error':
            cleanup();
            log.error('Match candidate search failed', new Error(data.message));
            reject(new Error(data.message));
            break;
          case 'complete':
            cleanup();
            result ? resolve(result) : reject(new Error('No result received'));
            break;
        }
      });

      window.api.match.search({
        jobDescription,
        dataSource: source,
        topN,
        constraints: normalizeConstraints(constraints),
      });
    });
  },

  searchWithSession(
    request: CreateSessionRequest,
    onProgress: (progress: SearchProgress) => void,
    onPipelineStages?: (stages: PipelineStages) => void,
    onHaikuConfirm?: (payload: HaikuConfirmPayload) => void,
  ): Promise<SearchResult> {
    return new Promise((resolve, reject) => {
      log.info('Match session search requested', {
        flow: request.matchFlowType,
        source: request.dataSource,
        topN: request.topN,
      });
      let result: SearchResult | null = null;

      const cleanup = window.api.match.onSearchEvent((data: any) => {
        switch (data.type) {
          case 'progress':
            onProgress({ percent: data.percent, stage: data.stage });
            break;
          case 'pipelineStages':
            onPipelineStages?.(data.stages);
            break;
          case 'result':
            result = { candidates: data.candidates, stats: data.stats };
            break;
          case 'haikuConfirm':
            onHaikuConfirm?.(data.payload);
            break;
          case 'session':
            if (result) result.sessionId = data.sessionId;
            break;
          case 'error':
            cleanup();
            log.error('Match session search failed', new Error(data.message));
            reject(new Error(data.message));
            break;
          case 'complete':
            cleanup();
            result ? resolve(result) : reject(new Error('No result received'));
            break;
        }
      });

      window.api.match.searchSession({
        ...request,
        constraints: normalizeConstraints(request.constraints),
      });
    });
  },

  async listSessions(): Promise<MatchSessionSummary[]> {
    log.info('Match sessions list requested');
    return window.api.match.listSessions() as Promise<MatchSessionSummary[]>;
  },

  async getSession(id: number): Promise<MatchSessionDetail> {
    log.info('Match session detail requested', { sessionId: id });
    return window.api.match.getSession(id) as Promise<MatchSessionDetail>;
  },

  async getResumeText(sourceType: string, upstreamId: number): Promise<string | null> {
    log.info('Match resume text requested', { sourceType, upstreamId });
    const result = await window.api.match.getResumeText({ sourceType, upstreamId }) as { text: string | null };
    return result.text;
  },

  async getAnalysisCacheStats(): Promise<{ totalEntries: number; oldestEntry: string | null }> {
    log.info('Match analysis cache stats requested');
    return window.api.match.getAnalysisCacheStats();
  },

  async clearAnalysisCache(): Promise<{ deleted: number }> {
    log.warn('Match analysis cache clear requested');
    return window.api.match.clearAnalysisCache();
  },
};
