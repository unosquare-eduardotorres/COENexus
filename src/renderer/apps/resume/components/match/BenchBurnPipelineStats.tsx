import { useState, useMemo } from 'react';
import type { CandidateTiming } from '../../types';

interface BenchBurnStats {
  totalPairs: number;
  analyzed: number;
  time: string;
  searchCost: string;
  timings?: Record<string, number>;
  candidateTimings?: CandidateTiming[];
}

interface BenchBurnPipelineStatsProps {
  stats: BenchBurnStats;
  onRetryFallbacks?: () => void;
}

interface PhaseRow {
  key: string;
  label: string;
  durationMs: number;
  detail?: string;
}

const PHASE_LABELS: Record<string, string> = {
  dataLoadMs: 'Data Loading',
  vectorSimilarityMs: 'Vector Similarity',
  opusAnalysisMs: 'Opus Analysis',
};

const PHASE_ORDER = ['dataLoadMs', 'vectorSimilarityMs', 'opusAnalysisMs'];

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function BenchBurnPipelineStats({ stats, onRetryFallbacks }: BenchBurnPipelineStatsProps) {
  const [showTimings, setShowTimings] = useState(false);

  const timings = stats.timings;
  const hasTimings = timings && Object.keys(timings).length > 0;
  const fallbackCount = stats.candidateTimings?.filter(ct => ct.fallback).length ?? 0;

  const summaryBadges = [
    { label: 'Total Pairs', value: String(stats.totalPairs) },
    { label: 'Analyzed', value: String(stats.analyzed) },
    { label: 'Duration', value: stats.time },
    { label: 'Cost', value: stats.searchCost },
  ];

  const phases = useMemo<PhaseRow[]>(() => {
    if (!timings) return [];
    return PHASE_ORDER
      .filter((key) => timings[key] !== undefined)
      .map((key) => {
        let detail: string | undefined;
        if (key === 'opusAnalysisMs') {
          const calls = timings['opusCallCount'] ?? 0;
          const fb = timings['opusFallbackCount'] ?? 0;
          const avg = timings['opusAvgMs'] ?? 0;
          const conc = timings['opusMaxConcurrency'] ?? 0;
          detail = `${calls} calls, ${fb} fallback${fb !== 1 ? 's' : ''}, ${formatMs(avg)} avg, ${conc} concurrency`;
        }
        return { key, label: PHASE_LABELS[key] ?? key, durationMs: timings[key], detail };
      });
  }, [timings]);

  const maxPhaseMs = useMemo(() => Math.max(...phases.map((p) => p.durationMs), 1), [phases]);

  const sortedCandidateTimings = useMemo<CandidateTiming[]>(() => {
    if (!stats.candidateTimings?.length) return [];
    return [...stats.candidateTimings].sort((a, b) => b.durationMs - a.durationMs);
  }, [stats.candidateTimings]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        {summaryBadges.map((badge) => (
          <div key={badge.label} className="glass-panel-subtle rounded-xl px-3 py-2">
            <div className="text-xs text-muted">{badge.label}</div>
            <div className="text-sm font-mono font-semibold text-primary">{badge.value}</div>
          </div>
        ))}
        {fallbackCount > 0 && onRetryFallbacks && (
          <button
            onClick={onRetryFallbacks}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
          >
            ↻ Re-analyze {fallbackCount} Fallback{fallbackCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {hasTimings && (
        <div className="pt-1">
          <button
            onClick={() => setShowTimings(!showTimings)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showTimings ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Performance Breakdown
          </button>

          {showTimings && (
            <div className="mt-3 space-y-4">
              <div className="glass-panel-subtle rounded-xl p-4 space-y-2.5">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Phase Waterfall</h4>
                {phases.map((p) => {
                  const widthPct = (p.durationMs / maxPhaseMs) * 100;
                  const isLongest = p.durationMs === maxPhaseMs;
                  const hasFallbacks = p.key === 'opusAnalysisMs' && (timings?.['opusFallbackCount'] ?? 0) > 0;

                  return (
                    <div key={p.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-secondary w-40 truncate" title={p.label}>{p.label}</span>
                          {hasFallbacks && (
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">
                              {timings?.['opusFallbackCount']} fb
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.detail && (
                            <span className="text-xs text-muted font-mono hidden sm:inline">{p.detail}</span>
                          )}
                          <span className={`text-xs font-mono font-semibold ${isLongest ? 'text-amber-500' : 'text-primary'}`}>
                            {formatMs(p.durationMs)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-200/30 dark:bg-gray-700/30 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isLongest
                              ? 'bg-amber-500/70'
                              : hasFallbacks
                                ? 'bg-red-400/60'
                                : 'bg-accent-500/50'
                          }`}
                          style={{ width: `${Math.max(widthPct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {sortedCandidateTimings.length > 0 && (
                <div className="glass-panel-subtle rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Per-Pair Timing</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted border-b border-gray-200/20 dark:border-gray-700/20">
                          <th className="text-left py-1.5 pr-4 font-medium">Name</th>
                          <th className="text-left py-1.5 pr-4 font-medium">Phase</th>
                          <th className="text-right py-1.5 pr-4 font-medium">Duration</th>
                          <th className="text-center py-1.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCandidateTimings.map((ct, idx) => (
                          <tr
                            key={`${ct.name}-${ct.phase}-${idx}`}
                            className={`border-b border-gray-200/10 dark:border-gray-700/10 ${
                              ct.fallback ? 'bg-amber-500/5' : ''
                            }`}
                            title={ct.error || undefined}
                          >
                            <td className="py-1.5 pr-4 text-primary font-mono truncate max-w-[240px]" title={ct.name}>{ct.name}</td>
                            <td className="py-1.5 pr-4">
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                {ct.phase}
                              </span>
                            </td>
                            <td className="py-1.5 pr-4 text-right font-mono text-primary">{formatMs(ct.durationMs)}</td>
                            <td className="py-1.5 text-center">
                              {ct.fallback ? (
                                <span className="text-amber-500" title={ct.error}>FALLBACK</span>
                              ) : (
                                <span className="text-emerald-500">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
