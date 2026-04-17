import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { SAMPLE_JOB_DESCRIPTION } from '../data/sampleJobDescription';
import { getMatchPrompts } from '../data/defaultMatchPrompts';
import { useIpcQuery, useInvalidateQueries } from '../../../shared/hooks/useIpcQuery';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';
import { useStepWizard } from './useStepWizard';
import { useToast } from '../../../shared/components/ToastContext';

const log = createRendererLogger('useMatchEngine');

export function useMatchEngine() {
  const { showToast } = useToast();
  const { currentStep: currentStepKey, completedSteps, navigateStep: navigateToStep, completeStep, setCurrentStep: setCurrentStepKey, setCompletedSteps, resetWizard } = useStepWizard<MatchStepKey>('intent', {
    historyKey: 'matchStep',
  });

  useEffect(() => {
    window.history.replaceState({ matchStep: 'intent' }, '');
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
  const { data: poolCounts = null } = useIpcQuery<PoolCounts | null>(['match', 'pool-counts'], () => matchEngineService.getPoolCounts());
  const { data: filterOptions = null } = useIpcQuery<FilterOptions | null>(['match', 'filter-options'], () => matchEngineService.getFilterOptions());
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
  const { data: sessions = [] } = useIpcQuery<MatchSessionSummary[]>(['match', 'sessions'], () => matchEngineService.listSessions());
  const invalidate = useInvalidateQueries();
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [activeStageDrawer, setActiveStageDrawer] = useState<PipelineStageKey | null>(null);
  const [showAiWarningModal, setShowAiWarningModal] = useState(false);
  const [haikuConfirm, setHaikuConfirm] = useState<HaikuConfirmPayload | null>(null);
  const [showHistoryPage, setShowHistoryPage] = useState(false);



  const handleIntentSelect = useCallback(
    (flow: MatchFlowType) => {
      log.info('Match flow selected', { flow });
      setMatchFlow(flow);
      completeStep('intent');
      if (flow === 'bench-burn') { navigateToStep('bench-burn'); return; }
      if (flow === 'delivery-to-op') { navigateToStep('delivery-to-op'); return; }
      if (flow === 'external-candidate-to-op') { navigateToStep('external-candidate-to-op'); return; }
      navigateToStep('data-source');
    },
    [completeStep, navigateToStep]
  );

  const handleJdNext = useCallback(
    (jd: string, source: JdSource) => {
      log.info('Match job description confirmed', { source, length: jd.length });
      setJobDescription(jd);
      setJdSource(source);
      completeStep('job-description');
      navigateToStep('filters');
    },
    [completeStep, navigateToStep]
  );

  const handleFiltersNext = useCallback(
    (constraints: AdvancedConstraints) => {
      log.info('Match filters confirmed', {
        candidateFilters: constraints.candidateFilters.length,
        employeeFilters: constraints.employeeFilters.length,
      });
      setAdvancedConstraints(constraints);
      completeStep('filters');
      navigateToStep('search-depth');
    },
    [completeStep, navigateToStep]
  );

  const handleSearchDepthNext = useCallback(
    (mode: SearchMode, selectedTopN: number) => {
      log.info('Match search depth confirmed', { mode, topN: selectedTopN, dataSource });
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
      log.info('Match data source selected', { source });
      setDataSource(source);
      completeStep('data-source');
      navigateToStep('job-description');
    },
    [completeStep, navigateToStep]
  );

  const executeSearch = useCallback(async () => {
    if (!pendingDataSource) return;
    const { source, topN: selectedTopN } = pendingDataSource;
    log.info('Match search started', {
      source,
      topN: selectedTopN,
      searchMode,
      matchFlow: matchFlow || 'find-for-position',
      candidateUpstreamIds: candidateUpstreamIds?.length ?? 0,
    });
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
          jdSource, jobDescription,
          dataSource: source,
          topN: selectedTopN,
          searchMode,
          constraints: advancedConstraints,
          haikuPromptConfig: haikuConfig ? { promptTemplate: haikuConfig.promptTemplate, maxTokens: haikuConfig.maxTokens, temperature: haikuConfig.temperature } : undefined,
          opusPromptConfig: opusConfig ? {
            promptTemplate: opusConfig.contextBlocks ? opusConfig.promptTemplate.replace('{{contextBlock}}', opusConfig.contextBlocks.matchEngine) : opusConfig.promptTemplate,
            maxTokens: opusConfig.maxTokens, temperature: opusConfig.temperature,
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
      log.info('Match search completed', {
        sessionId: result.sessionId ?? null,
        candidateCount: result.candidates.length,
      });
      completeStep('searching');
      navigateToStep('results');
      setTimeout(() => setAnimateIn(true), 50);
      invalidate(['match', 'sessions']);
    } catch (err) {
      log.error('Match search failed:', err);
      navigateToStep('data-source');
    }
  }, [pendingDataSource, sessionName, matchFlow, jdSource, jobDescription, advancedConstraints, candidateUpstreamIds, completeStep, searchMode, navigateToStep]);

  const handleStartSearch = useCallback(async () => {
    if (!pendingDataSource) return;
    const { connected } = await matchEngineService.getProxyStatus();
    if (!connected) {
      log.warn('Match search blocked by unavailable AI proxy');
      setShowSessionNamePrompt(false);
      setShowAiWarningModal(true);
      return;
    }
    void executeSearch();
  }, [pendingDataSource, executeSearch]);

  const handleAiWarningContinue = useCallback(() => {
    log.info('Match AI warning override accepted');
    void executeSearch();
  }, [executeSearch]);
  const handleAiWarningCancel = useCallback(() => {
    log.info('Match AI warning canceled');
    setShowAiWarningModal(false);
    setPendingDataSource(null);
  }, []);

  const handleConfirmDecision = useCallback(async (action: 'proceed' | 'include-all') => {
    if (!haikuConfirm) return;
    const id = haikuConfirm.searchId;
    setHaikuConfirm(null);
    log.info('Haiku confirmation submitted', { searchId: id, action });
    await window.api.match.confirmHaiku({ searchId: id, action });
  }, [haikuConfirm]);

  const handleLoadSession = useCallback(async (id: number) => {
    try {
      log.info('Match session load requested', { sessionId: id });
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
      log.error('Failed to load match session:', err);
    }
  }, [navigateToStep]);

  const handleSelectCandidate = useCallback((candidate: MatchCandidate) => {
    setSelectedProfile(candidate);
    setDeepDiveMode('profile');
    setCompletedSteps((prev) => { const next = new Set(prev); next.add('results'); return next; });
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
      setCompletedSteps((prev) => { const next = new Set(prev); next.add('results'); return next; });
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
      rank: i + 1, matchScore: c.matchScore, name: c.name,
      candidateStatus: c.candidateStatus ?? c.type, seniority: c.seniority, role: c.role,
      mainSkill: c.mainSkill, country: c.country,
      expectedSalary: c.salaryExpectations && c.salaryExpectations > 0 ? formatSalary(c.salaryExpectations, c.salaryExpectationsCurrency || undefined) : '',
      currentSalary: c.expectedRate > 0 ? formatSalary(c.expectedRate, c.currency || undefined) : '',
      lastStatusUpdate: c.lastStatusUpdate ? new Date(c.lastStatusUpdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      type: c.type === 'employee' ? 'Employee' : 'Candidate',
      technical: c.scores.technical, domain: c.scores.domain, leadership: c.scores.leadership,
      softSkills: c.scores.softSkills, availability: c.scores.availability,
      sharepointUrl: c.type === 'employee'
        ? `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Employees.aspx?employeeId=${c.id}`
        : `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Candidates.aspx?CandidateId=${c.id}`,
    }));
    exportToExcel(data, columns, `match-results-${new Date().toISOString().slice(0, 10)}.xlsx`);
    log.info('Match results exported', { rowCount: data.length });
    showToast('Match results exported to Excel', 'success');
  }, [candidates, showToast]);

  const handleBackToResults = useCallback(() => { navigateToStep('results'); }, [navigateToStep]);
  const handleStepClick = useCallback((step: MatchStepKey) => { navigateToStep(step); }, [navigateToStep]);

  const handleReset = useCallback(() => {
    log.info('Match flow reset');
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
    log.info('Match pipeline stage opened', { stage });
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

  return {
    wizard: { currentStepKey, completedSteps, handleStepClick, navigateToStep },
    intent: { matchFlow, handleIntentSelect, showHistoryPage, setShowHistoryPage },
    source: { dataSource, handleDataSourceNext, poolCounts, filterOptions },
    jd: { jobDescription, setJobDescription, jdSource, handleJdNext },
    filters: { advancedConstraints, handleFiltersNext, activeConstraintCount },
    depth: { searchMode, setSearchMode, topN, deeperTopN, setDeeperTopN, showAnalyzeDeeper, setShowAnalyzeDeeper, handleSearchDepthNext, candidateUpstreamIds, setCandidateUpstreamIds },
    search: { progress, handleStartSearch, executeSearch, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName, pendingDataSource },
    results: { candidates, stats, pipelineStages, animateIn, sessionId, handleExportToExcel, handleReset },
    deepDive: { selectedProfile, setSelectedProfile, compareList, handleToggleCompare, handleStartCompare, deepDiveMode, handleSelectCandidate, handleBackToResults },
    sessions: { sessions, showSessionHistory, setShowSessionHistory, handleLoadSession },
    pipeline: { activeStageDrawer, setActiveStageDrawer, activeStageDrawerCandidates, handleStageClick },
    aiWarning: { showAiWarningModal, handleAiWarningContinue, handleAiWarningCancel },
    haikuConfirm: { haikuConfirm, handleConfirmDecision },
  };
}
