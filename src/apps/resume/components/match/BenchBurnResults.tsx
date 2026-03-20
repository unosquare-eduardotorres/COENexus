import { useState } from 'react';
import { BenchEmployee, BenchOpenPosition, CrossMatchResult } from '../../types';
import { BenchBurnSearchResult } from '../../services/benchBurnService';
import ScoreRing from './ScoreRing';
import CategoryBar from './CategoryBar';
import BenchBurnPipelineStats from './BenchBurnPipelineStats';
import { getFitVerdictConfig, getInitials } from './shared/matchDetailUtils';

interface BenchBurnResultsProps {
  results: BenchBurnSearchResult;
  employees: BenchEmployee[];
  positions: BenchOpenPosition[];
  onReset: () => void;
  onSelectMatch: (match: CrossMatchResult, employee: BenchEmployee, position: BenchOpenPosition) => void;
  onRetryFallbacks?: () => void;
}

export default function BenchBurnResults({
  results,
  employees,
  positions,
  onReset,
  onSelectMatch,
  onRetryFallbacks,
}: BenchBurnResultsProps) {
  const [activeTab, setActiveTab] = useState<'employees' | 'positions'>('employees');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const empLookup = new Map(employees.map(e => [e.upstreamId, e]));
  const posLookup = new Map(positions.map(p => [p.upstreamId, p]));

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

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

  const getEmployee = (upstreamId: number): BenchEmployee => {
    return empLookup.get(upstreamId) ?? {
      upstreamId,
      name: 'Unknown',
      email: '',
      seniority: '',
      mainSkill: '',
      country: '',
      grossMonthlySalary: null,
      salaryCurrency: null,
      lastAccount: null,
      isVectorized: false,
    };
  };

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
              New Search
            </button>
          </div>
          <h2 className="text-2xl font-bold text-primary">Bench Burn Results</h2>
          <p className="text-sm text-secondary mt-1">
            <span className="font-mono font-semibold">{results.stats.analyzed}</span> pairs analyzed in{' '}
            <span className="font-mono">{results.stats.time}</span>
          </p>
        </div>
      </div>

      <BenchBurnPipelineStats stats={results.stats} onRetryFallbacks={onRetryFallbacks} />

      <div className="flex gap-1 p-1 rounded-xl glass-panel-subtle">
        <button
          onClick={() => { setActiveTab('employees'); setExpandedId(null); }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'employees'
              ? 'bg-white dark:bg-dark-card shadow-sm text-primary'
              : 'text-muted hover:text-secondary'
          }`}
        >
          By Employee
        </button>
        <button
          onClick={() => { setActiveTab('positions'); setExpandedId(null); }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'positions'
              ? 'bg-white dark:bg-dark-card shadow-sm text-primary'
              : 'text-muted hover:text-secondary'
          }`}
        >
          By Position
        </button>
      </div>

      <div className="space-y-2">
        {activeTab === 'employees' ? (
          Object.entries(results.employeeResults).map(([empIdStr, matches]) => {
            const empId = Number(empIdStr);
            const emp = getEmployee(empId);
            const isExpanded = expandedId === empId;

            return (
              <div key={empId} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggleExpand(empId)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(emp.name)}
                    </div>
                    <div>
                      <div className="font-medium text-primary">{emp.name}</div>
                      <div className="text-xs text-muted">
                        {emp.seniority} · {emp.mainSkill} · {emp.country}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
                    <svg
                      className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200/20 dark:border-dark-border/20">
                    {matches.map((match, idx) => {
                      const pos = getPosition(match.positionUpstreamId);
                      const verdictConfig = match.analysis?.fitVerdict ? getFitVerdictConfig(match.analysis.fitVerdict) : null;
                      return (
                        <button
                          key={`${match.positionUpstreamId}-${idx}`}
                          onClick={() => onSelectMatch(match, emp, pos)}
                          className="w-full px-4 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors border-b border-gray-100/10 dark:border-dark-border/10 last:border-b-0 text-left"
                          style={{ transitionDelay: `${idx * 30}ms` }}
                        >
                          <span className="text-xs font-mono text-muted w-5">#{idx + 1}</span>
                          <ScoreRing score={match.matchScore} size={40} />
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
                            <div className="text-xs text-muted truncate">
                              {pos.stakeholder && <span className="text-secondary">{pos.stakeholder}</span>}
                              {pos.stakeholder && ' · '}
                              <span className="font-mono">OP#{match.positionUpstreamId}</span>
                              {match.summary?.includes('AI analysis unavailable') && (
                                <span className="ml-1 mr-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  Cosine Only
                                </span>
                              )}
                              {match.summary && ` — ${match.summary}`}
                            </div>
                          </div>
                          <div className="hidden lg:flex flex-col gap-1 flex-shrink-0 w-28">
                            <CategoryBar label="Tech" value={match.scores.technical} />
                            <CategoryBar label="Domain" value={match.scores.domain} />
                          </div>
                          <div className="text-xs font-mono text-muted">
                            cos: {match.cosineSimilarity.toFixed(3)}
                          </div>
                          <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          Object.entries(results.positionResults).map(([posIdStr, matches]) => {
            const posId = Number(posIdStr);
            const pos = getPosition(posId);
            const isExpanded = expandedId === posId;

            return (
              <div key={posId} className="glass-card overflow-hidden">
                <button
                  onClick={() => toggleExpand(posId)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                      {pos.account.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-primary">{pos.account} — {pos.mainSkill}</div>
                      <div className="text-xs text-muted">
                        {pos.coe} · {pos.practice} · {pos.jobTitle}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
                    <svg
                      className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200/20 dark:border-dark-border/20">
                    {matches.map((match, idx) => {
                      const emp = getEmployee(match.employeeUpstreamId);
                      const verdictConfig = match.analysis?.fitVerdict ? getFitVerdictConfig(match.analysis.fitVerdict) : null;
                      return (
                        <button
                          key={`${match.employeeUpstreamId}-${idx}`}
                          onClick={() => onSelectMatch(match, emp, pos)}
                          className="w-full px-4 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors border-b border-gray-100/10 dark:border-dark-border/10 last:border-b-0 text-left"
                          style={{ transitionDelay: `${idx * 30}ms` }}
                        >
                          <span className="text-xs font-mono text-muted w-5">#{idx + 1}</span>
                          <ScoreRing score={match.matchScore} size={40} />
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(emp.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-primary truncate">{match.employeeName}</span>
                              {verdictConfig && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 border ${verdictConfig.classes}`}>
                                  {verdictConfig.icon} {verdictConfig.label}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted truncate">
                              {emp.seniority && <span className="text-secondary">{emp.seniority}</span>}
                              {emp.seniority && emp.mainSkill && ' · '}
                              {emp.mainSkill && <span className="text-secondary">{emp.mainSkill}</span>}
                              {match.summary?.includes('AI analysis unavailable') && (
                                <span className="ml-1 mr-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  Cosine Only
                                </span>
                              )}
                              {match.summary && ` — ${match.summary}`}
                            </div>
                          </div>
                          <div className="hidden lg:flex flex-col gap-1 flex-shrink-0 w-28">
                            <CategoryBar label="Tech" value={match.scores.technical} />
                            <CategoryBar label="Domain" value={match.scores.domain} />
                          </div>
                          <div className="text-xs font-mono text-muted">
                            cos: {match.cosineSimilarity.toFixed(3)}
                          </div>
                          <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
