import { useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import {
  MatchStepKey,
  MatchFlowType,
  JdSource,
  DataSource,
  HardConstraints,
  MatchCandidate,
  PipelineStats as PipelineStatsType,
  PipelineStages,
  PipelineStageKey,
  SearchProgress as SearchProgressType,
  TopN,
  PoolCounts,
  FilterOptions,
  MatchSessionSummary,
  HaikuConfirmPayload,
} from '../types';
import { matchEngineService } from '../services/matchEngineService';
import { SAMPLE_JOB_DESCRIPTION } from '../data/mockMatchCandidates';
import StepperBar from '../components/shared/StepperBar';
import IntentSelector from '../components/match/IntentSelector';
import JobDescriptionStep from '../components/match/JobDescriptionStep';
import DataSourceStep from '../components/match/DataSourceStep';
import SearchProgressComponent from '../components/match/SearchProgress';
import PipelineStatsDisplay from '../components/match/PipelineStats';
import CandidateCard from '../components/match/CandidateCard';
import CandidateProfile from '../components/match/CandidateProfile';
import CompareView from '../components/match/CompareView';
import SessionHistory from '../components/match/SessionHistory';
import SessionHistoryPage from '../components/match/SessionHistoryPage';
import PipelineStageDrawer from '../components/match/PipelineStageDrawer';

const SOURCE_LABELS: Record<DataSource, string> = {
  bench: 'Bench',
  'all-employees': 'Employees',
  candidates: 'Candidates',
  'all-sources': 'All Sources',
};

const MATCH_FLOW_LABELS: Record<MatchFlowType, string> = {
  'find-for-position': 'Find for Position',
  'match-to-positions': 'Match to Positions',
  'delivery-to-op': 'Delivery Pro to OP',
};

const PIPELINE_STAGE_LABELS: Record<PipelineStageKey, string> = {
  vectorResults: 'Pre-filtered — Vector Results',
  afterConstraints: 'After Constraints Applied',
  afterHaikuTriage: 'After Haiku Triage',
  sonnetAnalyzed: 'Sonnet Analyzed',
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

  const [jobDescription, setJobDescription] = useState(SAMPLE_JOB_DESCRIPTION);
  const [jdSource, setJdSource] = useState<JdSource>('custom');
  const [constraints, setConstraints] = useState<HardConstraints>({});
  const [dataSource, setDataSource] = useState<DataSource>('bench');
  const [topN, setTopN] = useState<TopN>(10);

  const [poolCounts, setPoolCounts] = useState<PoolCounts | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [progress, setProgress] = useState<SearchProgressType>({ percent: 0, stage: '' });
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [stats, setStats] = useState<PipelineStatsType | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStages | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<MatchCandidate | null>(null);
  const [compareList, setCompareList] = useState<MatchCandidate[]>([]);
  const [deepDiveMode, setDeepDiveMode] = useState<'profile' | 'compare'>('profile');
  const [animateIn, setAnimateIn] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [showSessionNamePrompt, setShowSessionNamePrompt] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [pendingDataSource, setPendingDataSource] = useState<{ source: DataSource; topN: TopN } | null>(null);

  const [sessions, setSessions] = useState<MatchSessionSummary[]>([]);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [activeStageDrawer, setActiveStageDrawer] = useState<PipelineStageKey | null>(null);
  const [showAiWarningModal, setShowAiWarningModal] = useState(false);
  const [haikuConfirm, setHaikuConfirm] = useState<HaikuConfirmPayload | null>(null);
  const [showHistoryPage, setShowHistoryPage] = useState(false);

  useEffect(() => {
    matchEngineService.getPoolCounts()
      .then(setPoolCounts)
      .catch(() => setPoolCounts(null));
    matchEngineService.getFilterOptions()
      .then(setFilterOptions)
      .catch(() => setFilterOptions(null));
    matchEngineService.listSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

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
    (source: DataSource, selectedTopN: TopN) => {
      setPendingDataSource({ source, topN: selectedTopN });
      const now = new Date();
      const defaultName = `Search — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      setSessionName(defaultName);
      setShowSessionNamePrompt(true);
    },
    []
  );

  const executeSearch = useCallback(
    async () => {
      if (!pendingDataSource) return;
      const { source, topN: selectedTopN } = pendingDataSource;
      setShowSessionNamePrompt(false);
      setShowAiWarningModal(false);

      setDataSource(source);
      setTopN(selectedTopN);
      completeStep('data-source');
      setCurrentStepKey('searching');
      setAnimateIn(false);
      setProgress({ percent: 0, stage: '' });
      setPipelineStages(null);

      try {
        const result = await matchEngineService.searchWithSession(
          {
            name: sessionName,
            matchFlowType: matchFlow || 'find-for-position',
            jdSource,
            jobDescription,
            dataSource: source,
            topN: selectedTopN,
            constraints,
          },
          (p) => setProgress(p),
          (stages) => setPipelineStages(stages),
          (payload) => setHaikuConfirm(payload),
        );

        setCandidates(result.candidates);
        setStats(result.stats);
        if (result.pipelineStages) setPipelineStages(result.pipelineStages);
        if (result.sessionId) setSessionId(result.sessionId);
        completeStep('searching');
        setCurrentStepKey('results');
        setTimeout(() => setAnimateIn(true), 50);

        matchEngineService.listSessions()
          .then(setSessions)
          .catch(() => {});
      } catch (err) {
        console.error('Search failed:', err);
        setCurrentStepKey('data-source');
      }
    },
    [pendingDataSource, sessionName, matchFlow, jdSource, jobDescription, constraints, completeStep]
  );

  const handleStartSearch = useCallback(
    async () => {
      if (!pendingDataSource) return;

      const { connected } = await matchEngineService.getProxyStatus();
      if (!connected) {
        setShowSessionNamePrompt(false);
        setShowAiWarningModal(true);
        return;
      }

      executeSearch();
    },
    [pendingDataSource, executeSearch]
  );

  const handleAiWarningContinue = useCallback(() => {
    executeSearch();
  }, [executeSearch]);

  const handleAiWarningCancel = useCallback(() => {
    setShowAiWarningModal(false);
    setPendingDataSource(null);
  }, []);

  const handleConfirmDecision = useCallback(async (action: 'proceed' | 'include-all') => {
    setHaikuConfirm(null);
    await fetch('/api/match/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  }, []);

  const handleLoadSession = useCallback(async (id: number) => {
    try {
      const detail = await matchEngineService.getSession(id);
      setSessionId(detail.id);
      setMatchFlow(detail.matchFlowType);
      setJobDescription(detail.jobDescription);
      setJdSource(detail.jdSource);
      setConstraints(detail.constraints || {});
      setDataSource(detail.dataSource);
      setTopN(detail.topN);
      setCandidates(detail.candidates);
      setStats(detail.stats || null);
      setPipelineStages(detail.pipelineStages || null);
      setCompletedSteps(new Set<MatchStepKey>(['intent', 'job-description', 'data-source', 'searching']));
      setCurrentStepKey('results');
      setShowSessionHistory(false);
      setTimeout(() => setAnimateIn(true), 50);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }, []);

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
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setJdSource('custom');
    setConstraints({});
    setDataSource('bench');
    setTopN(10);
    setProgress({ percent: 0, stage: '' });
    setCandidates([]);
    setStats(null);
    setPipelineStages(null);
    setSelectedProfile(null);
    setCompareList([]);
    setAnimateIn(false);
    setSessionId(null);
    setActiveStageDrawer(null);
  }, []);

  const handleStageClick = useCallback((stage: PipelineStageKey) => {
    if (stage === 'sonnetAnalyzed') return;
    setActiveStageDrawer(stage);
  }, []);

  const activeStageDrawerCandidates = useMemo(() => {
    if (!activeStageDrawer || !pipelineStages) return [];
    if (activeStageDrawer === 'sonnetAnalyzed') return [];
    return pipelineStages[activeStageDrawer] || [];
  }, [activeStageDrawer, pipelineStages]);

  const activeConstraintCount = useMemo(() => {
    let count = 0;
    if (constraints.seniority) count++;
    if (constraints.mainSkill) count++;
    if (constraints.salary) count++;
    if (constraints.salaryCurrency) count++;
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
        label: `${SOURCE_LABELS[dataSource]} · Top ${topN}`,
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
  }, [completedSteps, matchFlow, jdSource, activeConstraintCount, dataSource, topN, stats, candidates.length]);

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
          {sessions.length > 0 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowSessionHistory(!showSessionHistory)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  showSessionHistory
                    ? 'bg-accent-500/15 text-accent-500'
                    : 'glass-panel-subtle text-muted hover:text-secondary hover:bg-white/5'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Session History ({sessions.length})
              </button>
            </div>
          )}
        </div>

        {showSessionHistory && (
          <div className="mt-4">
            <SessionHistory
              sessions={sessions}
              onLoadSession={handleLoadSession}
              currentSessionId={sessionId}
              onClose={() => setShowSessionHistory(false)}
            />
          </div>
        )}

        <StepperBar
          stepLabels={STEP_LABELS}
          currentStepKey={currentStepKey}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          stepSummaries={stepSummaries}
        />

        {currentStepKey === 'intent' && !showHistoryPage && (
          <IntentSelector
            onSelect={handleIntentSelect}
            onViewHistory={() => setShowHistoryPage(true)}
            sessionCount={sessions.length}
          />
        )}

        {currentStepKey === 'intent' && showHistoryPage && (
          <SessionHistoryPage
            sessions={sessions}
            onLoadSession={(id) => { setShowHistoryPage(false); handleLoadSession(id); }}
            onBack={() => setShowHistoryPage(false)}
          />
        )}

        {currentStepKey === 'job-description' && (
          <JobDescriptionStep
            onNext={handleJdNext}
            initialJobDescription={jobDescription}
            initialSource={jdSource}
            initialConstraints={constraints}
            filterOptions={filterOptions}
          />
        )}

        {currentStepKey === 'data-source' && (
          <DataSourceStep onNext={handleDataSourceNext} initialSource={dataSource} poolCounts={poolCounts} />
        )}

        {currentStepKey === 'searching' && (
          <SearchProgressComponent progress={progress} isPaused={haikuConfirm !== null} />
        )}

        {currentStepKey === 'results' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    New Search
                  </button>
                  {sessions.length > 0 && (
                    <button
                      onClick={() => setShowSessionHistory(!showSessionHistory)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${
                        showSessionHistory ? 'text-accent-500' : 'text-muted hover:text-secondary'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      History
                    </button>
                  )}
                </div>
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
                className="mt-8 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-accent-500 disabled:hover:to-accent-600"
              >
                Compare Selected ({compareList.length})
              </button>
            </div>

            {showSessionHistory && (
              <SessionHistory
                sessions={sessions}
                onLoadSession={handleLoadSession}
                currentSessionId={sessionId}
                onClose={() => setShowSessionHistory(false)}
              />
            )}

            {stats && (
              <PipelineStatsDisplay
                stats={stats}
                pipelineStages={pipelineStages}
                onStageClick={handleStageClick}
              />
            )}

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

      {showSessionNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSessionNamePrompt(false)} />
          <div className="relative glass-panel rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-primary mb-1">Name This Search</h3>
            <p className="text-sm text-secondary mb-4">Give this session a name so you can find it later.</p>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartSearch()}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              placeholder="e.g., Senior React Developer — March 2026"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowSessionNamePrompt(false)}
                className="px-4 py-2 text-sm text-muted hover:text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSearch}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 transition-all"
              >
                Start Search
              </button>
            </div>
          </div>
        </div>
      )}

      {activeStageDrawer && pipelineStages && (
        <PipelineStageDrawer
          stage={activeStageDrawer}
          stageLabel={PIPELINE_STAGE_LABELS[activeStageDrawer]}
          candidates={activeStageDrawerCandidates}
          onClose={() => setActiveStageDrawer(null)}
        />
      )}

      {showAiWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">AI Services Unavailable</h3>
            </div>

            <p className="text-sm text-secondary leading-relaxed">
              The Claude AI proxy is not running. The following AI-powered features will not be available:
            </p>

            <ul className="text-sm text-muted space-y-1.5 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✕</span>
                <span><strong>Haiku Triage</strong> — AI relevance scoring per candidate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✕</span>
                <span><strong>Sonnet Deep Analysis</strong> — detailed fit narratives, skill gaps, leadership assessment</span>
              </li>
            </ul>

            <div className="glass-panel-subtle rounded-lg p-3">
              <p className="text-xs text-amber-500 font-medium">
                Results will be ranked by vector similarity only — scores may be less accurate and analysis sections will be empty.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAiWarningCancel}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200/30 dark:border-dark-border/30 text-sm font-medium text-secondary hover:bg-gray-100/50 dark:hover:bg-dark-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAiWarningContinue}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                Continue Without AI
              </button>
            </div>
          </div>
        </div>
      )}

      {haikuConfirm && currentStepKey === 'searching' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary">Fewer Matches Than Requested</h3>
            </div>

            <p className="text-sm text-secondary leading-relaxed">
              You requested <span className="font-semibold text-primary">Top {haikuConfirm.requestedTopN}</span>, but only{' '}
              <span className="font-semibold text-primary">{haikuConfirm.passedCount}</span> candidates scored above the quality threshold (40%).
            </p>

            {haikuConfirm.bestRejected.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Next Best Candidates</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {haikuConfirm.bestRejected.map((candidate, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg glass-panel-subtle">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">{candidate.name}</span>
                        {candidate.seniority && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500">{candidate.seniority}</span>
                        )}
                        {candidate.mainSkill && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">{candidate.mainSkill}</span>
                        )}
                      </div>
                      <span className="text-sm font-mono font-semibold text-amber-500">{candidate.haikuScore}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-panel-subtle rounded-lg p-3">
              <p className="text-xs text-amber-500 font-medium">
                Including low-scoring candidates may result in less relevant matches. They will still receive full Sonnet analysis.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleConfirmDecision('proceed')}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200/30 dark:border-dark-border/30 text-sm font-medium text-secondary hover:bg-gray-100/50 dark:hover:bg-dark-hover transition-colors"
              >
                Proceed with {haikuConfirm.passedCount}
              </button>
              <button
                onClick={() => handleConfirmDecision('include-all')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                Include Low Scores
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
