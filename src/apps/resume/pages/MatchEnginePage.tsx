import { useState, useCallback, useMemo, ReactNode } from 'react';
import {
  MatchStepKey,
  MatchFlowType,
  JdSource,
  DataSource,
  HardConstraints,
  MatchCandidate,
  PipelineStats as PipelineStatsType,
  SearchProgress as SearchProgressType,
} from '../types';
import { matchEngineService } from '../services/matchEngineService';
import StepperBar from '../components/shared/StepperBar';
import IntentSelector from '../components/match/IntentSelector';
import JobDescriptionStep from '../components/match/JobDescriptionStep';
import DataSourceStep from '../components/match/DataSourceStep';
import SearchProgressComponent from '../components/match/SearchProgress';
import PipelineStatsDisplay from '../components/match/PipelineStats';
import CandidateCard from '../components/match/CandidateCard';
import CandidateProfile from '../components/match/CandidateProfile';
import CompareView from '../components/match/CompareView';

const SOURCE_LABELS: Record<DataSource, string> = {
  bench: 'Bench',
  'all-employees': 'All Employees',
  candidates: 'Candidates',
  'all-sources': 'All Sources',
};

const MATCH_FLOW_LABELS: Record<MatchFlowType, string> = {
  'find-for-position': 'Find for Position',
  'match-to-positions': 'Match to Positions',
};

const STEP_LABELS: { key: MatchStepKey; title: string; icon: ReactNode }[] = [
  {
    key: 'intent',
    title: 'Intent',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    key: 'job-description',
    title: 'Job Description',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'data-source',
    title: 'Data Source',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'searching',
    title: 'AI Search',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    key: 'results',
    title: 'Results',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'deep-dive',
    title: 'Deep Dive',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
];

export default function MatchEnginePage() {
  const [currentStepKey, setCurrentStepKey] = useState<MatchStepKey>('intent');
  const [completedSteps, setCompletedSteps] = useState<Set<MatchStepKey>>(new Set());
  const [matchFlow, setMatchFlow] = useState<MatchFlowType | null>(null);

  const [jobDescription, setJobDescription] = useState('');
  const [jdSource, setJdSource] = useState<JdSource>('custom');
  const [constraints, setConstraints] = useState<HardConstraints>({});
  const [dataSource, setDataSource] = useState<DataSource>('bench');

  const [progress, setProgress] = useState<SearchProgressType>({ percent: 0, stage: '' });
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [stats, setStats] = useState<PipelineStatsType | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<MatchCandidate | null>(null);
  const [compareList, setCompareList] = useState<MatchCandidate[]>([]);
  const [deepDiveMode, setDeepDiveMode] = useState<'profile' | 'compare'>('profile');
  const [animateIn, setAnimateIn] = useState(false);

  const completeStep = useCallback((step: MatchStepKey) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const handleIntentSelect = useCallback(
    (flow: MatchFlowType) => {
      setMatchFlow(flow);
      completeStep('intent');
      setCurrentStepKey('job-description');
    },
    [completeStep]
  );

  const handleJdNext = useCallback(
    (jd: string, source: JdSource, hardConstraints: HardConstraints) => {
      setJobDescription(jd);
      setJdSource(source);
      setConstraints(hardConstraints);
      completeStep('job-description');
      setCurrentStepKey('data-source');
    },
    [completeStep]
  );

  const handleDataSourceNext = useCallback(
    async (source: DataSource) => {
      setDataSource(source);
      completeStep('data-source');
      setCurrentStepKey('searching');
      setAnimateIn(false);
      setProgress({ percent: 0, stage: '' });

      const result = await matchEngineService.searchCandidates(jobDescription, source, constraints, (p) => {
        setProgress(p);
      });

      setCandidates(result.candidates);
      setStats(result.stats);
      completeStep('searching');
      setCurrentStepKey('results');
      setTimeout(() => setAnimateIn(true), 50);
    },
    [jobDescription, constraints, completeStep]
  );

  const handleSelectCandidate = useCallback((candidate: MatchCandidate) => {
    setSelectedProfile(candidate);
    setDeepDiveMode('profile');
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add('results');
      return next;
    });
    setCurrentStepKey('deep-dive');
  }, []);

  const handleToggleCompare = useCallback((candidate: MatchCandidate) => {
    setCompareList((prev) => {
      const isSelected = prev.some((c) => c.id === candidate.id);
      if (isSelected) return prev.filter((c) => c.id !== candidate.id);
      if (prev.length >= 3) return prev;
      return [...prev, candidate];
    });
  }, []);

  const handleStartCompare = useCallback(() => {
    if (compareList.length >= 2) {
      setDeepDiveMode('compare');
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add('results');
        return next;
      });
      setCurrentStepKey('deep-dive');
    }
  }, [compareList.length]);

  const handleBackToResults = useCallback(() => {
    setCurrentStepKey('results');
  }, []);

  const handleStepClick = useCallback((step: MatchStepKey) => {
    setCurrentStepKey(step);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStepKey('intent');
    setCompletedSteps(new Set());
    setMatchFlow(null);
    setJobDescription('');
    setJdSource('custom');
    setConstraints({});
    setDataSource('bench');
    setProgress({ percent: 0, stage: '' });
    setCandidates([]);
    setStats(null);
    setSelectedProfile(null);
    setCompareList([]);
    setAnimateIn(false);
  }, []);

  const activeConstraintCount = useMemo(() => {
    let count = 0;
    if (constraints.seniority) count++;
    if (constraints.maxRate) count++;
    if (constraints.currency) count++;
    if (constraints.country) count++;
    return count;
  }, [constraints]);

  const stepSummaries = useMemo<Partial<Record<MatchStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<MatchStepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('intent') && matchFlow) {
      summaries['intent'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
        label: MATCH_FLOW_LABELS[matchFlow],
      };
    }

    if (completedSteps.has('job-description')) {
      const baseLabel = jdSource === 'position' ? 'Position' : 'Custom';
      const jdLabel = activeConstraintCount > 0
        ? `${baseLabel} (+${activeConstraintCount})`
        : baseLabel;
      const icon = jdSource === 'position' ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
      summaries['job-description'] = { icon, label: jdLabel };
    }

    if (completedSteps.has('data-source')) {
      summaries['data-source'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        label: SOURCE_LABELS[dataSource],
      };
    }

    if (completedSteps.has('searching') && stats) {
      summaries['searching'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        label: `${stats.profilesScanned} scanned`,
      };
    }

    if (completedSteps.has('results')) {
      summaries['results'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
        label: `${candidates.length} candidates`,
      };
    }

    return summaries;
  }, [completedSteps, matchFlow, jdSource, activeConstraintCount, dataSource, stats, candidates.length]);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-subtle text-xs font-medium text-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            TalentMatch Engine
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Find Your Best Candidates</h1>
          <p className="text-base text-secondary mt-3 max-w-xl mx-auto">
            AI-powered semantic search across your entire talent pool — employees, candidates, and passive profiles.
          </p>
        </div>

        <StepperBar
          stepLabels={STEP_LABELS}
          currentStepKey={currentStepKey}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          stepSummaries={stepSummaries}
        />

        {currentStepKey === 'intent' && (
          <IntentSelector onSelect={handleIntentSelect} />
        )}

        {currentStepKey === 'job-description' && (
          <JobDescriptionStep
            onNext={handleJdNext}
            initialJobDescription={jobDescription}
            initialSource={jdSource}
            initialConstraints={constraints}
          />
        )}

        {currentStepKey === 'data-source' && (
          <DataSourceStep onNext={handleDataSourceNext} initialSource={dataSource} />
        )}

        {currentStepKey === 'searching' && (
          <SearchProgressComponent progress={progress} />
        )}

        {currentStepKey === 'results' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors mb-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  New Search
                </button>
                <h2 className="text-2xl font-bold text-primary">Match Results</h2>
                <p className="text-sm text-secondary mt-1">
                  <span className="font-mono font-semibold text-primary">{candidates.length}</span> candidates matched
                  <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {SOURCE_LABELS[dataSource]}
                  </span>
                  {activeConstraintCount > 0 && (
                    <span className="ml-1 text-xs font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {activeConstraintCount} constraint{activeConstraintCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={handleStartCompare}
                disabled={compareList.length < 2}
                className="mt-8 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-indigo-500 disabled:hover:to-indigo-600"
              >
                Compare Selected ({compareList.length})
              </button>
            </div>

            {stats && <PipelineStatsDisplay stats={stats} />}

            <div className={`space-y-2 transition-opacity duration-500 ${animateIn ? 'opacity-100' : 'opacity-0'}`}>
              {candidates.map((candidate, index) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  rank={index + 1}
                  isCompareSelected={compareList.some((c) => c.id === candidate.id)}
                  onSelect={() => handleSelectCandidate(candidate)}
                  onToggleCompare={() => handleToggleCompare(candidate)}
                />
              ))}
            </div>
          </div>
        )}

        {currentStepKey === 'deep-dive' && deepDiveMode === 'profile' && selectedProfile && (
          <CandidateProfile candidate={selectedProfile} onBack={handleBackToResults} />
        )}

        {currentStepKey === 'deep-dive' && deepDiveMode === 'compare' && (
          <CompareView candidates={compareList} onBack={handleBackToResults} />
        )}
      </div>
    </div>
  );
}
