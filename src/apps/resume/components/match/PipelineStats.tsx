import { useState, useMemo } from 'react';
import type { PipelineStats as PipelineStatsType, PipelineStages, PipelineStageKey, CandidateTiming } from '../../types';

interface PipelineStatsProps {
  stats: PipelineStatsType;
  pipelineStages?: PipelineStages | null;
  onStageClick?: (stage: PipelineStageKey) => void;
}

interface StatBadge {
  label: string;
  value: string;
  stageKey?: PipelineStageKey;
}

interface PhaseRow {
  key: string;
  label: string;
  durationMs: number;
  detail?: string;
}

const PHASE_LABELS: Record<string, string> = {
  embeddingMs: 'JD Embedding',
  vectorSearchMs: 'Vector Search',
  totalCountMs: 'Total Count',
  enrichmentMs: 'Metadata Enrichment',
  constraintsMs: 'Constraint Filtering',
  haikuTriageMs: 'Haiku Triage',
  sonnetAnalysisMs: 'Sonnet Analysis',
};

const PHASE_ORDER = ['embeddingMs', 'vectorSearchMs', 'totalCountMs', 'enrichmentMs', 'constraintsMs', 'haikuTriageMs', 'sonnetAnalysisMs'];

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function PipelineStats({ stats, pipelineStages, onStageClick }: PipelineStatsProps) {
  const [showTimings, setShowTimings] = useState(false);

  const pipelineSteps: StatBadge[] = [
    { label: 'Profiles Scanned', value: stats.profilesScanned },
    { label: 'Pre-filtered', value: stats.preFiltered, stageKey: 'vectorResults' },
    { label: 'Constraints Applied', value: stats.constraintsApplied, stageKey: 'afterConstraints' },
    { label: 'Haiku Triage', value: stats.haikuTriage, stageKey: 'afterHaikuTriage' },
    { label: 'Sonnet Analyzed', value: stats.sonnetAnalyzed, stageKey: 'sonnetAnalyzed' },
  ];

  const metaStats: StatBadge[] = [
    { label: 'Search Cost', value: stats.searchCost },
    { label: 'Time', value: stats.time },
  ];

  const isClickable = (step: StatBadge) =>
    !!pipelineStages && !!step.stageKey && !!onStageClick && step.stageKey !== 'sonnetAnalyzed';

  const timings = stats.timings;
  const hasTimings = timings && Object.keys(timings).length > 0;

  const phases = useMemo<PhaseRow[]>(() => {
    if (!timings) return [];
    return PHASE_ORDER
      .filter((key) => timings[key] !== undefined)
      .map((key) => {
        let detail: string | undefined;
        if (key === 'haikuTriageMs') {
          const calls = timings['haikuCallCount'] ?? 0;
          const fb = timings['haikuFallbackCount'] ?? 0;
          const avg = timings['haikuAvgMs'] ?? 0;
          detail = `${calls} calls, ${fb} fallback${fb !== 1 ? 's' : ''}, ${formatMs(avg)} avg`;
        } else if (key === 'sonnetAnalysisMs') {
          const calls = timings['sonnetCallCount'] ?? 0;
          const fb = timings['sonnetFallbackCount'] ?? 0;
          const avg = timings['sonnetAvgMs'] ?? 0;
          detail = `${calls} calls, ${fb} fallback${fb !== 1 ? 's' : ''}, ${formatMs(avg)} avg`;
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
        {pipelineSteps.map((stat, i) => {
          const clickable = isClickable(stat);
          const Badge = clickable ? 'button' : 'div';
          return (
            <div key={stat.label} className="flex items-center gap-2">
              <Badge
                {...(clickable ? { onClick: () => onStageClick!(stat.stageKey!) } : {})}
                className={`glass-panel-subtle rounded-xl px-3 py-2 text-left transition-all ${
                  clickable
                    ? 'cursor-pointer hover:ring-2 ring-accent-500/30 hover:bg-white/5 group'
                    : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div className="text-xs text-muted">{stat.label}</div>
                  {clickable && (
                    <svg className="w-3 h-3 text-muted/40 group-hover:text-accent-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </div>
                <div className="text-sm font-mono font-semibold text-primary">{stat.value}</div>
              </Badge>
              {i < pipelineSteps.length - 1 && (
                <svg className="w-3 h-3 text-muted/40 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {metaStats.map((stat) => (
          <div key={stat.label} className="glass-panel-subtle rounded-xl px-3 py-2">
            <div className="text-xs text-muted">{stat.label}</div>
            <div className="text-sm font-mono font-semibold text-primary">{stat.value}</div>
          </div>
        ))}
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
                  const hasFallbacks = (p.key === 'haikuTriageMs' && (timings?.['haikuFallbackCount'] ?? 0) > 0) ||
                    (p.key === 'sonnetAnalysisMs' && (timings?.['sonnetFallbackCount'] ?? 0) > 0);

                  return (
                    <div key={p.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-secondary w-40 truncate">{p.label}</span>
                          {hasFallbacks && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">
                              {p.key === 'haikuTriageMs'
                                ? `${timings?.['haikuFallbackCount']} fb`
                                : `${timings?.['sonnetFallbackCount']} fb`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.detail && (
                            <span className="text-[10px] text-muted font-mono hidden sm:inline">{p.detail}</span>
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
                  <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Per-Candidate Timing</h4>
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
                            <td className="py-1.5 pr-4 text-primary font-mono truncate max-w-[180px]">{ct.name}</td>
                            <td className="py-1.5 pr-4">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                ct.phase === 'haiku'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              }`}>
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
