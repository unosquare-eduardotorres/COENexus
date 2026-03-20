import {
  BenchEmployee,
  BenchOpenPosition,
  BenchBurnRequest,
  CrossMatchResult,
  CandidateTiming,
  SearchProgress,
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

    return new Promise(async (resolve, reject) => {
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
                  reject(new Error(data.error || 'Retry error'));
                  return;
                }
              } catch {
              }
              currentEvent = '';
            }
          }
        }

        if (!result) {
          reject(new Error('No result received from retry'));
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(err);
      }
    });
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

    return new Promise(async (resolve, reject) => {
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
                  reject(new Error(data.error || 'Bench burn error'));
                  return;
                }
              } catch {
                // skip malformed JSON
              }
              currentEvent = '';
            }
          }
        }

        if (!result) {
          reject(new Error('No result received from bench burn'));
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(err);
      }
    });
  },
};
