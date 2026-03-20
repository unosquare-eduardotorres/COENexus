import { useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import {
  MatchStepKey,
  MatchFlowType,
  JdSource,
  DataSource,
  AdvancedConstraints,
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
  SearchMode,
} from '../types';
import { matchEngineService } from '../services/matchEngineService';
import { normalizeCandidate } from '../utils/normalizeCandidate';
import { exportToExcel, ColumnDef } from '../utils/exportToExcel';
import { formatSalary } from '../utils/formatSalary';
import { SAMPLE_JOB_DESCRIPTION } from '../data/mockMatchCandidates';
import { getMatchPrompts } from '../data/defaultMatchPrompts';
import StepperBar from '../components/shared/StepperBar';
import IntentSelector from '../components/match/IntentSelector';
import JobDescriptionStep from '../components/match/JobDescriptionStep';
import DataSourceStep from '../components/match/DataSourceStep';
import FilterStep from '../components/match/FilterStep';
import SearchDepthStep from '../components/match/SearchDepthStep';
import SearchProgressComponent from '../components/match/SearchProgress';
import PipelineStatsDisplay from '../components/match/PipelineStats';
import CandidateCard from '../components/match/CandidateCard';
import CandidateProfile from '../components/match/CandidateProfile';
import CompareView from '../components/match/CompareView';
import SessionHistory from '../components/match/SessionHistory';
import SessionHistoryPage from '../components/match/SessionHistoryPage';
import PipelineStageDrawer from '../components/match/PipelineStageDrawer';
import BenchBurnPage from './BenchBurnPage';
import DeliveryToOpPage from './DeliveryToOpPage';
import ExternalCandidateToOpPage from './ExternalCandidateToOpPage';

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
  'bench-burn': 'Bench Burn',
  'external-candidate-to-op': 'External Candidate to OP',
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
    key: 'data-source',
    title: 'Data Source',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
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
    key: 'filters',
    title: 'Filters',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    key: 'search-depth',
    title: 'Search Depth',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18l-7 8v6l-4 2V12L3 4z" />
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

  const navigateToStep = useCallback((step: MatchStepKey, replace = false) => {
    setCurrentStepKey(step);
    if (replace) {
      window.history.replaceState({ matchStep: step }, '');
    } else {
      window.history.pushState({ matchStep: step }, '');
    }
  }, []);

  useEffect(() => {
    window.history.replaceState({ matchStep: 'intent' }, '');

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.matchStep) {
        setCurrentStepKey(e.state.matchStep);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [matchFlow, setMatchFlow] = useState<MatchFlowType | null>(null);

  const [jobDescription, setJobDescription] = useState(SAMPLE_JOB_DESCRIPTION);
  const [jdSource, setJdSource] = useState<JdSource>('custom');
  const [advancedConstraints, setAdvancedConstraints] = useState<AdvancedConstraints>({ candidateFilters: [], employeeFilters: [] });
  const [dataSource, setDataSource] = useState<DataSource>('candidates');
  const [topN, setTopN] = useState<TopN>(10);

  const [searchMode, setSearchMode] = useState<SearchMode>('opus');
  const [deeperTopN, setDeeperTopN] = useState<TopN>(10);
  const [candidateUpstreamIds, setCandidateUpstreamIds] = useState<number[] | null>(null);
  const [showAnalyzeDeeper, setShowAnalyzeDeeper] = useState(false);

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

      if (flow === 'bench-burn') {
        navigateToStep('bench-burn');
        return;
      }

      if (flow === 'delivery-to-op') {
        navigateToStep('delivery-to-op');
        return;
      }

      if (flow === 'external-candidate-to-op') {
        navigateToStep('external-candidate-to-op');
        return;
      }

      navigateToStep('data-source');
    },
    [completeStep, navigateToStep]
  );

  const handleJdNext = useCallback(
    (jd: string, source: JdSource) => {
      setJobDescription(jd);
      setJdSource(source);
      completeStep('job-description');
      navigateToStep('filters');
    },
    [completeStep, navigateToStep]
  );

  const handleFiltersNext = useCallback(
    (constraints: AdvancedConstraints) => {
      setAdvancedConstraints(constraints);
      completeStep('filters');
      navigateToStep('search-depth');
    },
    [completeStep, navigateToStep]
  );

  const handleSearchDepthNext = useCallback(
    (mode: SearchMode, selectedTopN: number) => {
      setSearchMode(mode);
      setTopN(selectedTopN as TopN);
      completeStep('search-depth');

      setPendingDataSource({ source: dataSource, topN: selectedTopN as TopN });
      const now = new Date();
      const flowLabel = matchFlow === 'match-to-positions' ? 'Match to Positions' : 'Candidates to OP';
      const defaultName = `${flowLabel} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      setSessionName(defaultName);
      setShowSessionNamePrompt(true);
    },
    [completeStep, dataSource, matchFlow]
  );

  const handleDataSourceNext = useCallback(
    (source: DataSource) => {
      setDataSource(source);
      completeStep('data-source');
      navigateToStep('job-description');
    },
    [completeStep, navigateToStep]
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
      navigateToStep('searching');
      setAnimateIn(false);
      setProgress({ percent: 0, stage: '' });
      setPipelineStages(null);
      const matchPromptConfigs = getMatchPrompts();
      const haikuConfig = matchPromptConfigs.find(p => p.key === 'haiku-triage');
      const opusConfig = matchPromptConfigs.find(p => p.key === 'opus-analysis');

      try {
        const result = await matchEngineService.searchWithSession(
          {
            name: sessionName,
            matchFlowType: matchFlow || 'find-for-position',
            jdSource,
            jobDescription,
            dataSource: source,
            topN: selectedTopN,
            searchMode,
            constraints: advancedConstraints,
            haikuPromptConfig: haikuConfig ? {
              promptTemplate: haikuConfig.promptTemplate,
              maxTokens: haikuConfig.maxTokens,
              temperature: haikuConfig.temperature,
            } : undefined,
            opusPromptConfig: opusConfig ? {
              promptTemplate: opusConfig.contextBlocks
                ? opusConfig.promptTemplate.replace('{{contextBlock}}', opusConfig.contextBlocks.matchEngine)
                : opusConfig.promptTemplate,
              maxTokens: opusConfig.maxTokens,
              temperature: opusConfig.temperature,
            } : undefined,
            candidateUpstreamIds: candidateUpstreamIds ?? undefined,
          },
          (p) => setProgress(p),
          (stages) => setPipelineStages(stages),
          (payload) => setHaikuConfirm(payload),
        );
        setCandidateUpstreamIds(null);

        setCandidates(result.candidates.map(normalizeCandidate));
        setStats(result.stats);
        if (result.pipelineStages) setPipelineStages(result.pipelineStages);
        if (result.sessionId) setSessionId(result.sessionId);
        completeStep('searching');
        navigateToStep('results');
        setTimeout(() => setAnimateIn(true), 50);

        matchEngineService.listSessions()
          .then(setSessions)
          .catch(() => {});
      } catch (err) {
        console.error('Search failed:', err);
        navigateToStep('data-source');
      }
    },
    [pendingDataSource, sessionName, matchFlow, jdSource, jobDescription, advancedConstraints, candidateUpstreamIds, completeStep, searchMode, navigateToStep]
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
      setShowSessionHistory(false);

      if (detail.matchFlowType === 'delivery-to-op' || detail.matchFlowType === 'bench-burn' || detail.matchFlowType === 'external-candidate-to-op') {
        setCompletedSteps(new Set<MatchStepKey>(['intent']));
        navigateToStep(detail.matchFlowType);
        setTimeout(() => setAnimateIn(true), 50);
        return;
      }

      setJobDescription(detail.jobDescription);
      setJdSource(detail.jdSource);
      setAdvancedConstraints(detail.constraints || { candidateFilters: [], employeeFilters: [] });
      setDataSource(detail.dataSource);
      setTopN(detail.topN);
      setSearchMode(detail.searchMode || 'opus');
      setCandidates(detail.candidates.map(normalizeCandidate));
      setStats(detail.stats || null);
      setPipelineStages(detail.pipelineStages || null);
      setCompletedSteps(new Set<MatchStepKey>(['intent', 'job-description', 'data-source', 'filters', 'search-depth', 'searching']));
      navigateToStep('results');
      setTimeout(() => setAnimateIn(true), 50);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }, [navigateToStep]);

  const handleSelectCandidate = useCallback((candidate: MatchCandidate) => {
    setSelectedProfile(candidate);
    setDeepDiveMode('profile');
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add('results');
      return next;
    });
    navigateToStep('deep-dive');
  }, [navigateToStep]);

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
      navigateToStep('deep-dive');
    }
  }, [compareList.length, navigateToStep]);

  const handleExportToExcel = useCallback(() => {
    const columns: ColumnDef[] = [
      { header: 'Rank', key: 'rank', type: 'number' },
      { header: 'Score', key: 'matchScore', type: 'score' },
      { header: 'Name', key: 'name' },
      { header: 'Status', key: 'candidateStatus' },
      { header: 'Seniority', key: 'seniority' },
      { header: 'Title', key: 'role' },
      { header: 'Main Skill', key: 'mainSkill' },
      { header: 'Country', key: 'country' },
      { header: 'Expected Salary', key: 'expectedSalary' },
      { header: 'Current Salary', key: 'currentSalary' },
      { header: 'Last Updated', key: 'lastStatusUpdate' },
      { header: 'Type', key: 'type' },
      { header: 'Technical %', key: 'technical', type: 'score' },
      { header: 'Domain %', key: 'domain', type: 'score' },
      { header: 'Leadership %', key: 'leadership', type: 'score' },
      { header: 'Soft Skills %', key: 'softSkills', type: 'score' },
      { header: 'Availability %', key: 'availability', type: 'score' },
      { header: 'SharePoint', key: 'sharepointUrl', type: 'hyperlink' },
    ];

    const data = candidates.map((c, i) => ({
      rank: i + 1,
      matchScore: c.matchScore,
      name: c.name,
      candidateStatus: c.candidateStatus ?? c.type,
      seniority: c.seniority,
      role: c.role,
      mainSkill: c.mainSkill,
      country: c.country,
      expectedSalary: c.salaryExpectations && c.salaryExpectations > 0
        ? formatSalary(c.salaryExpectations, c.salaryExpectationsCurrency || undefined)
        : '',
      currentSalary: c.expectedRate > 0
        ? formatSalary(c.expectedRate, c.currency || undefined)
        : '',
      lastStatusUpdate: c.lastStatusUpdate
        ? new Date(c.lastStatusUpdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '',
      type: c.type === 'employee' ? 'Employee' : 'Candidate',
      technical: c.scores.technical,
      domain: c.scores.domain,
      leadership: c.scores.leadership,
      softSkills: c.scores.softSkills,
      availability: c.scores.availability,
      sharepointUrl: c.type === 'employee'
        ? `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Employees.aspx?employeeId=${c.id}`
        : `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Candidates.aspx?CandidateId=${c.id}`,
    }));

    exportToExcel(data, columns, `match-results-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [candidates]);

  const handleBackToResults = useCallback(() => {
    navigateToStep('results');
  }, [navigateToStep]);

  const handleStepClick = useCallback((step: MatchStepKey) => {
    navigateToStep(step);
  }, [navigateToStep]);

  const handleReset = useCallback(() => {
    navigateToStep('intent', true);
    setCompletedSteps(new Set());
    setMatchFlow(null);
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setJdSource('custom');
    setAdvancedConstraints({ candidateFilters: [], employeeFilters: [] });
    setDataSource('candidates');
    setTopN(10);
    setSearchMode('opus');
    setShowAnalyzeDeeper(false);
    setProgress({ percent: 0, stage: '' });
    setCandidates([]);
    setStats(null);
    setPipelineStages(null);
    setSelectedProfile(null);
    setCompareList([]);
    setAnimateIn(false);
    setSessionId(null);
    setActiveStageDrawer(null);
  }, [navigateToStep]);

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
    return advancedConstraints.candidateFilters.length + advancedConstraints.employeeFilters.length;
  }, [advancedConstraints]);

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
      const jdLabel = jdSource === 'position' ? 'Position' : 'Custom';
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

    if (completedSteps.has('filters')) {
      const filtersLabel = activeConstraintCount > 0 ? `${activeConstraintCount} filter(s)` : 'No filters';
      summaries['filters'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        ),
        label: filtersLabel,
      };
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

    if (completedSteps.has('search-depth')) {
      const modeLabels: Record<SearchMode, string> = { vector: 'Vector', haiku: 'Haiku', opus: 'Full Analysis' };
      summaries['search-depth'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18l-7 8v6l-4 2V12L3 4z" />
          </svg>
        ),
        label: `${modeLabels[searchMode]} · ${topN}`,
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
  }, [completedSteps, matchFlow, jdSource, activeConstraintCount, dataSource, topN, searchMode, stats, candidates.length]);

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

        {currentStepKey !== 'bench-burn' && currentStepKey !== 'delivery-to-op' && currentStepKey !== 'external-candidate-to-op' && (
          <StepperBar
            stepLabels={STEP_LABELS}
            currentStepKey={currentStepKey}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            stepSummaries={stepSummaries}
          />
        )}

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
          />
        )}

        {currentStepKey === 'filters' && (
          <FilterStep
            dataSource={dataSource}
            filterOptions={filterOptions}
            initialConstraints={advancedConstraints}
            onNext={handleFiltersNext}
          />
        )}

        {currentStepKey === 'bench-burn' && (
          <BenchBurnPage onReset={handleReset} />
        )}

        {currentStepKey === 'delivery-to-op' && (
          <DeliveryToOpPage onReset={handleReset} initialSessionId={sessionId} />
        )}

        {currentStepKey === 'external-candidate-to-op' && (
          <ExternalCandidateToOpPage onReset={handleReset} initialSessionId={sessionId} />
        )}

        {currentStepKey === 'data-source' && (
          <DataSourceStep onNext={handleDataSourceNext} initialSource={dataSource} poolCounts={poolCounts} />
        )}

        {currentStepKey === 'search-depth' && (
          <SearchDepthStep onNext={handleSearchDepthNext} initialMode={searchMode} />
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
              <div className="flex items-center gap-3 mt-8">
                {searchMode !== 'opus' && (
                  <button
                    onClick={() => setShowAnalyzeDeeper(true)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-violet-500/20"
                  >
                    🔬 Analyze Deeper
                  </button>
                )}
                <button
                  onClick={handleStartCompare}
                  disabled={compareList.length < 2}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-accent-500 disabled:hover:to-accent-600"
                >
                  Compare Selected ({compareList.length})
                </button>
                <button
                  onClick={handleExportToExcel}
                  disabled={candidates.length === 0}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to Excel
                </button>
              </div>
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

      {showAnalyzeDeeper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center">
                <span className="text-lg">🔬</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">Analyze Deeper</h3>
                <p className="text-xs text-muted">Upgrade your search with more AI analysis</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Analyze Top</span>
              {([10, 20, 30] as TopN[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setDeeperTopN(n)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    deeperTopN === n
                      ? 'bg-violet-500 text-white shadow-sm'
                      : 'glass-panel-subtle text-secondary hover:text-primary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {searchMode === 'vector' && (
                <button
                  onClick={() => {
                    setShowAnalyzeDeeper(false);
                    setSearchMode('haiku');
                    setTopN(deeperTopN);
                    setCandidateUpstreamIds(candidates.map(c => c.id));
                    setPendingDataSource({ source: dataSource, topN: deeperTopN });
                    const now = new Date();
                    const flowLabel = matchFlow === 'match-to-positions' ? 'Match to Positions' : 'Candidates to OP';
                    const defaultName = `${flowLabel} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                    setSessionName(defaultName);
                    setShowSessionNamePrompt(true);
                  }}
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 4h18l-7 8v6l-4 2V12L3 4z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-primary">Haiku Pre-filter</h4>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400">🎯 Balanced</span>
                      </div>
                      <p className="text-xs text-muted mt-1">AI triage with Haiku to score and filter candidates. Returns top 50.</p>
                    </div>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  setShowAnalyzeDeeper(false);
                  setSearchMode('opus');
                  setTopN(deeperTopN);
                  setCandidateUpstreamIds(candidates.map(c => c.id));
                  setPendingDataSource({ source: dataSource, topN: deeperTopN });
                  const now = new Date();
                  const flowLabel = matchFlow === 'match-to-positions' ? 'Match to Positions' : 'Candidates to OP';
                  const defaultName = `${flowLabel} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                  setSessionName(defaultName);
                  setShowSessionNamePrompt(true);
                }}
                className="w-full text-left p-4 rounded-xl border-2 border-gray-200/30 dark:border-dark-border/30 glass-panel-subtle hover:border-violet-500/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a7 7 0 017 7c0 2.5-1.5 4.5-3 6l-1 3H9l-1-3c-1.5-1.5-3-3.5-3-6a7 7 0 017-7z" />
                      <path d="M9 18h6M10 21h4" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-primary">Full Opus Analysis</h4>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400">🔬 Deepest</span>
                    </div>
                    <p className="text-xs text-muted mt-1">Complete pipeline with deep Opus analysis — fit narratives, skill gaps, leadership assessment. Top 10 candidates.</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowAnalyzeDeeper(false)}
              className="w-full py-2 text-sm text-muted hover:text-secondary transition-colors"
            >
              Cancel
            </button>
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
