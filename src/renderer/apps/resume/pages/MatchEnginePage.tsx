import { useMemo, ReactNode } from 'react';
import {
  MatchStepKey,
  MatchFlowType,
  DataSource,
  PipelineStageKey,
  SearchMode,
} from '../types';
import StepperBar from '../../../shared/components/StepperBar';
import IntentSelector from '../components/match/IntentSelector';
import JobDescriptionStep from '../components/match/JobDescriptionStep';
import DataSourceStep from '../components/match/DataSourceStep';
import FilterStep from '../components/match/FilterStep';
import SearchDepthStep from '../components/match/SearchDepthStep';
import SearchProgressComponent from '../components/match/SearchProgress';
import CandidateProfile from '../components/match/CandidateProfile';
import CompareView from '../components/match/CompareView';
import SessionHistory from '../components/match/SessionHistory';
import SessionHistoryPage from '../components/match/SessionHistoryPage';
import PipelineStageDrawer from '../components/match/PipelineStageDrawer';
import BenchBurnPage from './BenchBurnPage';
import DeliveryToOpPage from './DeliveryToOpPage';
import ExternalCandidateToOpPage from './ExternalCandidateToOpPage';
import MatchResultsStep from '../components/match/steps/MatchResultsStep';
import SessionNameModal from '../components/match/steps/SessionNameModal';
import AiWarningModal from '../components/match/steps/AiWarningModal';
import HaikuConfirmModal from '../components/match/steps/HaikuConfirmModal';
import AnalyzeDeeperModal from '../components/match/steps/AnalyzeDeeperModal';
import { useMatchEngine } from '../hooks/useMatchEngine';
import { MatchEngineProvider } from '../contexts/MatchEngineContext';

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
  { key: 'intent', title: 'Intent', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
  { key: 'data-source', title: 'Data Source', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { key: 'job-description', title: 'Job Description', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { key: 'filters', title: 'Filters', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> },
  { key: 'search-depth', title: 'Search Depth', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18l-7 8v6l-4 2V12L3 4z" /></svg> },
  { key: 'searching', title: 'AI Search', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
  { key: 'results', title: 'Results', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  { key: 'deep-dive', title: 'Deep Dive', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> },
];

export default function MatchEnginePage() {
  const hookValue = useMatchEngine();
  const {
    wizard: { currentStepKey, completedSteps, handleStepClick, navigateToStep },
    intent: { matchFlow, handleIntentSelect, showHistoryPage, setShowHistoryPage },
    source: { dataSource, handleDataSourceNext, poolCounts, filterOptions },
    jd: { jobDescription, setJobDescription, jdSource, handleJdNext },
    filters: { advancedConstraints, handleFiltersNext, activeConstraintCount },
    depth: { searchMode, topN, deeperTopN, setDeeperTopN, showAnalyzeDeeper, setShowAnalyzeDeeper, handleSearchDepthNext, candidateUpstreamIds, setCandidateUpstreamIds },
    search: { progress, handleStartSearch, executeSearch, showSessionNamePrompt, setShowSessionNamePrompt, sessionName, setSessionName, pendingDataSource },
    results: { candidates, stats, pipelineStages, animateIn, sessionId, handleExportToExcel, handleReset },
    deepDive: { selectedProfile, setSelectedProfile, compareList, handleToggleCompare, handleStartCompare, deepDiveMode, handleSelectCandidate, handleBackToResults },
    sessions: { sessions, showSessionHistory, setShowSessionHistory, handleLoadSession },
    pipeline: { activeStageDrawer, setActiveStageDrawer, activeStageDrawerCandidates, handleStageClick },
    aiWarning: { showAiWarningModal, handleAiWarningContinue, handleAiWarningCancel },
    haikuConfirm: { haikuConfirm, handleConfirmDecision },
  } = hookValue;

  const stepSummaries = useMemo<Partial<Record<MatchStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<MatchStepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('intent') && matchFlow) {
      summaries['intent'] = {
        icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
        label: MATCH_FLOW_LABELS[matchFlow],
      };
    }

    if (completedSteps.has('job-description')) {
      const jdLabel = jdSource === 'position' ? 'Position' : 'Custom';
      const icon = jdSource === 'position'
        ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      summaries['job-description'] = { icon, label: jdLabel };
    }

    if (completedSteps.has('filters')) {
      summaries['filters'] = {
        icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>,
        label: activeConstraintCount > 0 ? `${activeConstraintCount} filter(s)` : 'No filters',
      };
    }

    if (completedSteps.has('data-source')) {
      summaries['data-source'] = {
        icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        label: SOURCE_LABELS[dataSource],
      };
    }

    if (completedSteps.has('search-depth')) {
      const modeLabels: Record<SearchMode, string> = { vector: 'Vector', haiku: 'Haiku', opus: 'Full Analysis' };
      summaries['search-depth'] = {
        icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18l-7 8v6l-4 2V12L3 4z" /></svg>,
        label: `${modeLabels[searchMode]} · ${topN}`,
      };
    }

    if (completedSteps.has('searching') && stats) {
      summaries['searching'] = {
        icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
        label: `${stats.profilesScanned} scanned`,
      };
    }

    if (completedSteps.has('results')) {
      summaries['results'] = {
        icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        label: `${candidates.length} candidates`,
      };
    }

    return summaries;
  }, [completedSteps, matchFlow, jdSource, activeConstraintCount, dataSource, topN, searchMode, stats, candidates.length]);

  const handleAnalyzeDeeperHaiku = () => {
    setShowAnalyzeDeeper(false);
    setCandidateUpstreamIds(candidates.map(c => c.id));
    setPendingDataSource({ source: dataSource, topN: deeperTopN });
    const now = new Date();
    const flowLabel = matchFlow === 'match-to-positions' ? 'Match to Positions' : 'Candidates to OP';
    setSessionName(`${flowLabel} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    setShowSessionNamePrompt(true);
  };

  const handleAnalyzeDeeperOpus = () => {
    setShowAnalyzeDeeper(false);
    setCandidateUpstreamIds(candidates.map(c => c.id));
    setPendingDataSource({ source: dataSource, topN: deeperTopN });
    const now = new Date();
    const flowLabel = matchFlow === 'match-to-positions' ? 'Match to Positions' : 'Candidates to OP';
    setSessionName(`${flowLabel} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    setShowSessionNamePrompt(true);
  };

  // Workaround: need setPendingDataSource from depth but it's on search
  const { setPendingDataSource } = hookValue.search;

  return (
    <MatchEngineProvider value={hookValue}>
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
          <IntentSelector onSelect={handleIntentSelect} onViewHistory={() => setShowHistoryPage(true)} sessionCount={sessions.length} />
        )}

        {currentStepKey === 'intent' && showHistoryPage && (
          <SessionHistoryPage sessions={sessions} onLoadSession={(id) => { setShowHistoryPage(false); handleLoadSession(id); }} onBack={() => setShowHistoryPage(false)} />
        )}

        {currentStepKey === 'job-description' && (
          <JobDescriptionStep onNext={handleJdNext} initialJobDescription={jobDescription} initialSource={jdSource} />
        )}

        {currentStepKey === 'filters' && (
          <FilterStep dataSource={dataSource} filterOptions={filterOptions} initialConstraints={advancedConstraints} onNext={handleFiltersNext} />
        )}

        {currentStepKey === 'bench-burn' && <BenchBurnPage onReset={handleReset} />}
        {currentStepKey === 'delivery-to-op' && <DeliveryToOpPage onReset={handleReset} initialSessionId={sessionId} />}
        {currentStepKey === 'external-candidate-to-op' && <ExternalCandidateToOpPage onReset={handleReset} initialSessionId={sessionId} />}
        {currentStepKey === 'data-source' && <DataSourceStep onNext={handleDataSourceNext} initialSource={dataSource} poolCounts={poolCounts} />}
        {currentStepKey === 'search-depth' && <SearchDepthStep onNext={handleSearchDepthNext} initialMode={searchMode} />}
        {currentStepKey === 'searching' && <SearchProgressComponent progress={progress} isPaused={haikuConfirm !== null} />}

        {currentStepKey === 'results' && (
          <MatchResultsStep
            candidates={candidates}
            stats={stats}
            pipelineStages={pipelineStages}
            animateIn={animateIn}
            sessionId={sessionId}
            dataSource={dataSource}
            searchMode={searchMode}
            activeConstraintCount={activeConstraintCount}
            compareList={compareList}
            sessions={sessions}
            showSessionHistory={showSessionHistory}
            deeperTopN={deeperTopN}
            matchFlow={matchFlow}
            onReset={handleReset}
            onExportToExcel={handleExportToExcel}
            onSelectCandidate={handleSelectCandidate}
            onToggleCompare={handleToggleCompare}
            onStartCompare={handleStartCompare}
            onStageClick={handleStageClick}
            onToggleSessionHistory={() => setShowSessionHistory(!showSessionHistory)}
            onLoadSession={handleLoadSession}
            onAnalyzeDeeper={() => setShowAnalyzeDeeper(true)}
          />
        )}

        {currentStepKey === 'deep-dive' && deepDiveMode === 'profile' && selectedProfile && (
          <CandidateProfile candidate={selectedProfile} onBack={handleBackToResults} />
        )}

        {currentStepKey === 'deep-dive' && deepDiveMode === 'compare' && (
          <CompareView candidates={compareList} onBack={handleBackToResults} />
        )}
      </div>

      {showSessionNamePrompt && (
        <SessionNameModal
          sessionName={sessionName}
          onSessionNameChange={setSessionName}
          onConfirm={handleStartSearch}
          onCancel={() => setShowSessionNamePrompt(false)}
        />
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
        <AiWarningModal onContinue={handleAiWarningContinue} onCancel={handleAiWarningCancel} />
      )}

      {showAnalyzeDeeper && (
        <AnalyzeDeeperModal
          searchMode={searchMode}
          deeperTopN={deeperTopN}
          candidates={candidates}
          dataSource={dataSource}
          matchFlow={matchFlow}
          onSetDeeperTopN={setDeeperTopN}
          onStartHaikuUpgrade={handleAnalyzeDeeperHaiku}
          onStartOpusUpgrade={handleAnalyzeDeeperOpus}
          onCancel={() => setShowAnalyzeDeeper(false)}
        />
      )}

      {haikuConfirm && currentStepKey === 'searching' && (
        <HaikuConfirmModal haikuConfirm={haikuConfirm} onDecision={handleConfirmDecision} />
      )}
    </div>
    </MatchEngineProvider>
  );
}
