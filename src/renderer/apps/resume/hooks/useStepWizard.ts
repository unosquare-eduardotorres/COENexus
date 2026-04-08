import { useState, useCallback, useEffect } from 'react';

interface UseStepWizardOptions<TStep extends string> {
  historyKey: string;
  onPopState?: (step: TStep) => void;
}

interface StepWizard<TStep extends string> {
  currentStep: TStep;
  completedSteps: Set<TStep>;
  navigateStep: (step: TStep, replace?: boolean) => void;
  completeStep: (step: TStep) => void;
  setCurrentStep: (step: TStep) => void;
  setCompletedSteps: React.Dispatch<React.SetStateAction<Set<TStep>>>;
  resetWizard: (initialStep: TStep) => void;
}

export function useStepWizard<TStep extends string>(
  initialStep: TStep,
  options: UseStepWizardOptions<TStep>,
): StepWizard<TStep> {
  const { historyKey, onPopState } = options;

  const [currentStep, setCurrentStep] = useState<TStep>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<TStep>>(new Set());

  const navigateStep = useCallback((step: TStep, replace = false) => {
    setCurrentStep(step);
    const statePayload = { [historyKey]: step };
    if (replace) {
      window.history.replaceState(statePayload, '');
    } else {
      window.history.pushState(statePayload, '');
    }
  }, [historyKey]);

  const completeStep = useCallback((step: TStep) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const resetWizard = useCallback((resetStep: TStep) => {
    setCurrentStep(resetStep);
    setCompletedSteps(new Set());
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const step = e.state?.[historyKey] as TStep | undefined;
      if (step) {
        setCurrentStep(step);
        onPopState?.(step);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [historyKey, onPopState]);

  return {
    currentStep,
    completedSteps,
    navigateStep,
    completeStep,
    setCurrentStep,
    setCompletedSteps,
    resetWizard,
  };
}
