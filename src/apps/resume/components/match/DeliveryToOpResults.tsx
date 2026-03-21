import { BenchEmployee, BenchOpenPosition, CrossMatchResult } from '../../types';
import { BenchBurnSearchResult } from '../../services/benchBurnService';
import ScoreRing from './ScoreRing';
import CategoryBar from './CategoryBar';
import BenchBurnPipelineStats from './BenchBurnPipelineStats';
import { getFitVerdictConfig, getInitials } from './shared/matchDetailUtils';
import FitVerdictSummary from './shared/FitVerdictSummary';

interface DeliveryToOpResultsProps {
  results: BenchBurnSearchResult;
  employee: BenchEmployee;
  positions: BenchOpenPosition[];
  onReset: () => void;
  onSelectMatch: (match: CrossMatchResult, employee: BenchEmployee, position: BenchOpenPosition) => void;
  onRetryFallbacks?: () => void;
}

export default function DeliveryToOpResults({
  results,
  employee,
  positions,
  onReset,
  onSelectMatch,
  onRetryFallbacks,
}: DeliveryToOpResultsProps) {
  const posLookup = new Map(positions.map(p => [p.upstreamId, p]));

  const getPosition = (upstreamId: number): BenchOpenPosition => {
    return posLookup.get(upstreamId) ?? {
      upstreamId,
      id: 0,
      account: 'Custom',
      coe: '',
      practice: '',
      stakeholder: '',
      mainSkill: '',
      jobTitle: '',
      jobDescription: '',
      isVectorized: false,
    };
  };

  const matches = results.employeeResults[employee.upstreamId] ?? [];
  const sortedMatches = [...matches].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onReset}
              className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              New Analysis
            </button>
          </div>
          <h2 className="text-2xl font-bold text-primary">Analysis Results</h2>
          <p className="text-sm text-secondary mt-1">
            <span className="font-mono font-semibold">{results.stats.analyzed}</span> pair{results.stats.analyzed !== 1 ? 's' : ''} analyzed in{' '}
            <span className="font-mono">{results.stats.time}</span>
          </p>
        </div>
      </div>

      <div className="glass-card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
          {getInitials(employee.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-primary">{employee.name}</div>
          <div className="text-xs text-muted">
            {employee.seniority} · {employee.mainSkill} · {employee.country}
            {employee.isBench && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                Bench
              </span>
            )}
            {employee.isBench === false && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            )}
          </div>
        </div>
      </div>

      <BenchBurnPipelineStats stats={results.stats} onRetryFallbacks={onRetryFallbacks} />

      <div className="space-y-2">
        {sortedMatches.map((match, idx) => {
          const pos = getPosition(match.positionUpstreamId);
          const verdictConfig = match.analysis?.fitVerdict ? getFitVerdictConfig(match.analysis.fitVerdict) : null;
          return (
            <button
              key={`${match.positionUpstreamId}-${idx}`}
              onClick={() => onSelectMatch(match, employee, pos)}
              className="w-full glass-card glass-card-hover p-4 flex items-center gap-4 text-left"
              style={{ transitionDelay: `${idx * 30}ms` }}
            >
              <span className="text-sm font-mono text-muted w-6">#{idx + 1}</span>
              <ScoreRing score={match.matchScore} size={48} />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {pos.account.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary truncate">{match.positionLabel}</span>
                  {verdictConfig && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 border ${verdictConfig.classes}`}>
                      {verdictConfig.icon} {verdictConfig.label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {pos.account} · {pos.coe} · {pos.mainSkill}
                </div>
                <div className="text-xs text-muted mt-1 truncate">
                  {match.summary?.includes('AI analysis unavailable') && (
                    <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Cosine Only
                    </span>
                  )}
                  {match.summary && !match.summary.includes('AI analysis unavailable') && (
                    <FitVerdictSummary summary={match.summary} fitVerdict={match.analysis?.fitVerdict} variant="inline" />
                  )}
                  {match.summary?.includes('AI analysis unavailable') && match.summary}
                </div>
              </div>
              <div className="hidden lg:flex flex-col gap-1.5 flex-shrink-0 w-32">
                <CategoryBar label="Technical" value={match.scores.technical} />
                <CategoryBar label="Domain" value={match.scores.domain} />
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-mono text-muted">
                  cos: {match.cosineSimilarity.toFixed(3)}
                </div>
              </div>
              <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>

      {sortedMatches.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted">No matches found for this employee.</p>
        </div>
      )}
    </div>
  );
}
