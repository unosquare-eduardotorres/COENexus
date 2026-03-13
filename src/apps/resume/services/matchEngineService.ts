import { MatchCandidate, PipelineStats, DataSource, HardConstraints, SearchProgress } from '../types';
import { mockMatchCandidates, mockPipelineStats } from '../data/mockMatchCandidates';

const SEARCH_STAGES: { percent: number; stage: string; delay: number }[] = [
  { percent: 10, stage: 'Embedding job description...', delay: 300 },
  { percent: 25, stage: 'Scoping data source (WHERE source_type)...', delay: 400 },
  { percent: 40, stage: 'Applying hard constraints (WHERE seniority, rate, currency, country)...', delay: 350 },
  { percent: 60, stage: 'Running pgvector cosine similarity search...', delay: 500 },
  { percent: 75, stage: 'Haiku triage on top candidates...', delay: 400 },
  { percent: 90, stage: 'Sonnet deep analysis on shortlisted profiles...', delay: 500 },
  { percent: 100, stage: 'Ranking and preparing results...', delay: 300 },
];

const SOURCE_CANDIDATE_COUNTS: Record<DataSource, number> = {
  bench: 3,
  'all-employees': 4,
  candidates: 5,
  'all-sources': 6,
};

export const matchEngineService = {
  async searchCandidates(
    _jobDescription: string,
    source: DataSource,
    _constraints: HardConstraints,
    onProgress: (progress: SearchProgress) => void
  ): Promise<{ candidates: MatchCandidate[]; stats: PipelineStats }> {
    for (const step of SEARCH_STAGES) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      onProgress({ percent: step.percent, stage: step.stage });
    }
    await new Promise(resolve => setTimeout(resolve, 400));

    const candidates = mockMatchCandidates.slice(0, SOURCE_CANDIDATE_COUNTS[source]);
    const stats = mockPipelineStats[source];

    return { candidates, stats };
  },
};
