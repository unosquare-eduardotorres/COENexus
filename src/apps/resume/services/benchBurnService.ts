import {
  BenchEmployee,
  BenchOpenPosition,
  BenchBurnRequest,
  ExternalCandidateMatchRequest,
  CrossMatchResult,
  CandidateTiming,
  SearchProgress,
  SyncedCandidateListItem,
} from '../types';

const API_BASE = '/api/match';

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

const parseSSEStream = (
  res: Response,
  onProgress: (p: SearchProgress) => void,
  errorMessage = 'Search error',
  noResultMessage = 'No result received from stream',
): Promise<BenchBurnSearchResult> =>
  new Promise(async (resolve, reject) => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let result: BenchBurnSearchResult | null = null;

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
                onProgress(data);
              } else if (currentEvent === 'result') {
                result = data;
              } else if (currentEvent === 'error') {
                reject(new Error(data.error || errorMessage));
                return;
              }
            } catch {
            }
            currentEvent = '';
          }
        }
      }

      if (!result) {
        reject(new Error(noResultMessage));
      } else {
        resolve(result);
      }
    } catch (err) {
      reject(err);
    }
  });

export const benchBurnService = {
  async getBenchEmployees(): Promise<BenchEmployee[]> {
    const res = await fetch(`${API_BASE}/bench-employees`);
    if (!res.ok) throw new Error(`Bench employees failed: ${res.status}`);
    return res.json();
  },

  async getAllEmployees(): Promise<BenchEmployee[]> {
    const res = await fetch(`${API_BASE}/all-employees`);
    if (!res.ok) throw new Error(`All employees failed: ${res.status}`);
    return res.json();
  },

  async getAllCandidates(): Promise<SyncedCandidateListItem[]> {
    const res = await fetch(`${API_BASE}/all-candidates`);
    if (!res.ok) throw new Error(`All candidates failed: ${res.status}`);
    return res.json();
  },

  async searchCandidates(query: string): Promise<SyncedCandidateListItem[]> {
    const res = await fetch(`${API_BASE}/search-candidates?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Search candidates failed: ${res.status}`);
    return res.json();
  },

  async searchEmployees(query: string): Promise<BenchEmployee[]> {
    const res = await fetch(`${API_BASE}/search-employees?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Search employees failed: ${res.status}`);
    return res.json();
  },

  async getOpenPositions(): Promise<BenchOpenPosition[]> {
    const res = await fetch(`${API_BASE}/open-positions`);
    if (!res.ok) throw new Error(`Open positions failed: ${res.status}`);
    return res.json();
  },

  async getSession(id: number): Promise<BenchBurnSearchResult> {
    const res = await fetch(`${API_BASE}/bench-burn/sessions/${id}`);
    if (!res.ok) throw new Error(`Get bench-burn session failed: ${res.status}`);
    return res.json();
  },

  async retryFallbacks(
    sessionId: number,
    pairs: { employeeUpstreamId: number; positionUpstreamId: number }[],
    onProgress: (p: SearchProgress) => void,
  ): Promise<BenchBurnSearchResult> {
    const res = await fetch(`${API_BASE}/bench-burn/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, pairs }),
    });

    if (!res.ok) throw new Error(`Retry failed: ${res.status}`);
    if (!res.body) throw new Error('No response body');

    return parseSSEStream(res, onProgress, 'Retry error', 'No result received from retry');
  },

  async executeBenchBurn(
    request: BenchBurnRequest,
    onProgress: (p: SearchProgress) => void,
  ): Promise<BenchBurnSearchResult> {
    const res = await fetch(`${API_BASE}/bench-burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) throw new Error(`Bench burn failed: ${res.status}`);
    if (!res.body) throw new Error('No response body');

    return parseSSEStream(res, onProgress, 'Bench burn error', 'No result received from bench burn');
  },

  async getResumeText(sourceType: string, upstreamId: number): Promise<string> {
    const res = await fetch(`${API_BASE}/resume-text/${sourceType}/${upstreamId}`);
    if (!res.ok) throw new Error(`Resume text not available: ${res.status}`);
    const data = await res.json();
    return data.resumeText;
  },

  async executeExternalCandidateMatch(
    request: ExternalCandidateMatchRequest,
    onProgress: (p: SearchProgress) => void,
  ): Promise<BenchBurnSearchResult> {
    const res = await fetch(`${API_BASE}/external-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) throw new Error(`External candidate match failed: ${res.status}`);
    if (!res.body) throw new Error('No response body');
    return parseSSEStream(res, onProgress);
  },
};
