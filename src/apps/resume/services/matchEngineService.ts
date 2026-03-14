import {
  MatchCandidate,
  PipelineStats,
  PipelineStages,
  HaikuConfirmPayload,
  DataSource,
  HardConstraints,
  SearchProgress,
  TopN,
  PoolCounts,
  FilterOptions,
  MatchSessionSummary,
  MatchSessionDetail,
  CreateSessionRequest,
} from '../types';

const API_BASE = '/api/match';

export interface SearchResult {
  candidates: MatchCandidate[];
  stats: PipelineStats;
  pipelineStages?: PipelineStages;
  sessionId?: number;
}

function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: {
    onProgress?: (progress: SearchProgress) => void;
    onPipelineStages?: (stages: PipelineStages) => void;
    onResult?: (result: { candidates: MatchCandidate[]; stats: PipelineStats }) => void;
    onSession?: (data: { sessionId: number }) => void;
    onError?: (error: string) => void;
    onHaikuConfirm?: (payload: HaikuConfirmPayload) => void;
  }
): Promise<SearchResult> {
  return new Promise(async (resolve, reject) => {
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let result: SearchResult | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'progress') {
                handlers.onProgress?.(data);
              } else if (currentEvent === 'pipelineStages') {
                handlers.onPipelineStages?.(data);
                if (result) result.pipelineStages = data;
                else result = { candidates: [], stats: {} as PipelineStats, pipelineStages: data };
              } else if (currentEvent === 'result') {
                if (result) {
                  result.candidates = data.candidates;
                  result.stats = data.stats;
                } else {
                  result = { ...data };
                }
                handlers.onResult?.(data);
              } else if (currentEvent === 'session') {
                handlers.onSession?.(data);
                if (result) result.sessionId = data.sessionId;
                else result = { candidates: [], stats: {} as PipelineStats, sessionId: data.sessionId };
              } else if (currentEvent === 'error') {
                const errorMsg = data.error || 'Pipeline error';
                handlers.onError?.(errorMsg);
                reject(new Error(errorMsg));
                return;
              } else if (currentEvent === 'haikuConfirm') {
                handlers.onHaikuConfirm?.(data);
              }
            } catch {
              // skip malformed JSON chunks
            }
            currentEvent = '';
          }
        }
      }

      if (!result || result.candidates.length === 0 && !result.stats.time) {
        reject(new Error('No result received from search'));
      } else {
        resolve(result);
      }
    } catch (err) {
      reject(err);
    }
  });
}

export const matchEngineService = {
  async getPoolCounts(): Promise<PoolCounts> {
    const res = await fetch(`${API_BASE}/pool-counts`);
    if (!res.ok) throw new Error(`Pool counts failed: ${res.status}`);
    return res.json();
  },

  async getFilterOptions(): Promise<FilterOptions> {
    const res = await fetch(`${API_BASE}/filter-options`);
    if (!res.ok) throw new Error(`Filter options failed: ${res.status}`);
    return res.json();
  },

  async getProxyStatus(): Promise<{ connected: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/proxy-status`);
      return res.json();
    } catch {
      return { connected: false };
    }
  },

  async searchCandidates(
    jobDescription: string,
    source: DataSource,
    topN: TopN,
    constraints: HardConstraints,
    onProgress: (progress: SearchProgress) => void,
    onPipelineStages?: (stages: PipelineStages) => void,
    onHaikuConfirm?: (payload: HaikuConfirmPayload) => void,
  ): Promise<SearchResult> {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobDescription,
        dataSource: source,
        topN,
        constraints: {
          seniority: constraints.seniority || null,
          mainSkill: constraints.mainSkill || null,
          salary: constraints.salary || null,
          salaryOperator: constraints.salaryOperator || 'lte',
          salaryCurrency: constraints.salaryCurrency || null,
          country: constraints.country || null,
        },
      }),
    });

    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    if (!res.body) throw new Error('No response body');

    return parseSSEStream(res.body.getReader(), {
      onProgress,
      onPipelineStages,
      onHaikuConfirm,
    });
  },

  async searchWithSession(
    request: CreateSessionRequest,
    onProgress: (progress: SearchProgress) => void,
    onPipelineStages?: (stages: PipelineStages) => void,
    onHaikuConfirm?: (payload: HaikuConfirmPayload) => void,
  ): Promise<SearchResult> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: request.name,
        matchFlowType: request.matchFlowType,
        jdSource: request.jdSource,
        jobDescription: request.jobDescription,
        dataSource: request.dataSource,
        topN: request.topN,
        constraints: request.constraints ? {
          seniority: request.constraints.seniority || null,
          mainSkill: request.constraints.mainSkill || null,
          salary: request.constraints.salary || null,
          salaryOperator: request.constraints.salaryOperator || 'lte',
          salaryCurrency: request.constraints.salaryCurrency || null,
          country: request.constraints.country || null,
        } : null,
      }),
    });

    if (!res.ok) throw new Error(`Session search failed: ${res.status}`);
    if (!res.body) throw new Error('No response body');

    return parseSSEStream(res.body.getReader(), {
      onProgress,
      onPipelineStages,
      onHaikuConfirm,
    });
  },

  async listSessions(): Promise<MatchSessionSummary[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error(`List sessions failed: ${res.status}`);
    return res.json();
  },

  async getSession(id: number): Promise<MatchSessionDetail> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    if (!res.ok) throw new Error(`Get session failed: ${res.status}`);
    return res.json();
  },
};
