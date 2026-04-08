import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStepWizard } from './useStepWizard';

type TestStep = 'step1' | 'step2' | 'step3';

describe('useStepWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with the given initial step', () => {
    const { result } = renderHook(() =>
      useStepWizard<TestStep>('step1', { historyKey: 'testStep' }),
    );

    expect(result.current.currentStep).toBe('step1');
    expect(result.current.completedSteps.size).toBe(0);
  });

  it('should navigate to a new step', () => {
    const { result } = renderHook(() =>
      useStepWizard<TestStep>('step1', { historyKey: 'testStep' }),
    );

    act(() => {
      result.current.navigateStep('step2');
    });

    expect(result.current.currentStep).toBe('step2');
  });

  it('should complete a step', () => {
    const { result } = renderHook(() =>
      useStepWizard<TestStep>('step1', { historyKey: 'testStep' }),
    );

    act(() => {
      result.current.completeStep('step1');
    });

    expect(result.current.completedSteps.has('step1')).toBe(true);
    expect(result.current.completedSteps.size).toBe(1);
  });

  it('should complete multiple steps', () => {
    const { result } = renderHook(() =>
      useStepWizard<TestStep>('step1', { historyKey: 'testStep' }),
    );

    act(() => {
      result.current.completeStep('step1');
      result.current.completeStep('step2');
    });

    expect(result.current.completedSteps.has('step1')).toBe(true);
    expect(result.current.completedSteps.has('step2')).toBe(true);
    expect(result.current.completedSteps.size).toBe(2);
  });

  it('should reset the wizard', () => {
    const { result } = renderHook(() =>
      useStepWizard<TestStep>('step1', { historyKey: 'testStep' }),
    );

    act(() => {
      result.current.completeStep('step1');
      result.current.navigateStep('step2');
      result.current.completeStep('step2');
    });

    expect(result.current.currentStep).toBe('step2');
    expect(result.current.completedSteps.size).toBe(2);

    act(() => {
      result.current.resetWizard('step1');
    });

    expect(result.current.currentStep).toBe('step1');
    expect(result.current.completedSteps.size).toBe(0);
  });

  it('should allow setting completed steps directly', () => {
    const { result } = renderHook(() =>
      useStepWizard<TestStep>('step1', { historyKey: 'testStep' }),
    );

    act(() => {
      result.current.setCompletedSteps(new Set<TestStep>(['step1', 'step2', 'step3']));
    });

    expect(result.current.completedSteps.size).toBe(3);
  });

  it('should not duplicate completed steps', () => {
    const { result } = renderHook(() =>
      useStepWizard<TestStep>('step1', { historyKey: 'testStep' }),
    );

    act(() => {
      result.current.completeStep('step1');
      result.current.completeStep('step1');
    });

    expect(result.current.completedSteps.size).toBe(1);
  });
});
