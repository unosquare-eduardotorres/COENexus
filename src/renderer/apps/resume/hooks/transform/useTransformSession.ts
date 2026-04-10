import { createElement, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { NavigateFunction, useSearchParams } from 'react-router-dom';
import { useIpcQuery } from '../../../../shared/hooks/useIpcQuery';
import { transformSessionService } from '../../services/transformSessionService';
import {
  CreateOrUpdateTransformSession,
  ProcessingMode,
  RefinementMode,
  ResumeSourceType,
  SessionContextType,
  StructuredResume,
  TransformSessionSummary,
} from '../../types';
import { createRendererLogger } from '../../../../shared/utils/rendererLogger';

const log = createRendererLogger('useTransformSession');

export type StepKey = 'intent' | 'select' | 'refinement' | 'job-description' | 'review' | 'save';

const createIcon = (paths: string[], className = 'w-4 h-4'): ReactNode =>
  createElement(
    'svg',
    { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
    ...paths.map((d) =>
      createElement('path', {
        key: d,
        d,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 1.5,
      }),
    ),
  );

const STEP_ICONS: Record<StepKey, ReactNode> = {
  intent: createIcon([
    'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  ]),
  select: createIcon(['M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z']),
  refinement: createIcon(['M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z']),
  'job-description': createIcon(['M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.64-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z']),
  review: createIcon([
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  ]),
  save: createIcon(['M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4']),
};

export function useTransformSession(navigate: NavigateFunction) {
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('session');
  const parsedSessionId = useMemo(() => {
    if (!sessionIdParam) return null;
    const id = parseInt(sessionIdParam, 10);
    return Number.isNaN(id) ? null : id;
  }, [sessionIdParam]);

  const {
    data: sessionDetail,
    error: sessionDetailError,
  } = useIpcQuery(
    ['transform-session', 'detail', String(parsedSessionId ?? '')],
    () => transformSessionService.get(parsedSessionId as number),
    { enabled: parsedSessionId !== null },
  );

  const {
    data: listedSessions,
    error: listedSessionsError,
  } = useIpcQuery(['transform-session', 'history'], () => transformSessionService.list());

  const [currentStepKey, setCurrentStepKey] = useState<StepKey>('intent');
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [showSaveSessionModal, setShowSaveSessionModal] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [savedSessionName, setSavedSessionName] = useState('');
  const [pendingSessionName, setPendingSessionName] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [showHistoryPage, setShowHistoryPage] = useState(false);
  const [historySessions, setHistorySessions] = useState<TransformSessionSummary[]>([]);
  const [hasSaved, setHasSaved] = useState(false);

  const getStepLabels = useCallback((refinementMode: RefinementMode) => {
    const base: { key: StepKey; title: string }[] = [
      { key: 'intent', title: 'Choose Flow' },
      { key: 'select', title: 'Select Resume(s)' },
      { key: 'refinement', title: 'Enhancement Mode' },
    ];
    if (refinementMode === 'job-tailoring') base.push({ key: 'job-description', title: 'Job Description' });
    base.push({ key: 'review', title: 'Review' }, { key: 'save', title: 'Save / Export' });
    return base.map((s) => ({ ...s, icon: STEP_ICONS[s.key] }));
  }, []);

  const getNextStepKey = useCallback((current: StepKey, refinementMode: RefinementMode): StepKey | null => {
    const keys = getStepLabels(refinementMode).map((s) => s.key);
    const idx = keys.indexOf(current);
    return idx >= 0 && idx < keys.length - 1 ? keys[idx + 1] : null;
  }, [getStepLabels]);

  const getPrevStepKey = useCallback((current: StepKey, refinementMode: RefinementMode): StepKey | null => {
    const keys = getStepLabels(refinementMode).map((s) => s.key);
    const idx = keys.indexOf(current);
    return idx > 0 ? keys[idx - 1] : null;
  }, [getStepLabels]);

  const goToStep = useCallback((stepKey: StepKey) => {
    setCurrentStepKey(stepKey);
  }, []);

  const handleStepClick = useCallback((stepKey: StepKey) => {
    setCurrentStepKey(stepKey);
  }, []);

  const handleNext = useCallback((refinementMode: RefinementMode) => {
    const next = getNextStepKey(currentStepKey, refinementMode);
    if (!next) return;
    setCompletedSteps((prev) => new Set([...prev, currentStepKey]));
    setCurrentStepKey(next);
  }, [currentStepKey, getNextStepKey]);

  const handleBack = useCallback((refinementMode: RefinementMode) => {
    const prev = getPrevStepKey(currentStepKey, refinementMode);
    if (prev) setCurrentStepKey(prev);
  }, [currentStepKey, getPrevStepKey]);

  const handleNextFromStep3 = useCallback((refinementMode: RefinementMode, onNonTailoringAdvance: () => void) => {
    const nextStep: StepKey = refinementMode === 'job-tailoring' ? 'job-description' : 'review';
    setCompletedSteps((prev) => new Set([...prev, 'refinement']));
    setCurrentStepKey(nextStep);
    if (refinementMode !== 'job-tailoring') onNonTailoringAdvance();
  }, []);

  const defaultSessionName = useCallback(
    (
      sourceType: ResumeSourceType,
      refinementMode: RefinementMode,
      selectedCandidateName: string | null,
      selectedEmployeeName: string | null,
      selectedFileName?: string,
    ) => {
      const now = new Date();
      const dateStr = `${String(now.getFullYear()).slice(-2)}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
      const subject =
        sourceType === 'ats-candidates' && selectedCandidateName
          ? selectedCandidateName
          : sourceType === 'employees' && selectedEmployeeName
            ? selectedEmployeeName
            : selectedFileName?.replace(/\.[^/.]+$/, '') ?? 'Session';
      const modeLabels: Record<RefinementMode, string> = {
        'professional-polish': 'Professional Polish',
        'impact-focused': 'Impact-Focused',
        'ats-optimized': 'ATS-Optimized',
        'job-tailoring': 'Job Description Tailoring',
      };
      return `${dateStr} - ${subject} - ${modeLabels[refinementMode]}`;
    },
    [],
  );

  const loadSessionFromUrl = useCallback(
    async (ctx: SessionLoadContext, handlers: SessionLoadHandlers) => {
      if (!sessionIdParam || parsedSessionId === null) return;
      if (sessionDetailError) {
        log.error('Failed to load session:', sessionDetailError);
        handlers.setError('Failed to load session');
        return;
      }
      if (!sessionDetail) return;
      try {
        const detail = sessionDetail;
        setSavedSessionId(parsedSessionId);
        if (detail.wizardStateJson) {
          const state: PersistedWizardState = JSON.parse(detail.wizardStateJson);
          handlers.setProcessingMode(state.processingMode);
          handlers.setSourceType(state.sourceType);
          handlers.setRefinementMode(state.refinementMode);
          handlers.setJobDescriptionSource(state.jobDescriptionSource);
          handlers.setCustomJobDescription(state.customJobDescription);
          setCompletedSteps(new Set(state.completedSteps));
          if (state.selectedCandidateId) {
            const liveCandidate = ctx.liveCandidates.find((c) => String(c.upstreamId) === state.selectedCandidateId);
            if (liveCandidate) {
              handlers.setSelectedCandidate({
                id: String(liveCandidate.upstreamId),
                upstreamId: liveCandidate.upstreamId,
                name: liveCandidate.name,
                email: liveCandidate.email,
                phone: '',
                skills: [liveCandidate.mainSkill, liveCandidate.seniority].filter(Boolean),
                positions: [],
              });
            }
          }
          setCurrentStepKey(state.currentStepKey === ('processing' as StepKey) ? 'intent' : state.currentStepKey);
        }
        if (detail.resumeContentJson) {
          handlers.setTransformedResumes(JSON.parse(detail.resumeContentJson) as StructuredResume[]);
        }
      } catch (err) {
        log.error('Failed to load session:', err);
        handlers.setError('Failed to load session');
      }
    },
    [parsedSessionId, sessionDetail, sessionDetailError, sessionIdParam],
  );

  const saveSession = useCallback(
    async (input: SaveSessionInput) => {
      setSavingSession(true);
      try {
        let contextType: SessionContextType = 'upload';
        if (input.sourceType === 'ats-candidates') contextType = 'candidate';
        else if (input.sourceType === 'employees') contextType = 'employee';
        const wizardState: PersistedWizardState = {
          currentStepKey,
          completedSteps: [...completedSteps],
          processingMode: input.processingMode,
          sourceType: input.sourceType,
          refinementMode: input.refinementMode,
          jobDescriptionSource: input.jobDescriptionSource,
          customJobDescription: input.customJobDescription,
          selectedCandidateId: input.selectedCandidateId ?? null,
          selectedPositionId: input.selectedPositionId ?? null,
          fileNames: input.selectedFileNames,
        };
        const resumesToSave = input.transformedResumes.map((r) => input.editedResumes.get(r.id) || r);
        const payload: CreateOrUpdateTransformSession = {
          name: input.selectedCandidateName || input.selectedFileNames[0] || `Session ${new Date().toLocaleString()}`,
          contextType,
          contextName: input.selectedCandidateName || input.selectedFileNames[0] || null,
          processingMode: input.processingMode,
          refinementMode: input.refinementMode,
          jobDescription: input.customJobDescription || null,
          jobDescriptionSource: input.jobDescriptionSource,
          selectedPositionId: input.selectedPositionId ?? null,
          resumeContentJson: JSON.stringify(resumesToSave),
          wizardStateJson: JSON.stringify(wizardState),
          status: input.transformedResumes.length > 0 ? 'completed' : 'draft',
        };
        if (savedSessionId) await transformSessionService.update(savedSessionId, payload);
        else {
          const created = await transformSessionService.create(payload);
          setSavedSessionId(created.id);
        }
        setHasSaved(true);
      } finally {
        setSavingSession(false);
      }
    },
    [completedSteps, currentStepKey, savedSessionId],
  );

  useEffect(() => {
    if (listedSessions) {
      setSessionCount(listedSessions.length);
      setHistorySessions(listedSessions);
      return;
    }
    if (listedSessionsError) {
      setSessionCount(0);
      setHistorySessions([]);
    }
  }, [listedSessions, listedSessionsError]);


  const history = useMemo(
    () => ({
      sessionCount,
      showHistoryPage,
      setShowHistoryPage,
      historySessions,
      navigate,
    }),
    [historySessions, navigate, sessionCount, showHistoryPage],
  );

  return {
    currentStepKey,
    setCurrentStepKey,
    completedSteps,
    setCompletedSteps,
    savedSessionId,
    setSavedSessionId,
    savingSession,
    setSavingSession,
    showSaveSessionModal,
    setShowSaveSessionModal,
    isSavingSession,
    setIsSavingSession,
    sessionSaved,
    setSessionSaved,
    savedSessionName,
    setSavedSessionName,
    pendingSessionName,
    setPendingSessionName,
    hasSaved,
    setHasSaved,
    history,
    getStepLabels,
    getNextStepKey,
    getPrevStepKey,
    goToStep,
    handleStepClick,
    handleNext,
    handleBack,
    handleNextFromStep3,
    defaultSessionName,
    loadSessionFromUrl,
    saveSession,
  };
}
