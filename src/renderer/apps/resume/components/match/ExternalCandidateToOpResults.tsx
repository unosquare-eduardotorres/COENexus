import { CrossMatchResult, BenchOpenPosition, ExternalResumeFile } from '../../types';
import { BenchBurnSearchResult } from '../../services/benchBurnService';
import ScoreRing from './ScoreRing';
import CategoryBar from './CategoryBar';
import BenchBurnPipelineStats from './BenchBurnPipelineStats';
import { getFitVerdictConfig, getInitials } from './shared/matchDetailUtils';
import FitVerdictSummary from './shared/FitVerdictSummary';

interface ExternalCandidateToOpResultsProps {
  results: BenchBurnSearchResult;
  resumes: ExternalResumeFile[];
  position: BenchOpenPosition;
  onReset: () => void;
  onSelectMatch: (match: CrossMatchResult) => void;
  onRetryFallbacks?: () => void;
}

export default function ExternalCandidateToOpResults({
  results,
  resumes,
  position,
  onReset,
  onSelectMatch,
  onRetryFallbacks,
}: ExternalCandidateToOpResultsProps) {
  const matches = results.positionResults[position.upstreamId]
    ?? Object.values(results.positionResults).flat();
  const sortedMatches = [...matches].sort((a, b) => b.matchScore - a.matchScore);
  const resumeCount = resumes.length || new Set(sortedMatches.map(m => m.employeeName)).size;

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
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
          {position.jobTitle.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-primary truncate" title={position.jobTitle}>{position.jobTitle}</div>
          <div className="text-xs text-muted truncate" title={`${position.account} · ${position.coe} · ${position.mainSkill}`}>
            {position.account} · {position.coe} · {position.mainSkill}
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium flex-shrink-0">
          {resumeCount} Resume{resumeCount !== 1 ? 's' : ''}
        </span>
      </div>

      <BenchBurnPipelineStats stats={results.stats} onRetryFallbacks={onRetryFallbacks} />

      <div className="space-y-2">
        {sortedMatches.map((match, idx) => {
          const verdictConfig = match.analysis?.fitVerdict ? getFitVerdictConfig(match.analysis.fitVerdict) : null;
          return (
            <button
              key={`${match.employeeUpstreamId}-${idx}`}
              onClick={() => onSelectMatch(match)}
              className="w-full glass-card glass-card-hover p-4 flex items-center gap-4 text-left"
              style={{ transitionDelay: `${idx * 30}ms` }}
            >
              <span className="text-sm font-mono text-muted w-6">#{idx + 1}</span>
              <ScoreRing score={match.matchScore} size={48} />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {getInitials(match.employeeName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary truncate" title={match.employeeName}>{match.employeeName}</span>
                  {verdictConfig && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 border ${verdictConfig.classes}`}>
                      {verdictConfig.icon} {verdictConfig.label}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {position.account} · {position.jobTitle} · {position.mainSkill}
                </div>
                <div className="text-xs text-muted mt-1 truncate" title={match.summary || undefined}>
                  {match.summary?.includes('AI analysis unavailable') && (
                    <span className="mr-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
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
        <div className="glass-panel-subtle p-8 text-center">
          <p className="text-sm text-muted">No matches found for uploaded resumes.</p>
        </div>
      )}
    </div>
  );
}
